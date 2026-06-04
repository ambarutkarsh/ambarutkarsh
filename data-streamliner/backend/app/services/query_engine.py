"""
Query Engine - Core service for executing dataset queries.
Uses SQLAlchemy parameterised queries ONLY. Never string concatenation into SQL.
"""
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import structlog
from sqlalchemy import create_engine, text, select, func as sqlfunc, column, table, literal_column
from sqlalchemy.engine import Engine

from ..models.dataset import Dataset, DatasetField, AggregationType, FieldType, SourceType
from ..models.data_source import DataSource, DbType
from ..core.security import decrypt_credential
from ..core.config import settings

logger = structlog.get_logger()


@dataclass
class QueryResult:
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: int
    truncated: bool = False


def _build_source_engine(ds: DataSource) -> Engine:
    password = decrypt_credential(ds.encrypted_password)
    if ds.db_type == DbType.postgresql:
        url = f"postgresql+psycopg2://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type in (DbType.mysql, DbType.mariadb):
        url = f"mysql+pymysql://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == DbType.mssql:
        url = (
            f"mssql+pyodbc://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
            f"?driver=ODBC+Driver+17+for+SQL+Server"
        )
    else:
        raise ValueError(f"Unsupported db_type: {ds.db_type}")
    return create_engine(url, pool_size=2, max_overflow=5, pool_timeout=ds.connection_timeout)


def _apply_aggregation(field: DatasetField, col_expr):
    """Apply SQLAlchemy aggregation function to a column expression."""
    agg = field.aggregation_type
    if agg == AggregationType.count:
        return sqlfunc.count(col_expr)
    elif agg == AggregationType.count_distinct:
        return sqlfunc.count(col_expr.distinct())
    elif agg == AggregationType.sum:
        return sqlfunc.sum(col_expr)
    elif agg == AggregationType.avg:
        return sqlfunc.avg(col_expr)
    elif agg == AggregationType.min:
        return sqlfunc.min(col_expr)
    elif agg == AggregationType.max:
        return sqlfunc.max(col_expr)
    else:
        return col_expr


def _validate_field_name(field_name: str, allowed_fields: Dict[str, DatasetField]) -> DatasetField:
    """
    Validate that a requested field exists in the dataset config.
    This prevents user-supplied column names from entering queries.
    """
    if field_name not in allowed_fields:
        raise ValueError(f"Field '{field_name}' is not defined in the dataset")
    return allowed_fields[field_name]


def _build_filter_conditions(
    filters: Dict[str, Any],
    allowed_fields: Dict[str, DatasetField],
    source_table,
    bind_params: Dict[str, Any],
) -> List:
    """
    Build WHERE conditions from filters dict.
    Each filter: {field_name: value} or {field_name: {op: value}}
    Operators: eq, ne, gt, gte, lt, lte, in, like, between
    Uses SQLAlchemy column references and bind parameters throughout.
    """
    conditions = []
    param_idx = 0
    for field_key, filter_val in filters.items():
        try:
            df = _validate_field_name(field_key, allowed_fields)
        except ValueError:
            continue  # Skip unknown fields silently
        col_expr = source_table.c[df.source_column]

        if isinstance(filter_val, dict):
            for op, val in filter_val.items():
                param_name = f"fp_{param_idx}"
                param_idx += 1
                if op == "eq":
                    bind_params[param_name] = val
                    conditions.append(col_expr == text(f":{param_name}"))
                elif op == "ne":
                    bind_params[param_name] = val
                    conditions.append(col_expr != text(f":{param_name}"))
                elif op == "gt":
                    bind_params[param_name] = val
                    conditions.append(col_expr > text(f":{param_name}"))
                elif op == "gte":
                    bind_params[param_name] = val
                    conditions.append(col_expr >= text(f":{param_name}"))
                elif op == "lt":
                    bind_params[param_name] = val
                    conditions.append(col_expr < text(f":{param_name}"))
                elif op == "lte":
                    bind_params[param_name] = val
                    conditions.append(col_expr <= text(f":{param_name}"))
                elif op == "like":
                    bind_params[param_name] = f"%{val}%"
                    conditions.append(col_expr.like(text(f":{param_name}")))
                elif op == "in" and isinstance(val, list):
                    conditions.append(col_expr.in_(val))
                elif op == "between" and isinstance(val, list) and len(val) == 2:
                    p1, p2 = f"fp_{param_idx}", f"fp_{param_idx+1}"
                    param_idx += 2
                    bind_params[p1] = val[0]
                    bind_params[p2] = val[1]
                    conditions.append(col_expr.between(text(f":{p1}"), text(f":{p2}")))
        else:
            # Simple equality
            param_name = f"fp_{param_idx}"
            param_idx += 1
            bind_params[param_name] = filter_val
            conditions.append(col_expr == text(f":{param_name}"))
    return conditions


class QueryEngine:
    def execute(
        self,
        dataset: Dataset,
        data_source: DataSource,
        selected_field_names: List[str],
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> QueryResult:
        start_time = time.time()

        # Build lookup of valid fields
        allowed_fields: Dict[str, DatasetField] = {
            f.source_column: f for f in dataset.fields
        }
        # Also allow lookup by business_name
        business_lookup: Dict[str, DatasetField] = {
            f.business_name: f for f in dataset.fields
        }
        # Merge: prefer source_column keys
        all_field_lookup = {**business_lookup, **allowed_fields}

        # Validate requested fields
        resolved_fields: List[DatasetField] = []
        for fname in selected_field_names:
            if fname not in all_field_lookup:
                raise ValueError(f"Field '{fname}' not found in dataset '{dataset.name}'")
            resolved_fields.append(all_field_lookup[fname])

        effective_limit = min(limit or settings.MAX_QUERY_ROWS, settings.MAX_QUERY_ROWS)
        filters = filters or {}

        engine = _build_source_engine(data_source)
        try:
            if dataset.source_type == SourceType.query:
                # Raw SQL dataset - wrap in subquery
                raw_sql = dataset.source_config.get("sql", "")
                if not raw_sql:
                    raise ValueError("Dataset has no SQL configured")
                result = self._execute_raw_sql_dataset(
                    engine, raw_sql, resolved_fields, filters, effective_limit, all_field_lookup
                )
            else:
                result = self._execute_table_dataset(
                    engine, dataset, data_source, resolved_fields, filters, effective_limit, all_field_lookup
                )
        finally:
            engine.dispose()

        elapsed_ms = int((time.time() - start_time) * 1000)
        result.execution_time_ms = elapsed_ms
        logger.info(
            "query_executed",
            dataset_id=dataset.id,
            row_count=result.row_count,
            execution_time_ms=elapsed_ms,
        )
        return result

    def _execute_table_dataset(
        self,
        engine: Engine,
        dataset: Dataset,
        data_source: DataSource,
        resolved_fields: List[DatasetField],
        filters: Dict[str, Any],
        limit: int,
        all_field_lookup: Dict[str, DatasetField],
    ) -> QueryResult:
        source_config = dataset.source_config or {}
        schema = data_source.schema_name or source_config.get("schema")
        table_name = source_config.get("table", "")

        if not table_name:
            raise ValueError("Dataset source config missing 'table'")

        # Build SQLAlchemy table reference (no user input in name - validated above)
        source_table = table(table_name, *[column(f.source_column) for f in dataset.fields], schema=schema)

        # Determine which fields are measures vs dimensions/attributes
        measure_fields = [f for f in resolved_fields if f.aggregation_type not in (AggregationType.none,)]
        group_fields = [f for f in resolved_fields if f.aggregation_type == AggregationType.none]

        # Build SELECT columns
        select_cols = []
        col_labels = []
        for f in resolved_fields:
            col_expr = source_table.c[f.source_column]
            if f.aggregation_type not in (AggregationType.none,):
                agg_expr = _apply_aggregation(f, col_expr)
                select_cols.append(agg_expr.label(f.business_name))
            else:
                select_cols.append(col_expr.label(f.business_name))
            col_labels.append(f.business_name)

        stmt = select(*select_cols)

        # Build WHERE conditions
        bind_params: Dict[str, Any] = {}
        conditions = _build_filter_conditions(filters, all_field_lookup, source_table, bind_params)
        for cond in conditions:
            stmt = stmt.where(cond)

        # GROUP BY if there are aggregated measures
        if measure_fields and group_fields:
            for f in group_fields:
                stmt = stmt.group_by(source_table.c[f.source_column])

        stmt = stmt.limit(limit + 1)  # +1 to detect truncation

        with engine.connect() as conn:
            result_proxy = conn.execute(stmt, bind_params)
            rows_raw = result_proxy.fetchall()

        truncated = len(rows_raw) > limit
        rows_raw = rows_raw[:limit]
        rows = [dict(zip(col_labels, row)) for row in rows_raw]

        return QueryResult(
            columns=col_labels,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=0,
            truncated=truncated,
        )

    def _execute_raw_sql_dataset(
        self,
        engine: Engine,
        raw_sql: str,
        resolved_fields: List[DatasetField],
        filters: Dict[str, Any],
        limit: int,
        all_field_lookup: Dict[str, DatasetField],
    ) -> QueryResult:
        """
        Execute a raw-SQL dataset by wrapping it as a CTE,
        then selecting validated columns from the CTE.
        This ensures no user-supplied filter values flow into SQL strings.
        """
        col_labels = [f.business_name for f in resolved_fields]
        source_cols = [f.source_column for f in resolved_fields]

        # Build: WITH base AS (<raw_sql>) SELECT col1, col2 FROM base WHERE ... LIMIT ?
        # Use text() for the CTE body (dataset author-supplied SQL, not user input)
        # Use parameterised bindings for all filter values
        bind_params: Dict[str, Any] = {}
        where_clauses = []
        param_idx = 0

        for field_key, filter_val in filters.items():
            if field_key not in all_field_lookup:
                continue
            df = all_field_lookup[field_key]
            col_name = df.source_column  # validated from dataset definition

            if isinstance(filter_val, dict):
                for op, val in filter_val.items():
                    param_name = f"wp_{param_idx}"
                    param_idx += 1
                    if op == "eq":
                        bind_params[param_name] = val
                        where_clauses.append(f'base."{col_name}" = :{param_name}')
                    elif op == "gt":
                        bind_params[param_name] = val
                        where_clauses.append(f'base."{col_name}" > :{param_name}')
                    elif op == "gte":
                        bind_params[param_name] = val
                        where_clauses.append(f'base."{col_name}" >= :{param_name}')
                    elif op == "lt":
                        bind_params[param_name] = val
                        where_clauses.append(f'base."{col_name}" < :{param_name}')
                    elif op == "lte":
                        bind_params[param_name] = val
                        where_clauses.append(f'base."{col_name}" <= :{param_name}')
                    elif op == "like":
                        bind_params[param_name] = f"%{val}%"
                        where_clauses.append(f'base."{col_name}" LIKE :{param_name}')
                    elif op == "in" and isinstance(val, list):
                        # Use individual bind params for IN list
                        in_params = []
                        for v in val:
                            p = f"wp_{param_idx}"
                            param_idx += 1
                            bind_params[p] = v
                            in_params.append(f":{p}")
                        where_clauses.append(f'base."{col_name}" IN ({", ".join(in_params)})')
            else:
                param_name = f"wp_{param_idx}"
                param_idx += 1
                bind_params[param_name] = filter_val
                where_clauses.append(f'base."{col_name}" = :{param_name}')

        # Build SELECT list from validated column names only
        select_list = ", ".join(f'base."{c}"' for c in source_cols)
        sql_str = f"WITH base AS ({raw_sql}) SELECT {select_list} FROM base"
        if where_clauses:
            sql_str += " WHERE " + " AND ".join(where_clauses)
        bind_params["_limit"] = limit + 1
        sql_str += " LIMIT :_limit"

        with engine.connect() as conn:
            result_proxy = conn.execute(text(sql_str), bind_params)
            rows_raw = result_proxy.fetchall()

        truncated = len(rows_raw) > limit
        rows_raw = rows_raw[:limit]
        rows = [dict(zip(col_labels, row)) for row in rows_raw]

        return QueryResult(
            columns=col_labels,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=0,
            truncated=truncated,
        )


def recommend_charts(selected_measures: List[DatasetField], selected_dimensions: List[DatasetField]) -> Dict[str, Any]:
    n_measures = len(selected_measures)
    n_dimensions = len(selected_dimensions)
    has_date_dim = any(d.data_type in ("date", "datetime") for d in selected_dimensions)
    has_percentage = any(m.aggregation_type == AggregationType.percentage for m in selected_measures)

    if n_measures == 1 and n_dimensions == 0:
        chart_types = ["kpi_card"]
    elif n_measures == 1 and n_dimensions == 1 and has_date_dim:
        chart_types = ["line_chart", "area_chart", "bar_chart"]
    elif n_measures == 1 and n_dimensions == 1:
        chart_types = ["bar_chart", "pie_chart", "donut_chart"]
    elif n_measures > 1 and n_dimensions == 1:
        chart_types = ["grouped_bar_chart", "line_chart"]
    elif n_measures == 1 and n_dimensions == 2:
        chart_types = ["stacked_bar_chart", "heatmap"]
    elif has_percentage:
        chart_types = ["donut_chart", "gauge_chart"]
    else:
        chart_types = ["bar_chart", "table"]

    return {"chart_types": chart_types, "primary": chart_types[0] if chart_types else "table"}

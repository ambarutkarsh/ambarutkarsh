import time
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text, inspect
from ..models.data_source import DataSource, DbType
from ..core.security import decrypt_credential


def _build_connection_url(ds: DataSource) -> str:
    password = decrypt_credential(ds.encrypted_password)
    if ds.db_type == DbType.postgresql:
        return f"postgresql+psycopg2://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type in (DbType.mysql, DbType.mariadb):
        return f"mysql+pymysql://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == DbType.mssql:
        return (
            f"mssql+pyodbc://{ds.username}:{password}@{ds.host}:{ds.port}/{ds.database_name}"
            f"?driver=ODBC+Driver+17+for+SQL+Server"
        )
    else:
        raise ValueError(f"Unsupported db_type: {ds.db_type}")


def test_connection(ds: DataSource) -> Dict[str, Any]:
    """Test database connection. Returns success/failure with latency."""
    try:
        url = _build_connection_url(ds)
        engine = create_engine(url, connect_args={"connect_timeout": ds.connection_timeout}, pool_size=1, max_overflow=0)
        start = time.time()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = (time.time() - start) * 1000
        engine.dispose()
        return {"success": True, "message": "Connection successful", "latency_ms": round(latency_ms, 2)}
    except Exception as exc:
        return {"success": False, "message": str(exc), "latency_ms": None}


def get_schemas(ds: DataSource) -> List[str]:
    url = _build_connection_url(ds)
    engine = create_engine(url, pool_size=1, max_overflow=0)
    try:
        inspector = inspect(engine)
        schemas = inspector.get_schema_names()
        return schemas
    finally:
        engine.dispose()


def get_tables(ds: DataSource, schema: Optional[str] = None) -> List[Dict[str, str]]:
    url = _build_connection_url(ds)
    engine = create_engine(url, pool_size=1, max_overflow=0)
    try:
        inspector = inspect(engine)
        tables = []
        for t in inspector.get_table_names(schema=schema):
            tables.append({"name": t, "type": "table"})
        for v in inspector.get_view_names(schema=schema):
            tables.append({"name": v, "type": "view"})
        return tables
    finally:
        engine.dispose()


def get_columns(ds: DataSource, table: str, schema: Optional[str] = None) -> List[Dict[str, Any]]:
    url = _build_connection_url(ds)
    engine = create_engine(url, pool_size=1, max_overflow=0)
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table, schema=schema)
        return [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
            }
            for col in columns
        ]
    finally:
        engine.dispose()

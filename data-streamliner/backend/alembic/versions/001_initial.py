"""Initial migration - create all tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("is_superuser", sa.Boolean(), default=False, nullable=False),
        sa.Column("roles", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("last_login", sa.DateTime(timezone=True)),
        sa.Column("failed_login_attempts", sa.Integer(), default=0),
        sa.Column("locked_until", sa.DateTime(timezone=True)),
        sa.Column("force_password_change", sa.Boolean(), default=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    # data_sources
    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.String(1000)),
        sa.Column("db_type", sa.Enum("postgresql","mysql","mssql","oracle","mariadb", name="dbtype"), nullable=False),
        sa.Column("host", sa.String(255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("database_name", sa.String(255), nullable=False),
        sa.Column("schema_name", sa.String(255)),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("encrypted_password", sa.String(1000), nullable=False),
        sa.Column("ssl_mode", sa.String(50), default="disable"),
        sa.Column("connection_timeout", sa.Integer(), default=30),
        sa.Column("query_timeout", sa.Integer(), default=30),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_by", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # datasets
    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("data_source_id", sa.Integer(), sa.ForeignKey("data_sources.id"), nullable=False),
        sa.Column("source_type", sa.Enum("table","view","query","join", name="sourcetype"), nullable=False),
        sa.Column("source_config", sa.JSON()),
        sa.Column("default_filters", sa.JSON()),
        sa.Column("status", sa.Enum("draft","published","deprecated", name="datasetstatus"), nullable=False, default="draft"),
        sa.Column("version", sa.Integer(), default=1),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_datasets_data_source_id", "datasets", ["data_source_id"])

    # dataset_fields
    op.create_table(
        "dataset_fields",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_column", sa.String(255), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("field_type", sa.Enum("attribute","measure","dimension","calculated", name="fieldtype"), nullable=False),
        sa.Column("data_type", sa.Enum("string","integer","decimal","date","datetime","boolean", name="datatype"), nullable=False),
        sa.Column("aggregation_type", sa.Enum("none","count","count_distinct","sum","avg","min","max","percentage","ratio", name="aggregationtype"), nullable=False),
        sa.Column("formula", sa.Text()),
        sa.Column("format_string", sa.String(100)),
        sa.Column("decimal_places", sa.Integer(), default=2),
        sa.Column("is_visible", sa.Boolean(), default=True),
        sa.Column("is_filterable", sa.Boolean(), default=True),
        sa.Column("is_exportable", sa.Boolean(), default=True),
        sa.Column("is_pii", sa.Boolean(), default=False),
        sa.Column("sort_order", sa.Integer(), default=0),
    )
    op.create_index("ix_dataset_fields_dataset_id", "dataset_fields", ["dataset_id"])

    # semantic_layers
    op.create_table(
        "semantic_layers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id"), nullable=False),
        sa.Column("mappings", sa.JSON()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # reports
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id"), nullable=False),
        sa.Column("config", sa.JSON()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_public", sa.Boolean(), default=False),
        sa.Column("allowed_roles", sa.JSON()),
    )

    # report_executions
    op.create_table(
        "report_executions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("executed_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("execution_time_ms", sa.BigInteger()),
        sa.Column("row_count", sa.Integer()),
        sa.Column("filters_applied", sa.JSON()),
        sa.Column("status", sa.Enum("success","failed", name="executionstatus"), nullable=False),
        sa.Column("error_message", sa.Text()),
    )
    op.create_index("ix_report_executions_report_id", "report_executions", ["report_id"])

    # dashboards
    op.create_table(
        "dashboards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("layout", sa.JSON()),
        sa.Column("filters", sa.JSON()),
        sa.Column("status", sa.Enum("draft","published", name="dashboardstatus"), nullable=False, default="draft"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("allowed_roles", sa.JSON()),
    )

    # dashboard_widgets
    op.create_table(
        "dashboard_widgets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dashboard_id", sa.Integer(), sa.ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("reports.id")),
        sa.Column("position", sa.JSON()),
        sa.Column("title", sa.String(255)),
        sa.Column("widget_type", sa.String(100), default="chart"),
    )

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", sa.Integer()),
        sa.Column("username", sa.String(255)),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("object_type", sa.String(100)),
        sa.Column("object_id", sa.String(255)),
        sa.Column("previous_value", sa.JSON()),
        sa.Column("new_value", sa.JSON()),
        sa.Column("ip_address", sa.String(50)),
        sa.Column("status", sa.String(50), default="success"),
        sa.Column("description", sa.Text()),
    )
    op.create_index("ix_audit_logs_event_timestamp", "audit_logs", ["event_timestamp"])
    op.create_index("ix_audit_logs_event_type", "audit_logs", ["event_type"])
    op.create_index("ix_audit_logs_object_type", "audit_logs", ["object_type"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("dashboard_widgets")
    op.drop_table("dashboards")
    op.drop_table("report_executions")
    op.drop_table("reports")
    op.drop_table("semantic_layers")
    op.drop_table("dataset_fields")
    op.drop_table("datasets")
    op.drop_table("data_sources")
    op.drop_table("users")

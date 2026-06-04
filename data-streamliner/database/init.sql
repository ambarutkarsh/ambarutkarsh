-- Data Streamliner Configuration Database
-- This script initialises the schema. Alembic manages ongoing migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    roles JSONB DEFAULT '[]',
    force_password_change BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    db_type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(255),
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    ssl_mode VARCHAR(50),
    connection_timeout INTEGER DEFAULT 10,
    query_timeout INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Datasets
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source_id INTEGER REFERENCES data_sources(id) NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'table',
    source_config JSONB DEFAULT '{}',
    default_filters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_data_source ON datasets(data_source_id);

-- Dataset Fields (attributes, measures, dimensions)
CREATE TABLE IF NOT EXISTS dataset_fields (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
    source_column VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    description TEXT,
    field_type VARCHAR(50) NOT NULL DEFAULT 'attribute',
    data_type VARCHAR(50) NOT NULL DEFAULT 'string',
    aggregation_type VARCHAR(50) DEFAULT 'none',
    formula TEXT,
    format_string VARCHAR(100),
    decimal_places INTEGER DEFAULT 2,
    is_visible BOOLEAN DEFAULT TRUE,
    is_filterable BOOLEAN DEFAULT TRUE,
    is_exportable BOOLEAN DEFAULT TRUE,
    is_pii BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dataset_fields_dataset ON dataset_fields(dataset_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_id INTEGER REFERENCES datasets(id) NOT NULL,
    config JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    allowed_roles JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_dataset ON reports(dataset_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);

-- Report Executions
CREATE TABLE IF NOT EXISTS report_executions (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    executed_by INTEGER REFERENCES users(id),
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_time_ms INTEGER,
    row_count INTEGER,
    filters_applied JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT
);

-- Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id),
    allowed_roles JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard Widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id SERIAL PRIMARY KEY,
    dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    report_id INTEGER REFERENCES reports(id),
    position JSONB DEFAULT '{"x":0,"y":0,"w":6,"h":4}',
    title VARCHAR(255),
    widget_type VARCHAR(50) DEFAULT 'chart'
);

CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON dashboard_widgets(dashboard_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    object_type VARCHAR(100),
    object_id VARCHAR(100),
    previous_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'success',
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);

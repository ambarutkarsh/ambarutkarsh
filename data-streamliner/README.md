# Data Streamliner

Self-hosted analytics platform for Star Health Insurance. Connect to internal databases, define business metrics, and generate governed dashboards — no internet required.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Access to your source database from this host

### Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:
   - `CONFIG_DB_PASSWORD` — strong password for the config database
   - `SECRET_KEY` — random 64-char hex string (`python -c "import secrets; print(secrets.token_hex(32))"`)
   - `ENCRYPTION_KEY` — random 32-char key (`python -c "import secrets; print(secrets.token_hex(16))"`)

3. Start all services:
   ```bash
   docker compose up -d
   ```

4. Open your browser at `http://localhost:3000`

5. Log in with default credentials:
   - Username: `admin`
   - Password: `Admin@123`
   - **Change the password immediately after first login.**

### Services

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000       |
| Backend  | http://localhost:8000       |
| API Docs | http://localhost:8000/docs  |

## Architecture

```
Browser → Frontend (React + Nginx :3000)
              ↓
          Backend (FastAPI :8000)
              ↓
    ┌─────────────────────┐
    │  Config DB          │  Source Databases (read-only)
    │  (PostgreSQL)       │  PostgreSQL / MySQL / SQL Server
    │  Redis Cache        │
    └─────────────────────┘
```

## User Roles

| Role               | Access                                      |
|--------------------|---------------------------------------------|
| admin              | Full system access, user and source mgmt    |
| data_admin         | Create and manage datasets, fields          |
| report_creator     | Build reports and dashboards                |
| viewer             | View published dashboards                   |
| auditor            | View audit logs                             |

## Default Renewal Analytics Setup

After login, configure Star Health renewal analytics:

1. **Admin → Data Sources** — add your renewal database connection
2. **Datasets → New Dataset** — select the policy/renewal table or view
3. Map columns:
   - `policy_no` → Policy Number (attribute)
   - `policy_end_dt` → Policy End Date (dimension, date)
   - `renewal_count` → Renewal Count (dimension, integer)
   - `renewal_status` → Renewal Status (dimension, string)
   - `premium_due` → Premium Due (measure, sum)
   - `premium_renewed` → Premium Renewed (measure, sum)
4. Add calculated dimension: Renewal Vintage (R1/R2/R3/R4+)
5. Publish the dataset
6. **Reports → New Report** — select measures and dimensions
7. **Dashboards → New Dashboard** — add report widgets

## Stopping

```bash
docker compose down
```

Data is persisted in Docker volumes. To also remove data:
```bash
docker compose down -v
```

## Upgrading

```bash
docker compose pull
docker compose up -d
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Apache ECharts, AG Grid Community, Material UI
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0
- **Config DB**: PostgreSQL 16
- **Cache**: Redis 7
- **Deployment**: Docker Compose / Kubernetes (Helm)

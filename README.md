# AD Management

AD Management is a self-hosted Active Directory monitoring and audit console for day-to-day administrators. It combines LDAP state snapshots, domain controller event collection, compliance reporting, and an operational dashboard into a single deployable platform.

The current product scope is strictly Active Directory. The console does not target Azure AD or Entra ID in this release.

## What It Does

- Monitors AD administrative changes such as create, modify, and delete activity
- Collects authentication evidence including logons, failures, lockouts, and logoffs
- Tracks stale users, stale computers, privileged group exposure, and password policy exceptions
- Provides a web dashboard, filtered reports, CSV export, HTML/PDF reporting, and first-run onboarding
- Supports repeatable deployment with Docker Compose for Ubuntu or Windows-based host environments

## Core Features

- `FastAPI` backend for APIs, collectors, scheduling, and reporting
- `Next.js` frontend for dashboards, configuration, reports, and onboarding
- `PostgreSQL` for persistence
- Optional `Redis` for cache and scheduler support
- `LDAP/LDAPS` collector for directory state and compliance posture
- `WinRM` collectors for AD change activity and authentication event ingestion

## Product Structure

```text
admanagement/
  api/
  collectors/
  core/
  db/
  models/
  reports/
  services/
  templates/
  cli.py
frontend/
  app/
  components/
  lib/
scripts/
tests/
docker-compose.prod.yml
Dockerfile.backend
README.md
requirements.txt
Start-Dev.ps1
Stop-Dev.ps1
```

## Deployment Options

### Recommended: Docker Compose

This is the intended distribution path for IT teams.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:

- `postgres`
- `redis`
- `backend`
- `frontend`

Default URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Onboarding: `http://localhost:3000/onboarding`

### Ubuntu Bootstrap

An Ubuntu helper is included:

```bash
./scripts/install-ubuntu.sh
```

Use this when preparing a dedicated Linux host for the product. Docker and the Docker Compose plugin should already be present unless your internal packaging process installs them separately.

### Local Development

1. Create a Python 3.10+ virtual environment
2. Install backend requirements
3. Install frontend dependencies
4. Copy `.env.example` to `.env`
5. Start the API and frontend

Backend:

```bash
pip install -r requirements.txt
uvicorn admanagement.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

On Windows, from the repository root:

```powershell
.\Start-Dev.ps1
```

## First-Run Onboarding

The system is designed to onboard a new environment through the web UI before regular monitoring starts.

Open:

- `http://localhost:3000/onboarding`

The onboarding flow captures:

- monitored domain name and FQDN
- LDAP server and base DN
- LDAP bind DN and password
- domain controller targets
- WinRM username, domain, password, auth type, port, and SSL mode
- business hours and working days

Until onboarding is completed, the frontend redirects `/` to `/onboarding`.

Setup endpoints:

- `GET /api/setup/status`
- `POST /api/setup/test-ldap`
- `POST /api/setup/test-winrm`
- `POST /api/setup/bootstrap`

## Required Environment Settings

Start from `.env.example` and update the values for your environment.

Typical areas you will configure:

- database connection
- Redis connection
- LDAP server, bind DN, and base DN
- WinRM defaults
- scheduler intervals
- report output path

Do not commit `.env` to source control.

## CLI Operations

Initialize the database schema:

```bash
python -m admanagement.cli init-db
```

Test LDAP connectivity:

```bash
python -m admanagement.cli ldap-check
```

Create a directory snapshot:

```bash
python -m admanagement.cli ldap-snapshot
```

List recent snapshot runs:

```bash
python -m admanagement.cli snapshot-runs
```

Summarize the latest snapshot:

```bash
python -m admanagement.cli snapshot-summary
```

Compare two snapshot runs:

```bash
python -m admanagement.cli snapshot-drift --baseline-run-id <RUN_ID> --target-run-id <RUN_ID>
```

Inspect the AD change ingestor:

```bash
python -m admanagement.cli ingest-check
```

Run the AD change ingestor:

```bash
python -m admanagement.cli ingest-run
```

Run a wider ad hoc poll without checkpoints:

```bash
python -m admanagement.cli ingest-run --window-minutes 15 --ignore-checkpoints
```

Inspect the authentication/logon ingestor:

```bash
python -m admanagement.cli logon-check
```

Run the authentication/logon ingestor:

```bash
python -m admanagement.cli logon-run
```

Summarize stored authentication activity:

```bash
python -m admanagement.cli logon-summary
```

## Web Console

Primary views available in the frontend:

- Overview dashboard
- AD Changes
- Compliance
- Reports
- Configuration

Key operational pages:

- administrative user actions
- logon and local logon-logoff reports
- privileged group exposure
- stale object and password exception reporting
- monitored domain and domain controller configuration
- business hours, excluded accounts, alert rules, and audit policy expectations

## Scheduling

Background jobs start with the API when scheduler support is enabled.

Relevant settings include:

- `ADMANAGEMENT_SCHEDULER_ENABLED`
- `ADMANAGEMENT_LDAP_SNAPSHOT_INTERVAL_MINUTES`
- `ADMANAGEMENT_ACTIVITY_POLL_INTERVAL_MINUTES`
- `ADMANAGEMENT_LOGON_POLL_INTERVAL_MINUTES`
- `ADMANAGEMENT_EVENT_SKIP_ORIGIN_CORRELATION`

The overview dashboard also exposes a `Run now` action so an administrator can force an immediate pull of recent AD activity and authentication logs without waiting for the next scheduled interval.

## Data Flow

1. LDAP collector snapshots directory state
2. Event collectors ingest AD administrative activity and authentication events from domain controllers
3. Services normalize and correlate the collected evidence
4. The dashboard, reports, and exports render from persisted data


## Operational Notes

- LDAP alone is not sufficient for answering who changed what and from where; that requires Security log collection
- WinRM collection depends on reachable domain controllers and working remoting permissions
- HTML/PDF reporting may require additional system packages on Linux if your reporting stack uses `WeasyPrint`
- The console is designed for administrators and infrastructure teams, not consumer-style single-click desktop distribution

## Current Scope

This repository is currently focused on:

- Active Directory monitoring
- AD administrative change tracking
- authentication activity and failure monitoring
- compliance posture and operational audit readiness

Future scope can be extended, but the current product should be treated as an AD-specific operational console.

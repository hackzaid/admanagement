from __future__ import annotations

import json

import typer

from admanagement.collectors.event_ingestor import EventIngestor
from admanagement.collectors.ldap_collector import LdapCollector
from admanagement.collectors.logon_ingestor import LogonIngestor
from admanagement.core.config import get_settings
from admanagement.db.bootstrap import init_db
from admanagement.services.snapshot_analysis import SnapshotAnalysisService


app = typer.Typer(no_args_is_help=True, pretty_exceptions_show_locals=False)


@app.command("ldap-check")
def ldap_check() -> None:
    settings = get_settings()
    result = LdapCollector(settings).test_connection()
    typer.echo(
        json.dumps(
            {
                "collector": "ldap",
                "run_id": result.run_id,
                "captured_at_utc": result.captured_at_utc,
                "base_dn": result.base_dn,
                "page_size": result.page_size,
                "connected": result.connected,
            },
            indent=2,
        )
    )


@app.command("ldap-snapshot")
def ldap_snapshot() -> None:
    settings = get_settings()
    result = LdapCollector(settings).run_snapshot()
    typer.echo(json.dumps(result, indent=2))


@app.command("snapshot-runs")
def snapshot_runs(limit: int = 10) -> None:
    result = SnapshotAnalysisService().list_runs(limit=limit)
    typer.echo(json.dumps(result, indent=2))


@app.command("snapshot-summary")
def snapshot_summary(
    run_id: str | None = None,
    stale_days: int = 180,
) -> None:
    result = SnapshotAnalysisService().summarize_run(run_id=run_id, stale_days=stale_days)
    typer.echo(json.dumps(result, indent=2))


@app.command("snapshot-drift")
def snapshot_drift(
    baseline_run_id: str = typer.Option(..., "--baseline-run-id"),
    target_run_id: str | None = typer.Option(None, "--target-run-id"),
    stale_days: int = typer.Option(180, "--stale-days"),
) -> None:
    result = SnapshotAnalysisService().compare_runs(
        baseline_run_id=baseline_run_id,
        target_run_id=target_run_id,
        stale_days=stale_days,
    )
    typer.echo(json.dumps(result, indent=2))


@app.command("ingest-check")
def ingest_check() -> None:
    settings = get_settings()
    result = EventIngestor(settings).describe()
    typer.echo(json.dumps(result, indent=2))


@app.command("ingest-run")
def ingest_run(
    window_minutes: int | None = typer.Option(None, "--window-minutes", min=1),
    ignore_checkpoints: bool = typer.Option(False, "--ignore-checkpoints"),
    skip_origin_correlation: bool = typer.Option(False, "--skip-origin-correlation"),
    domain_controller: list[str] | None = typer.Option(None, "--dc"),
) -> None:
    settings = get_settings()
    result = EventIngestor(settings).run(
        window_minutes_override=window_minutes,
        ignore_checkpoints=ignore_checkpoints,
        skip_origin_correlation=skip_origin_correlation,
        domain_controllers=domain_controller,
    )
    typer.echo(json.dumps(result, indent=2))


@app.command("activity-import")
def activity_import(path: str) -> None:
    settings = get_settings()
    result = EventIngestor(settings).import_csv(path=path)
    typer.echo(json.dumps(result, indent=2))


@app.command("activity-summary")
def activity_summary(limit: int = 10) -> None:
    settings = get_settings()
    result = EventIngestor(settings).summary(limit=limit)
    typer.echo(json.dumps(result, indent=2))


@app.command("logon-check")
def logon_check() -> None:
    settings = get_settings()
    result = LogonIngestor(settings).describe()
    typer.echo(json.dumps(result, indent=2))


@app.command("logon-run")
def logon_run(
    window_minutes: int | None = typer.Option(None, "--window-minutes", min=1),
    ignore_checkpoints: bool = typer.Option(False, "--ignore-checkpoints"),
    domain_controller: list[str] | None = typer.Option(None, "--dc"),
) -> None:
    settings = get_settings()
    result = LogonIngestor(settings).run(
        window_minutes_override=window_minutes,
        ignore_checkpoints=ignore_checkpoints,
        domain_controllers=domain_controller,
    )
    typer.echo(json.dumps(result, indent=2))


@app.command("logon-summary")
def logon_summary(limit: int = 10) -> None:
    settings = get_settings()
    result = LogonIngestor(settings).summary(limit=limit)
    typer.echo(json.dumps(result, indent=2))


@app.command("init-db")
def initialize_database() -> None:
    init_db()
    typer.echo("Database schema initialized.")


if __name__ == "__main__":
    app()

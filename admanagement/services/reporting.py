from __future__ import annotations

from pathlib import Path

from weasyprint import HTML

from admanagement.reports.html_report import get_template_environment


class ReportingService:
    def render_activity_report(self, context: dict[str, object], output_html: Path, output_pdf: Path) -> None:
        env = get_template_environment()
        template = env.get_template("activity_report.html")
        html = template.render(**context)
        output_html.write_text(html, encoding="utf-8")
        HTML(string=html).write_pdf(output_pdf)

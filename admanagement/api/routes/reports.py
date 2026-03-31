from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter

from admanagement.services.report_catalog import ReportCatalogService
from admanagement.services.saved_view_service import SavedViewService


router = APIRouter(prefix="/reports", tags=["reports"])


class SavedViewRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    state: dict[str, object]
    view_scope: str = "dashboard"


@router.get("/catalog")
def report_catalog() -> list[dict[str, object]]:
    return ReportCatalogService().list_catalog()


@router.get("/saved")
def saved_reports() -> list[dict[str, object]]:
    return ReportCatalogService().list_saved_reports()


@router.get("/saved-views")
def saved_views(view_scope: str = "dashboard") -> list[dict[str, object]]:
    return SavedViewService().list_views(view_scope=view_scope)


@router.post("/saved-views")
def upsert_saved_view(payload: SavedViewRequest) -> dict[str, object]:
    return SavedViewService().upsert_view(
        name=payload.name,
        state=payload.state,
        view_scope=payload.view_scope,
    )


@router.delete("/saved-views/{item_id}")
def delete_saved_view(item_id: int) -> dict[str, bool]:
    return {"ok": SavedViewService().delete_view(item_id)}

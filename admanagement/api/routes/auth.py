from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from admanagement.core.config import get_settings
from admanagement.services.auth_service import AuthService, AuthenticationError


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _token_from_request(request: Request, authorization: str | None) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    header_token = request.headers.get("x-ad-session", "").strip()
    return header_token


@router.post("/login")
def auth_login(payload: LoginRequest) -> dict[str, object]:
    service = AuthService(get_settings())
    try:
        return service.authenticate(payload.username, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/session")
def auth_session(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, object]:
    service = AuthService(get_settings())
    token = _token_from_request(request, authorization)
    session = service.get_session(token)
    if session is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return session


@router.post("/logout")
def auth_logout(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, bool]:
    service = AuthService(get_settings())
    token = _token_from_request(request, authorization)
    if not token:
        return {"ok": False}
    return {"ok": service.revoke_session(token)}

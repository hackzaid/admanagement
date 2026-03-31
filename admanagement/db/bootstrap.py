from admanagement.db.base import Base
from admanagement.db.session import engine
from admanagement import models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

def _make_engine():
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        # SQLite needs connect_args; no pool sizing
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.APP_ENV == "development",
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=settings.APP_ENV == "development",
    )


engine = _make_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def create_all_tables():
    Base.metadata.create_all(bind=engine)

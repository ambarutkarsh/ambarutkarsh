from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum, func, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.database import Base


class DbType(str, enum.Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    mssql = "mssql"
    oracle = "oracle"
    mariadb = "mariadb"


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    db_type: Mapped[DbType] = mapped_column(SAEnum(DbType), nullable=False)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    database_name: Mapped[str] = mapped_column(String(255), nullable=False)
    schema_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    username: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_password: Mapped[str] = mapped_column(Text, nullable=False)

    ssl_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    connection_timeout: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    query_timeout: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class DbType(str, enum.Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    mssql = "mssql"
    oracle = "oracle"
    mariadb = "mariadb"


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(1000))
    db_type = Column(Enum(DbType), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database_name = Column(String(255), nullable=False)
    schema_name = Column(String(255))
    username = Column(String(255), nullable=False)
    encrypted_password = Column(String(1000), nullable=False)
    ssl_mode = Column(String(50), default="disable")
    connection_timeout = Column(Integer, default=30)
    query_timeout = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

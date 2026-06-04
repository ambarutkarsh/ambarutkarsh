from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum, func, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class SourceType(str, enum.Enum):
    table = "table"
    view = "view"
    query = "query"
    join = "join"


class DatasetStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    deprecated = "deprecated"


class FieldType(str, enum.Enum):
    attribute = "attribute"
    measure = "measure"
    dimension = "dimension"
    calculated = "calculated"


class DataType(str, enum.Enum):
    string = "string"
    integer = "integer"
    decimal = "decimal"
    date = "date"
    datetime = "datetime"
    boolean = "boolean"


class AggregationType(str, enum.Enum):
    none = "none"
    count = "count"
    count_distinct = "count_distinct"
    sum = "sum"
    avg = "avg"
    min = "min"
    max = "max"
    percentage = "percentage"
    ratio = "ratio"


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    data_source_id: Mapped[int] = mapped_column(Integer, ForeignKey("data_sources.id"), nullable=False)
    source_type: Mapped[SourceType] = mapped_column(SAEnum(SourceType), nullable=False)
    source_config: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    default_filters: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    status: Mapped[DatasetStatus] = mapped_column(SAEnum(DatasetStatus), default=DatasetStatus.draft, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    fields = relationship("DatasetField", back_populates="dataset", cascade="all, delete-orphan")
    data_source = relationship("DataSource", foreign_keys=[data_source_id])


class DatasetField(Base):
    __tablename__ = "dataset_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dataset_id: Mapped[int] = mapped_column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)

    source_column: Mapped[str] = mapped_column(String(255), nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    field_type: Mapped[FieldType] = mapped_column(SAEnum(FieldType), nullable=False)
    data_type: Mapped[DataType] = mapped_column(SAEnum(DataType), nullable=False)
    aggregation_type: Mapped[AggregationType] = mapped_column(
        SAEnum(AggregationType), default=AggregationType.none, nullable=False
    )
    formula: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    format_string: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    decimal_places: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_exportable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_pii: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    dataset = relationship("Dataset", back_populates="fields")

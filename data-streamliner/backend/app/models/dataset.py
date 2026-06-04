from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Enum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


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

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    source_type = Column(Enum(SourceType), nullable=False, default=SourceType.table)
    source_config = Column(JSON)  # tables, joins, or raw SQL
    default_filters = Column(JSON, default=dict)
    status = Column(Enum(DatasetStatus), nullable=False, default=DatasetStatus.draft)
    version = Column(Integer, default=1)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

    fields = relationship("DatasetField", back_populates="dataset", cascade="all, delete-orphan")
    data_source = relationship("DataSource", foreign_keys=[data_source_id])


class DatasetField(Base):
    __tablename__ = "dataset_fields"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    source_column = Column(String(255), nullable=False)
    business_name = Column(String(255), nullable=False)
    description = Column(String(500))
    field_type = Column(Enum(FieldType), nullable=False, default=FieldType.attribute)
    data_type = Column(Enum(DataType), nullable=False, default=DataType.string)
    aggregation_type = Column(Enum(AggregationType), nullable=False, default=AggregationType.none)
    formula = Column(Text, nullable=True)
    format_string = Column(String(100))
    decimal_places = Column(Integer, default=2)
    is_visible = Column(Boolean, default=True)
    is_filterable = Column(Boolean, default=True)
    is_exportable = Column(Boolean, default=True)
    is_pii = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    dataset = relationship("Dataset", back_populates="fields")

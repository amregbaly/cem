from datetime import datetime
from typing import Any, Dict
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative Base with standard dictionary representation and audit metadata."""

    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance attributes to a dictionary suitable for JSON serialization and audit diffs."""
        result = {}
        for column in self.__table__.columns:
            val = getattr(self, column.name, None)
            if isinstance(val, datetime):
                result[column.name] = val.isoformat()
            else:
                result[column.name] = val
        return result


class TimestampMixin:
    """Standard created_at and updated_at timestamps."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

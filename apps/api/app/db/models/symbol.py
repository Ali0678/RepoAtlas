from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Identified


class Symbol(Identified, Base):
    __tablename__ = "symbols"
    __table_args__ = (
        Index("ix_symbols_file_id", "file_id"),
        Index("ix_symbols_name", "name"),
        CheckConstraint(
            "start_line >= 1 AND end_line >= start_line",
            name="ck_symbols_line_range",
        ),
    )

    file_id: Mapped[UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    name: Mapped[str]
    kind: Mapped[str]
    start_line: Mapped[int]
    end_line: Mapped[int]
    signature: Mapped[str | None] = mapped_column(Text)

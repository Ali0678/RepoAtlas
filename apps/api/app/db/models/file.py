from uuid import UUID

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Identified


class File(Identified, Base):
    __tablename__ = "files"
    __table_args__ = (
        UniqueConstraint("analysis_id", "path", name="uq_files_analysis_path"),
        UniqueConstraint("analysis_id", "id", name="uq_files_analysis_id"),
        CheckConstraint("size_bytes >= 0", name="ck_files_size_bytes"),
    )

    analysis_id: Mapped[UUID] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"))
    path: Mapped[str] = mapped_column(Text)
    language: Mapped[str]
    loc: Mapped[int | None]
    complexity: Mapped[int | None]
    churn: Mapped[int | None]
    cluster: Mapped[str | None]
    size_bytes: Mapped[int] = mapped_column(BigInteger)

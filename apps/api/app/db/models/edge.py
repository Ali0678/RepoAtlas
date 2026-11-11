from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Identified


class Edge(Identified, Base):
    __tablename__ = "edges"
    __table_args__ = (
        ForeignKeyConstraint(
            ["analysis_id", "source_file_id"],
            ["files.analysis_id", "files.id"],
            name="fk_edges_source_file",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["analysis_id", "target_file_id"],
            ["files.analysis_id", "files.id"],
            name="fk_edges_target_file",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "analysis_id",
            "source_file_id",
            "target_file_id",
            "kind",
            name="uq_edges_analysis_source_target_kind",
        ),
        Index("ix_edges_analysis_source", "analysis_id", "source_file_id"),
        Index("ix_edges_analysis_target", "analysis_id", "target_file_id"),
        CheckConstraint("weight >= 1", name="ck_edges_weight"),
    )

    analysis_id: Mapped[UUID]
    source_file_id: Mapped[UUID]
    target_file_id: Mapped[UUID]
    kind: Mapped[str] = mapped_column(server_default="import")
    weight: Mapped[int] = mapped_column(server_default="1")

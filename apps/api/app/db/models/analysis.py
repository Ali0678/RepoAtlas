from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAt, Identified


class Analysis(Identified, CreatedAt, Base):
    __tablename__ = "analyses"
    __table_args__ = (UniqueConstraint("repo_id", "commit_sha", name="uq_analyses_repo_commit"),)

    repo_id: Mapped[UUID] = mapped_column(ForeignKey("repos.id", ondelete="CASCADE"))
    commit_sha: Mapped[str]
    status: Mapped[str] = mapped_column(server_default="queued")
    stage: Mapped[str] = mapped_column(server_default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    stats: Mapped[dict[str, object]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

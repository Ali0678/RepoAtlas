from sqlalchemy import Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAt, Identified


class Repo(Identified, CreatedAt, Base):
    __tablename__ = "repos"
    __table_args__ = (UniqueConstraint("owner", "name", name="uq_repos_owner_name"),)

    owner: Mapped[str]
    name: Mapped[str]
    url: Mapped[str] = mapped_column(Text)

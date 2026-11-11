from sqlalchemy import BigInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAt, Identified


class User(Identified, CreatedAt, Base):
    __tablename__ = "users"
    github_id: Mapped[int] = mapped_column(BigInteger, unique=True)
    login: Mapped[str]
    avatar_url: Mapped[str | None] = mapped_column(Text)

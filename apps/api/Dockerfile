FROM python:3.14-slim-trixie

COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /srv/repoatlas/apps/api

COPY pyproject.toml uv.lock ./

RUN uv sync --locked --no-dev --no-cache

RUN useradd --create-home --uid 10001 appuser

COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
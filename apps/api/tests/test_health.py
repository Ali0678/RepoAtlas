from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


async def test_health_returns_ok(application: FastAPI) -> None:
    transport = ASGITransport(app=application)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"] == "application/json"

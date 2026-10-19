from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import health, playground
from app.core.db import engine
from app.core.redis import redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await redis_client.aclose()
    await engine.dispose()


app = FastAPI(
    title="learn-mall",
    version="0.1.0",
    description="商城 + ERP 全栈课程工作区",
    lifespan=lifespan,
)

app.include_router(health.router, tags=["system"])
app.include_router(playground.router, prefix="/playground", tags=["playground"])

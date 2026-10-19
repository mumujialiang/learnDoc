import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.redis import redis_client

router = APIRouter()


@router.get("/health/live", summary="进程存活探针")
async def liveness() -> dict[str, str]:
    """只证明进程还在跑，不查任何外部依赖。

    用途：容器是否该重启。
    如果这里查数据库，数据库抖一下所有容器就被同时重启，故障被放大。
    """
    return {"status": "ok"}


async def _check_db(session: AsyncSession) -> str:
    try:
        await asyncio.wait_for(session.execute(text("select 1")), settings.health_timeout)
        return "ok"
    except Exception as exc:  # noqa: BLE001
        return f"down: {type(exc).__name__}"


async def _check_redis() -> str:
    try:
        await asyncio.wait_for(redis_client.ping(), settings.health_timeout)
        return "ok"
    except Exception as exc:  # noqa: BLE001
        return f"down: {type(exc).__name__}"


@router.get("/health", summary="就绪探针：db + redis 连通性")
async def readiness(session: AsyncSession = Depends(get_db)):
    """证明本实例可以接收流量。

    用途：负载均衡 / K8s 摘流量。
    依赖不可用返回 503 而不是 500 —— 500 会被当成代码 bug 触发告警，
    503 才是"我暂时不可用"。
    """
    # 两个检查并发执行，总耗时不超过单个超时，
    # 否则 db 慢 + redis 慢会叠加成 2 倍超时。
    db_result, redis_result = await asyncio.gather(_check_db(session), _check_redis())
    checks = {"db": db_result, "redis": redis_result}

    healthy = all(v == "ok" for v in checks.values())
    return JSONResponse(checks, status_code=200 if healthy else 503)

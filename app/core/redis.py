import redis.asyncio as aioredis

from app.core.config import settings

redis_client: aioredis.Redis = aioredis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    # 必须显式设置超时。redis-py 默认没有连接超时，
    # 网络不可达时会一直挂起，把调用方（包括探针）一起拖死。
    socket_connect_timeout=2.0,
    socket_timeout=2.0,
    health_check_interval=30,
)

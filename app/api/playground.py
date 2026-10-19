"""教学用接口，只用于破坏性验证，不要出现在生产代码里。

M0-02 用它演示两件事：
1. 事务里做慢操作 → 连接被长期占用
2. 事务里调外部 HTTP → 外部服务失败导致数据库回滚

两种数据库的"睡一会儿"写法不同，这里按方言分流 ——
这是少数几个真的需要分支的地方。
"""

import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db

router = APIRouter()


@router.get("/slow-tx", summary="事务内慢操作：观察连接与锁")
async def slow_tx(seconds: float = 10, session: AsyncSession = Depends(get_db)):
    """在事务中 sleep。并发打这个接口，可以观察到：

    - PostgreSQL：`pg_stat_activity` 里堆积 state='idle in transaction'
    - SQL Server：`sys.dm_exec_requests` 里出现 blocking_session_id，其他请求被卡住
    """
    await session.execute(text("select 1"))
    await asyncio.sleep(seconds)
    return {
        "slept": seconds,
        "backend": settings.db_backend,
        "hint": "PostgreSQL 看 idle in transaction；SQL Server 看 blocking_session_id",
    }


@router.get("/long-tx", summary="事务内长任务：连接池被打满")
async def long_tx(seconds: float = 30, session: AsyncSession = Depends(get_db)):
    secs = max(0, min(int(seconds), 120))

    if settings.db_backend == "mssql":
        # WAITFOR DELAY 不接受参数绑定，只能拼字面量。
        # 上面已把范围限制在 0~120，不存在注入。
        await session.execute(text(f"WAITFOR DELAY '00:00:{secs:02d}'"))
    else:
        await session.execute(text("select pg_sleep(:s)"), {"s": secs})

    return {"slept": secs, "backend": settings.db_backend}

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
    echo=False,
)

# expire_on_commit=False：commit 之后对象属性不失效。
# 默认值 True 会在访问属性时触发隐式 SELECT，
# 在 async 会话中直接抛 MissingGreenlet —— 这是新人第一大坑。
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """请求级会话：一个 HTTP 请求 = 一个事务。

    提交放在 yield 之后的 else 分支，含义是
    「路由正常返回才提交，抛异常就回滚」。
    路由内部只 flush，不 commit。
    """
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        else:
            if settings.tx_auto_commit:
                await session.commit()

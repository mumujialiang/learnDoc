from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "learn-mall"
    debug: bool = True

    # 用 127.0.0.1 而不是 localhost：
    # Windows 上 localhost 常优先解析为 ::1，Docker Desktop 的 IPv6 端口映射
    # 有时不通，表现为连接长时间挂起而不是立刻失败。
    database_url: str = "postgresql+asyncpg://mall:mall@127.0.0.1:5432/mall"
    redis_url: str = "redis://127.0.0.1:6379/0"

    # 连接池上限。PG 默认 max_connections=100，
    # 多实例部署时（实例数 × (pool+overflow)）必须小于它，否则会打满。
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # 依赖层是否自动提交事务。M0-02 的核心开关。
    tx_auto_commit: bool = True

    # 探针超时。依赖挂起时探针必须快速失败，
    # 否则探针自己会被拖死，负载均衡既摘不掉流量也判不了死。
    health_timeout: float = 2.0

    @property
    def db_backend(self) -> str:
        """当前连的是哪种库。

        绝大多数代码不需要这个分支 —— SQLAlchemy 会把方言差异吃掉。
        只有监控 SQL、锁语句这类真的和库绑死的地方才用。
        """
        return "mssql" if self.database_url.startswith("mssql") else "postgresql"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

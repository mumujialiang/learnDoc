"""M0-01 / M0-02 验证脚本。

用法（先启动 uvicorn）：
    python scripts/smoke.py health
    python scripts/smoke.py inspect -r 10
    python scripts/smoke.py hammer -c 50 -s 10
"""

import argparse
import asyncio
import sys

import httpx
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine

BASE_URL = "http://127.0.0.1:8000"


async def cmd_health() -> int:
    failed = 0
    # trust_env=False：跳过系统代理。Windows 上常配了全局代理，
    # 不关会导致请求 127.0.0.1 也被转发出去，返回 502。
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10, trust_env=False) as client:
        for path, expect in (("/health/live", 200), ("/health", 200)):
            try:
                resp = await client.get(path)
            except httpx.ConnectError:
                print(f"[FAIL] {path} 连接失败，uvicorn 起了吗？")
                failed += 1
                continue
            ok = resp.status_code == expect
            flag = "OK  " if ok else "FAIL"
            print(f"[{flag}] {path:14} {resp.status_code} {resp.text}")
            failed += 0 if ok else 1
    return failed


async def cmd_hammer(concurrency: int = 50, seconds: int = 10) -> int:
    """并发打事务内慢接口，用于观察连接占用。"""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=120, trust_env=False) as client:
        tasks = [
            client.get("/playground/slow-tx", params={"seconds": seconds})
            for _ in range(concurrency)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    errors = [r for r in results if isinstance(r, Exception)]
    ok = sum(1 for r in results if isinstance(r, httpx.Response) and r.status_code == 200)
    print(f"并发 {concurrency} 次，耗时约 {seconds}s")
    print(f"  成功 {ok} / 异常 {len(errors)}")
    for err in errors[:3]:
        print(f"  - {type(err).__name__}: {err}")
    return 0 if not errors else 1


async def cmd_inspect(rounds: int = 6, interval: float = 2.0) -> int:
    """观察数据库连接与阻塞状态。

    两种库的可观测口径完全不同：
    - PostgreSQL 是 MVCC，慢事务表现为 `idle in transaction` 堆积
    - SQL Server 默认锁读，慢事务表现为别的请求被 `blocking_session_id` 卡住
    """
    backend = settings.db_backend
    print(f"backend = {backend}")

    try:
        await _inspect_loop(backend, rounds, interval)
    finally:
        # 脚本退出前必须释放连接池，
        # 否则 pyodbc 会打印 "Unclosed connection" 并留下悬空句柄
        await engine.dispose()

    return 0


async def _inspect_loop(backend: str, rounds: int, interval: float) -> None:
    async with engine.connect() as conn:
        for i in range(rounds):
            if backend == "mssql":
                result = await conn.execute(
                    text(
                        """
                        select
                          count(*) as sessions,
                          sum(case when s.open_transaction_count > 0
                                    and s.status = 'sleeping' then 1 else 0 end) as idle_tx,
                          sum(case when r.blocking_session_id <> 0 then 1 else 0 end) as blocked
                        from sys.dm_exec_sessions s
                        left join sys.dm_exec_requests r on r.session_id = s.session_id
                        where s.is_user_process = 1
                        """
                    )
                )
                row = result.mappings().first()
                print(
                    f"[{i + 1}/{rounds}] 会话={row['sessions']} "
                    f"空闲事务={row['idle_tx'] or 0} 被阻塞={row['blocked'] or 0}"
                )
            else:
                result = await conn.execute(
                    text(
                        """
                        select coalesce(state, 'unknown') as state, count(*) as n
                        from pg_stat_activity
                        where datname = current_database() and pid <> pg_backend_pid()
                        group by state
                        order by n desc
                        """
                    )
                )
                rows = result.mappings().all()
                detail = ", ".join(f"{r['state']}={r['n']}" for r in rows) or "无连接"
                print(f"[{i + 1}/{rounds}] {detail}")

            if i < rounds - 1:
                await asyncio.sleep(interval)


def main() -> int:
    parser = argparse.ArgumentParser(description="M0 冒烟与破坏性验证")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("health", help="检查 /health/live 与 /health")

    p_hammer = sub.add_parser("hammer", help="并发打事务内慢接口")
    p_hammer.add_argument("-c", "--concurrency", type=int, default=50)
    p_hammer.add_argument("-s", "--seconds", type=int, default=10)

    p_inspect = sub.add_parser("inspect", help="观察连接与阻塞状态")
    p_inspect.add_argument("-r", "--rounds", type=int, default=6)

    args = parser.parse_args()
    if args.cmd == "health":
        return asyncio.run(cmd_health())
    if args.cmd == "hammer":
        return asyncio.run(cmd_hammer(args.concurrency, args.seconds))
    return asyncio.run(cmd_inspect(args.rounds))


if __name__ == "__main__":
    sys.exit(main())

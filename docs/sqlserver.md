# SQL Server 对照手册

公司用 SQL Server，但这套课按 PostgreSQL 讲原理。
两份都留着 —— 原理在哪都一样，语法和锁模型不一样。

本文只记**真的会踩到的差异**，不搬文档。

---

## 一、切换步骤

```powershell
# 1. 起 SQL Server（默认 profile 不会启动它）
docker compose --profile mssql up -d

# 2. 装 ODBC 驱动（Windows 上必须）
#    下载 "ODBC Driver 18 for SQL Server"
#    https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server

# 3. 建库（容器只带 master/msdb 这些系统库，没有业务库）
docker exec mall-mssql /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P 'Mall@Passw0rd' -C `
  -Q "if db_id('mall') is null create database mall;"

# 4. 装 Python 驱动
pip install -e ".[mssql]"

# 5. 改 .env
DATABASE_URL=mssql+aioodbc://sa:Mall%40Passw0rd@127.0.0.1:1433/mall?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

# 6. 验证
python scripts/smoke.py health
python scripts/smoke.py inspect -r 6
```

两个最常见的启动失败：

1. **密码里的 `@` 没编码** —— 必须写成 `%40`，否则连接串会被截断
2. **驱动名不对** —— 没装 ODBC Driver 18 时，Windows 自带的老驱动叫 `SQL Server`（不带版本号），连接串要改成：

```text
...?driver=SQL+Server&Encrypt=no
```

老驱动能连 SQL Server 2022，只是不支持新版 TLS 参数，所以用 `Encrypt=no` 而不是 `TrustServerCertificate=yes`。

查本机装了哪些驱动：

```powershell
python -c "import pyodbc; print([d for d in pyodbc.drivers() if 'SQL Server' in d])"
```

---

## 二、最大的差异：并发模型

这是唯一会改变你**判断方式**的差异，其余都只是语法。

| | PostgreSQL | SQL Server（默认） |
|---|---|---|
| 读操作会不会被写阻塞 | 不会（MVCC 快照） | **会**（共享锁 vs 排他锁） |
| 长事务的危害 | 快照膨胀、vacuum 受阻 | 其他请求直接被卡住 |
| 典型现象 | `idle in transaction` 堆积 | `blocking_session_id` 一片 |

所以同一段代码，两边表现完全不同：

```text
事务里发短信，耗时 3 秒

PostgreSQL：连接被占 3 秒，但其他人照常查数据，只是池子少一个
SQL Server：这张表被锁 3 秒，任何想读它的人全部排队
```

**想让它接近 PostgreSQL 的行为**，开一个数据库选项就行：

```sql
ALTER DATABASE mall SET READ_COMMITTED_SNAPSHOT ON;
```

开了之后，读走行版本（类似 MVCC），不再阻塞写。代价是 tempdb 压力变大。

要不要开，取决于业务：报表多、读多写少的系统，开了体验好很多。

---

## 三、DDL 对照

| PostgreSQL | SQL Server | 备注 |
|---|---|---|
| `bigserial primary key` | `bigint identity(1,1) primary key` | |
| `timestamptz` | `datetimeoffset` | 别用 `datetime`，精度只有 3.33ms |
| `numeric(12,2)` | `decimal(12,2)` | 完全等价，金额都用它 |
| `boolean` | `bit` | |
| `text` | `nvarchar(max)` | |
| `varchar(n)` | `nvarchar(n)` | 含中文一律用 `n` 前缀 |
| `jsonb` | `nvarchar(max)` | 有 JSON 函数，但没有索引能力 |
| `uuid` | `uniqueidentifier` | |
| `default now()` | `default sysdatetimeoffset()` | |

**软删除的唯一索引，两边语法一样**：

```sql
create unique index uq_sku_code on sku (sku_code) where deleted_at is null;
```

这是 SQL Server 的「筛选索引」，和 PG 的部分索引是同一个东西。M1-05 那节不用改。

---

## 四、写法对照

### 插入并拿回自增 ID

```sql
-- PostgreSQL
insert into orders (...) values (...) returning id;

-- SQL Server
insert into orders (...) output inserted.id values (...);
```

### Upsert

```sql
-- PostgreSQL：干净、并发安全
insert into stock (sku_id, qty) values (1, 10)
on conflict (sku_id) do update set qty = stock.qty + excluded.qty;

-- SQL Server：只有 MERGE
merge stock as t
using (select 1 as sku_id, 10 as qty) as s on t.sku_id = s.sku_id
when matched then update set qty = t.qty + s.qty
when not matched then insert (sku_id, qty) values (s.sku_id, s.qty);
```

**MERGE 在并发下有已知的死锁问题**，微软自己的文档也承认。
生产环境的稳妥做法是：唯一索引 + `try/catch` 捕获 2627/2601 错误后重试，而不是迷信 MERGE。

这个坑对 M0-03 幂等那节影响最大 —— 那边讲的"让数据库唯一索引挡住重复"依然成立，只是捕获的异常码不同（PG 是 `23505`，SQL Server 是 `2627`/`2601`）。

### 行锁

```sql
-- PostgreSQL
select * from stock where sku_id = 1 for update;

-- SQL Server
select * from stock with (updlock, rowlock) where sku_id = 1;
```

### 分页

```sql
-- PostgreSQL
select * from orders order by id limit 20 offset 40;

-- SQL Server（必须带 order by）
select * from orders order by id offset 40 rows fetch next 20 rows only;
```

M2-02 讲的游标分页 `where id < :last_id` 两边都能用，而且都更快。

### 其他零碎

| 需求 | PostgreSQL | SQL Server |
|---|---|---|
| 字符串拼接 | `a \|\| b` | `a + b` |
| 当前时间 | `now()` | `sysdatetimeoffset()` |
| 类型转换 | `cast(x as int)` | `cast(x as int)` 或 `convert` |
| 正则 | `~` / `regexp_match` | 无原生支持，要用 `like` 或 CLR |

---

## 五、监控对照

M0-02 的实验脚本 `smoke.py inspect` 已经按方言分流了。手工查的话：

| 想知道 | PostgreSQL | SQL Server |
|---|---|---|
| 当前有多少连接 | `pg_stat_activity` | `sys.dm_exec_sessions` |
| 谁在等锁 | `pg_locks` + `wait_event` | `sys.dm_exec_requests.blocking_session_id` |
| 正在跑什么 SQL | `pg_stat_activity.query` | `sys.dm_exec_requests` join `sys.dm_exec_sql_text` |
| 有没有空闲事务 | `state = 'idle in transaction'` | `open_transaction_count > 0 and status = 'sleeping'` |
| 慢查询历史 | `pg_stat_statements` | Query Store |

查"谁堵住了谁"：

```sql
select
  r.session_id,
  r.blocking_session_id,
  r.wait_type,
  r.wait_time / 1000.0 as wait_sec,
  t.text as sql_text
from sys.dm_exec_requests r
cross apply sys.dm_exec_sql_text(r.sql_handle) t
where r.blocking_session_id <> 0;
```

---

## 六、踩坑清单

按踩到的频率排：

1. **MERGE 并发死锁** —— 用唯一索引 + 捕获 2627 重试，别硬刚
2. **锁升级** —— 单条语句锁超过约 5000 行会升级成表锁，PG 没这回事。批量更新要分批
3. **`READ_COMMITTED_SNAPSHOT` 默认关闭** —— 不主动开，读就会阻塞写
4. **`nvarchar` 和 `varchar` 混用** —— 隐式转换导致索引失效，是性能问题的头号来源
5. **标识列不能显式插值** —— 迁移数据要先 `SET IDENTITY_INSERT ON`
6. **排序规则默认不区分大小写** —— `'ABC' = 'abc'` 返回 true，和 PG 相反。做唯一校验时要留意
7. **`datetime` 精度只有 3.33ms** —— 一律用 `datetime2` 或 `datetimeoffset`
8. **容器要 2GB 内存** —— 内存不够会直接退出，日志里只有一句 "sqlservr: This program requires..."
9. **连接串里的 `@` 要编码** —— `%40`
10. **`WAITFOR DELAY` 不支持参数绑定** —— 只能拼字面量，务必先校验范围

---

## 七、课程里哪些地方要跟着改

| 课 | 改动 |
|---|---|
| M0-02 事务边界 | 实验现象从「连接被占」变成「表被锁」；监控口径换 `sys.dm_exec_requests` |
| M0-03 幂等 | 唯一约束的错误码 `23505` → `2627`/`2601`；`ON CONFLICT` → 唯一索引 + 重试 |
| M1-05 软删除 | 不用改，筛选索引语法相同 |
| M3-04 超卖 | `for update` → `with (updlock, rowlock)`；条件更新的写法两边通用 |
| M4-02 台账对账 | 窗口函数两边都支持，SQL 基本可直接跑 |
| M6-03 迁移 | `create index concurrently` → `with (online = on)`（企业版） |

其余章节讲的是**原理**（库存四量、优惠分摊、单据模型、状态机），和数据库无关，一个字都不用改。

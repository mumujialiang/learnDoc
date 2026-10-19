# 001 使用异步 SQLAlchemy + asyncpg

## 状态

已采纳

## 背景

交易类接口的主要时间消耗在数据库与外部服务的 IO 等待上。
项目需要单实例支撑较高并发，且团队来自前端背景，需要较低的心智负担。

## 决策

- 引擎使用 `create_async_engine` + `asyncpg` 驱动
- 全局 `expire_on_commit=False`
- 关联数据一律显式 `selectinload`，不使用懒加载

## 代价

- 任何隐式 IO（懒加载、commit 后读属性）都会抛 `MissingGreenlet`，调试成本高于同步版
- 部分第三方库只有同步接口，需要 `run_in_threadpool` 包装
- 事务与 session 的写法纪律要求更严格，新人需要 1~2 周适应

## 备选方案

| 方案 | 为什么不选 |
|---|---|
| 同步 SQLAlchemy + psycopg | 并发能力受限，但作为过渡方案同样可行 |
| Django ORM | 复杂查询与显式锁需要频繁绕行，ERP 报表场景吃亏 |
| raw SQL + 自行封装 | 前期快，后期字段变更与迁移难以维护 |

## 收益

- IO 等待期间不占线程，连接数可压到很低
- Pydantic + SQLAlchemy 类型标注对前端背景的人更易读

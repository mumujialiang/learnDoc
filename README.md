# learn-mall

商城（MiniMall）+ ERP（MiniERP）全栈后端课程工作区。

可视化讲义在线体验：<https://mumujialiang.github.io/learnDoc/>

面向 5 年前端经验、转全栈的工程师。技术栈：

- FastAPI + Pydantic v2
- SQLAlchemy 2.0（async）+ asyncpg
- PostgreSQL 16 + Redis 7
- Alembic 迁移

数据库默认用 PostgreSQL —— 课程正文按它讲原理（MVCC、部分索引、`ON CONFLICT` 在它上面最直白）。
公司用 SQL Server 的话，一个环境变量切过去：

```powershell
docker compose --profile mssql up -d
pip install -e ".[mssql]"
# 改 .env 里的 DATABASE_URL
```

两套的差异、踩坑、课程受影响范围记在 [`docs/sqlserver.md`](docs/sqlserver.md)，
网页版在侧边栏底部的 **SQL Server 对照**。

`scripts/smoke.py inspect` 会按方言自动切换监控口径：

```text
backend = postgresql
[1/6] idle in transaction=30, idle=2

backend = mssql
[1/6] 会话=1 空闲事务=0 被阻塞=0
```

## 两种学习入口

| 入口 | 定位 |
|---|---|
| `web/` 可视化讲义 | **通俗版**。每个术语先解释再使用，配可交互模拟器 |
| `docs/course/` | **原始版**。Markdown 原文，信息更密，适合查细节和打印 |

先读通俗版建立直觉，再翻原始版补细节。

### 启动可视化讲义

```powershell
cd web
npm install
npm run dev
# → http://localhost:5173
```

**263 节全部上线**，分 9 门课：后端、数据库、并发、全栈架构、工程化、ERP、
AI 编程、AI 应用开发、前端。

课程正文是数据驱动的：内容在 `web/src/data/lessons/` 下的
`m*.js`、`f*.js`、`a*.js`、`e*.js`、`h*.js`、`r*.js`、`s*.js`，
由 `LessonRenderer.vue` 统一渲染。想改某一节，只改数据文件即可，不用碰组件。

五个可交互可视化，全部实时绘制（不依赖任何图表库）：

| 可视化 | 在哪节 | 能做什么 |
|---|---|---|
| **探针故障演练台** | M0-01 | 拨开关，看 liveness 与 readiness 失败后 Pod 被重启还是被摘流量 |
| **连接池仪表盘** | M0-02 | 施加 50 并发，看 30 个槽位被事务占住多久、队列如何堆积 |
| **SPU / SKU 矩阵** | M1-01 | 点格子下架，看规格选择器与报表查询的连锁反应 |
| **库存四量** | M3-03 | 下单 / 支付 / 超时取消，看可售、锁定、已出库如何分离 |
| **超卖时序** | M3-04 | 1~5 个并发请求的时间轴重叠，红色窗口一出现库存就变负 |

其中三个用 Canvas 2D 逐帧绘制（`src/widgets/*Stage.vue`），
共享 `CanvasStage.vue` 提供 DPR 自适应、可见性暂停与统一渲染循环。

### 关于代码

正文默认**不展示代码**。每个代码块被折叠成一行虚线小条，需要对照时才点开。

理由很简单：代码交给 AI，人的时间应该花在判断上。
所以每节真正保留的是：中文场景、因果链、对照表、验收清单——
而不是"照着敲一遍"。

只有两类例外会直接展开：**终端命令**和**报错原文**——
这两个不展开就没法用。

## 后端快速开始

```powershell
# 1. 启动依赖
docker compose up -d

# 2. 创建虚拟环境
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. 安装依赖
pip install -e ".[dev]"

# 4. 配置环境变量
Copy-Item .env.example .env

# 5. 启动服务
uvicorn app.main:app --reload --port 8000
```

另开一个终端验证：

```powershell
python scripts/smoke.py health
```

预期输出：

```text
[OK  ] /health/live   200 {"status":"ok"}
[OK  ] /health        200 {"db":"ok","redis":"ok"}
```

接口文档：<http://127.0.0.1:8000/docs>

## 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| `/health` 一直挂着不返回 | `localhost` 解析到 `::1` | 连接串改用 `127.0.0.1` |
| 请求返回空 body 的 502 | httpx 走了系统代理 | 客户端加 `trust_env=False` |
| `alembic` 报 `UnicodeDecodeError: 'gbk'` | `alembic.ini` 含中文 | 该文件只写 ASCII |
| `MissingGreenlet` | 会话 commit 后隐式加载属性 | 引擎已设 `expire_on_commit=False`，关联数据用 `selectinload` |

## 目录说明

```text
app/
├─ main.py            应用入口，lifespan 管理连接释放
├─ core/
│  ├─ config.py       配置（pydantic-settings）
│  ├─ db.py           异步引擎 + 请求级 Session
│  └─ redis.py        Redis 客户端
├─ api/
│  ├─ health.py       存活 / 就绪探针
│  └─ playground.py   教学用破坏性接口
└─ models/            ORM 模型（M1 开始填充）

scripts/smoke.py      冒烟 + 并发验证
docs/course/          课程正文（Markdown）
docs/adr/             架构决策记录

web/                  可视化讲义
├─ src/views/         课程页面（前 3 节为手写，其余走通用渲染）
├─ src/widgets/       交互模拟器
├─ src/data/course.js 课程目录
└─ src/data/lessons/  课程正文（按模块拆分，m0.js ~ m7.js）
```

## 数据库迁移

```powershell
# 生成迁移（需先在 app/models 里定义模型）
alembic revision --autogenerate -m "add catalog tables"

# 应用
alembic upgrade head

# 回滚一步
alembic downgrade -1
```

## 当前进度

课程正文：**40 / 40 节**，M0 ~ M7 全部可读。

后端代码：`app/` 只实现了 M0-01 的骨架。
从 M1-01 开始，模型和接口需要你按课程自己写 —— 这是设计如此，不是没做完。

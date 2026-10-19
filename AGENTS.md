# AGENTS.md

给在本仓库工作的 AI coding agent 的说明。修改项目结构或约定时，请同步更新本文件。

## 仓库是什么

两个产物，共用一个仓库：

1. **教学后端**（`app/`）：MiniMall + MiniERP 的 FastAPI 示例工程，用于课程演示。
2. **可视化课程站**（`web/`）：Vue 3 + Vite 的纯静态 SPA，数据驱动，不依赖后端 API。

线上地址：<https://mumujialiang.github.io/learnDoc/>

当前规模：**9 门课 / 55 个模块 / 263 节**，全部已上线。

## 目录结构

```text
app/                    FastAPI 应用（api / core / models）
alembic/                数据库迁移
scripts/smoke.py        健康检查、连接观察、并发压测脚本
docs/                   原始讲义（course/）、架构决策（adr/）、SQL Server 对照
web/                    课程站
  src/data/lessons/     课程内容：m*.js / f*.js / a*.js / e*.js / h*.js / r*.js / s*.js
  src/data/course.js    模块与课时目录（chapters）
  src/data/courses.js   课程门户与模块映射（courses）
  src/components/       LessonRenderer 等通用组件
  src/views/            门户、课程页、课时页、SQL Server 对照
  src/composables/      useProgress（手动已学状态）
.github/workflows/      GitHub Pages 自动部署
```

## 常用命令

### 课程站（最常用）

```powershell
cd web
npm install
npm run dev                 # http://127.0.0.1:5173（端口占用会顺延）
npm run build               # 产物在 web/dist
npm run preview             # http://127.0.0.1:4173/learnDoc/
```

### 后端

```powershell
docker compose up -d                              # PostgreSQL + Redis
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
python scripts/smoke.py health
python scripts/smoke.py inspect -r 10
python scripts/smoke.py hammer -c 50 -s 10
```

### SQL Server 模式

```powershell
docker compose --profile mssql up -d
pip install -e ".[mssql]"
# 改 .env 的 DATABASE_URL，参考 .env.example 与 docs/sqlserver.md
```

## 课程站架构

- 路由是 **hash 模式**（`createWebHashHistory`），GitHub Pages 不需要 404 重写。
  - `/` 课程门户
  - `/course/:courseId` 课程页
  - `/lesson/:code` 课时页
  - `/sqlserver` SQL Server 对照
- 数据流：课时数据文件 → `data/lessons/index.js` → `data/course.js` 的 `chapters` →
  `data/courses.js` 的课程映射 → 页面组件。
- 渲染：`LessonRenderer.vue` 按 `blocks[].type` 渲染，支持
  `h2 / h3 / p / lead / goal / list / olist / callout / code / table / chain /
  howto / steps / checklist / widget / figure / hr`。
- 三个手写页面例外：`M0-01`、`M0-02`、`M1-01` 走 `views/Lesson01~03.vue`，
  **不读取 lessons 数据**。改这三节要改对应 vue 文件。

### 课时数据格式

```js
'M9-01': {
  code: 'M9-01',
  title: '事务的边界',
  chapter: '数据库 · 事务与并发',
  minutes: 60,
  lead: '两三句话的场景引入，可用 \\n 换行。',
  terms: [{ en: '事务边界', zh: 'transaction boundary', plain: '一句人话解释。' }],
  blocks: [{ type: 'h2', text: '一、...' }, { type: 'p', text: '...' }],
}
```

### 重要级别与状态

- 级别：`core`（核心）/ `important`（重要）/ `optional`（选学）。
- 默认在 `course.js` 的 `CHAPTER_LEVEL` 里按模块设置，单节课可用 `L()` 的第 4 个参数覆盖。
- 待写课程用 `D(code, title)`，渲染为「待写」虚线卡片。
- 「已学」是**手动**的：课时页右下角按钮，存在 `localStorage` 的 `lm-learned`。
  **不要改回打开即标记。**
- 顺序学习是软约束：显示「第 x / y 节」，前面有未学课时会提示，但不硬锁。

## 新增或修改课程内容

1. 在对应数据文件里加课时对象（`m*.js` 数据库/后端，`f*` 前端，`a*` AI，`e*` ERP，`h*` 协议/工程）。
2. 新文件要在 `data/lessons/index.js` 里 `import` 并 `...spread`。
3. 在 `data/course.js` 的 `chapterList` 中登记课时，**code 必须与数据 key 完全一致**。
4. 在 `data/courses.js` 的对应课程 `chapterIds` 中加入模块 id。
5. 构建并交叉校验：

```powershell
cd web
npm run build
```

```powershell
$course = Select-String -Path "src/data/course.js" -Pattern "L\('([A-Z]\d+-\d+)'|D\('([A-Z]\d+-\d+)'" -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value + $_.Groups[2].Value }
$data = Select-String -Path "src/data/lessons/*.js" -Pattern "^  '([A-Z]\d+-\d+)':" |
  ForEach-Object { $_.Matches[0].Groups[1].Value }
$course | Where-Object { $_ -and $_ -notin $data }
```

> 校验结果中的「缺失项」目前只有 `M0-01`、`M0-02`、`M1-01`：
> 它们是对应 `views/Lesson01~03.vue` 的手写页面，不存于数据文件。
> 除此之外的缺失项才是真的编号不一致。

## 内容写作约定

- 全中文，面向「5 年前端转全栈」的读者；先解释术语，再讲机制。
- **默认不展示代码**。`CodeBlock` 默认折叠；只有终端命令和报错原文适合展开。
- 每节结构尽量包含：真实场景 → 机制拆解 → 概念对照 → 失败模式 → 边界取舍 →
  验收清单 → 动手验证 → 小结 → 延伸问题。
- 讲「怎么判断」，不写「照着敲」的教程。
- 避免绝对路径资源（如 `/logo.png`），GitHub Pages 部署在 `/learnDoc/` 子路径。

## 后端约定

- Python 3.12；FastAPI + Pydantic v2 + SQLAlchemy 2.0 async + Alembic。
- 数据库默认 PostgreSQL；SQL Server 通过 `settings.db_backend` 分流，
  方言相关 SQL 必须两边都测（如 `pg_sleep` / `WAITFOR DELAY`）。
- 不要在代码里硬编码凭据；`.env` 不进 git。
- 迁移统一用 `alembic revision` / `alembic upgrade head`，不要手改生产库。
- 提交前跑 `ruff check`；测试用 `pytest`（`asyncio_mode=auto`）。

## 发布

- 远端：`origin` = `https://github.com/mumujialiang/learnDoc.git`。
- push 到 `main` 会触发 `.github/workflows/deploy.yml`：构建 `web/` 并发布 Pages。
- 本机访问 GitHub 需要走系统代理（常见为 `http://127.0.0.1:10804`）。
  Git 不会自动读取 Windows 系统代理，推送时临时设置：

```powershell
$env:HTTPS_PROXY='http://127.0.0.1:10804'
$env:HTTP_PROXY='http://127.0.0.1:10804'
git push origin main
```

- 推送后可在 Actions 里确认构建成功，再访问线上地址验证。

## 已知约束与坑

- `vite preview` 的 `command` 也是 `serve`，所以 base 判断用了 `isPreview`，
  否则预览时资源 404。
- 所有课程数据打进同一个 JS，产物已超过 500 KB（gzip 约 230 KB）；
  内容继续增长应考虑按课程动态导入。
- `web/dist/`、`web/node_modules/` 已在 `.gitignore`，不要提交。
- 不要删除 `.codebuddy/`。
- 不要修改远端名称，也不要把代理写进全局 git config（用临时环境变量）。
- 课时 code 与数据 key 不一致时，页面会显示「这节还没写」。

## 当前待办

- 深度统一：M9（事务与并发）与新增的 H 系列是 12 板块左右的深度版，
  其余课程仍按旧密度，需按同标准逐步重写。
- 打包优化：所有课程数据打进同一个 chunk，产物约 867 KB（gzip 307 KB），
  应改为按课程/模块动态导入。
- 课程站暂无自动化测试；修改后至少跑 `npm run build` 与一次浏览器冒烟。

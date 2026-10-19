export default {
  'M6-01': {
    code: 'M6-01',
    title: '结构化日志与 trace_id',
    chapter: '可观测与工程化',
    minutes: 40,
    lead:
      '线上出问题，你打开日志，看到 500 条 "error occurred"。\n' +
      '哪一条是这次请求的？哪个用户？哪张订单？全都不知道。',
    terms: [
      {
        en: 'trace_id',
        zh: '链路 ID',
        plain: '一次请求的唯一编号。从进门到出门，所有日志都带着它。',
      },
      {
        en: '结构化日志',
        zh: 'structured log',
        plain: '不是一句话，是一行 JSON。这样机器能按字段检索、统计、告警。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、print 为什么不够' },
      {
        type: 'list',
        items: [
          '没有级别，分不清信息和错误',
          '没有时间，出事后不知道先后顺序',
          '没有上下文：哪个用户、哪张订单',
          '异步并发下，多行日志会交错在一起',
        ],
      },

      { type: 'h2', text: '二、改成结构化' },
      {
        type: 'code',
        lang: 'python',
        code: `
logger.info("order created", extra={
    "trace_id": trace_id,
    "order_id": order.id,
    "user_id": uid,
    "amount": str(order.amount),
})
`,
      },
      {
        type: 'p',
        text: '输出是一行 JSON，可以直接被 ELK / Loki / ClickHouse 吃进去，按字段查「所有 amount > 10000 的订单日志」。',
      },

      { type: 'h2', text: '三、trace_id 贯穿整条链路' },
      {
        type: 'code',
        lang: 'python',
        title: '中间件里生成并回传',
        code: `
trace_id = request.headers.get("X-Trace-Id") or uuid4().hex
request.state.trace_id = trace_id
response.headers["X-Trace-Id"] = trace_id
`,
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '用户截图报障时，让他把响应头里的 trace_id 发给你。\n' +
          '一个号，就能捞出这次请求碰过的所有日志 —— 包括数据库、队列、第三方调用。',
      },

      { type: 'h2', text: '四、别把敏感信息写进日志' },
      {
        type: 'list',
        items: [
          '密码、token、支付签名',
          '完整手机号、身份证号',
          '银行卡号、CVV',
        ],
      },
      {
        type: 'p',
        text: '日志会被复制、转发、存到第三方平台。写进去一次，就再也收不回来了。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '日志是 JSON，不是拼接字符串', v: '看日志文件' },
          { k: '每条日志都带 trace_id', v: '搜一次请求' },
          { k: '错误日志有完整堆栈', v: '人为触发异常' },
          { k: '日志里没有密码和完整手机号', v: '审一遍' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '跨服务调用时，trace_id 怎么传过去？',
          '日志保留多久合适？全量保留的成本在哪？',
          '为什么说不该用日志做业务数据分析？',
        ],
      },
    ],
  },

  'M6-02': {
    code: 'M6-02',
    title: '测试分层',
    chapter: '可观测与工程化',
    minutes: 45,
    lead:
      '单元测试全绿，上线还是炸。\n' +
      '因为 bug 在事务边界上，而单测根本不碰数据库。',
    terms: [
      {
        en: '单元测试',
        zh: 'unit test',
        plain: '测一个函数。数据库、网络全部 mock 掉，跑得飞快。',
      },
      {
        en: '集成测试',
        zh: 'integration test',
        plain: '起一个真的数据库，完整跑一遍请求。慢，但能抓真问题。',
      },
      {
        en: '契约测试',
        zh: 'contract test',
        plain: '验证接口的输入输出格式，防止改了字段把前端搞崩。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、三层各抓什么' },
      {
        type: 'table',
        head: ['层', '能抓什么', '抓不到什么'],
        rows: [
          ['单元测试', '纯逻辑、算法、边界值', '事务、SQL、并发、约束'],
          ['集成测试', '真实读写、约束、事务回滚', '前端契约'],
          ['契约测试', '字段增减、类型变化', '业务逻辑对错'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**只有集成测试能抓事务 bug。**\n' +
          '因为事务是数据库的行为 —— 你把数据库 mock 掉，就什么都没测到。',
      },

      { type: 'h2', text: '二、集成测试要用真库' },
      {
        type: 'code',
        lang: 'python',
        code: `
@pytest.fixture
async def db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '用 testcontainers 起一个临时 PostgreSQL，比 SQLite 靠谱得多。\n' +
          'SQLite 没有真正的行锁和事务隔离，测不出并发问题 —— 那正是你最需要测的地方。',
      },

      { type: 'h2', text: '三、最值得写的四类测试' },
      {
        type: 'list',
        items: [
          '事务回滚：中途抛异常，数据必须一点都没写进去',
          '并发扣减：50 个协程抢 10 件库存，只能成功 10 次',
          '幂等：同一请求打 5 次，数据只有一份',
          '状态机：非法迁移必须抛错',
        ],
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '这四类测试，每一类都对应一个上线后会真金白银损失的 bug。\n' +
          '写这四类，比写 200 个 getter 的测试有用得多。',
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '有连真数据库跑的集成测试', v: '看 CI 配置' },
          { k: '并发场景有测试覆盖', v: '搜 asyncio.gather' },
          { k: '测试之间互不影响（可重复跑）', v: '连跑两次' },
          { k: '关键接口有契约测试', v: '看测试文件' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '集成测试很慢，怎么在 CI 里控制时间？',
          '测试数据怎么隔离？每个用例建一次库吗？',
          '为什么说「测试覆盖率」是个容易骗人的指标？',
        ],
      },
    ],
  },

  'M6-03': {
    code: 'M6-03',
    title: '迁移与灰度发布',
    chapter: '可观测与工程化',
    minutes: 40,
    lead:
      '给一张 500 万行的表加个字段，你直接 ALTER。\n' +
      '数据库锁表 8 分钟，全站白屏。\n' +
      '这不是夸张，是每年都在发生的事故。',
    terms: [
      {
        en: '迁移',
        zh: 'migration',
        plain: '改数据库结构的那段脚本。它必须能前进，也必须能后退。',
      },
      {
        en: '灰度',
        zh: 'canary release',
        plain: '新版本先给 1% 的用户，看指标正常再逐步放大。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、迁移的三条铁律' },
      {
        type: 'list',
        items: [
          '必须能回滚 —— 写不出 downgrade 就别上线',
          '不能长时间锁表 —— 生产库上有真实流量',
          '必须向后兼容 —— 老代码在灰度期间还要继续跑',
        ],
      },

      { type: 'h2', text: '二、加字段的两种写法' },
      {
        type: 'code',
        lang: 'sql',
        code: `
-- 安全：可空字段，PostgreSQL 只改元数据
alter table orders add column note varchar(255);

-- 危险：非空且无默认值，要重写整张表
alter table orders add column note varchar(255) not null;
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          'PostgreSQL 11+ 对「带默认值的非空字段」做了优化，不会重写表。\n' +
          '但 MySQL 5.7 会 —— 那种情况必须用 gh-ost 或 pt-online-schema-change。',
      },

      { type: 'h2', text: '三、加索引要用 concurrently' },
      {
        type: 'code',
        lang: 'sql',
        code: `create index concurrently idx_orders_user on orders (user_id);`,
      },
      {
        type: 'p',
        text: '`concurrently` 不锁写，代价是慢，而且失败会留下一个无效索引（要手动 drop 再重来）。',
      },

      { type: 'h2', text: '四、删字段的三步' },
      {
        type: 'steps',
        items: [
          { t: '先加新字段，双写', d: '老代码读老字段，新代码写两个。' },
          { t: '切读，观察一个版本', d: '确认没有任何代码再读老字段。' },
          { t: '再删老字段', d: '删之前全局搜一遍，包括报表脚本和定时任务。' },
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '每个迁移都有 downgrade', v: '跑一次 downgrade' },
          { k: '大表变更没有锁表风险', v: '在预发环境计时' },
          { k: '迁移在生产规模数据上跑过', v: '用脱敏数据试' },
          { k: '灰度期间新老代码能共存', v: '同时跑两个版本' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么说「加字段简单、删字段危险」？',
          '迁移失败了，生产库处于什么状态？怎么恢复？',
          '什么情况下必须停机发布？',
        ],
      },
    ],
  },

  'M6-04': {
    code: 'M6-04',
    title: '秒杀演练',
    chapter: '可观测与工程化',
    minutes: 60,
    lead:
      '平时 100 QPS，大促 5000 QPS。\n' +
      '你以为只是「快 50 倍」，实际上是另一套系统。',
    terms: [
      {
        en: 'QPS',
        zh: '每秒请求数',
        plain: '系统每秒能处理多少个请求。压测的核心指标。',
      },
      {
        en: '熔断',
        zh: 'circuit breaker',
        plain: '下游一直失败时，直接快速返回错误，不再去调用 —— 保护自己也保护下游。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先压测，再优化' },
      { type: 'p', text: '不要猜瓶颈。用 100 并发打一遍，看哪里先崩：' },
      {
        type: 'table',
        head: ['先崩的地方', '说明什么'],
        rows: [
          ['数据库连接池', '扣减太慢，或事务太长'],
          ['CPU', '序列化 / 校验太重'],
          ['Redis 单 key', '热点集中在一个 SKU 上'],
          ['带宽', '响应体太大，比如返回了整个商品详情'],
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '在你的项目里跑一次 `python scripts/smoke.py hammer -c 50 -s 10`，\n' +
          '然后用 `inspect` 看 `idle in transaction` 涨到多少 —— 那就是第一个瓶颈。',
      },

      { type: 'h2', text: '二、秒杀的四个必备动作' },
      {
        type: 'steps',
        items: [
          { t: '限流', d: '网关层就挡住，只让 1% 的请求进来。剩下的直接返回"活动太火爆"。' },
          { t: '预热', d: '库存提前加载到 Redis，商品信息提前进缓存。不要等用户来了才查库。' },
          { t: '异步下单', d: '先返回「排队中」，后台慢慢建单。用户看到的是进度条，不是转圈。' },
          { t: '兜底', d: '超卖退款、下游故障熔断、缓存挂了降级。' },
        ],
      },

      { type: 'h2', text: '三、秒杀时绝对不要做的事' },
      {
        type: 'list',
        items: [
          '同步写日志到磁盘（用异步日志）',
          '每单都发短信（改成批量）',
          '做复杂的权限校验（预计算好）',
          '一次请求查 5 次数据库（合并成 1 次）',
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**秒杀不是「让正常流程跑得更快」，是「为极端流量重新设计一条路」。**\n' +
          '把日常代码原样压上去，压多少倍都还是崩。',
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '压测过目标 QPS，知道瓶颈在哪', v: '跑一次压测' },
          { k: '有接口限流', v: '超量请求被拒而不是排队' },
          { k: '热点数据提前预热', v: '看启动流程' },
          { k: '下游故障能熔断', v: '停掉一个依赖' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '限流限在网关、服务、数据库，各有什么利弊？',
          '「排队中」这个状态，用户刷新页面会怎样？',
          '为什么秒杀场景要尽量少用数据库事务？',
        ],
      },
    ],
  },
}

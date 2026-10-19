export default {
  'M5-01': {
    code: 'M5-01',
    title: '任务队列与任务幂等',
    chapter: '异步与一致性',
    minutes: 50,
    lead:
      '有些事不该让用户等：发短信、生成报表、同步库存。\n' +
      '扔到后台去做，用户立刻拿到响应 —— 但「扔到后台」这件事本身，会引入一堆新问题。',
    terms: [
      {
        en: '任务队列',
        zh: 'task queue',
        plain: '一个待办列表。生产者在前面放任务，worker 在后面挨个取出来做。',
      },
      {
        en: 'worker',
        zh: '工作进程',
        plain: '一直在跑、从队列里捞任务执行的程序。可以起多个，并行处理。',
      },
      {
        en: '死信队列',
        zh: 'dead letter queue',
        plain: '重试很多次还是失败的任务，单独放到一边，等人来看。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、什么该异步' },
      {
        type: 'table',
        head: ['操作', '同步还是异步', '为什么'],
        rows: [
          ['发短信 / 邮件', '异步', '失败不影响主流程'],
          ['生成月度报表', '异步', '要跑几分钟'],
          ['同步库存到商城', '异步', '允许延迟几秒'],
          ['扣库存', '同步', '必须立刻知道成功还是失败'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**能异步的前提是：失败了不影响用户当下看到的结果。**\n' +
          '扣库存失败必须立刻告诉用户，不能「稍后再说」。',
      },

      { type: 'h2', text: '二、任务必须幂等' },
      { type: 'p', text: '队列的语义通常是「至少一次」：执行到一半 worker 挂了，任务会被重新投递。' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: 'worker 取到任务' },
          { text: '执行成功，还没标记完成' },
          { text: 'worker 崩了' },
          { text: '任务被重新投递' },
          { text: '又执行一次', mark: true },
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '所以每个任务都要能安全地执行两次。\n' +
          '方法还是那套：幂等键 + 唯一约束，或者状态条件更新。',
      },

      { type: 'h2', text: '三、重试要有策略' },
      {
        type: 'table',
        head: ['失败原因', '要不要重试'],
        rows: [
          ['网络抖动、下游 5xx', '重试，指数退避'],
          ['下游 4xx（参数错了）', '不重试，重试多少次都一样'],
          ['自己的代码 bug', '重试几次后进死信'],
        ],
      },
      {
        type: 'code',
        lang: 'python',
        code: `
@task(max_retries=5, retry_delay=[1, 5, 30, 120, 600])
async def send_sms(order_id: int):
    ...
`,
      },

      { type: 'h2', text: '四、死信队列' },
      { type: 'p', text: '重试 5 次还失败的任务，不能丢，也不能无限重试把队列堵死。' },
      {
        type: 'list',
        items: [
          '放进死信队列，等人工介入',
          '发告警到群里',
          '提供一个「重放」按钮，修好之后批量重跑',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '任务重复执行不会产生两份数据', v: '手动重投一次' },
          { k: '重试次数和间隔有上限', v: '看任务配置' },
          { k: '失败任务能查到、能重放', v: '看死信队列' },
          { k: 'worker 挂了任务不会丢', v: 'kill 一个 worker 试试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '队列积压了 10 万个任务，怎么处理？',
          '任务执行时间超过队列的超时时间，会发生什么？',
          '为什么「发短信」绝对不能放在数据库事务里？',
        ],
      },
    ],
  },

  'M5-02': {
    code: 'M5-02',
    title: '事件驱动与 Outbox',
    chapter: '异步与一致性',
    minutes: 60,
    lead:
      '下单成功后要通知仓库。你的代码先写数据库，再发消息。\n' +
      '发消息失败了怎么办？订单在，仓库永远不知道。\n' +
      '发消息成功了、数据库却回滚了怎么办？仓库收到一个不存在的订单。',
    terms: [
      {
        en: '双写问题',
        zh: 'dual write',
        plain: '写库和发消息是两个独立操作，没有任何机制能保证它们都成功。',
      },
      {
        en: 'Outbox',
        zh: '发件箱模式',
        plain: '把「要发的消息」先写进数据库一张表，和业务数据同一个事务。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、双写为什么不可靠' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '写订单，提交成功' },
          { text: '发消息失败' },
          { text: '订单在，仓库不知道' },
          { text: '货永远发不出', mark: true },
        ],
      },
      { type: 'p', text: '反过来也一样糟糕：' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '写订单，提交' },
          { text: '发消息成功' },
          { text: '下游开始备货' },
          { text: '订单后来被撤销' },
          { text: '处理了一个不存在的订单', mark: true },
        ],
      },

      { type: 'h2', text: '二、Outbox 的核心思路' },
      {
        type: 'p',
        text: '一句话：**把「发消息」变成「写一行数据」，让它和业务数据进同一个事务。**',
      },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table outbox (
  id         bigserial primary key,
  topic      varchar(64) not null,
  payload    jsonb not null,
  status     smallint not null default 0,  -- 0待发送 1已发送
  created_at timestamptz not null default now()
);
`,
      },
      {
        type: 'code',
        lang: 'python',
        code: `
async with session.begin():
    session.add(order)
    session.add(Outbox(topic="order.created", payload={...}))
    # 同一个事务：要么订单和消息都在，要么都不在
`,
      },

      { type: 'h2', text: '三、谁负责真正发出去' },
      {
        type: 'list',
        items: [
          '独立进程轮询 outbox 表，发完标记 status=1',
          'CDC（如 Debezium）监听数据库变更，自动投递到 MQ',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '轮询最简单，缺点是几百毫秒延迟。\n' +
          'CDC 更实时，但多了一整套组件要维护。小项目用轮询完全够。',
      },

      { type: 'h2', text: '四、它仍然只是「至少一次」' },
      {
        type: 'p',
        text: '发完消息、还没来得及把 status 改成 1，进程挂了 —— 下次会再发一遍。',
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**Outbox 解决的是「不丢」，不是「不重」。**\n' +
          '消费端必须自己幂等，这一步谁也替不了你。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '发消息和写业务数据在同一个事务里', v: '读代码' },
          { k: '有进程在消费 outbox 表', v: '看任务列表' },
          { k: '消费端做了幂等', v: '重复投递一次' },
          { k: 'outbox 表有清理或归档机制', v: '看数据量会不会一直涨' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          'outbox 表要不要按时间分区？为什么？',
          '消息顺序重要吗？同一订单的多个事件怎么保证有序？',
          '如果不用 Outbox，还有什么办法能避免双写？',
        ],
      },
    ],
  },

  'M5-03': {
    code: 'M5-03',
    title: '什么时候不需要分布式事务',
    chapter: '异步与一致性',
    minutes: 40,
    lead:
      '微服务一上来就想上分布式事务。\n' +
      '但真实项目里，90% 的「跨服务一致性」用状态机 + 补偿就够了 —— 剩下的 10%，其实根本不该拆成两个服务。',
    terms: [
      {
        en: '分布式事务',
        zh: 'distributed transaction',
        plain: '多个服务或多个数据库的操作，要么全成功，要么全失败。',
      },
      {
        en: '补偿',
        zh: 'compensation',
        plain: '出问题时，用另一个操作把前面的影响抵消掉。比如扣了钱就退钱。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先问：真的需要吗' },
      {
        type: 'table',
        head: ['场景', '需要强一致吗', '怎么做'],
        rows: [
          ['下单扣库存', '需要', '放在同一个库，用普通事务'],
          ['下单发短信', '不需要', '异步 + 重试'],
          ['支付后加积分', '不需要', '事件 + 补偿'],
          ['跨行转账', '需要', '这才是分布式事务的真实场景'],
        ],
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '**绝大多数「我们需要分布式事务」的需求，本质是服务拆错了。**\n' +
          '下单和扣库存本来就该在同一个服务、同一个事务里。',
      },

      { type: 'h2', text: '二、补偿怎么做' },
      { type: 'p', text: '以「支付成功后加积分」为例：' },
      {
        type: 'steps',
        items: [
          { t: '支付成功，发事件', d: '订单服务只负责发，不关心谁消费。' },
          { t: '积分服务消费', d: '加积分，并记录「这笔订单已经加过」。' },
          { t: '失败了怎么办', d: '重试；重试到上限就进死信，人工补。' },
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '这里的不一致是「用户晚了几秒看到积分」，不是「积分加错了」。\n' +
          '**能接受延迟，就不需要分布式事务。**',
      },

      { type: 'h2', text: '三、真的需要时的三个选项' },
      {
        type: 'table',
        head: ['方案', '复杂度', '适合'],
        rows: [
          ['Saga', '中', '长流程，每一步都能补偿'],
          ['TCC', '高', '资金类，要求准实时'],
          ['两阶段提交', '很高', '同构数据库，强一致'],
        ],
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '能说清每个跨服务调用「不一致时会怎样」', v: '画一张表' },
          { k: '有补偿或重试机制', v: '制造一次失败' },
          { k: '没有为了「看起来严谨」引入分布式事务框架', v: '看依赖列表' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '什么情况下「最终一致」是不可接受的？',
          'Saga 的补偿操作本身也失败了，怎么办？',
          '为什么说「拆分服务应该按事务边界来拆」？',
        ],
      },
    ],
  },

  'M5-04': {
    code: 'M5-04',
    title: '缓存穿透 / 击穿 / 雪崩',
    chapter: '异步与一致性',
    minutes: 50,
    lead:
      '缓存出问题，永远只有三种姿势：\n' +
      '查一个根本不存在的东西、一个热点突然过期、一大批同时过期。',
    terms: [
      {
        en: '穿透',
        zh: 'cache penetration',
        plain: '查一个数据库里也没有的数据。缓存没有、库里也没有，每次都打到库上。',
      },
      {
        en: '击穿',
        zh: 'cache breakdown',
        plain: '一个热点 key 过期的瞬间，大量请求同时发现没缓存，同时去查库。',
      },
      {
        en: '雪崩',
        zh: 'cache avalanche',
        plain: '大批 key 在同一时间过期，数据库瞬间被压垮。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、穿透：查不存在的东西' },
      { type: 'p', text: '有人用不存在的 ID 疯狂请求。缓存没有，数据库也没有 —— 每次都白查一遍。' },
      {
        type: 'code',
        lang: 'python',
        code: `
value = await cache.get(key)
if value is None:
    row = await db.get(id)
    if row is None:
        await cache.set(key, "__NULL__", ex=60)   # 空值也缓存
        return None
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '还可以用布隆过滤器：先判断「这个 ID 可能存在吗」，不存在直接返回。\n' +
          '适合数据量大、ID 有规律的场景。',
      },

      { type: 'h2', text: '二、击穿：热点瞬间过期' },
      { type: 'p', text: '一个爆款商品的缓存刚好过期。1 万个请求同时发现没缓存，同时去查库。' },
      {
        type: 'code',
        lang: 'python',
        title: '加一把互斥锁',
        code: `
if not await cache.set(f"lock:{key}", 1, nx=True, ex=5):
    await asyncio.sleep(0.05)
    return await cache.get(key)   # 等别人查完
`,
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '更简单的办法：热点 key **永不过期**，靠后台定时任务更新。\n' +
          '简单粗暴，但对爆款商品最有效。',
      },

      { type: 'h2', text: '三、雪崩：一起过期' },
      { type: 'p', text: '凌晨 0 点，所有 key 的 TTL 同时到期。数据库瞬间被压垮。' },
      {
        type: 'list',
        items: [
          '过期时间加随机抖动（±10%）',
          '多级缓存：本地缓存 + Redis',
          'Redis 本身要高可用，别单点',
        ],
      },
      {
        type: 'code',
        lang: 'python',
        code: `ttl = base_ttl + random.randint(0, base_ttl // 10)`,
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '查不存在的数据不会打穿到库', v: '刷 1000 个不存在的 ID' },
          { k: '热点 key 过期时只有一个请求查库', v: '并发打一个刚过期的 key' },
          { k: 'TTL 带随机抖动', v: '看代码' },
          { k: 'Redis 挂了服务能降级', v: '停掉 Redis' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '空值缓存的 TTL 该设多久？太长和太短各有什么问题？',
          '布隆过滤器能删除元素吗？',
          '为什么「缓存永不过期」也是一种正经策略？',
        ],
      },
    ],
  },

  'M5-05': {
    code: 'M5-05',
    title: '缓存与数据库一致性',
    chapter: '异步与一致性',
    minutes: 45,
    lead:
      '数据库改了，缓存还是旧值，用户看到的是几秒前的世界。\n' +
      '这件事能彻底解决吗？不能。但可以让不一致的窗口足够小。',
    terms: [
      {
        en: '缓存一致性',
        zh: 'cache consistency',
        plain: '缓存里的数据和数据库里的对得上。',
      },
      {
        en: '延迟双删',
        zh: 'delayed double delete',
        plain: '更新数据库前后各删一次缓存，中间还等一小会儿。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、为什么不能「先删缓存再更库」' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '删缓存' },
          { text: '另一个请求查库，读到旧值' },
          { text: '旧值被写回缓存' },
          { text: '数据库更新完成' },
          { text: '缓存里是旧值，长期不一致', mark: true },
        ],
      },

      { type: 'h2', text: '二、推荐做法：先更库，再删缓存' },
      {
        type: 'code',
        lang: 'python',
        code: `
await db.update(...)
await db.commit()
await cache.delete(key)
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '为什么是「删」不是「更新」：\n' +
          '更新缓存要重新算一遍值，成本高；并发下两个更新还可能乱序。删除是幂等的，谁删都一样。',
      },

      { type: 'h2', text: '三、还是有窗口' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '请求 A 查缓存，未命中' },
          { text: '请求 A 查库，读到旧值' },
          { text: '请求 B 更新了库' },
          { text: '请求 B 删了缓存' },
          { text: '请求 A 把旧值写回缓存', mark: true },
        ],
      },
      {
        type: 'p',
        text: '概率很低，但要更保险就加延迟双删：',
      },
      {
        type: 'code',
        lang: 'python',
        code: `
await cache.delete(key)
await db.update(...)
await asyncio.sleep(0.5)     # 等可能的旧值写入完成
await cache.delete(key)
`,
      },

      { type: 'h2', text: '四、更根本的答案' },
      {
        type: 'callout',
        kind: 'success',
        text:
          '**不要让缓存承担「正确性」。**\n' +
          '缓存只用来加速。任何时候缓存失效，读到的都该是对的 —— 这才是可接受的架构。\n' +
          '需要强一致的数据（库存、余额），就别缓存，或者只缓存极短时间。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '更新逻辑是「先更库再删缓存」', v: '读代码' },
          { k: '删缓存失败有重试或补偿', v: '模拟一次失败' },
          { k: '关键数据（库存、余额）不依赖缓存', v: '看代码' },
          { k: '缓存挂了业务能降级', v: '停 Redis' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么「更新缓存」不如「删除缓存」？',
          '如果删缓存一直失败，怎么保证最终一致？',
          '哪些数据可以放心缓存 1 小时？',
        ],
      },
    ],
  },
}

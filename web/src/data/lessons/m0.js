export default {
  'M0-03': {
    code: 'M0-03',
    title: '幂等',
    chapter: '后端心智模型',
    minutes: 50,
    lead:
      '你在前端提交表单时，肯定处理过用户狂点两次按钮。\n' +
      '你的做法是 disabled = true —— 但那只是挡住了「同一个页面上的同一个人」。',
    terms: [
      {
        en: 'idempotent',
        zh: '幂等',
        plain: '同一个请求执行 1 次和执行 10 次，结果完全一样。',
      },
      {
        en: 'idempotency key',
        zh: '幂等键',
        plain: '客户端生成的一个唯一编号，服务端靠它认出「这事我来过了」。',
      },
      {
        en: 'retry',
        zh: '重试',
        plain:
          '请求超时后自动再发一次。你以为"没发成功"，其实对方可能已经收到了 —— 重试是后端最容易被忽略的默认假设。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、前端的防连点，只挡住了一种情况' },
      { type: 'p', text: '按钮 disabled 能挡住手抖。但下面这些它一个都挡不住：' },
      {
        type: 'list',
        items: [
          '网络超时，客户端自动重试了一次 —— 其实服务端第一次就成功了',
          '支付网关重复推送回调，同一条「支付成功」发了 5 次',
          '用户刷新页面，浏览器问「是否重新提交表单」，他点了是',
          '消息队列投递失败，重投了 3 次',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '这四种情况的共同点：**同一个业务动作，被提交了多次**。\n前端的 disabled 管不到网络那一层。',
      },

      { type: 'h2', text: '二、幂等的真正含义' },
      {
        type: 'p',
        text: '幂等不是「防止重复提交」，而是「**重复提交了也没关系**」。',
      },
      {
        type: 'p',
        text: '这两者差别很大：前者要在所有入口堵，漏一个就出事；后者是让结果天然正确。',
      },
      {
        type: 'table',
        head: ['操作', '幂等吗', '执行两次的后果'],
        rows: [
          ['查询订单', '是', '结果一样'],
          ['把订单标记为已支付', '是', '状态还是已支付'],
          ['给用户加 100 积分', '否', '变成 200'],
          ['库存减 1', '否', '减了 2'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '判断标准：这个操作是「**设置成某个值**」，还是「**在原有基础上加减**」？\n前者天然幂等，后者必须加防护。',
      },

      { type: 'h2', text: '三、别用「先查一下」，让数据库去挡' },
      {
        type: 'p',
        text: '最直觉的写法是「先查有没有，没有就插」。这在并发下是坏掉的：',
      },
      {
        type: 'code',
        lang: 'python',
        title: '✕ 先查后插',
        code: `
exists = await session.scalar(
    select(Order).where(Order.request_id == rid)
)
if not exists:
    session.add(Order(request_id=rid, ...))
`,
      },
      {
        type: 'p',
        text: '两个请求同时执行，都查到「没有」，于是都插入了。查询和插入之间有一个窗口，这就是竞态。',
      },
      { type: 'p', text: '正确做法是把唯一性交给数据库：' },
      {
        type: 'code',
        lang: 'sql',
        title: '给订单表加一个幂等键',
        code: `
alter table orders add column request_id varchar(64) not null;
create unique index uq_orders_request_id on orders (request_id);
`,
      },
      {
        type: 'code',
        lang: 'python',
        title: '✓ 插不进去就说明已经处理过',
        code: `
try:
    session.add(Order(request_id=rid, ...))
    await session.flush()
except IntegrityError:
    await session.rollback()
    # 已经有人用这个 request_id 建过单了，返回那一单
    return await get_order_by_request_id(rid)
`,
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '数据库的唯一索引是**并发安全的最后一道防线**。\n应用层那句 if 只能算优化，不能算保障。',
      },

      { type: 'h2', text: '四、状态变更也要幂等' },
      {
        type: 'p',
        text: '把订单从「待支付」改成「已支付」，重复执行应该是「什么都不做」，而不是报错。做法是把当前状态写进条件里：',
      },
      {
        type: 'code',
        lang: 'sql',
        title: '只有现在还是待支付，才更新',
        code: `
update orders
set status = 'paid', paid_at = now()
where id = :id and status = 'pending';
-- 影响 0 行 = 已经处理过了
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '注意：返回 0 行**不算错误**。幂等的接口重复调用时应该返回成功 ——\n因为它想达成的那个状态，现在已经达成了。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '同一个 request_id 打 10 次，只产生 1 条订单', v: '写脚本循环' },
          { k: '重复的回调返回 200，不是 500', v: '手动重发' },
          { k: '50 个并发请求，只有 1 个真正生效', v: 'asyncio.gather' },
          { k: '把状态重复设置成同一个值不报错', v: '连着调两次' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          'request_id 该由前端生成还是后端生成？各自的坑是什么？',
          '如果客户端根本不传幂等键，服务端能自己造一个吗？怎么造？',
          '「扣库存」这类操作，光靠幂等键能解决吗？还缺什么前提？',
        ],
      },
    ],
  },

  'M0-04': {
    code: 'M0-04',
    title: '错误处理与统一响应',
    chapter: '后端心智模型',
    minutes: 40,
    lead:
      '接口报错了。前端要回答三个问题：要不要给用户看？要不要自动重试？要不要让他改操作？\n' +
      '这三个答案，全藏在后端的响应里。后端只回一句 "error"，前端就只能猜。',
    terms: [
      {
        en: 'status code',
        zh: 'HTTP 状态码',
        plain:
          '响应头上的一个数字。4xx 是「你请求有问题」，5xx 是「我这边有问题」—— 前端对这两类的处理方式完全不同。',
      },
      {
        en: 'error code',
        zh: '业务错误码',
        plain:
          '响应体里你自己定义的字符串，比如 STOCK_NOT_ENOUGH。状态码只有几十个，业务错误有上千个。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、状态码本身就是契约' },
      {
        type: 'p',
        text: '前端拿到一个响应，第一件事是看状态码。它决定了后面所有逻辑：',
      },
      {
        type: 'table',
        head: ['场景', '该返回', '前端该怎么办'],
        rows: [
          ['参数缺失或格式错', '400', '别重试，提示用户改'],
          ['没登录 / 登录过期', '401', '跳登录页'],
          ['登录了但没权限', '403', '提示无权限，别重试'],
          ['资源不存在', '404', '提示，或退回列表'],
          ['状态冲突（已支付又支付）', '409', '刷新数据，别重试'],
          ['自己的代码炸了', '500', '提示系统繁忙，可重试'],
          ['依赖挂了，暂时不可用', '503', '退避后重试'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '最常见的坏味道：所有失败都返回 `200` + `{code: 1, msg: "xxx"}`。\n' +
          '这样监控系统看不到任何异常（它只看状态码），前端也得为每个接口写一堆 if。',
      },

      { type: 'h2', text: '二、业务错误要有自己的码' },
      {
        type: 'p',
        text: '状态码只有几十个，业务错误却有成百上千。所以需要两层：状态码说「哪一类」，业务码说「具体是什么」。',
      },
      {
        type: 'code',
        lang: 'json',
        title: '一个够用的错误响应',
        code: `
{
  "code": "STOCK_NOT_ENOUGH",
  "message": "库存不足，仅剩 3 件",
  "data": { "sku_id": 123, "available": 3 }
}
`,
      },
      {
        type: 'p',
        text: '`data` 那一层很重要。前端要展示「仅剩 3 件」，如果只给一句 message，它就得去解析中文字符串 —— 一改文案就崩。',
      },

      { type: 'h2', text: '三、永远不要吞异常' },
      {
        type: 'code',
        lang: 'python',
        title: '✕ 一个非常常见的写法',
        code: `
try:
    await do_something()
except Exception:
    return {"code": 1, "msg": "失败"}
`,
      },
      { type: 'p', text: '这样做的后果是一条完整的滑坡：' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '真实异常被吃掉' },
          { text: '日志里没有堆栈' },
          { text: '监控看不到错误率' },
          { text: '用户报障你查不出原因' },
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text: '**吞异常是后端最贵的 bug。** 它不制造错误，它让错误变得不可见。',
      },
      {
        type: 'p',
        text: '正确姿势：业务上能预期的错误，转成明确的错误码；预期之外的，让它冒到全局处理器，记录堆栈并返回 500。',
      },
      {
        type: 'code',
        lang: 'python',
        title: '两层异常处理器',
        code: `
@app.exception_handler(BusinessError)
async def handle_business(request, exc: BusinessError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "message": exc.message, "data": exc.data},
    )


@app.exception_handler(Exception)
async def handle_unexpected(request, exc: Exception):
    logger.exception("unhandled", extra={"trace_id": request.state.trace_id})
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "系统繁忙，请稍后再试"},
    )
`,
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '参数错误返回 400，不是 500', v: '故意传错类型' },
          { k: '业务错误有独立错误码，前端能 switch', v: '触发几个业务异常' },
          { k: '异常日志里有完整堆栈', v: '看日志文件' },
          { k: '503 和 500 分得清', v: '停掉 Redis 再请求' },
          { k: '错误响应里没有泄露 SQL 或堆栈', v: '直接读响应体' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '为什么「库存不足」用 409 而不是 400？',
          '「系统繁忙」要不要告诉用户具体原因？什么情况下必须说？',
          '如果一个接口可能返回 30 种业务错误，前端怎么维护这些分支？',
        ],
      },
    ],
  },
}

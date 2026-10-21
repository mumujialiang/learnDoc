export default {
  'M3-01': {
    code: 'M3-01',
    title: '购物车与价格快照',
    chapter: '交易核心',
    minutes: 50,
    lead:
      '购物车不是「订单的草稿」，它是独立的东西。\n' +
      '因为它有三个订单没有的特性：会失效、会合并、会被用户反复改。',
    terms: [
      {
        en: '价格快照',
        zh: 'price snapshot',
        plain: '加入购物车那一刻的价格。存下来，之后才能对比"涨了还是降了"。',
      },
      {
        en: '失效商品',
        zh: 'invalid item',
        plain: '已下架、已售罄、已删除的商品。它还在购物车里，但买不了。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、购物车存在哪' },
      {
        type: 'table',
        head: ['用户状态', '存在哪', '代价'],
        rows: [
          ['未登录', 'localStorage + 服务端临时 ID', '换设备就没了'],
          ['已登录', '服务端数据库', '换设备还在'],
        ],
      },
      {
        type: 'p',
        text: '很多系统的做法是：未登录时用 cookie 里的临时 ID 在服务端存一份。这样登录后能直接合并，不用让用户重加一遍。',
      },

      { type: 'h2', text: '二、登录时的合并，是事故高发区' },
      { type: 'p', text: '未登录加了 3 件，登录后账号里还有 2 件。合并时有三道题必须回答：' },
      {
        type: 'list',
        items: [
          '同一个 SKU 出现两次，数量相加还是取大的？',
          '加购时 99，现在 129，显示哪个价？',
          '商品已下架，合并进来还是丢掉？',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '常见策略：**同 SKU 数量相加、展示当前价格、下架商品标记为失效但不删除**。\n' +
          '不删除是因为用户可能还想看「我加过什么」，直接消失会让他怀疑自己记错了。',
      },

      { type: 'h2', text: '三、价格要不要冻结' },
      { type: 'p', text: '这是购物车最核心的设计问题，没有标准答案，但有明确的代价：' },
      {
        type: 'table',
        head: ['方案', '加购时存什么', '结算时'],
        rows: [
          ['不冻结', '只存 sku_id 和数量', '按当前价格算'],
          ['冻结', '额外存 price 快照', '对比：变了要明确提示'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '电商规范普遍要求：**结算价必须让用户确认**。\n' +
          '加购 99、结算 129，必须明确提示「价格已变动」，不能悄悄按 129 收。',
      },

      { type: 'h2', text: '四、表结构' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table cart_item (
  id             bigserial primary key,
  user_id        bigint not null,
  sku_id         bigint not null,
  qty            int not null check (qty > 0),
  price_snapshot numeric(12,2) not null,
  added_at       timestamptz not null default now(),
  unique (user_id, sku_id)        -- 同一 SKU 只有一行
);
`,
      },
      {
        type: 'p',
        text: '那个 `unique` 很关键。没有它，用户点两次「加入购物车」就会出现两行，后面所有的数量计算都要特殊处理。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '同一 SKU 不会出现两行', v: '连续加购两次' },
          { k: '下架商品标记失效，不是消失', v: '下架一个再看购物车' },
          { k: '价格变化时结算页有提示', v: '改价后走一遍结算' },
          { k: '未登录的购物车登录后能合并', v: '清 cookie 加购再登录' },
        ],
      },
    ],
  },

  'M3-02': {
    code: 'M3-02',
    title: '价格计算与优惠分摊',
    chapter: '交易核心',
    minutes: 60,
    lead:
      '一张订单用了优惠券、满减、会员折扣。用户要退其中一件 —— 该退多少钱？\n' +
      '如果系统没做「分摊」，这道题无解。',
    terms: [
      {
        en: '优惠分摊',
        zh: 'discount allocation',
        plain: '把总优惠按比例分到每一行商品上，让每行都有明确的实付金额。',
      },
      {
        en: '分摊误差',
        zh: 'rounding residue',
        plain: '除不尽的那几分钱。必须有地方吸收，否则总额对不上。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、优惠叠加的顺序，是业务决策' },
      { type: 'p', text: '同一笔订单可能有多种优惠。顺序不同，结果不同：' },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '原价 300，同时挂着「8 折」和「满 200 减 30」：\n' +
          '① 先打折，再满减 → 240 → **210**\n' +
          '② 先满减，再打折 → 270 → **216**\n' +
          '同一笔订单，两种顺序差 6 块钱。',
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**顺序必须写进需求文档并固定下来。**\n' +
          '不然运营算一遍、财务算一遍、开发实现一遍，三个数字对不上，最后开会吵一周。',
      },

      { type: 'h2', text: '二、为什么必须分摊' },
      {
        type: 'p',
        text: '订单：A 商品 100 元，B 商品 200 元，总优惠 30 元。用户要退 A。',
      },
      {
        type: 'table',
        head: ['做法', '退多少', '问题'],
        rows: [
          ['按原价退 100', '100', '平台白送了 A 应承担的 10 元优惠'],
          ['平均分 15', '85', 'B 的优惠被 A 拿走了'],
          ['按比例分 10', '90', '正确'],
        ],
      },
      {
        type: 'p',
        text: 'A 占总价的 1/3，所以承担 30 × 1/3 = 10 元优惠。A 的实付是 90，退款就退 90。',
      },

      { type: 'h2', text: '三、除不尽的那一分钱' },
      {
        type: 'code',
        lang: 'python',
        code: `
# 总优惠 100，分给 3 行，每行 33.33
shares = [Decimal("33.33"), Decimal("33.33"), Decimal("33.33")]
# 加起来 99.99，少了 0.01

# 把差额补给最后一行
shares[-1] += total_discount - sum(shares)
`,
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**必须保证 sum(分摊) 严格等于总优惠。**\n' +
          '差 1 分钱，财务对账就挂，而且极难排查 —— 因为业务上看起来一切正常。',
      },

      { type: 'h2', text: '四、订单行要存这些' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table order_item (
  id              bigserial primary key,
  order_id        bigint not null,
  sku_id          bigint not null,
  qty             int not null,
  price           numeric(12,2) not null,             -- 下单时单价
  discount_share  numeric(12,2) not null default 0,   -- 分摊到的优惠
  payable         numeric(12,2) not null              -- 实付 = price*qty - discount_share
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '`payable` 是冗余字段（能从另外两个算出来），但它让退款、对账、报表都不用重算。\n' +
          '**这里的冗余是划算的** —— 它把一个容易算错的逻辑固化成数据。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '各行 payable 之和等于订单实付', v: '写断言测试' },
          { k: '分摊误差被吸收，总差额为 0', v: '随机造 100 单验证' },
          { k: '优惠叠加顺序写在注释里', v: '读代码' },
          { k: '退款按 payable 退，不按 price 退', v: '测一次部分退款' },
        ],
      },
    ],
  },

  'M3-03': {
    code: 'M3-03',
    title: '库存模型',
    chapter: '交易核心',
    minutes: 55,
    lead:
      '库存不是一个数字，是四个数字。\n' +
      '实物有多少、锁定了多少、在途多少、能卖多少 —— 合成一个，你迟早会算错。',
    terms: [
      {
        en: '可售库存',
        zh: 'available',
        plain: '现在能卖给用户的数量。它不等于仓库里实物有多少。',
      },
      {
        en: '锁定 / 预占',
        zh: 'locked',
        plain: '已经下单但还没付款的，先扣住不给别人买。',
      },
      {
        en: '在途',
        zh: 'in transit',
        plain: '采购了、还没入库的货。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、四个量的关系' },
      {
        type: 'callout',
        kind: 'info',
        text: '**可售 = 实物 − 锁定**。有的系统还会把在途算进来，但这条式子就是整节的核心。',
      },
      {
        type: 'table',
        head: ['量', '含义', '谁在改它'],
        rows: [
          ['实物库存', '仓库里真实有的', '入库单、出库单'],
          ['锁定库存', '下单未付款的', '下单 +1，支付后转为出库，超时释放'],
          ['可售库存', '能卖给用户的', '由上面两个计算'],
          ['在途库存', '采购中还没到货的', '采购单'],
        ],
      },
      { type: 'p', text: '点几下就明白了 —— 注意「实物」和「可售」什么时候会分开：' },
      { type: 'widget', name: 'stock' },
      {
        type: 'howto',
        rows: [
          { k: '下单 10 件', v: '实物还是 100，但可售掉到 90，条上出现一段金色。货没动，别人买不到了' },
          { k: '支付', v: '金色消失，实物条真的变短 —— 这才是「卖掉了」' },
          { k: '超时取消', v: '金色退回青色，实物一根手指都没动过' },
        ],
      },

      { type: 'h2', text: '二、只有一个字段会怎样' },
      { type: 'p', text: '商品实物 10 件。A 下单 3 件没付款，B 下单 5 件也没付款。' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: 'A 下单，10 → 7' },
          { text: 'B 下单，7 → 2' },
          { text: '两人都超时取消' },
          { text: '库存变成 2，实际有 10' },
          { text: '少卖 8 件', mark: true },
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '所以「减库存」这个说法本身就不准确。\n' +
          '准确的说法是：**下单时加锁定量，不是减实物量**。',
      },

      { type: 'h2', text: '三、表怎么设计' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock (
  sku_id    bigint primary key,
  physical  int not null default 0,    -- 仓库里真实有的
  locked    int not null default 0,    -- 已下单未付款的
  available int generated always as (physical - locked) stored
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '用生成列让数据库来算，避免应用层写错公式。\n' +
          '代价是每次写入都要重算 —— 极高并发下可以考虑去掉，靠应用保证。',
      },

      { type: 'h2', text: '四、锁定什么时候释放' },
      {
        type: 'list',
        items: [
          '支付成功：锁定转为出库，实物减少',
          '超时未支付：定时任务释放锁定',
          '用户主动取消：立即释放',
          '退款：看商品是否退回仓库，决定是否加回实物',
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '超时释放的任务**必须幂等**。\n' +
          '重复执行一次，可能把别人刚锁的量放掉，直接导致超卖。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '库存至少区分 physical 和 locked', v: '看表结构' },
          { k: '锁定有超时释放机制', v: '下单不付款等超时' },
          { k: '释放任务重复执行不会多释放', v: '手动跑两次' },
          { k: '后台能查到某个 SKU 的各类数量', v: '看后台页面' },
        ],
      },
    ],
  },

  'M3-04': {
    code: 'M3-04',
    title: '下单扣减与超卖',
    chapter: '交易核心',
    minutes: 70,
    lead:
      '两个人同时买最后一件。\n' +
      '两个请求都读到「还有 1 件」，都判断「够」，都扣了 —— 结果卖了 2 件。\n' +
      '这就是超卖。它只发生在几毫秒的窗口里，但足够毁掉一次大促。',
    terms: [
      {
        en: '超卖',
        zh: 'oversell',
        plain: '卖出去的比实际有的多。用户付了钱，你发不出货。',
      },
      {
        en: '原子性',
        zh: 'atomic',
        plain: '一个操作要么全做完，要么完全没发生，中间不能被插队。',
      },
      {
        en: '条件更新',
        zh: 'conditional update',
        plain: '把判断写进 update 的 where 里，让数据库一次性完成判断和修改。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、超卖是怎么发生的' },
      {
        type: 'code',
        lang: 'python',
        title: '✕ 查询和扣减分成两步',
        code: `
stock = await get_stock(sku_id)      # 读到 1
if stock.available >= qty:           # 判断够
    await decr_stock(sku_id, qty)    # 扣减
`,
      },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '请求 A 读到 1' },
          { text: '请求 B 也读到 1' },
          { text: 'A 判断够，扣减' },
          { text: 'B 也判断够，扣减' },
          { text: '库存 -1，卖了 2 件', mark: true },
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**根本原因：读取和写入之间有一个时间窗口。**\n' +
          '只要判断和扣减不是原子的，这个窗口就一直存在 —— 不管你把代码写得多漂亮。',
      },
      { type: 'p', text: '把这块窗口画出来，你一眼就能看见它有多长：' },
      { type: 'widget', name: 'oversell' },
      {
        type: 'howto',
        rows: [
          { k: '看红色竖带', v: '那是「已读取、还没写入」的窗口。谁在这个区间里读，读到的都是旧值' },
          { k: '调到 5 个并发', v: '五条时间轴互相咬住，库存一路扣到 -4' },
          { k: '切「条件更新」', v: '只有第一条能扣成功，其余写入段变成虚线 —— 影响 0 行' },
        ],
      },

      { type: 'h2', text: '二、方案一：把条件写进 SQL' },
      {
        type: 'code',
        lang: 'sql',
        title: '✓ 判断和修改是同一条语句',
        code: `
update stock
set locked = locked + :qty
where sku_id = :sku_id
  and physical - locked >= :qty;

-- 影响 0 行 = 库存不够，直接返回失败
`,
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '**这是最简单也最可靠的方案，绝大多数场景够用。**\n' +
          '数据库保证了这一条语句内部不会被其他事务插队。',
      },

      { type: 'h2', text: '三、方案二：悲观锁' },
      {
        type: 'code',
        lang: 'sql',
        code: `
select * from stock where sku_id = :id for update;
-- 这一行被锁住，其他事务必须等
update stock set locked = locked + :qty where sku_id = :id;
`,
      },
      {
        type: 'table',
        head: ['', '适合', '不适合'],
        rows: [
          ['条件更新', '并发高、逻辑简单', '扣减前要读很多其他数据'],
          ['悲观锁', '逻辑复杂、要多步读写', '同一行热点极高'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '悲观锁在秒杀场景是灾难：上万人抢同一个 SKU，全部排队。\n' +
          '连接池几秒内被占满，然后整个服务连别的接口都响应不了。',
      },

      { type: 'h2', text: '四、方案三：Redis 预扣' },
      {
        type: 'code',
        lang: 'lua',
        title: 'Lua 保证判断和扣减原子',
        code: `
local stock = tonumber(redis.call('get', KEYS[1]))
if stock < tonumber(ARGV[1]) then
    return 0
end
redis.call('decrby', KEYS[1], ARGV[1])
return 1
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          'Redis 方案会引入新问题：**Redis 挂了怎么办？Redis 和数据库对不上怎么办？**\n' +
          '所以它只适合「秒杀」这种极端场景，必须配异步落库 + 定时对账兜底。',
      },

      { type: 'h2', text: '五、选型建议' },
      {
        type: 'table',
        head: ['场景', '方案'],
        rows: [
          ['普通商城', '条件更新（方案一）'],
          ['后台人工操作', '悲观锁'],
          ['秒杀 / 大促', 'Redis 预扣 + 异步落库 + 限流'],
        ],
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: '扣减是单条 SQL，没有先查后改', v: '读代码' },
          { k: '50 并发抢 10 件，只成功 10 次', v: '写压测脚本' },
          { k: '库存为 0 时返回明确错误，不是 500', v: '扣到 0 再下单' },
          { k: '扣减失败会回滚整个事务', v: '制造后续异常' },
        ],
      },
    ],
  },

  'M3-05': {
    code: 'M3-05',
    title: '支付回调',
    chapter: '交易核心',
    minutes: 60,
    lead:
      '支付平台的回调，一定重复、一定乱序、一定会有丢的。\n' +
      '如果你的代码假设「它只会来一次、而且按顺序来」，上线第一天就会出事。',
    terms: [
      {
        en: 'webhook',
        zh: '回调',
        plain: '支付平台主动请求你的接口，告诉你这笔支付的结果。',
      },
      {
        en: '验签',
        zh: 'signature verify',
        plain: '用密钥验证这个请求确实来自支付平台，而不是别人伪造的。',
      },
      {
        en: '掉单',
        zh: 'lost order',
        plain: '用户付了钱，但你的系统没收到通知，订单还停在待支付。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、回调的三个必然' },
      {
        type: 'table',
        head: ['现象', '原因', '你该怎么办'],
        rows: [
          ['重复通知', '平台没收到你的 200，会一直重试', '幂等'],
          ['乱序', '先发的失败通知后到', '按状态机处理，不回退'],
          ['丢失', '网络问题、你服务正在重启', '主动查询兜底'],
        ],
      },

      { type: 'h2', text: '二、验签不能省' },
      {
        type: 'code',
        lang: 'python',
        code: `
def verify(payload: bytes, signature: str) -> bool:
    expect = hmac.new(SECRET, payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expect, signature)
`,
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '不验签，等于开了一个「谁都能把订单改成已支付」的接口。\n' +
          '而且必须用 `compare_digest`，普通 `==` 会因为提前返回而泄露信息。',
      },

      { type: 'h2', text: '三、幂等 + 状态机，一条 SQL 解决' },
      {
        type: 'code',
        lang: 'sql',
        code: `
update orders
set status = 'paid', paid_at = now(), transaction_id = :tid
where id = :order_id
  and status = 'pending'        -- 只有待支付才能变已支付
  and amount = :paid_amount;    -- 顺手校验金额
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '三个条件一起：状态对、金额对、只能成功一次。\n' +
          '影响 0 行时应该返回 200 —— 因为可能是重复通知，这不是错误。',
      },

      { type: 'h2', text: '四、掉单兜底' },
      { type: 'p', text: '如果回调真的丢了，用户付了钱但订单还停在待支付。必须有主动查询。' },
      {
        type: 'steps',
        items: [
          { t: '找出可疑订单', d: '定时扫描超过 5 分钟还是待支付的订单。' },
          { t: '主动调支付平台的查询接口', d: '问它：这笔到底付了没？' },
          { t: '按查询结果补状态', d: '走和回调同一套状态机逻辑，不要写第二份。' },
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '主动查询和被动回调**必须复用同一段处理逻辑**。\n' +
          '写两份，迟早不一致 —— 而这两份不一致的地方，就是钱出错的地方。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '回调接口验签了', v: '伪造一个请求试试' },
          { k: '同一回调打 5 次，只生效一次', v: '手动重发' },
          { k: '金额不匹配的请求被拒绝', v: '改金额重发' },
          { k: '有掉单补偿的定时任务', v: '看任务列表' },
        ],
      },
    ],
  },

  'M3-06': {
    code: 'M3-06',
    title: '订单状态机与履约',
    chapter: '交易核心',
    minutes: 50,
    lead:
      '订单状态不只是「走到哪了」，它决定了「现在能做什么」。\n' +
      '待支付能取消，已发货不能。这条规则如果散落在几十个 if 里，一定会漏。',
    terms: [
      {
        en: '履约',
        zh: 'fulfillment',
        plain: '从支付完成到商品送达的全过程：接单、拣货、发货、签收。',
      },
      {
        en: '逆向流程',
        zh: 'reverse flow',
        plain: '取消、退款、退货、换货。比正向复杂得多，分支是正向的三倍。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、正向主流程' },
      {
        type: 'chain',
        kind: 'ok',
        items: [
          { text: '待支付' },
          { text: '已支付' },
          { text: '待发货' },
          { text: '已发货' },
          { text: '已完成' },
        ],
      },
      { type: 'p', text: '每一跳都对应一个业务动作，而不是「改个字段」：' },
      {
        type: 'table',
        head: ['迁移', '触发', '副作用'],
        rows: [
          ['待支付 → 已支付', '支付回调', '通知仓库、加积分'],
          ['已支付 → 待发货', '仓库接单', '锁定转出库'],
          ['待发货 → 已发货', '填写运单号', '通知用户、开始计时'],
          ['已发货 → 已完成', '确认收货或超时', '结算货款'],
        ],
      },

      { type: 'h2', text: '二、逆向比正向多' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '待支付 → 已取消' },
          { text: '已支付 → 退款中 → 已退款' },
          { text: '已发货 → 退货中 → 已退货' },
          { text: '任意 → 部分退款' },
        ],
      },
      {
        type: 'p',
        text: '正向只有一条路，逆向有十几种。所以必须有一张明确的地图（上一节的状态迁移表），不能靠记忆。',
      },

      { type: 'h2', text: '三、状态变更要发事件' },
      {
        type: 'code',
        lang: 'python',
        code: `
async def transit(order, to):
    check_transition(order.status, to)
    order.status = to
    await log_status(order, to)
    await publish("order.status_changed", {
        "order_id": order.id, "from": old, "to": to
    })
`,
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '发事件是为了解耦：加积分、发短信、通知仓库，都不该写在订单服务里。\n' +
          '但**事件必须在事务提交后发**。否则事务回滚了，消息已经发出去了，下游去做了一件不存在的事。',
      },

      { type: 'h2', text: '四、超时也是一种状态迁移' },
      {
        type: 'list',
        items: [
          '待支付 30 分钟未付 → 自动取消，释放库存',
          '已发货 15 天未确认 → 自动确认收货',
          '退款中 7 天未处理 → 升级为客服工单',
        ],
      },
      {
        type: 'p',
        text: '这些定时任务都要幂等。而且要注意：**它们改的是状态，不是业务结果**。自动确认收货只改状态，钱早就结算了。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '状态迁移有白名单，非法迁移报错', v: '构造一次非法迁移' },
          { k: '每次迁移都有日志和事件', v: '改一次状态看' },
          { k: '超时任务存在且幂等', v: '手动跑两次' },
          { k: '事件在事务提交后发', v: '制造回滚看消息' },
        ],
      },
    ],
  },

  'M3-07': {
    code: 'M3-07',
    title: '售后与逆向流程',
    chapter: '交易核心',
    minutes: 55,
    lead:
      '正向流程只有一条路，逆向有十几种。\n' +
      '退款、退货、换货、部分退、拒绝退款 —— 每一种的金额算法都不一样。',
    terms: [
      {
        en: '售后单',
        zh: 'after-sale order',
        plain: '独立于订单的一张单据，记录这次售后请求和它的审批过程。',
      },
      {
        en: '冲正',
        zh: 'reversal',
        plain: '用一条反向记录抵消原记录，而不是去改原来那条。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、为什么售后要独立成单' },
      {
        type: 'list',
        items: [
          '一个订单可能有多笔售后，退不同商品',
          '售后有自己的状态和审批流程',
          '要留完整的沟通记录、凭证、物流单号',
        ],
      },
      {
        type: 'p',
        text: '把售后字段塞进订单表，很快就变成 30 个字段，其中一半只在一两种情况下有值。',
      },

      { type: 'h2', text: '二、退款金额怎么算' },
      { type: 'p', text: '这是最容易算错的地方。看一个具体例子：' },
      {
        type: 'table',
        head: ['商品', '原价', '分摊优惠', '实付'],
        rows: [
          ['A', '100', '-10', '90'],
          ['B', '200', '-20', '180'],
          ['合计', '300', '-30', '270'],
        ],
      },
      { type: 'p', text: '用户只退 A。该退多少？' },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**退 A 的实付 90，不是原价 100。**\n' +
          '多退 10 块，就是平台白送。这个 bug 在量大的时候能亏出一套房。',
      },

      { type: 'h2', text: '三、部分退款的边界情况' },
      { type: 'p', text: '如果整单优惠是「满 300 减 30」，退掉 A 之后只剩 200 —— 不满足满减条件了。' },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '这时候要不要追回优惠？\n' +
          '这是**业务决策**，不是技术决策。必须提前定，写进规则，而不是让开发临时拍脑袋。',
      },

      { type: 'h2', text: '四、退货要入库存，但不是简单加' },
      {
        type: 'list',
        items: [
          '要检查商品是否影响二次销售',
          '要按原批次入库，不能和正常货混',
          '成本价用原出库成本，不是当前成本',
        ],
      },
      {
        type: 'p',
        text: '第三条最容易被忽略。三个月前成本 50，现在成本 60。退货入库按 60 算，你的成本账就乱了。',
      },

      { type: 'h2', text: '五、表结构' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table after_sale (
  id            bigserial primary key,
  order_id      bigint not null,
  type          smallint not null,   -- 1退款 2退货退款 3换货
  status        smallint not null,   -- 申请/审核/处理中/完成/拒绝
  refund_amount numeric(12,2) not null,
  reason        varchar(255),
  created_at    timestamptz not null default now()
);

create table after_sale_item (
  id             bigserial primary key,
  after_sale_id  bigint not null,
  order_item_id  bigint not null,
  qty            int not null,
  refund_amount  numeric(12,2) not null
);
`,
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: '部分退款按行实付退，不按原价', v: '算一笔看' },
          { k: '退款金额不会超过订单实付', v: '构造边界值' },
          { k: '多次部分退款加起来不超过总实付', v: '连续退 3 次' },
          { k: '退货入库走单据，不直接改库存', v: '看代码' },
        ],
      },
    ],
  },
}

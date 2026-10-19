export default {
  'M1-02': {
    code: 'M1-02',
    title: '金额与精度',
    chapter: '领域建模',
    minutes: 45,
    lead:
      '前端算价格，99.9 × 3 得到 299.70000000000005 时，你可能只是皱了下眉，然后 toFixed(2)。\n' +
      '在后端，这个数字会进财务报表、发票、银行对账。',
    terms: [
      {
        en: 'Decimal / Numeric',
        zh: '精确小数',
        plain: '按十进制存的小数类型，不经过二进制转换，所以没有误差。',
      },
      {
        en: '整数分',
        zh: '最小单位',
        plain: '把「元」换算成「分」存成整数，彻底绕开小数。支付通道基本都这么干。',
      },
      {
        en: '舍入规则',
        zh: 'rounding',
        plain: '四舍五入、四舍六入五成双（银行家舍入）。定不下来，财务就会来找你。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、float 为什么会错' },
      {
        type: 'code',
        lang: 'python',
        code: `
>>> 0.1 + 0.2
0.30000000000000004
>>> 99.9 * 3
299.70000000000005
`,
      },
      {
        type: 'p',
        text: '因为二进制表示不了 0.1，就像十进制写不出 1/3。这个误差单次只有 1e-17，但你把 10 万条订单加起来，就是几毛到几块的差额 —— 对账对不平。',
      },
      {
        type: 'callout',
        kind: 'danger',
        text: '钱不能用 float。这不是代码风格问题，是正确性问题。',
      },

      { type: 'h2', text: '二、两种正确姿势' },
      {
        type: 'table',
        head: ['做法', '存什么', '用在哪'],
        rows: [
          ['Decimal', 'numeric(12,2)', '后端计算、报表、发票'],
          ['整数分', 'bigint，单位是分', '对接支付通道'],
        ],
      },
      {
        type: 'code',
        lang: 'sql',
        title: '表结构',
        code: `
price      numeric(12,2) not null,   -- 10 位整数 + 2 位小数
cost_price numeric(12,2)
`,
      },
      {
        type: 'code',
        lang: 'python',
        title: '算钱的时候',
        code: `
from decimal import Decimal, ROUND_HALF_UP

total = (Decimal("99.90") * 3).quantize(
    Decimal("0.01"), rounding=ROUND_HALF_UP
)
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '为什么是 (12,2)：整数部分 10 位，最大约 99 亿，够任何单品价格。\n' +
          '不要用 (65,30) 这种「保险起见」的写法 —— 它让索引变胖、计算变慢，还容易被客户端精度截断。',
      },

      { type: 'h2', text: '三、舍入：最容易吵架的地方' },
      { type: 'p', text: '1 分钱的差额，财务能追你三天。所以要提前把规则定死：' },
      {
        type: 'list',
        items: [
          '每个商品算完就舍入，还是最后总额才舍入？',
          '优惠分摊到每一行，除不尽的那 1 分钱归谁？',
          '按比例退款，四舍五入后加起来超过原价怎么办？',
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '铁律：**分摊、折扣、税费必须能倒推回原值**。\n' +
          '即 sum(每一行) 严格等于总额，多一分少一分都是 bug。',
      },

      { type: 'h2', text: '四、一旦有外币' },
      {
        type: 'table',
        head: ['字段', '为什么必须有'],
        rows: [
          ['currency', '¥100 和 $100 不是一回事'],
          ['exchange_rate', '三个月后对账，要用当时的汇率'],
          ['rate_at', '汇率每天在变，必须知道用的是哪一版'],
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '所有金额字段都是 numeric，没有 float / double', v: '全局搜 Float' },
          { k: 'Python 里用 Decimal，不出现 float()', v: '读代码' },
          { k: '优惠分摊后，各行之和等于总额', v: '写断言测试' },
          { k: '金额字段带币种', v: '看表结构' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么不能「先存 float，展示时再格式化」？',
          '如果支付通道只收整数分，系统内部该用什么？转换发生在哪一层？',
          '汇率应该下单时锁定，还是支付时取实时？',
        ],
      },
    ],
  },

  'M1-03': {
    code: 'M1-03',
    title: '主数据 / 单据 / 台账',
    chapter: '领域建模',
    minutes: 50,
    lead:
      'ERP 里有三种完全不同的数据，生命周期、修改方式、审计要求都不一样。\n' +
      '把它们当成同一种东西处理，是 ERP 项目最常见的返工原因。',
    terms: [
      {
        en: '主数据',
        zh: 'master data',
        plain: '商品、客户、供应商、仓库。变化慢，被所有业务引用。',
      },
      {
        en: '业务单据',
        zh: 'document',
        plain: '订单、入库单、调拨单。有生命周期：草稿 → 审核 → 执行 → 作废。',
      },
      {
        en: '流水台账',
        zh: 'ledger',
        plain:
          '库存变动、资金流水。只追加，永不修改 —— 任何时刻的余额都能由历史记录推导出来。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、三种数据，三种规矩' },
      {
        type: 'table',
        head: ['类型', '例子', '能改吗', '能删吗'],
        rows: [
          ['主数据', '商品、客户、仓库', '能改，但要走变更流程', '不能，只能停用'],
          ['业务单据', '订单、入库单', '草稿能改，审核后冻结', '不能，只能作废'],
          ['流水台账', '库存变动、资金流水', '一个字都不能改', '绝对不能'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**台账只能追加。** 记错了怎么办？再记一条反向的冲正记录。\n' +
          '这不是洁癖，是审计要求：任何时刻的余额，都必须能由流水推导出来。',
      },

      { type: 'h2', text: '二、混在一起会发生什么' },
      {
        type: 'p',
        text: '把「库存数量」当成一个可以随便改的字段，事故是这样发生的：',
      },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '运营手改了一次库存' },
          { text: '不知道谁改的、为什么改' },
          { text: '月底盘亏 200 件' },
          { text: '查不出是哪一笔' },
        ],
      },
      {
        type: 'p',
        text: '如果库存是台账推出来的余额，每一笔变动都有一条记录，问题就能定位到具体单据。',
      },

      { type: 'h2', text: '三、单据的骨架' },
      {
        type: 'code',
        lang: 'sql',
        title: '头 + 明细',
        code: `
-- 单据头：这次入库"这件事"
create table stock_in (
  id           bigserial primary key,
  doc_no       varchar(32) not null unique,
  warehouse_id bigint not null,
  status       smallint not null default 0,  -- 0草稿 1已审核 2已执行 3已作废
  created_by   bigint not null,
  created_at   timestamptz not null default now()
);

-- 单据明细：入了"哪些货"
create table stock_in_item (
  id       bigserial primary key,
  doc_id   bigint not null references stock_in(id),
  sku_id   bigint not null,
  qty      numeric(14,3) not null,
  batch_no varchar(64)
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '一张入库单可能有 50 个商品。头表存「这件事」，明细存「哪些货」。\n' +
          '**状态挂在头上，不挂在明细上** —— 不然一行行审核，永远对不齐。',
      },

      { type: 'h2', text: '四、状态决定了能不能改' },
      {
        type: 'p',
        text: '草稿状态可以随便改。一旦审核通过就冻结。要改？作废重开，而不是偷偷改。',
      },
      {
        type: 'p',
        text: '这不是流程繁琐，是**责任归属**：审核人签过字的东西，不能悄悄被改掉。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '台账表里搜不到 update 语句', v: '全局搜' },
          { k: '单据审核后接口层禁止编辑', v: '手动试' },
          { k: '单据号唯一，且有业务含义（前缀+日期+序号）', v: '看 doc_no' },
          { k: '每张表都有 created_by / created_at', v: '看表结构' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '主数据改名了，历史单据上显示新名字还是旧名字？',
          '「作废」和「删除」的区别是什么？为什么需要前者？',
          '如果台账漏记了一笔，怎么补救才不破坏审计？',
        ],
      },
    ],
  },

  'M1-04': {
    code: 'M1-04',
    title: '状态机',
    chapter: '领域建模',
    minutes: 45,
    lead:
      '订单状态不是一个字段，是一张地图。\n' +
      '地图上标着哪些路能走、哪些是死路。没有地图，代码迟早会走到悬崖上。',
    terms: [
      {
        en: 'state machine',
        zh: '状态机',
        plain:
          '一组状态 + 允许的迁移。比如「待支付」只能去「已支付」或「已取消」，不能直接去「已完成」。',
      },
      {
        en: '非法跃迁',
        zh: 'illegal transition',
        plain: '从「已发货」直接跳回「待支付」这种不该发生的转换。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、最常见的写法，问题在哪' },
      {
        type: 'p',
        text: '最直觉的写法是「如果当前是某个状态，就改成目标状态」—— 一句判断，一句赋值。短小、好懂、随处可见。',
      },
      {
        type: 'p',
        text: '但它什么都没拦。它允许从**任何**状态跳到目标状态。三个月后，你会看到「已退款」的订单又变成了「已完成」，而且没人知道是哪段代码干的。',
      },

      { type: 'h2', text: '二、把地图写下来' },
      { type: 'p', text: '六个状态，把每个状态「能去哪」列清楚，就是一张完整的表：' },
      {
        type: 'table',
        head: ['当前状态', '允许变成'],
        rows: [
          ['待支付', '已支付 / 已取消'],
          ['已支付', '已发货 / 退款中'],
          ['已发货', '已完成 / 退款中'],
          ['已完成', '退款中'],
          ['退款中', '已退款 / 已支付'],
        ],
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '就这五行，把所有合法路径写死了。任何一次状态变更都先查这张表，不在表里的直接抛错。\n' +
          '新人接手时看这五行，比读 500 行 if 更快。',
      },

      { type: 'h2', text: '三、状态变更必须留痕' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table order_status_log (
  id          bigserial primary key,
  order_id    bigint not null,
  from_status varchar(16),
  to_status   varchar(16) not null,
  operator_id bigint,
  reason      varchar(255),
  created_at  timestamptz not null default now()
);
`,
      },
      {
        type: 'p',
        text: '出问题时，「这单为什么变成这样」是第一个要回答的问题。没有这张表，你只能猜。',
      },

      { type: 'h2', text: '四、并发下只有一个能成功' },
      {
        type: 'code',
        lang: 'sql',
        title: '判断和修改写在同一条语句里',
        code: `
update orders set status = 'paid'
where id = :id and status = 'pending';
-- 影响 0 行 = 别人已经改过了
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '这就是把状态机写进 SQL 的好处：**判断和修改是同一条语句，中间没有窗口**。\n' +
          '如果分成「先查状态，再更新」，两个请求就能同时通过检查。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '所有状态值定义成常量，代码里没有裸字符串', v: '全局搜' },
          { k: '非法跃迁会抛错，不是静默通过', v: '构造一次非法迁移' },
          { k: '每次状态变更都有日志记录', v: '改一次看表' },
          { k: '并发改状态只有一个成功', v: '并发测试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '订单「取消」之后还能「支付」吗？为什么不能？',
          '状态机该放在 Python 里，还是数据库的 check 约束里？',
          '如果业务要加一个新状态，你要改几处代码？',
        ],
      },
    ],
  },

  'M1-05': {
    code: 'M1-05',
    title: '软删除与审计',
    chapter: '领域建模',
    minutes: 40,
    lead:
      '数据删掉就没了。但业务上真正要问的从来不是「这条数据在不在」，\n' +
      '而是「它什么时候没的、谁弄没的」。',
    terms: [
      {
        en: 'soft delete',
        zh: '软删除',
        plain: '不真删，只打一个 deleted_at 标记。数据还在，只是默认查不到。',
      },
      {
        en: '审计字段',
        zh: 'audit fields',
        plain: 'created_by / created_at / updated_by / updated_at，四个字段回答"谁在什么时候干了什么"。',
      },
      {
        en: 'optimistic lock',
        zh: '乐观锁',
        plain: '用一个版本号防止两个人同时改同一条数据，后提交的那个会失败。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、为什么不能真删' },
      {
        type: 'list',
        items: [
          '订单删了，财务对不上账',
          '用户删了，他的历史订单指向谁',
          '商品删了，报表里的销量变成孤儿数据',
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text: '**能被业务引用的数据，永远不物理删除。** 只做「停用」或「软删除」。',
      },

      { type: 'h2', text: '二、软删除带来的坑：唯一索引' },
      {
        type: 'p',
        text: '商品编码不能重复。但删掉的那条还占着编码，新建同编码就冲突了。',
      },
      {
        type: 'code',
        lang: 'sql',
        title: '部分索引是标准解法',
        code: `
-- ✕ 软删除的行也占着位置
create unique index on sku (sku_code);

-- ✓ 只对未删除的行加唯一约束
create unique index on sku (sku_code) where deleted_at is null;
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '这是 PostgreSQL 的「部分索引」。MySQL 没有这个能力，通常用 `deleted_at = 0` 或额外的删除标记位绕。',
      },

      { type: 'h2', text: '三、审计字段' },
      {
        type: 'table',
        head: ['字段', '谁在写', '干什么用'],
        rows: [
          ['created_by', '创建时的登录用户', '出事时找谁'],
          ['created_at', '数据库默认值 now()', '排序、对账'],
          ['updated_by', '每次修改时覆盖', '追责'],
          ['updated_at', 'ORM 或触发器自动更新', '判断数据新鲜度'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '`created_at` 一定要用**数据库的 now()**，不要用应用服务器的时间。\n' +
          '多台服务器时钟不同步，排序会乱，对账会错。',
      },

      { type: 'h2', text: '四、乐观锁：两个人同时改' },
      {
        type: 'p',
        text: 'A 打开订单准备改地址，B 同时把它改成了已发货。A 点保存，把 B 的改动覆盖掉了 —— 而两个人都以为成功了。',
      },
      {
        type: 'code',
        lang: 'sql',
        title: '版本号',
        code: `
alter table orders add column version int not null default 0;

update orders
set address = :addr, version = version + 1
where id = :id and version = :old_version;
-- 影响 0 行 = 有人在你之前改过了，让用户刷新重来
`,
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '核心业务表有 deleted_at 字段', v: '看表结构' },
          { k: '软删除表的唯一索引带 where deleted_at is null', v: '看索引定义' },
          { k: 'created_at 由数据库生成', v: '看默认值' },
          { k: '并发改同一条记录，第二次会失败', v: '并发测试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '软删除的数据要不要出现在列表里？搜索结果里呢？',
          '如果审计要精确到「改了哪几个字段」，该怎么做？',
          '乐观锁和悲观锁，分别适合什么场景？',
        ],
      },
    ],
  },

  'M1-06': {
    code: 'M1-06',
    title: '多租户建模',
    chapter: '领域建模',
    minutes: 50,
    lead:
      '一套代码，多个客户，数据必须互相看不见。\n' +
      '听起来是个小需求，但它是 SaaS 系统里最容易出安全事故的地方 —— 漏一个 where，就是数据泄露。',
    terms: [
      {
        en: 'tenant',
        zh: '租户',
        plain: '一个独立付费的客户公司。A 公司和 B 公司互为租户。',
      },
      {
        en: '数据隔离',
        zh: 'isolation',
        plain: '保证 A 公司永远查不到 B 公司的数据，从接口到数据库都不能漏。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、三种隔离方式' },
      {
        type: 'table',
        head: ['方式', '怎么做', '成本', '隔离强度'],
        rows: [
          ['字段隔离', '每张表加 tenant_id', '最低', '靠代码纪律'],
          ['Schema 隔离', '每个租户一个 schema', '中', '数据库层隔离'],
          ['库隔离', '每个租户一个数据库', '最高', '物理隔离'],
        ],
      },
      {
        type: 'p',
        text: '90% 的 SaaS 用第一种。省钱、好维护，但对代码纪律要求最高 —— 因为隔离不是数据库强制的，是你要记得写。',
      },

      { type: 'h2', text: '二、最危险的地方：唯一索引' },
      {
        type: 'code',
        lang: 'sql',
        code: `
-- ✕ 全系统商品编码唯一
create unique index on product (code);

-- ✓ 每个租户内唯一
create unique index on product (tenant_id, code);
`,
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '忘记把 `tenant_id` 放进唯一索引，会让 A 公司占用了 B 公司想用的编码。\n' +
          '这类 bug 上线半年才被发现 —— 因为要恰好有两个租户用了同一个编码。',
      },

      { type: 'h2', text: '三、防止漏写 where' },
      {
        type: 'p',
        text: '靠人肉在每个查询里写 `where tenant_id = ?` 是不可靠的，迟早有人忘。几种工程手段：',
      },
      {
        type: 'list',
        items: [
          'ORM 层做全局过滤（SQLAlchemy 的 with_loader_criteria）',
          '请求进来时把 tenant_id 放进上下文，不通过参数传',
          '数据库行级安全（PostgreSQL 的 RLS），由数据库强制',
          '定期搜代码：有多少 select 没带 tenant_id',
        ],
      },
      {
        type: 'code',
        lang: 'python',
        code: `
# 中间件里从 token 解析出租户，塞进上下文
request.state.tenant_id = token.tenant_id


async def get_tenant(request) -> int:
    return request.state.tenant_id
`,
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**永远不要从请求参数里读 tenant_id。**\n' +
          '用户能改参数，就能改成别家的 ID。只能从登录态里取。',
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '每张业务表都有 tenant_id', v: '看表结构' },
          { k: '所有唯一索引都包含 tenant_id', v: '看索引定义' },
          { k: 'tenant_id 来自登录态，不是请求参数', v: '搜参数定义' },
          { k: '用 A 的 token 查不到 B 的数据', v: '造两个租户试' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '如果两个租户要共享同一份商品数据，模型怎么改？',
          '租户注销了，数据该怎么处理？直接删吗？',
          '字段隔离方案下，怎么做跨租户的全局统计？',
        ],
      },
    ],
  },
}

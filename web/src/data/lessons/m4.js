export default {
  'M4-01': {
    code: 'M4-01',
    title: '单据模型',
    chapter: 'ERP 核心',
    minutes: 55,
    lead:
      'ERP 里有一条铁律：库存只能被单据改变。\n' +
      '不能在后台直接改个数字说「这里少 5 件」—— 改了，就再也查不出为什么少。',
    terms: [
      {
        en: '单据',
        zh: 'document',
        plain: '一次业务行为的正式记录：入库单、出库单、调拨单、盘点单。',
      },
      {
        en: '红冲',
        zh: 'reversal',
        plain: '用一张反向单据抵消错的那张，而不是删掉重开。账上会留两条记录。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、为什么要「单据」这么麻烦的形式' },
      { type: 'p', text: '假设你是仓库管理员。老板说「这台机器少了 3 个零件」，你要怎么记录？' },
      {
        type: 'table',
        head: ['做法', '结果'],
        rows: [
          ['直接改库存数字', '查不出谁改的、为什么改、什么时候改的'],
          ['开一张出库单', '有单号、有经手人、有时间、有原因'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**库存的每一次变化，都必须能回答三个问题：谁干的、什么时候、为什么。**\n' +
          '单据就是把这三个问题变成结构化数据。',
      },

      { type: 'h2', text: '二、四类基本单据' },
      {
        type: 'table',
        head: ['单据', '什么时候用', '对库存'],
        rows: [
          ['入库单', '采购到货、退货入库、盘盈', '增加'],
          ['出库单', '销售发货、领用、盘亏', '减少'],
          ['调拨单', '从 A 仓移到 B 仓', '一边减一边加，总量不变'],
          ['盘点单', '实际数和账面数对不上', '按差异调整'],
        ],
      },

      { type: 'h2', text: '三、统一的单据骨架' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock_doc (
  id                 bigserial primary key,
  doc_type           smallint not null,   -- 1入库 2出库 3调拨 4盘点
  doc_no             varchar(32) not null unique,
  status             smallint not null default 0,
  from_warehouse_id  bigint,
  to_warehouse_id    bigint,
  created_by         bigint not null,
  audited_by         bigint,
  audited_at         timestamptz,
  created_at         timestamptz not null default now()
);
`,
      },

      { type: 'h2', text: '四、状态流转' },
      {
        type: 'steps',
        items: [
          { t: '草稿', d: '可以随便改，别人看不见，不产生任何库存影响。' },
          { t: '已审核', d: '冻结。要改只能作废重开 —— 因为这代表有人签字确认过了。' },
          { t: '已执行', d: '真正动了库存。不可逆。' },
          { t: '已作废', d: '还没执行就被取消的单据，留档备查。' },
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**「已执行」之后不能改。** 错了就红冲：开一张反向单据。\n' +
          '这样账上永远有两条记录，能看出来"这里曾经错过一次"—— 这正是审计要的。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '所有库存变化都来自单据', v: '搜代码里的 update stock' },
          { k: '单据号唯一，且有业务规则', v: '看 doc_no 生成逻辑' },
          { k: '已执行的单据不能再改', v: '接口层试一次' },
          { k: '作废要留原因和操作人', v: '看作废接口' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么调拨单不能拆成「一张出库 + 一张入库」？',
          '盘点单算出来的差异，该怎么记账？',
          '上个月的单据发现错了，还能改吗？该怎么处理？',
        ],
      },
    ],
  },

  'M4-02': {
    code: 'M4-02',
    title: '库存台账 vs 余额',
    chapter: 'ERP 核心',
    minutes: 60,
    lead:
      'ERP 里最重要的一个设计：\n' +
      '台账是事实，余额是缓存。\n' +
      '搞反了，库存永远对不上，而且查不出为什么。',
    terms: [
      {
        en: '台账',
        zh: 'ledger',
        plain: '每一笔库存变动的流水记录。只追加，不修改，不删除。',
      },
      {
        en: '余额',
        zh: 'balance',
        plain: '当前库存数。它是台账累加出来的结果，本身不产生新信息。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、两个东西，两种角色' },
      {
        type: 'table',
        head: ['', '台账', '余额'],
        rows: [
          ['是什么', '每一笔变动的记录', '当前的总数'],
          ['能改吗', '绝对不能', '可以，但必须能重算'],
          ['数据量', '很大，一直增长', '很小，一个 SKU 一行'],
          ['用来干什么', '审计、追溯、对账', '查询、下单判断'],
        ],
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '**余额永远可以由台账重算出来。**\n' +
          '如果算不出来，说明台账有漏洞 —— 这时候该修的是台账，不是余额。',
      },

      { type: 'h2', text: '二、台账表' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock_ledger (
  id            bigserial primary key,
  sku_id        bigint not null,
  warehouse_id  bigint not null,
  change_qty    numeric(14,3) not null,   -- 正数入库，负数出库
  balance_after numeric(14,3) not null,   -- 变动后的余额快照
  doc_id        bigint,                   -- 来源单据
  doc_type      smallint,
  created_at    timestamptz not null default now()
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '`balance_after` 是冗余字段，但它让「某个时刻的库存是多少」能直接查出来，不用从头累加。\n' +
          '这是典型的用空间换查询性能。',
      },

      { type: 'h2', text: '三、余额是怎么错的' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '并发写入，更新丢了' },
          { text: '程序 bug，改了余额没写台账' },
          { text: '有人手工改库' },
          { text: '余额和台账对不上', mark: true },
        ],
      },
      { type: 'p', text: '所以必须有对账任务：定期把台账累加一遍，和余额比。' },
      {
        type: 'code',
        lang: 'sql',
        title: '找出对不上的 SKU',
        code: `
select l.sku_id,
       sum(l.change_qty) as from_ledger,
       s.physical        as from_balance
from stock_ledger l
join stock s on s.sku_id = l.sku_id
group by l.sku_id, s.physical
having sum(l.change_qty) <> s.physical;
`,
      },

      { type: 'h2', text: '四、别拿余额当真相' },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '给用户看库存，用余额（快）。\n' +
          '对账、审计、算成本，用台账（准）。\n' +
          '**永远不要因为余额快，就把它当成唯一真相。**',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '台账表没有任何 update / delete', v: '搜代码' },
          { k: '每笔台账都有来源单据', v: '看 doc_id 是否为空' },
          { k: '有对账任务能发现差异', v: '手动改一次余额试试' },
          { k: '余额可以从台账完整重算', v: '写个脚本跑一遍' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '台账要不要定期归档？归档之后怎么对账？',
          '发现余额错了 3 个月，怎么修才不留后患？',
          '为什么台账要额外记一个 balance_after？',
        ],
      },
    ],
  },

  'M4-03': {
    code: 'M4-03',
    title: '批次 / 序列号 / 有效期',
    chapter: 'ERP 核心',
    minutes: 50,
    lead:
      '同一个 SKU，不同批次成本可能不一样，保质期也不一样。\n' +
      '如果你只记「这个商品还有 100 件」，就永远说不清「退回来的那件是哪批、该按哪个成本算」。',
    terms: [
      {
        en: '批次',
        zh: 'batch',
        plain: '同一时间、同一供应商进来的一批货。有自己的成本、生产日期、有效期。',
      },
      {
        en: '序列号',
        zh: 'SN',
        plain: '单件唯一编号。手机、家电这类必须一机一码，售后靠它定位。',
      },
      {
        en: 'FEFO',
        zh: '先到期先出',
        plain: '不是先进先出，是最早过期的先出。食品、药品必须这样。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、什么商品需要批次' },
      {
        type: 'table',
        head: ['类型', '要不要批次', '例子'],
        rows: [
          ['普通日用品', '不需要', '纸巾、文具'],
          ['食品 / 化妆品', '需要（有效期）', '牛奶、面膜'],
          ['高价值单品', '需要（序列号）', '手机、笔记本'],
          ['药品', '需要（批号 + 有效期）', '处方药'],
        ],
      },

      { type: 'h2', text: '二、批次表' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock_batch (
  id              bigserial primary key,
  sku_id          bigint not null,
  batch_no        varchar(64) not null,
  production_date date,
  expire_date     date,
  cost_price      numeric(12,2) not null,
  qty             numeric(14,3) not null default 0,
  unique (sku_id, batch_no)
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '成本挂在批次上，不是挂在 SKU 上。\n' +
          '第一批进价 50，第二批 55 —— 出库时必须知道出的是哪一批，否则成本算不准。',
      },

      { type: 'h2', text: '三、出库怎么选批次' },
      {
        type: 'table',
        head: ['策略', '选哪批', '适合'],
        rows: [
          ['FIFO', '最早入库的', '通用'],
          ['FEFO', '最早过期的', '食品、药品'],
          ['指定批次', '人工选', '客户指定、质量召回'],
        ],
      },
      {
        type: 'code',
        lang: 'sql',
        title: 'FIFO 取批次',
        code: `
select * from stock_batch
where sku_id = :sku_id and qty > 0
order by created_at
for update;
`,
      },

      { type: 'h2', text: '四、序列号表' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock_sn (
  id            bigserial primary key,
  sku_id        bigint not null,
  sn            varchar(64) not null unique,
  batch_id      bigint,
  status        smallint not null default 0,  -- 0在库 1已售 2退货 3维修
  sold_order_id bigint
);
`,
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '序列号必须**全局唯一**，不是 SKU 内唯一。\n' +
          '因为售后是拿 SN 查的：用户报一个号，你要立刻定位到那台机器、那笔订单。\n' +
          '如果只在 SKU 内唯一，同一个号在两个商品上存在，你就查不出来了。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '需要批次的商品，出库必须指定批次', v: '不传批次试一次' },
          { k: '批次有独立成本价', v: '看表结构' },
          { k: '有效期商品有 FEFO 逻辑', v: '造两批不同效期' },
          { k: '序列号全局唯一', v: '插一个重复的试试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '同一批次能不能有不同的成本？（提示：退货入库）',
          '过期商品怎么处理？直接减库存吗？',
          '序列号商品退款后，SN 的状态该怎么变？',
        ],
      },
    ],
  },

  'M4-04': {
    code: 'M4-04',
    title: '业财一体',
    chapter: 'ERP 核心',
    minutes: 60,
    lead:
      '仓库说「货收到了」，财务说「我们欠供应商 5 万」。\n' +
      '这两件事在系统里如果各做各的，月底对账就是灾难。',
    terms: [
      {
        en: '业财一体',
        zh: 'business-finance integration',
        plain: '业务单据一发生，财务凭证自动生成。不靠人手工录入。',
      },
      {
        en: '应收 / 应付',
        zh: 'AR / AP',
        plain: '别人欠你的钱 / 你欠别人的钱。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、业务动作对应什么财务结果' },
      {
        type: 'table',
        head: ['业务动作', '财务影响'],
        rows: [
          ['采购入库', '应付增加（你欠供应商钱）'],
          ['销售出库', '应收增加（客户欠你钱）'],
          ['收到货款', '应收减少'],
          ['付给供应商', '应付减少'],
          ['退货', '反向冲减'],
        ],
      },

      { type: 'h2', text: '二、为什么要自动生成' },
      { type: 'p', text: '如果让财务对着单据手工录凭证：' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '仓库入了 500 单' },
          { text: '财务手工录 500 笔' },
          { text: '难免录错 3 笔' },
          { text: '月底对不上，查一周', mark: true },
        ],
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '**业务单据一审核，凭证自动生成。**\n' +
          '财务的角色从「录入员」变成「复核员」—— 这是业财一体的全部意义。',
      },

      { type: 'h2', text: '三、凭证表' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table voucher (
  id          bigserial primary key,
  voucher_no  varchar(32) not null unique,
  biz_type    varchar(32) not null,    -- purchase_in / sale_out
  biz_id      bigint not null,         -- 来源单据 ID
  amount      numeric(14,2) not null,
  direction   smallint not null,       -- 1应收 2应付
  status      smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (biz_type, biz_id)            -- 同一单据只能生成一次
);
`,
      },
      {
        type: 'p',
        text: '那个 `unique (biz_type, biz_id)` 是防重复的关键。审核被重复触发时，第二张凭证插不进来。',
      },

      { type: 'h2', text: '四、金额必须同源' },
      {
        type: 'list',
        items: [
          '采购入库：按入库单的采购价 × 数量',
          '销售出库：按订单的实付金额（不是原价）',
          '退货：按原单金额反向，不重新计算',
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '凭证金额必须和业务单据**同源**。\n' +
          '各算各的，就是两套数字，永远对不上 —— 而且你分不清是哪边算错了。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '凭证由单据自动生成，不手工录', v: '看流程' },
          { k: '同一单据不会重复生成凭证', v: '重复审核试一次' },
          { k: '凭证金额等于单据金额', v: '抽几张对一遍' },
          { k: '退货会生成反向凭证', v: '退一笔看' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '采购入库了但发票还没到，账该怎么做？',
          '一张订单分两次发货，凭证怎么生成？',
          '财务想手工改凭证金额，应该允许吗？',
        ],
      },
    ],
  },

  'M4-05': {
    code: 'M4-05',
    title: '成本核算',
    chapter: 'ERP 核心',
    minutes: 55,
    lead:
      '同一件商品，第一批进价 50，第二批 55。卖出去的那件，成本算多少？\n' +
      '这不是会计问题，是数据问题 —— 你必须知道出的是哪一批。',
    terms: [
      {
        en: '移动加权平均',
        zh: 'moving average',
        plain: '每次入库后重新算平均成本。简单，但分不清批次。',
      },
      {
        en: '成本快照',
        zh: 'cost snapshot',
        plain: '出库那一刻把成本记下来，之后永不重算。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、两种算法' },
      {
        type: 'table',
        head: ['', '移动加权平均', '先进先出'],
        rows: [
          ['怎么算', '(原库存金额 + 新入库金额) / 总数量', '取出最早那批的成本'],
          ['优点', '简单，库存上只有一个数', '贴近实际，能追溯到批次'],
          ['缺点', '不区分批次', '必须维护批次数据'],
          ['适合', '品类多、单价低', '单价高、要求精确'],
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '算一遍就懂：原库存 100 件 × 50 元 = 5000，新入库 100 件 × 55 元 = 5500。\n' +
          '总金额 10500 ÷ 总数量 200 = **平均成本 52.5 元**。',
      },

      { type: 'h2', text: '二、成本为什么不能事后改' },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '出库成本一旦记账，就影响毛利、影响报表，可能已经报过税了。\n' +
          '**事后改成本 = 改历史财报。**',
      },
      { type: 'p', text: '所以成本必须在出库那一刻确定，并且存下来。' },

      { type: 'h2', text: '三、把成本存在出库记录上' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table stock_out_item (
  id         bigserial primary key,
  doc_id     bigint not null,
  sku_id     bigint not null,
  qty        numeric(14,3) not null,
  unit_cost  numeric(12,4) not null,   -- 出库那一刻的成本
  total_cost numeric(14,4) not null    -- 存下来，以后不重算
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '`unit_cost` 是快照。\n' +
          '三年后有人问「这批货当时成本多少」，你直接查，不用重算，也不用担心算法中途改过。',
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: '出库记录上存了成本快照', v: '看表结构' },
          { k: '成本算法只有一处实现', v: '搜代码' },
          { k: '改了入库价，历史出库成本不变', v: '改价后查旧单' },
          { k: '毛利报表能对上成本', v: '抽 3 单手算' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '退货入库，成本按原出库成本还是当前成本？',
          '赠品的成本怎么算？算不算进毛利？',
          '一开始用加权平均，后来想换 FIFO，历史数据怎么办？',
        ],
      },
    ],
  },

  'M4-06': {
    code: 'M4-06',
    title: '审批流引擎',
    chapter: 'ERP 核心',
    minutes: 50,
    lead:
      '采购单超 1 万要经理批，超 5 万要总监批。\n' +
      '你把这几个 if 写进代码，下个月老板说「改成 2 万」，你就得发版。',
    terms: [
      {
        en: '审批流',
        zh: 'approval flow',
        plain: '一张单据要经过哪些人、按什么顺序同意。',
      },
      {
        en: '流程实例',
        zh: 'flow instance',
        plain: '某个具体单据正在走的这一次流程。同一套流程，有一千个实例。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、硬编码的尽头' },
      {
        type: 'code',
        lang: 'python',
        title: '✕ 看起来挺清楚的',
        code: `
if amount < 10000:
    approve_directly()
elif amount < 50000:
    need_approval("manager")
else:
    need_approval("director")
`,
      },
      { type: 'p', text: '三个月后，需求会变成这样：' },
      {
        type: 'list',
        items: [
          '「财务也要批」',
          '「不同部门额度不一样」',
          '「金额阈值改成 2 万」',
          '「要支持会签（两个人都同意才行）」',
        ],
      },

      { type: 'h2', text: '二、把流程变成数据' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table flow_def (
  id       bigserial primary key,
  biz_type varchar(32) not null,   -- purchase_order
  name     varchar(64) not null,
  version  int not null default 1
);

create table flow_node (
  id             bigserial primary key,
  flow_id        bigint not null,
  seq            int not null,           -- 第几步
  approver_type  smallint not null,      -- 1角色 2指定人 3上级
  approver_value varchar(64),
  condition      jsonb                   -- {"amount_gte": 50000}
);
`,
      },

      { type: 'h2', text: '三、实例和执行记录' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table flow_instance (
  id         bigserial primary key,
  flow_id    bigint not null,
  biz_id     bigint not null,
  current_seq int not null default 1,
  status     smallint not null default 0   -- 0进行中 1通过 2拒绝
);

create table flow_task (
  id          bigserial primary key,
  instance_id bigint not null,
  seq         int not null,
  approver_id bigint,
  action      smallint,                    -- 1同意 2拒绝
  comment     varchar(255),
  acted_at    timestamptz
);
`,
      },

      { type: 'h2', text: '四、单据状态和流程状态要分开' },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '单据有自己的状态（草稿 / 已审核），流程有自己的状态（进行中 / 通过 / 拒绝）。\n' +
          '**不要把两者合并成一个字段** —— 否则每加一种流程，状态机就要重画一遍。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '改审批规则不用改代码', v: '后台配一个新流程' },
          { k: '流程走到哪一步能查', v: '看实例表' },
          { k: '同一个人不能重复审批', v: '点两次' },
          { k: '会签 / 或签能配置', v: '各配一个试试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '审批人离职了，卡住的单子怎么办？',
          '审批过程中金额被改了，该怎么处理？',
          '加签、转办、撤回，分别该怎么建模？',
        ],
      },
    ],
  },

  'M4-07': {
    code: 'M4-07',
    title: '商城与 ERP 库存同步',
    chapter: 'ERP 核心',
    minutes: 55,
    lead:
      '商城显示「仅剩 3 件」，仓库里实际有 300 件。\n' +
      '这不是 bug，这是设计 —— 因为商城看到的从来不是「仓库有多少」，而是「你现在能卖多少」。',
    terms: [
      {
        en: '可售量',
        zh: 'available',
        plain: '商城能卖给用户的数量。它是 ERP 库存的一个投影，不是库存本身。',
      },
      {
        en: '同步延迟',
        zh: 'sync lag',
        plain: 'ERP 变了，商城还没更新，中间那段时间。它永远存在，压不掉。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、为什么商城不直接读 ERP' },
      {
        type: 'list',
        items: [
          'ERP 查询慢，扛不住商城的 QPS',
          'ERP 的口径是「实物」，不是「可售」',
          '两个系统要能独立发布，不能强耦合',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '所以商城有自己的库存表，通过同步任务从 ERP 更新。\n' +
          '**商城的是副本，ERP 的是真相。**',
      },

      { type: 'h2', text: '二、同步方向' },
      {
        type: 'table',
        head: ['方向', '内容', '频率'],
        rows: [
          ['ERP → 商城', '实物库存、上下架状态', '准实时（几秒）'],
          ['商城 → ERP', '订单、出库指令', '实时'],
          ['商城 → ERP', '预占 / 释放', '实时'],
        ],
      },

      { type: 'h2', text: '三、同步延迟的两个方向都危险' },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: 'ERP 出库 50 件' },
          { text: '同步延迟 5 秒' },
          { text: '商城还显示 100' },
          { text: '超卖 50 件', mark: true },
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '同步延迟必然存在，所以商城必须有**缓冲量**。\n' +
          '常见做法：可售量 = ERP 库存 × 90%，留 10% 吸收延迟和异常。',
      },

      { type: 'h2', text: '四、超卖的最终兜底' },
      { type: 'p', text: '就算同步做得再好，也会超卖。所以下单链路必须有三道闸：' },
      {
        type: 'steps',
        items: [
          { t: '商城本地扣减', d: '快，挡住 99% 的重复请求。' },
          { t: '同步到 ERP 预占', d: '失败就回滚商城扣减，并给用户退款。' },
          { t: 'ERP 出库时校验实物', d: '真没货了，触发缺货处理流程（补货或退款）。' },
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '商城库存有独立表，不实时查 ERP', v: '看代码' },
          { k: '有缓冲比例，不是全量同步', v: '看配置' },
          { k: '同步失败有告警和重试', v: '断网试一次' },
          { k: '超卖有兜底流程', v: '人为制造一次超卖' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '大促时缓冲比例该调大还是调小？为什么？',
          '商城和 ERP 库存长期对不上，你从哪里开始查？',
          '门店自提的库存，要不要同步到商城线上？',
        ],
      },
    ],
  },
}

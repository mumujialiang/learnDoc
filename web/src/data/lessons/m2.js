export default {
  'M2-01': {
    code: 'M2-01',
    title: '资源建模 vs 动作建模',
    chapter: 'API 与鉴权',
    minutes: 40,
    lead:
      'REST 教你用名词描述资源：GET /orders/1。\n' +
      '但总会遇到说不成名词的操作 ——「把这张单取消掉」。硬塞进 REST 会很别扭。',
    terms: [
      {
        en: '资源建模',
        zh: 'REST 风格',
        plain: 'URL 指向一个「东西」，用 GET/POST/PATCH/DELETE 表示对它做什么。',
      },
      {
        en: '动作建模',
        zh: 'RPC 风格',
        plain: 'URL 指向一件「事」，POST 一下就执行，比如 /orders/1/cancel。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、能用名词表达的，就用名词' },
      {
        type: 'table',
        head: ['操作', '资源写法', '动作写法'],
        rows: [
          ['查订单', 'GET /orders/1', '—'],
          ['新建订单', 'POST /orders', '—'],
          ['取消订单', '—', 'POST /orders/1/cancel'],
          ['批量改价', '—', 'POST /skus/batch-price'],
        ],
      },
      {
        type: 'p',
        text: '判断标准很简单：能不能用一个名词描述它？「订单」是名词，「取消」不是。',
      },

      { type: 'h2', text: '二、硬套 REST 的典型翻车' },
      {
        type: 'code',
        lang: 'http',
        title: '✕ 把状态当字段改',
        code: `
PATCH /orders/1
{ "status": "cancelled" }
`,
      },
      { type: 'p', text: '这个接口有什么问题？它允许把 status 改成任意值。' },
      {
        type: 'p',
        text: '而「取消订单」这件事要校验是否已发货、要退库存、要退款、要发通知。这些逻辑藏在哪？没人知道，因为接口名里没说。',
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '**状态变更不是赋值。** 它是一件有前置条件、有副作用的业务动作。\n' +
          '把它做成 PATCH status，等于把所有校验都扔掉了。',
      },

      { type: 'h2', text: '三、HTTP 方法本身带语义' },
      {
        type: 'table',
        head: ['方法', '幂等吗', '能自动重试吗'],
        rows: [
          ['GET', '是', '能'],
          ['PUT', '是', '能'],
          ['DELETE', '是', '能'],
          ['POST', '否', '不能，除非带幂等键'],
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '为什么 POST 不幂等：它通常表示「创建」或「执行一个动作」。\n' +
          '重试一次，可能建出两条订单。所以 POST 要么带幂等键，要么明确告诉调用方「别自动重试」。',
      },

      { type: 'h2', text: '四、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'URL 里没有多余的动词', v: '看一遍路由列表' },
          { k: '状态变更走独立的动作接口', v: '看订单相关接口' },
          { k: 'GET 接口不产生任何副作用', v: '搜 get 里的写操作' },
          { k: 'POST 接口有幂等键，或文档里写了不重试', v: '看接口文档' },
        ],
      },
      { type: 'h2', text: '五、课后问题' },
      {
        type: 'list',
        items: [
          '批量操作（一次改 100 个商品价格）该怎么设计 URL？',
          '一个接口同时修改多个资源，用 PATCH 还是 POST？',
          '为什么说「URL 是写给排查问题的人看的」？',
        ],
      },
    ],
  },

  'M2-02': {
    code: 'M2-02',
    title: '分页',
    chapter: 'API 与鉴权',
    minutes: 40,
    lead:
      '前端要「第 1000 页」，后端写了 limit 20 offset 19980。\n' +
      '数据库为了返回这 20 条，先把前 20000 条扫了一遍，然后扔掉。',
    terms: [
      {
        en: 'offset 分页',
        zh: '偏移分页',
        plain: 'limit + offset。翻得越深越慢，因为要跳过前面所有行。',
      },
      {
        en: 'cursor 分页',
        zh: '游标分页',
        plain: '用「上一页最后一条的 id」作为起点，不数前面的。翻到多深都一样快。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、offset 的代价' },
      {
        type: 'code',
        lang: 'sql',
        code: `select * from orders order by id limit 20 offset 19980;`,
      },
      {
        type: 'p',
        text: '数据库必须先定位到第 19981 行。前 19980 行它不返回，但得一行行读过去。页数越深越慢，这是 O(n)。',
      },
      {
        type: 'chain',
        kind: 'danger',
        items: [
          { text: '第 1 页 8ms' },
          { text: '第 100 页 120ms' },
          { text: '第 1000 页 1.2s' },
          { text: '第 5000 页 超时', mark: true },
        ],
      },

      { type: 'h2', text: '二、游标分页怎么解' },
      {
        type: 'code',
        lang: 'sql',
        title: '用上一页的最后一条当起点',
        code: `
-- 第一页
select * from orders order by id desc limit 20;

-- 下一页
select * from orders
where id < :last_id
order by id desc
limit 20;
`,
      },
      {
        type: 'p',
        text: '`where id < last_id` 能直接走索引定位，不管翻到第几页，都只读 20 行。',
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '代价是**不能跳页**。用户只能「下一页」，没法直接跳到第 50 页。\n' +
          '信息流、聊天记录、无限滚动适合游标；后台管理表格需要跳页，那就得忍受 offset。',
      },

      { type: 'h2', text: '三、total 比你想的贵' },
      { type: 'p', text: '列表接口经常顺手返回总数。但 `count(*)` 在大表上要扫全表或全索引。' },
      {
        type: 'list',
        items: [
          '能不给就不给：无限滚动根本不需要总数',
          '非要给：缓存 count，或用估算值（PostgreSQL 的 reltuples）',
          '数据量小（10 万以内）：随便 count',
        ],
      },

      { type: 'h2', text: '四、参数要防呆' },
      {
        type: 'code',
        lang: 'python',
        code: `
size = min(page_size, 100)      # 不给用户传 10000 的机会
cursor = decode_signed(request.cursor)  # 游标要签名，防止被篡改
`,
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '深分页接口 P99 在 100ms 内', v: '翻到第 1000 页压测' },
          { k: 'page_size 有上限', v: '传 10000 试试' },
          { k: '排序字段有索引', v: 'explain 看执行计划' },
          { k: '游标做了签名或加密', v: '改一个字符看会不会崩' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 order by 用到的字段必须有索引？',
          '页面上显示「共 12345 条」，这个数字一定要精确吗？',
          '翻页过程中有新数据插入，offset 分页会出现什么问题？',
        ],
      },
    ],
  },

  'M2-03': {
    code: 'M2-03',
    title: '鉴权与 RBAC',
    chapter: 'API 与鉴权',
    minutes: 55,
    lead:
      '认证是「你是谁」，授权是「你能干什么」。\n' +
      '这两个词天天被混用，混用的后果是：登录了就等于什么都能干。',
    terms: [
      {
        en: 'authentication',
        zh: '认证',
        plain: '证明你是你。登录就是认证。失败返回 401。',
      },
      {
        en: 'authorization',
        zh: '授权',
        plain: '你有没有权限干这件事。失败返回 403。',
      },
      {
        en: 'RBAC',
        zh: '基于角色的访问控制',
        plain: '用户 → 角色 → 权限。不给用户直接配权限，给他角色。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先分清两件事' },
      {
        type: 'table',
        head: ['问题', '属于', '该返回'],
        rows: [
          ['你是谁？', '认证', '401'],
          ['你能不能干这个？', '授权', '403'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '401 和 403 混用，前端就没法处理：401 该跳登录页，403 该提示「无权限」。\n' +
          '搞反了，用户会卡在登录页里无限循环。',
      },

      { type: 'h2', text: '二、JWT 和 Session 的取舍' },
      {
        type: 'table',
        head: ['', 'JWT', 'Session'],
        rows: [
          ['状态存在哪', '客户端（token 里）', '服务端（Redis）'],
          ['能主动踢人吗', '不能，除非维护黑名单', '能，删掉就行'],
          ['横向扩展', '天然支持', '需要共享存储'],
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**JWT 最大的坑：签发之后没法作废。**\n' +
          '用户被禁用、改了密码，旧 token 依然有效，直到过期。\n' +
          '解法：access token 设短（15 分钟），配 refresh token，refresh 存服务端。',
      },

      { type: 'h2', text: '三、RBAC 的表' },
      {
        type: 'code',
        lang: 'sql',
        code: `
create table role (id bigserial primary key, name varchar(32) unique);

create table permission (
  id   bigserial primary key,
  code varchar(64) unique          -- order:read / order:refund
);

create table user_role (
  user_id bigint not null,
  role_id bigint not null,
  primary key (user_id, role_id)
);

create table role_permission (
  role_id       bigint not null,
  permission_id bigint not null,
  primary key (role_id, permission_id)
);
`,
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '为什么不给用户直接配权限：1000 个用户 × 50 个权限 = 5 万行。\n' +
          '改一次规则，全公司要改 1000 次。给角色配，改一次生效一片。',
      },

      { type: 'h2', text: '四、权限检查放在哪一层' },
      {
        type: 'list',
        items: [
          '路由层：`@require("order:refund")`，挡住 90% 的越权',
          '数据层：「只能查自己门店的订单」—— 数据权限，比功能权限难得多',
          '业务层：「金额超 10 万要二级审批」—— 这是流程规则，不是权限',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '401 和 403 分开返回', v: '分别触发一次' },
          { k: 'access token 有效期不超过 30 分钟', v: '看配置' },
          { k: '没权限的接口真的被挡住', v: '用低权限账号试' },
          { k: '权限码是数据，不是写死的 if-else', v: '读代码' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '用户改了密码，旧的 token 还能用吗？该怎么处理？',
          '数据权限（只能看自己门店的订单）该怎么实现？',
          '前端需要做权限判断吗？还是全靠后端？',
        ],
      },
    ],
  },

  'M2-04': {
    code: 'M2-04',
    title: '校验与 DTO 分层',
    chapter: 'API 与鉴权',
    minutes: 40,
    lead:
      '把请求体直接丢给 ORM 模型，是最省事也最危险的做法。\n' +
      '用户多传一个字段，就可能改掉不该改的东西。',
    terms: [
      {
        en: 'DTO',
        zh: '数据传输对象',
        plain: '接口的入参和出参各一套模型，不直接用数据库模型。',
      },
      {
        en: '批量赋值漏洞',
        zh: 'mass assignment',
        plain: '用户传什么字段，你就写什么字段。多传的字段也会生效。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、直接透传会发生什么' },
      {
        type: 'code',
        lang: 'python',
        title: '✕ 用户传 {"title": "...", "price": 0, "is_admin": true}',
        code: `
@router.patch("/products/{id}")
async def update(id: int, data: dict, session=Depends(get_db)):
    for k, v in data.items():
        setattr(product, k, v)      # 任何字段都能改
`,
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '这就是「批量赋值」漏洞：**任何字段都能改**，包括你没打算暴露的。\n' +
          '价格改成 0、状态改成已支付、角色改成管理员 —— 全都能做到。',
      },

      { type: 'h2', text: '二、入参和出参要分开' },
      {
        type: 'code',
        lang: 'python',
        code: `
class ProductUpdate(BaseModel):
    title: str | None = None
    price: Decimal | None = Field(None, gt=0, le=999999)


class ProductOut(BaseModel):
    id: int
    title: str
    price: Decimal
    # cost_price 不在出参里 —— 成本价不能让前台看到
`,
      },
      {
        type: 'p',
        text: '`ProductUpdate` 里没声明的字段，用户传了也会被忽略。这是「白名单」思维：默认拒绝，显式允许。',
      },

      { type: 'h2', text: '三、校验写在模型里' },
      {
        type: 'code',
        lang: 'python',
        code: `
class OrderCreate(BaseModel):
    sku_id: int
    qty: int = Field(gt=0, le=999)

    @field_validator("qty")
    @classmethod
    def check_qty(cls, v):
        if v > 999:
            raise ValueError("单次最多买 999 件")
        return v
`,
      },
      {
        type: 'callout',
        kind: 'success',
        text:
          '校验前移的好处：**非法请求在进入业务逻辑之前就被挡住**，不会污染数据。\n' +
          '而且错误信息是框架自动生成的，格式统一。',
      },

      { type: 'h2', text: '四、出参要脱敏' },
      {
        type: 'list',
        items: [
          '手机号：138****8888',
          '成本价、利润率：不给前台',
          '内部状态码：转成前端能懂的文案',
          '密码、token：永远不出现在任何响应里',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '接口参数不是 dict 或 Any', v: '看类型标注' },
          { k: '入参模型只包含允许修改的字段', v: '读 schema' },
          { k: '出参不含成本、密码等敏感字段', v: '看一次响应' },
          { k: '多传一个字段既不报错也不生效', v: '手动试' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          'DTO 和 ORM 模型之间怎么转换？手写还是自动？',
          '为什么 price 要设上限？不设会怎样？',
          '前端已经在校验了，后端为什么还要校验一遍？',
        ],
      },
    ],
  },

  'M2-05': {
    code: 'M2-05',
    title: '接口版本与兼容',
    chapter: 'API 与鉴权',
    minutes: 35,
    lead:
      '你改了接口，前端没升级。用户打开页面，白屏。\n' +
      '这不是前端的问题 —— 是你破坏了契约。',
    terms: [
      {
        en: '向后兼容',
        zh: 'backward compatible',
        plain: '老客户端用老字段，依然能正常工作。',
      },
      {
        en: '灰度',
        zh: 'canary',
        plain: '新版本先给一小部分用户，出问题影响面小。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、什么改动是安全的' },
      {
        type: 'table',
        head: ['改动', '安全吗', '为什么'],
        rows: [
          ['加一个可选字段', '安全', '老客户端直接忽略它'],
          ['加一个必填字段', '不安全', '老客户端不会传'],
          ['删字段', '不安全', '老客户端还在读'],
          ['改字段类型', '不安全', 'int 变 string 会解析失败'],
          ['改字段含义', '最危险', '类型没变，值的意思变了'],
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text:
          '**改含义比改类型更危险** —— 因为类型检查、单元测试、编译器全都发现不了。\n' +
          '比如 status 从 0/1 变成 1/2，代码照跑，业务全错。',
      },

      { type: 'h2', text: '二、删字段的三步法' },
      {
        type: 'steps',
        items: [
          { t: '先加新字段，双写', d: '新老字段同时写，读还是读老的。这时候谁都没影响。' },
          { t: '切读', d: '确认所有客户端都升级完了，把读切到新字段。' },
          { t: '观察一个版本，再删老字段', d: '删之前先全局搜一遍，还有谁在引用。' },
        ],
      },

      { type: 'h2', text: '三、真要破坏兼容，就加版本号' },
      {
        type: 'code',
        lang: 'http',
        code: `
GET /api/v1/orders
GET /api/v2/orders
`,
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          '版本号是最后手段，不是常规手段。\n' +
          '每多一个版本，你就多一份要维护、要修 bug、要测试的代码 —— 而且是永久的。',
      },

      { type: 'h2', text: '四、不同客户端的兼容窗口' },
      {
        type: 'list',
        items: [
          '移动 App：用户可能半年不更新，必须长期兼容老版本',
          '小程序：有强制更新机制，窗口短很多',
          '内部后台：可以约定同时发布，几乎没有窗口',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '新增字段都是可选的', v: '看 schema 变更' },
          { k: '没有直接删字段或改类型', v: '看 diff' },
          { k: '老版本客户端能正常调通', v: '用旧包测一次' },
          { k: '字段含义变更写了迁移说明', v: '看变更记录' },
        ],
      },
      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '如果必须改一个字段的含义，最稳妥的做法是什么？',
          '接口版本号和发布日期，哪个更好用？',
          '为什么说「契约测试」能提前发现兼容问题？',
        ],
      },
    ],
  },
}

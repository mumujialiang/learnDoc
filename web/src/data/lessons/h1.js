export default {
  'H1-01': {
    code: 'H1-01',
    title: 'HTTP 方法与幂等',
    chapter: 'HTTP 与 API 协议',
    minutes: 55,
    lead:
      '网关超时后自动重试了一次 POST，用户被扣了两次款。\n' +
      '代码里没有任何并发问题，问题出在「POST 不是幂等方法」这件事上。',
    terms: [
      {
        en: '安全方法',
        zh: 'safe method',
        plain: '不改变服务端状态的方法，比如 GET、HEAD。',
      },
      {
        en: '幂等方法',
        zh: 'idempotent method',
        plain: '执行一次和执行多次，服务端最终状态相同。',
      },
      {
        en: '幂等键',
        zh: 'idempotency key',
        plain: '调用方提供的唯一标识，服务端用它识别重复请求。',
      },
      {
        en: '重试预算',
        zh: 'retry budget',
        plain: '限制重试总量，避免故障时重试流量超过正常流量。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'chain',
        kind: 'danger',
        items: ['客户端 POST 下单', '网关等待超时', '网关自动重试', '服务端处理两次', { text: '两笔订单', mark: true }],
      },

      { type: 'h2', text: '二、方法的语义' },
      {
        type: 'table',
        head: ['方法', '用途', '安全', '幂等'],
        rows: [
          ['GET', '读取资源', '是', '是'],
          ['HEAD', '只取响应头', '是', '是'],
          ['POST', '创建 / 执行动作', '否', '否'],
          ['PUT', '整体替换', '否', '是'],
          ['PATCH', '部分更新', '否', '不一定'],
          ['DELETE', '删除', '否', '是'],
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text: '「幂等」说的是服务端最终状态，不是响应内容。PUT 重复执行结果一样，但每次都会执行。',
      },

      { type: 'h2', text: '三、为什么 POST 重试会重复' },
      {
        type: 'p',
        text:
          'POST 的语义是「执行一次动作」，协议本身不提供去重。' +
          '网络超时、网关重试、用户连点、消息重投，都会让它执行多次。',
      },

      { type: 'h2', text: '四、工程上怎么让 POST 幂等' },
      {
        type: 'steps',
        items: [
          { t: '调用方生成幂等键', d: '一次业务操作一个键，重试复用同一个' },
          { t: '服务端存唯一约束', d: '键写进表，冲突即视为重复' },
          { t: '重复请求返回首次结果', d: '不要返回错误，客户端会困惑' },
          { t: '键有有效期', d: '覆盖业务可能的重试窗口' },
        ],
      },

      { type: 'h2', text: '五、常见错误' },
      {
        type: 'table',
        head: ['错误', '后果'],
        rows: [
          ['每次重试生成新键', '去重失效'],
          ['只在应用层判重', '并发下仍重复'],
          ['重复请求返回 500', '客户端继续重试'],
          ['幂等键没有唯一索引', '高并发下失效'],
        ],
      },

      { type: 'h2', text: '六、和状态码的配合' },
      {
        type: 'p',
        text:
          '重复请求通常返回首次成功的状态码（如 200/201），而不是 409。' +
          '如果业务要求明确告知，可在响应体里带 `duplicated: true`。',
      },

      { type: 'h2', text: '七、边界' },
      {
        type: 'list',
        items: [
          '查询类接口天然幂等，不需要幂等键',
          '批量操作要按批次键去重，不是每行一个键',
          '文件上传要用内容哈希或会话 id 去重',
          '幂等键不能包含时间戳等每次都变的字段',
        ],
      },

      { type: 'h2', text: '八、验收' },
      {
        type: 'checklist',
        items: [
          { k: '写接口是否支持幂等键', v: '查参数与表结构' },
          { k: '重试不会重复扣款/下单', v: '同一请求发两次' },
          { k: '幂等键有唯一约束', v: '看索引' },
          { k: '重复请求返回一致结果', v: '对比两次响应' },
          { k: 'GET 不产生副作用', v: '检查实现' },
        ],
      },

      { type: 'h2', text: '九、动手验证' },
      {
        type: 'list',
        items: [
          '对下单接口连续发送两次相同请求（带同一个幂等键）',
          '确认数据库只有一条订单',
          '去掉唯一索引再试一次，观察是否出现两条',
          '把重试改成自动触发，验证客户端不会重复提交',
        ],
      },

      { type: 'h2', text: '十、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '方法语义决定重试是否安全。POST 要幂等，必须靠幂等键和数据库约束，不能靠调用方自觉。',
      },

    ],
  },

  'H1-02': {
    code: 'H1-02',
    title: '状态码与错误契约',
    chapter: 'HTTP 与 API 协议',
    minutes: 50,
    lead:
      '前端把所有失败都当 500 弹「服务器开小差」，\n' +
      '用户不知道为什么失败，客服也查不出原因。\n' +
      '状态码和错误结构，是接口最容易被忽视的契约。',
    terms: [
      {
        en: '状态码',
        zh: 'status code',
        plain: 'HTTP 层面对结果的分类，决定客户端、网关、监控怎么处理。',
      },
      {
        en: '业务错误码',
        zh: 'error code',
        plain: '业务层面的具体原因，比如库存不足、余额不够。',
      },
      {
        en: '错误契约',
        zh: 'error contract',
        plain: '所有接口统一的错误结构：code、message、details、trace_id。',
      },
      {
        en: '可重试错误',
        zh: 'retryable error',
        plain: '网络抖动、限流、下游 5xx 可以重试；参数错误重试没有意义。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '库存不足返回 500，监控告警响起；参数错误返回 200 加 `success: false`，' +
          '网关和监控都以为成功；前端只能统一弹「操作失败」。',
      },

      { type: 'h2', text: '二、五类状态码' },
      {
        type: 'table',
        head: ['范围', '含义', '例子'],
        rows: [
          ['2xx', '成功', '200 查询、201 创建、204 无内容'],
          ['3xx', '重定向', '301 永久、304 未修改'],
          ['4xx', '调用方错误', '400 参数、401 未登录、403 无权限、404 不存在、409 冲突、422 校验失败、429 限流'],
          ['5xx', '服务端错误', '500 未捕获、502 网关、503 过载、504 超时'],
        ],
      },

      { type: 'h2', text: '三、不要一律 200' },
      {
        type: 'callout',
        kind: 'danger',
        text: '200 + `success: false` 会让网关、监控、重试全部失效。HTTP 语义是给基础设施看的，不只给前端看。',
      },

      { type: 'h2', text: '四、统一错误结构' },
      {
        type: 'table',
        head: ['字段', '作用'],
        rows: [
          ['code', '业务错误码，稳定不变'],
          ['message', '给人看的说明'],
          ['details', '字段级错误，如表单校验'],
          ['trace_id', '排查用，能串起日志'],
        ],
      },
      {
        type: 'p',
        text:
          '错误码要稳定、可枚举；不要直接把异常类名或数据库错误抛给前端。' +
          '同一个错误在所有接口里应返回相同结构。',
      },

      { type: 'h2', text: '五、状态码与重试' },
      {
        type: 'table',
        head: ['状态码', '客户端是否重试'],
        rows: [
          ['400 / 422', '不重试，改了参数再说'],
          ['401', '刷新令牌后重试一次'],
          ['403', '不重试'],
          ['404', '不重试'],
          ['409', '按业务处理，可能重试'],
          ['429', '按 Retry-After 退避'],
          ['502 / 503 / 504', '退避后重试，需幂等'],
        ],
      },

      { type: 'h2', text: '六、错误信息不能泄露什么' },
      {
        type: 'list',
        items: [
          '堆栈、SQL 语句、表名',
          '内网地址、数据库连接串',
          '用户是否存在（登录接口要模糊提示）',
          '权限判断细节（避免被枚举）',
        ],
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '所有接口错误结构一致', v: '抽查不同接口' },
          { k: '4xx 和 5xx 使用正确', v: '逐条核对' },
          { k: '错误响应不含内部信息', v: '触发异常看返回' },
          { k: '前端能区分可重试与不可重试', v: '看处理逻辑' },
          { k: 'trace_id 能串起日志', v: '用一次错误请求验证' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '分别触发参数错误、未登录、越权、下游超时四种情况',
          '记录返回的状态码与结构，检查是否一致',
          '把库存不足故意写成 500，观察监控是否误报',
          '用 trace_id 在日志里检索同一次请求',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '状态码给基础设施看，业务码给人看，trace_id 给排查看。三层都要有。',
      },

    ],
  },

  'H1-03': {
    code: 'H1-03',
    title: '缓存与内容协商',
    chapter: 'HTTP 与 API 协议',
    minutes: 50,
    lead:
      '给商品详情接口加了缓存，结果运营改了价格，用户半天看不到。\n' +
      '缓存不是「加个头」这么简单，关键是搞清楚：谁能缓存、缓存多久、怎么失效。',
    terms: [
      {
        en: '强缓存',
        zh: 'strong cache',
        plain: '不发请求，直接用本地副本，由 Cache-Control 控制。',
      },
      {
        en: '协商缓存',
        zh: 'conditional request',
        plain: '带 ETag / Last-Modified 询问服务端，没变返回 304。',
      },
      {
        en: '内容协商',
        zh: 'content negotiation',
        plain: '客户端用 Accept 表达要什么格式，服务端据此返回。',
      },
      {
        en: 'Vary',
        zh: 'vary header',
        plain: '告诉缓存「同一 URL 还要按哪些请求头区分副本」。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '商品接口返回 `Cache-Control: public, max-age=3600`，' +
          '运营调价后，CDN 和浏览器都还在用旧数据，客服电话被打爆。',
      },

      { type: 'h2', text: '二、缓存由谁决定' },
      {
        type: 'table',
        head: ['角色', '看什么'],
        rows: [
          ['浏览器', 'Cache-Control、Expires'],
          ['CDN', 'Cache-Control、s-maxage、Vary'],
          ['网关', '缓存策略与键'],
          ['应用', 'ETag、Last-Modified'],
        ],
      },

      { type: 'h2', text: '三、常用指令' },
      {
        type: 'list',
        items: [
          '`no-store`：完全不缓存，敏感数据用',
          '`no-cache`：可以存，但每次要验证',
          '`max-age`：浏览器缓存秒数',
          '`s-maxage`：共享缓存（CDN）秒数',
          '`private`：只允许浏览器缓存',
          '`public`：允许 CDN 缓存',
          '`stale-while-revalidate`：先返回旧的，后台刷新',
        ],
      },

      { type: 'h2', text: '四、ETag 与 304' },
      {
        type: 'p',
        text:
          '服务端给资源一个版本标识（ETag）。客户端下次带 `If-None-Match`，' +
          '没变就返回 304，省掉响应体但仍有一次请求。',
      },

      { type: 'h2', text: '五、Vary 别漏' },
      {
        type: 'callout',
        kind: 'warn',
        text: '接口按语言、租户、登录态返回不同内容时，必须用 Vary 声明。否则 CDN 会把 A 用户的响应给 B 用户。',
      },

      { type: 'h2', text: '六、内容协商' },
      {
        type: 'list',
        items: [
          '`Accept`：要什么类型',
          '`Content-Type`：实际是什么类型',
          '`Accept-Encoding`：支持的压缩方式',
          '`Accept-Language`：语言偏好',
        ],
      },

      { type: 'h2', text: '七、缓存键设计' },
      {
        type: 'p',
        text:
          '缓存键通常由 URL + 查询参数 + Vary 头组成。' +
          '漏掉租户、语言、登录态，就会串数据。',
      },

      { type: 'h2', text: '八、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'HTML 是否短缓存', v: '看响应头' },
          { k: '接口是否按数据敏感性区分策略', v: '抽查' },
          { k: 'Vary 是否覆盖语言/租户', v: '看响应头' },
          { k: '发布后能否及时失效', v: '改数据观察' },
          { k: '304 响应体为空', v: '抓包' },
        ],
      },

      { type: 'h2', text: '九、动手验证' },
      {
        type: 'list',
        items: [
          '用 curl 请求接口，记录响应头',
          '第二次带 If-None-Match，确认返回 304',
          '修改数据后再次请求，确认 ETag 变化',
          '切换 Accept-Language，观察缓存是否串语言',
        ],
      },

      { type: 'h2', text: '十、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '缓存策略 = 谁能存 + 存多久 + 怎么验证 + 按什么区分。四件事缺一不可。',
      },

    ],
  },

  'H1-04': {
    code: 'H1-04',
    title: 'CORS 与跨域',
    chapter: 'HTTP 与 API 协议',
    minutes: 45,
    lead:
      '本地开发一切正常，部署后所有接口报跨域。\n' +
      '多数「跨域问题」不是配置少了，而是没搞清预检、凭证和通配符的规则。',
    terms: [
      {
        en: '同源',
        zh: 'same origin',
        plain: '协议、域名、端口都相同。任何一项不同都算跨域。',
      },
      {
        en: '预检请求',
        zh: 'preflight',
        plain: '浏览器在正式请求前发的 OPTIONS 请求，用来确认服务端是否允许。',
      },
      {
        en: '凭证',
        zh: 'credentials',
        plain: 'Cookie、Authorization 等身份信息。跨域携带凭证有额外限制。',
      },
      {
        en: '简单请求',
        zh: 'simple request',
        plain: '方法、头、类型都受限的请求，不触发预检。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '前端在 `http://localhost:5173`，后端在 `http://localhost:8000`。' +
          'GET 能通，带 JSON 的 POST 失败；加了 `*` 之后带 Cookie 又失败。',
      },

      { type: 'h2', text: '二、什么时候触发预检' },
      {
        type: 'table',
        head: ['条件', '是否预检'],
        rows: [
          ['GET / HEAD / POST + 简单头', '否'],
          ['Content-Type 为 application/json', '是'],
          ['自定义头（如 Authorization）', '是'],
          ['PUT / PATCH / DELETE', '是'],
        ],
      },

      { type: 'h2', text: '三、服务端要返回什么' },
      {
        type: 'list',
        items: [
          '`Access-Control-Allow-Origin`：允许的来源，不能是 `*` 如果带凭证',
          '`Access-Control-Allow-Methods`：允许的方法',
          '`Access-Control-Allow-Headers`：允许的请求头',
          '`Access-Control-Allow-Credentials`：是否允许凭证',
          '`Access-Control-Max-Age`：预检结果缓存多久',
        ],
      },

      { type: 'h2', text: '四、带 Cookie 的规则' },
      {
        type: 'callout',
        kind: 'warn',
        text: '带凭证时，Allow-Origin 必须是具体域名，不能用 `*`；前端也要设置 credentials: include。',
      },

      { type: 'h2', text: '五、常见错误' },
      {
        type: 'table',
        head: ['现象', '原因'],
        rows: [
          ['预检 404', '网关没把 OPTIONS 转给后端'],
          ['Allow-Origin 重复', '网关和后端都加了一次'],
          ['带 Cookie 失败', 'Allow-Origin 用了 *'],
          ['自定义头被拒', 'Allow-Headers 没列全'],
          ['上传大文件失败', '预检缓存太短或超时'],
        ],
      },

      { type: 'h2', text: '六、开发环境怎么处理' },
      {
        type: 'p',
        text:
          '本地开发可以用 Vite 代理，把请求转发到后端，避免跨域；' +
          '生产环境用同域部署或网关统一加 CORS 头。',
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '预检请求返回 204/200', v: '看 OPTIONS' },
          { k: 'Allow-Origin 是具体域名', v: '带凭证场景' },
          { k: 'Allow-Headers 覆盖 Authorization', v: '看响应头' },
          { k: '网关没有重复加头', v: '抓包' },
          { k: '生产环境走同域或代理', v: '看部署' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '用 curl 发一个 OPTIONS 预检，检查返回头',
          '故意带 Authorization 头，确认预检被触发',
          '把 Allow-Origin 改成 * 并带 Cookie，观察失败',
          '检查网关日志，确认 OPTIONS 有被转发',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '跨域是浏览器行为，不是服务端拒绝。预检通过与否，取决于响应头，而不是请求本身。',
      },

    ],
  },

  'H1-05': {
    code: 'H1-05',
    title: '连接、超时与 HTTP/2',
    chapter: 'HTTP 与 API 协议',
    minutes: 50,
    lead:
      '服务偶尔整体卡顿，CPU 不高、数据库也不慢，\n' +
      '最后发现是连接池耗尽，请求都在等一个空闲连接。\n' +
      '连接和超时，是接口性能的隐形地基。',
    terms: [
      {
        en: '长连接',
        zh: 'keep-alive',
        plain: '一次 TCP 连接上复用多个请求，减少握手开销。',
      },
      {
        en: '连接池',
        zh: 'connection pool',
        plain: '客户端复用连接，限制并发连接数。',
      },
      {
        en: '超时分层',
        zh: 'timeout layering',
        plain: '连接、读取、整体各有超时，任何一层缺失都会拖住线程。',
      },
      {
        en: '多路复用',
        zh: 'multiplexing',
        plain: 'HTTP/2 在一个连接上并行传输多个请求。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '某个下游接口变慢，客户端连接迟迟不释放，连接池被占满；' +
          '其他接口拿不到连接，整个服务开始超时。',
      },

      { type: 'h2', text: '二、连接生命周期' },
      {
        type: 'chain',
        items: ['DNS', 'TCP 握手', 'TLS 握手', '发送请求', '等待响应', '复用或关闭'],
      },
      {
        type: 'p',
        text: '长连接省掉前三次握手，但连接本身有状态，需要池化管理和健康检查。',
      },

      { type: 'h2', text: '三、超时要分层' },
      {
        type: 'table',
        head: ['类型', '控制什么', '缺失的后果'],
        rows: [
          ['连接超时', '建立连接最多等多久', '网络不可达时线程长时间挂起'],
          ['读取超时', '等响应数据最多多久', '下游卡住时连接不释放'],
          ['整体超时', '一次调用总共多久', '多层重试叠加，拖垮线程'],
          ['池获取超时', '等空闲连接最多多久', '池耗尽时请求无限排队'],
        ],
      },

      { type: 'h2', text: '四、HTTP/1.1 与 HTTP/2' },
      {
        type: 'table',
        head: ['特性', 'HTTP/1.1', 'HTTP/2'],
        rows: [
          ['并发', '多连接或队头阻塞', '单连接多路复用'],
          ['头部', '纯文本，重复传输', '压缩传输'],
          ['服务器推送', '无', '有（实际少用）'],
        ],
      },

      { type: 'h2', text: '五、连接池不是越大越好' },
      {
        type: 'list',
        items: [
          '连接数受下游承载能力限制',
          '连接过多会增加内存与切换开销',
          '池满时的等待超时要短，快速失败',
          '连接要有最大生命周期，避免被中间设备断开',
          '健康检查能剔除坏连接',
        ],
      },

      { type: 'h2', text: '六、重试与超时的关系' },
      {
        type: 'callout',
        kind: 'warn',
        text: '超时时间 2 秒、重试 3 次，最坏要等 6 秒以上。重试预算要和整体超时一起算。',
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '每个外部调用都有超时', v: '代码审查' },
          { k: '连接池有上限与获取超时', v: '看配置' },
          { k: '重试次数与整体超时匹配', v: '算一遍最坏耗时' },
          { k: '连接复用是否生效', v: '看连接数' },
          { k: 'HTTP/2 是否启用', v: '看协议与网关' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '用 curl 观察 keep-alive 连接复用',
          '把下游延迟调大，观察连接池占用',
          '把池子调到 1，压测看排队与超时',
          '对比 HTTP/1.1 与 HTTP/2 的并发请求耗时',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '连接是稀缺资源。池子、超时、重试三者必须一起设计，缺一个就会在故障时放大问题。',
      },

    ],
  },
}

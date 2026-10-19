export default {
  'H15-01': {
    code: 'H15-01',
    title: 'SSR 与 SSG',
    chapter: 'SSR 与微前端',
    minutes: 50,
    lead:
      '纯客户端渲染的首屏要等 JS 下载、执行，\n' +
      '对内容站和弱网用户不友好。SSR/SSG 把渲染提前了。',
    terms: [
      {
        en: 'CSR',
        zh: '客户端渲染',
        plain: '浏览器下载 JS 后渲染页面，首屏依赖 JS。',
      },
      {
        en: 'SSR',
        zh: '服务端渲染',
        plain: '服务端生成 HTML，浏览器先看到内容再水合。',
      },
      {
        en: 'SSG',
        zh: '静态生成',
        plain: '构建时生成 HTML，部署为静态文件。',
      },
      {
        en: '水合',
        zh: 'hydration',
        plain: '浏览器接管服务端 HTML，绑定事件与状态。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '商品详情页用 CSR，弱网下白屏 3 秒，SEO 抓不到内容。' +
          '改成 SSR 后，首屏 HTML 直接带商品信息。',
      },

      { type: 'h2', text: '二、三种模式对比' },
      {
        type: 'table',
        head: ['模式', '首屏', '适合'],
        rows: [
          ['CSR', '慢，依赖 JS', '后台管理、强交互应用'],
          ['SSR', '快，按请求渲染', '电商、内容、登录态页面'],
          ['SSG', '最快，构建时生成', '博客、文档、营销页'],
        ],
      },

      { type: 'h2', text: '三、SSR 的代价' },
      {
        type: 'list',
        items: [
          '需要 Node 服务，部署与扩容更复杂',
          '服务端不能直接用浏览器 API',
          '缓存与个性化要平衡',
          '水合不一致会导致闪烁或报错',
        ],
      },

      { type: 'h2', text: '四、怎么选' },
      {
        type: 'callout',
        kind: 'info',
        text: '内容型页面优先 SSG/SSR；后台系统 CSR 足够。不要为了技术而技术。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '首屏 HTML 含核心内容', v: '禁 JS 打开' },
          { k: '水合无报错', v: '看控制台' },
          { k: 'SEO 能抓到内容', v: '抓取工具' },
          { k: '服务端无浏览器 API', v: '看代码' },
          { k: '缓存策略明确', v: '看响应头' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: 'SSR/SSG 解决首屏与 SEO，不解决所有性能问题。先确认业务是否真的需要。',
      },
      {
        type: 'list',
        items: [
          'SSR 和 SSG 怎么选？',
          '水合不一致会怎样？',
          'SSR 服务怎么扩容？',
          '哪些页面不适合 SSR？',
        ],
      },
    ],
  },

  'H15-02': {
    code: 'H15-02',
    title: '同构渲染',
    chapter: 'SSR 与微前端',
    minutes: 45,
    lead:
      '同一份组件代码，服务端跑一遍、客户端再跑一遍。\n' +
      '两边的环境差异，就是同构的主要坑。',
    terms: [
      {
        en: '同构',
        zh: 'isomorphic',
        plain: '同一份代码能在服务端和浏览器运行。',
      },
      {
        en: '环境差异',
        zh: 'environment difference',
        plain: 'window、document、localStorage 在服务端不存在。',
      },
      {
        en: '状态序列化',
        zh: 'state serialization',
        plain: '把服务端数据注入 HTML，供客户端水合使用。',
      },
      {
        en: '水合不匹配',
        zh: 'hydration mismatch',
        plain: '服务端 HTML 与客户端首次渲染不一致。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '组件里直接读 localStorage，服务端渲染时报 `window is not defined`，' +
          '整个页面 500。',
      },

      { type: 'h2', text: '二、常见环境差异' },
      {
        type: 'table',
        head: ['API', '服务端', '处理'],
        rows: [
          ['window/document', '不存在', '生命周期内使用'],
          ['localStorage', '不存在', '客户端读取'],
          ['Date.now / 随机数', '两端可能不同', '服务端注入固定值'],
          ['请求地址', '相对路径不可用', '用绝对地址'],
        ],
      },

      { type: 'h2', text: '三、数据怎么传' },
      {
        type: 'p',
        text:
          '服务端请求到的数据要序列化进 HTML（如 `window.__INITIAL_STATE__`），' +
          '客户端用它做首次渲染，避免二次请求。',
      },

      { type: 'h2', text: '四、水合不匹配' },
      {
        type: 'callout',
        kind: 'warn',
        text: '服务端与客户端首屏结构必须一致。用时间、随机数、浏览器判断渲染不同内容，都会导致不匹配。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '服务端无浏览器 API', v: '启动 SSR 测试' },
          { k: '首屏数据已序列化', v: '看 HTML' },
          { k: '水合无警告', v: '看控制台' },
          { k: '时间/随机数已固定', v: '看渲染' },
          { k: '客户端不重复请求首屏数据', v: '看网络' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: '同构的关键是「环境判断」和「状态传递」。服务端只负责首屏，浏览器负责交互。',
      },
      {
        type: 'list',
        items: [
          '为什么服务端不能用 localStorage？',
          '水合不匹配有哪些典型原因？',
          '首屏数据怎么注入？',
          'SSR 下路由怎么处理？',
        ],
      },
    ],
  },

  'H15-03': {
    code: 'H15-03',
    title: '微前端',
    chapter: 'SSR 与微前端',
    minutes: 45,
    lead:
      '多个团队维护一个前端应用，发布互相阻塞。\n' +
      '微前端把应用拆成可独立开发、独立发布的子应用。',
    terms: [
      {
        en: '微前端',
        zh: 'micro frontends',
        plain: '把前端应用按业务拆成多个可独立部署的子应用。',
      },
      {
        en: '运行时集成',
        zh: 'runtime integration',
        plain: '主应用在运行时加载子应用，子应用独立发布。',
      },
      {
        en: '样式隔离',
        zh: 'style isolation',
        plain: '避免子应用之间 CSS 互相污染。',
      },
      {
        en: '沙箱',
        zh: 'sandbox',
        plain: '隔离子应用的全局变量与执行环境。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '三个团队共用一个仓库，每次发布都要一起回归，' +
          '一个团队的 bug 阻塞另外两个团队上线。',
      },

      { type: 'h2', text: '二、拆分方式' },
      {
        type: 'table',
        head: ['方式', '特点'],
        rows: [
          ['路由分发', '按路径拆分，最常见'],
          ['iframe', '隔离最好，体验与通信差'],
          ['模块联邦', '构建时共享依赖'],
          ['Web Components', '标准隔离，生态有限'],
        ],
      },

      { type: 'h2', text: '三、主要难点' },
      {
        type: 'list',
        items: [
          '样式与全局变量污染',
          '依赖重复加载、版本冲突',
          '子应用间通信与状态共享',
          '统一登录、路由、监控',
        ],
      },

      { type: 'h2', text: '四、什么时候不该用' },
      {
        type: 'callout',
        kind: 'warn',
        text: '团队小、发布不冲突时，微前端只会增加复杂度。先解决工程协作，再谈拆分。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '子应用可独立发布', v: '实际发一次' },
          { k: '样式不互相污染', v: '切换页面' },
          { k: '登录态能共享', v: '跨子应用' },
          { k: '依赖不重复加载', v: '看网络' },
          { k: '监控能定位到子应用', v: '看错误上报' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: '微前端解决的是组织协作问题，不是技术问题。拆分前先确认团队真的需要独立发布。',
      },
      {
        type: 'list',
        items: [
          '微前端和组件库有什么区别？',
          'iframe 方案为什么体验差？',
          '子应用之间怎么通信？',
          '如何避免依赖重复？',
        ],
      },
    ],
  },

  'H16-01': {
    code: 'H16-01',
    title: '直传与预签名',
    chapter: '对象存储工程',
    minutes: 45,
    lead:
      '文件经过应用服务器中转，带宽和内存都被占满。\n' +
      '直传让客户端直接写对象存储，应用只负责发凭证。',
    terms: [
      {
        en: '对象存储',
        zh: 'object storage',
        plain: '按对象存放文件的存储服务，适合图片、视频、附件。',
      },
      {
        en: '预签名 URL',
        zh: 'presigned URL',
        plain: '服务端签发的临时上传/下载地址，带权限与有效期。',
      },
      {
        en: '临时凭证',
        zh: 'STS',
        plain: '云厂商提供的短期访问凭证，权限可精确限制。',
      },
      {
        en: '私有桶',
        zh: 'private bucket',
        plain: '默认不允许公开访问，读取需要签名。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '用户上传 100MB 视频，先传到应用服务器再转存对象存储，' +
          '服务器内存和带宽被打满，接口超时。',
      },

      { type: 'h2', text: '二、直传流程' },
      {
        type: 'chain',
        items: ['客户端请求上传凭证', '服务端鉴权并签名', '客户端直传对象存储', '回调/确认落库'],
      },

      { type: 'h2', text: '三、权限怎么控' },
      {
        type: 'table',
        head: ['控制点', '做法'],
        rows: [
          ['路径', '按用户/业务前缀限制'],
          ['大小', '签名时限制 content-length'],
          ['类型', '限制 content-type'],
          ['有效期', '几分钟到十几分钟'],
        ],
      },

      { type: 'h2', text: '四、别让客户端为所欲为' },
      {
        type: 'callout',
        kind: 'warn',
        text: '预签名 URL 只应允许写入指定路径。路径由服务端生成，不能让客户端随便传。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '文件不经应用服务器', v: '看上传链路' },
          { k: '签名限制路径与大小', v: '构造越权路径' },
          { k: '桶是私有的', v: '直接访问 URL' },
          { k: '上传完成有确认', v: '看回调/查询' },
          { k: '临时凭证权限最小', v: '看策略' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: '直传的核心是「服务端签名、客户端传输」。路径、大小、类型、有效期，一个都不能少。',
      },
      {
        type: 'list',
        items: [
          '为什么直传能减轻服务器压力？',
          '预签名 URL 泄露有什么风险？',
          '上传完成后如何确认？',
          '私有桶怎么让用户下载？',
        ],
      },
    ],
  },

  'H16-02': {
    code: 'H16-02',
    title: '分片与断点续传',
    chapter: '对象存储工程',
    minutes: 45,
    lead:
      '大文件一次传完，网络一抖就前功尽弃。\n' +
      '分片上传让失败只重传一小块。',
    terms: [
      {
        en: '分片上传',
        zh: 'multipart upload',
        plain: '把大文件切成多块并行上传，最后合并。',
      },
      {
        en: '断点续传',
        zh: 'resumable upload',
        plain: '记录已完成分片，失败后从断点继续。',
      },
      {
        en: '秒传',
        zh: 'instant upload',
        plain: '文件哈希已存在时，直接复用，不再上传。',
      },
      {
        en: '校验',
        zh: 'checksum',
        plain: '用哈希校验分片与整体文件，防止损坏。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '用户上传 2GB 安装包，传到 90% 网络断开，只能从头再来。' +
          '分片 + 断点续传后，只需要补最后几片。',
      },

      { type: 'h2', text: '二、流程' },
      {
        type: 'steps',
        items: [
          { t: '初始化', d: '创建上传任务，拿到 uploadId' },
          { t: '计算分片', d: '按固定大小切块并编号' },
          { t: '并行上传', d: '每片独立签名、独立重试' },
          { t: '合并', d: '全部分片完成后提交' },
          { t: '校验', d: '对比整体哈希' },
        ],
      },

      { type: 'h2', text: '三、断点怎么记' },
      {
        type: 'p',
        text:
          '服务端记录 uploadId 与已完成分片；客户端本地也存一份。' +
          '重新上传时先查询已传分片，跳过它们。',
      },

      { type: 'h2', text: '四、秒传的边界' },
      {
        type: 'callout',
        kind: 'warn',
        text: '秒传依赖文件哈希，但哈希相同不代表内容一定相同（理论上可碰撞）。高安全场景要二次校验。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '大文件可分片上传', v: '传一个 1GB 文件' },
          { k: '断网后能续传', v: '中断再恢复' },
          { k: '分片失败会重试', v: '模拟失败' },
          { k: '合并后哈希一致', v: '校验' },
          { k: '未完成分片会清理', v: '看清理任务' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: '分片解决大文件，断点解决网络不稳，秒传解决重复文件。三者都建立在「哈希 + 分片记录」上。',
      },
      {
        type: 'list',
        items: [
          '分片大小怎么定？',
          '断点记录存在哪？',
          '秒传有什么风险？',
          '未完成的分片怎么清理？',
        ],
      },
    ],
  },

  'H16-03': {
    code: 'H16-03',
    title: 'CDN 与安全',
    chapter: '对象存储工程',
    minutes: 40,
    lead:
      '文件放对象存储只是第一步：\n' +
      '怎么让全球用户快速下载，又不被白嫖流量，是另一半问题。',
    terms: [
      {
        en: 'CDN',
        zh: '内容分发网络',
        plain: '把文件缓存到离用户近的节点，减少延迟。',
      },
      {
        en: '防盗链',
        zh: 'hotlink protection',
        plain: '限制只有指定来源能访问资源，防止被别人盗用。',
      },
      {
        en: '签名 URL',
        zh: 'signed URL',
        plain: '带过期时间与签名的下载地址，防止长期外链。',
      },
      {
        en: '回源',
        zh: 'origin fetch',
        plain: 'CDN 节点没命中缓存时回对象存储取文件。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '商品图直接用对象存储公网地址，被其他站点盗链，' +
          '一个月流量费用翻了三倍。',
      },

      { type: 'h2', text: '二、CDN 怎么配' },
      {
        type: 'table',
        head: ['项', '建议'],
        rows: [
          ['缓存时间', '静态资源长，HTML 短'],
          ['缓存键', 'URL + 必要查询参数'],
          ['回源', '私有桶 + 回源鉴权'],
          ['刷新', '发布后刷新对应路径'],
        ],
      },

      { type: 'h2', text: '三、访问控制' },
      {
        type: 'list',
        items: [
          '私有桶 + 签名 URL，链接短期有效',
          'Referer 白名单防盗链',
          '按 IP / 地域限流',
          '敏感文件走应用鉴权后再签发',
        ],
      },

      { type: 'h2', text: '四、签名 URL 的边界' },
      {
        type: 'callout',
        kind: 'warn',
        text: '签名 URL 一旦发出，在有效期内谁拿到都能访问。有效期要短，敏感文件要绑定用户。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '静态资源走 CDN', v: '看域名' },
          { k: '私有文件不能直接访问', v: '去掉签名' },
          { k: '链接有效期合理', v: '等待过期' },
          { k: '有防盗链策略', v: '伪造 Referer' },
          { k: '流量有监控与告警', v: '看账单' },
        ],
      },

      { type: 'h2', text: '六、小结与延伸' },
      {
        type: 'callout',
        kind: 'info',
        text: 'CDN 解决速度，签名与防盗链解决成本与安全。公开桶是最容易出事的选择。',
      },
      {
        type: 'list',
        items: [
          '为什么静态资源适合长缓存？',
          '签名 URL 泄露怎么办？',
          'Referer 防盗链能被绕过吗？',
          'CDN 缓存了错误响应怎么处理？',
        ],
      },
    ],
  },
}

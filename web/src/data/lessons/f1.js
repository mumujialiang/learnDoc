export default {
  'F1-01': {
    code: 'F1-01',
    title: '从输入 URL 到页面渲染',
    chapter: '浏览器与运行时',
    minutes: 50,
    lead:
      '这是面试常问的题，但真正有用的是：\n' +
      '知道每一步在做什么，才知道性能该从哪里优化。',
    terms: [
      {
        en: '关键渲染路径',
        zh: 'critical rendering path',
        plain: '从 HTML 到像素的必经步骤：解析、构建、布局、绘制、合成。',
      },
      {
        en: '重排',
        zh: 'reflow',
        plain: '元素尺寸或位置变化导致重新计算布局，代价最高。',
      },
      {
        en: '重绘',
        zh: 'repaint',
        plain: '只改颜色、背景等视觉属性，不需要重新布局。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、一个真实场景' },
      {
        type: 'p',
        text:
          '首页 LCP 三点二秒，团队讨论要不要换框架。录一次瀑布图发现：' +
          '首屏一张 1.8MB 未压缩的 banner、字体文件 600KB、head 里一个同步加载的统计脚本。' +
          '三项加起来占了三点二秒里的两点四秒，跟框架一点关系没有。' +
          '这道题的价值不在背链路，而在于能把时间归属到具体的一跳。',
      },

      { type: 'h2', text: '二、请求链路' },
      {
        type: 'chain',
        items: ['URL', 'DNS 解析', 'TCP / TLS', 'HTTP 请求', 'HTML 响应'],
      },
      {
        type: 'p',
        text:
          'DNS 常见二三十到一百多毫秒；建连加 TLS 在旧协议下要两三个往返，' +
          'HTTP/2 复用连接后，同域后续请求省掉这部分。' +
          '首字节时间（TTFB）大致等于 DNS + 连接 + TLS + 服务端处理，前四项里前端只能影响「少一次跳」。' +
          '跨域资源每多一个域名，就多一次 DNS 与建连——域名分片在今天基本是负收益。',
      },

      { type: 'h2', text: '三、解析与渲染' },
      {
        type: 'chain',
        items: ['HTML 解析成 DOM', 'CSS 解析成 CSSOM', '构建渲染树', '布局', '绘制', '合成'],
      },
      {
        type: 'p',
        text: 'CSS 会阻塞渲染，JS 会阻塞 HTML 解析。这就是为什么脚本位置和加载方式会影响首屏。',
      },
      {
        type: 'p',
        text:
          '机制上：没有完整 CSSOM 就构建不出渲染树，所以 CSS 拦的是「画」；' +
          '而普通 script 必须等下载并执行完才继续解析 HTML，拦的是「读」。' +
          'defer 让脚本等文档解析完再按顺序执行，async 是下载完就插队执行、顺序不定。' +
          '这就是「为什么我的 DOM 查询拿不到后面的元素」的根源。',
      },

      { type: 'h2', text: '四、哪一步最贵' },
      {
        type: 'table',
        head: ['阶段', '典型耗时', '优化方向'],
        rows: [
          ['网络', '几十到几百毫秒', 'CDN、压缩、缓存、减少体积'],
          ['解析与执行', '取决于 JS 体积', '代码分割、按需加载'],
          ['布局与绘制', '节点越多越慢', '减少 DOM、避免频繁读写样式'],
          ['合成', '通常较快', '用 transform / opacity 做动画'],
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '判断顺序固定：先在 Network 里按体积和耗时排序，找最长的三根柱子；' +
          '再看 Performance 里主线程是否有超过 50ms 的长任务。' +
          '跳过这两步直接改代码，基本是在优化错觉。',
      },

      { type: 'h2', text: '五、前端能控制什么' },
      {
        type: 'list',
        items: [
          '资源优先级：preload、prefetch、defer / async',
          '首屏只加载必要代码，其余动态导入',
          '图片给明确尺寸，避免布局抖动',
          '字体按需子集化，避免字体阻塞',
          '避免在主线程做长任务',
        ],
      },

      { type: 'h2', text: '六、失败模式' },
      {
        type: 'table',
        head: ['写法', '后果', '怎么判断'],
        rows: [
          ['首屏大图不压缩、不设尺寸', 'LCP 变慢，同时撑高 CLS', '看瀑布图里最大那根柱子'],
          ['字体没写 font-display', '文字长时间不可见（FOIT）', '弱网下刷新首屏'],
          ['head 里同步加载第三方脚本', '阻塞解析，整页白屏更久', '删掉它再测一次'],
          ['所有路由同步 import', '首包过大，首屏必须等全部下载', '看产物里主 chunk 体积'],
        ],
      },

      { type: 'h2', text: '七、边界与取舍' },
      {
        type: 'p',
        text:
          'preload 不是越多越好，它会抢带宽，把真正关键的东西挤后。' +
          '懒加载过度会让首屏内容出现太晚，LCP 反而变差。' +
          'SSR 也不是万能：它优化的是首屏内容与 TTFB，代价是服务端成本和水合（hydration）后的交互延迟，' +
          '如果你的瓶颈在一张图，SSR 一分钱都省不下来。',
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'steps',
        items: [
          { t: '归属时间', d: '录一次瀑布图，把首屏总时间按 DNS、连接、下载、主线程四类各占多少写下来。' },
          { t: '做一次单变量实验', d: '只给首屏图加压缩与宽高，其他不动，对比 LCP 与 CLS 的变化。' },
          { t: '验证阻塞关系', d: '把 head 里的脚本加上 defer，看首次内容绘制是否提前。' },
        ],
      },

      { type: 'h2', text: '九、小结' },
      {
        type: 'p',
        text:
          '链路本身不用背，要记住的是三件事：DNS 与连接是固定开销，所以少域名；' +
          'CSS 拦渲染、同步 JS 拦解析，所以关键样式内联、脚本 defer；' +
          '首屏时间由最慢那一根柱子决定，所以先找柱子再动手。',
      },

      { type: 'h2', text: '十、验收' },
      {
        type: 'checklist',
        items: [
          { k: '首屏关键资源数量', v: '看 Network 瀑布图' },
          { k: 'LCP / CLS 是否达标', v: 'Lighthouse 或真实用户指标' },
          { k: '有没有阻塞渲染的脚本', v: '看 head 里的 script' },
          { k: '图片是否有尺寸约束', v: '检查 img 标签' },
        ],
      },

      { type: 'h2', text: '十一、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 CSS 会阻塞渲染，JS 会阻塞解析？',
          '重排和重绘的区别是什么？',
          'defer 和 async 分别适合什么脚本？',
          '为什么域名分片在 HTTP/2 下变成了负收益？',
        ],
      },
    ],
  },

  'F1-02': {
    code: 'F1-02',
    title: '事件循环与任务队列',
    chapter: '浏览器与运行时',
    minutes: 50,
    lead:
      'setTimeout(fn, 0) 不是立刻执行，Promise 会比它更早。\n' +
      '搞不清任务顺序，就会写出「看起来对、顺序错」的代码。',
    terms: [
      {
        en: '宏任务',
        zh: 'macrotask',
        plain: 'script、setTimeout、setInterval、IO 回调等，一次事件循环取一个。',
      },
      {
        en: '微任务',
        zh: 'microtask',
        plain: 'Promise 回调、queueMicrotask、MutationObserver，当前任务结束后立即清空。',
      },
      {
        en: '渲染时机',
        zh: 'rendering opportunity',
        plain: '浏览器在两轮任务之间决定是否绘制，通常约每 16ms 一次。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、一个真实场景' },
      {
        type: 'p',
        text:
          '点「导出」按钮，页面要先把两万条记录序列化，卡住 400 毫秒，用户以为没点上又点了一次。' +
          '有人把任务拆成十片用 setTimeout(0) 依次跑，结果还是卡——' +
          '因为每片 40 毫秒之外，中间还塞了十次重排，总时长没变，交互也没变好。',
      },

      { type: 'h2', text: '二、执行模型' },
      {
        type: 'chain',
        items: ['取一个宏任务', '执行', '清空微任务队列', '可能渲染', '下一轮'],
      },
      {
        type: 'p',
        text:
          '注意第三步是「清空」，不是「取一个」。所以微任务里再产生微任务，会一直排到空，' +
          '中间永远轮不到渲染。这就是「Promise 里递归调用自己，页面完全冻住」的原因，' +
          '而同样的代码换成 setTimeout 递归，页面至少还喘得过来。',
      },

      { type: 'h2', text: '三、顺序怎么排' },
      {
        type: 'table',
        head: ['代码', '执行顺序'],
        rows: [
          ['同步代码', '最先'],
          ['Promise.then', '当前宏任务结束后，立即'],
          ['queueMicrotask', '同微任务'],
          ['setTimeout 0', '下一轮宏任务'],
          ['requestAnimationFrame', '渲染前'],
        ],
      },
      {
        type: 'p',
        text:
          'async/await 不改变这套规则：await 之后的代码等价于 .then 里的回调，是微任务。' +
          '所以「await 一个同步值」也不会立刻继续，而是先让出给后面的微任务。' +
          '面试题里那些输出顺序，全都能用这一条推出来。',
      },

      { type: 'h2', text: '四、渲染发生在什么时候' },
      {
        type: 'p',
        text:
          '浏览器在一轮任务和微任务清空后，才可能渲染。' +
          '如果微任务一直产生新微任务，页面会一直不更新。',
      },
      {
        type: 'p',
        text:
          '这里的「可能」很重要：屏幕 60Hz 时大约每 16 毫秒有一次机会，' +
          '但如果这一轮任务耗时 100 毫秒，机会就错过了，用户看到的是卡顿而不是掉帧。' +
          'requestAnimationFrame 排在这之前，所以动画放 rAF 里最稳；requestIdleCallback 排在空闲时，适合低优先级计算。',
      },

      { type: 'h2', text: '五、常见坑' },
      {
        type: 'list',
        items: [
          '长任务阻塞渲染，页面卡住',
          '在微任务里无限递归，永远轮不到渲染',
          'await 循环里没有让出，仍然占满主线程',
          '误以为 setTimeout 能保证顺序',
        ],
      },
      {
        type: 'callout',
        kind: 'warn',
        text:
          'setTimeout 有最小延迟钳制：嵌套五层之后每次至少 4 毫秒，后台标签页更宽松。' +
          '所以用 setTimeout(0) 做切片，实际每片之间有 4 毫秒空转，切一百片就多四百毫秒。' +
          '需要更细的让出，用 MessageChannel 或 scheduler 的 yield。',
      },

      { type: 'h2', text: '六、失败模式' },
      {
        type: 'table',
        head: ['症状', '根因', '怎么确认'],
        rows: [
          ['点击后 300ms 才响应', '主线程被一个大任务占住', 'Performance 里找超 50ms 的长任务'],
          ['页面完全冻结、日志还在打', '微任务无限递归', '看是否在 then 里递归调用自己'],
          ['切片后仍然卡', '单片仍然太长，或切片间触发了重排', '量每片实际耗时'],
          ['后台标签页计时严重漂移', '后台节流', '前后台各打一次时间戳'],
        ],
      },

      { type: 'h2', text: '七、边界与取舍' },
      {
        type: 'p',
        text:
          '切片不是免费的：每让出一次就有调度成本，切成一百片可能比一次跑完更慢。' +
          '经验值是一片控制在 16 到 50 毫秒之间，够细到能响应输入，又不至于把开销翻倍。' +
          '如果计算真的重到影响交互，正确做法是挪到 Web Worker，而不是在主线程上切得更碎。',
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'steps',
        items: [
          { t: '排一次顺序', d: '写同步日志、Promise.then、setTimeout 0、rAF 四个，先预测再运行。' },
          { t: '制造一次冻结', d: '在 then 里递归调用自身，观察页面停止响应；换成 setTimeout 递归再看一次。' },
          { t: '量一次切片', d: '把两万条处理切成二十片，记录每片真实耗时与总时长。' },
        ],
      },

      { type: 'h2', text: '九、小结' },
      {
        type: 'p',
        text:
          '一轮循环取一个宏任务、清空全部微任务、然后才可能渲染。' +
          '所有「顺序不对」和「页面卡死」的问题，都能落在这三句话上；' +
          '所有「切了还是卡」的问题，都是单片太长或让出方式选错。',
      },

      { type: 'h2', text: '十、验收' },
      {
        type: 'checklist',
        items: [
          { k: '有没有超过 50ms 的长任务', v: 'Performance 面板' },
          { k: 'INP 是否达标', v: '真实用户指标' },
          { k: '异步顺序是否符合预期', v: '打日志验证' },
          { k: '复杂计算是否分片', v: '检查循环与递归' },
        ],
      },

      { type: 'h2', text: '十一、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 Promise 比 setTimeout 先执行？',
          'requestAnimationFrame 和 setTimeout 的区别？',
          '长任务为什么会影响交互？',
          '为什么 Web Worker 解决的是「不阻塞」，而不是「更快」？',
        ],
      },
    ],
  },

  'F1-03': {
    code: 'F1-03',
    title: '网络与缓存',
    chapter: '浏览器与运行时',
    minutes: 45,
    lead:
      '缓存用得好，首屏快一倍；用错了，用户永远看到旧页面。\n' +
      '关键不是「开缓存」，而是分清哪些资源可以缓存多久。',
    terms: [
      {
        en: '强缓存',
        zh: 'strong cache',
        plain: '不发请求，直接用本地副本，由 Cache-Control / Expires 控制。',
      },
      {
        en: '协商缓存',
        zh: 'conditional request',
        plain: '带 ETag / Last-Modified 询问服务端，没变就返回 304。',
      },
      {
        en: 'CDN',
        zh: 'content delivery network',
        plain: '把静态资源放到离用户更近的节点，减少网络延迟。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、一个真实场景' },
      {
        type: 'p',
        text:
          '版本发布完，运营说新功能看不见。排查发现 index.html 被 CDN 缓存了七天，' +
          '带 hash 的 JS 倒是最新的，只是没人告诉浏览器该去拿它。' +
          '缓存事故几乎都不是策略写错，而是「哪一层缓存」没分清。',
      },

      { type: 'h2', text: '二、缓存决策' },
      {
        type: 'table',
        head: ['资源', '建议策略'],
        rows: [
          ['带 hash 的 JS / CSS', '强缓存一年，immutable'],
          ['图片 / 字体', '强缓存较长时间'],
          ['HTML', '不缓存或短缓存，走协商'],
          ['接口数据', '按业务决定，谨慎缓存'],
        ],
      },
      {
        type: 'p',
        text:
          '这张表能成立的前提只有一个：文件名带内容 hash。' +
          '内容一变文件名就变，浏览器自然会去取新的；反过来，文件名不带 hash 却设了一年的强缓存，' +
          '等于把「更新」这件事彻底交给用户去按 Ctrl+F5。',
      },

      { type: 'h2', text: '三、强缓存与协商缓存的差别' },
      {
        type: 'chain',
        items: ['请求', '本地有副本且未过期 → 直接用', '过期 → 带 ETag 询问', '304 用本地 / 200 换新'],
      },
      {
        type: 'p',
        text:
          '强缓存省掉的是整个请求往返，协商缓存只省响应体。' +
          '所以「快」的关键在强缓存，而「新」的关键在让 HTML 走协商。' +
          'ETag 比 Last-Modified 精确，因为它基于内容而不是时间，' +
          '能把「一秒内改两次」和「时间对不上」都区分开。',
      },

      { type: 'h2', text: '四、CDN 与回源' },
      {
        type: 'p',
        text:
          'CDN 节点没命中时会回源站取，第一次仍然慢。' +
          '发布新版本时要注意刷新 CDN 缓存，否则用户拿到的还是旧文件。',
      },
      {
        type: 'p',
        text:
          '实践上要做三件事：发布后刷新 HTML 与目录列表（而不是刷全站），' +
          '大促前预热核心静态资源，以及把源站的 Cache-Control 与 CDN 的 TTL 对齐——' +
          '这两处不一致时，你刷了新内容，边缘节点仍按旧 TTL 返回。',
      },

      { type: 'h2', text: '五、Service Worker 的边界' },
      {
        type: 'list',
        items: [
          '能离线、能拦截请求，但生命周期和更新很绕',
          '缓存策略写错，用户可能长期拿不到新版本',
          '没有 HTTPS 无法使用',
          '业务简单时，HTTP 缓存通常够用',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          '最常见的 SW 事故：缓存优先策略把 HTML 也缓存了，用户每次打开都是旧壳子。' +
          '判断信号是「强刷正常、正常刷新不正常」。修法是 HTML 走网络优先，静态资源才走缓存优先。',
      },

      { type: 'h2', text: '六、常见错误' },
      {
        type: 'list',
        items: [
          '给 HTML 设了长强缓存，发布后用户看不到新版本',
          '静态资源文件名不带 hash，却设了长缓存',
          '跨域请求漏了 CORS 头，缓存行为异常',
          '304 响应体处理不当，页面拿到空内容',
        ],
      },

      { type: 'h2', text: '七、失败模式' },
      {
        type: 'table',
        head: ['症状', '最可能的根因', '怎么确认'],
        rows: [
          ['部分用户看到旧页面', 'HTML 被强缓存或 CDN 未刷新', '对比响应头的 age 与 cache-control'],
          ['新版本资源 404', 'HTML 是旧的，引用了已删除的旧 hash', '看 404 的文件名版本号'],
          ['接口返回旧数据', '中间层缓存没区分用户或版本', '换账号请求同一接口'],
          ['离线后一直白屏', 'SW 缓存了壳却漏了接口或分包', '断网重开，看 Network 里缺哪个'],
        ],
      },

      { type: 'h2', text: '八、边界与取舍' },
      {
        type: 'p',
        text:
          '缓存时间越长越省钱，也越难更新，这是唯一的核心取舍。' +
          '接口层还要多考虑一条：能不能按用户维度缓存。做不到就别在 CDN 层缓存业务接口，' +
          '否则迟早出现「张三看到李四的数据」。这一条不是性能问题，是事故。',
      },

      { type: 'h2', text: '九、动手验证' },
      {
        type: 'steps',
        items: [
          { t: '读一次响应头', d: '分别看 HTML 与带 hash 的 JS 的 cache-control、etag、age，确认策略符合预期。' },
          { t: '模拟一次发布', d: '改一个文件重新构建，正常刷新看是否拿到新版本；再看强刷与普通刷新的差异。' },
          { t: '断网测一次', d: '有 SW 的项目断网重开，确认该有的能打开、不该有的明确报错。' },
        ],
      },

      { type: 'h2', text: '十、小结' },
      {
        type: 'p',
        text:
          '一句话策略：文件名带 hash 的资源永久缓存，HTML 永远短缓存，' +
          '接口默认不缓存。发布流程里必须包含「刷新 CDN 的 HTML」，' +
          '否则所有前端优化都会输给一次缓存。',
      },

      { type: 'h2', text: '十一、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'HTML 是否短缓存', v: '看响应头' },
          { k: '静态资源是否带 hash', v: '看构建产物' },
          { k: '发布后用户能拿到新版本', v: '强刷与普通刷新对比' },
          { k: 'CDN 刷新流程', v: '看发布脚本' },
        ],
      },

      { type: 'h2', text: '十二、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 HTML 不适合长强缓存？',
          'ETag 和 Last-Modified 哪个更精确？',
          'Service Worker 更新为什么会滞后？',
          'CDN 的 TTL 与源站 Cache-Control 冲突时以谁为准？',
        ],
      },
    ],
  },

  'F1-04': {
    code: 'F1-04',
    title: '存储与安全边界',
    chapter: '浏览器与运行时',
    minutes: 45,
    lead:
      '浏览器给了四种存储，但没有一种适合放敏感数据。\n' +
      '搞清楚同源和存储边界，才知道 token 该放哪。',
    terms: [
      {
        en: '同源策略',
        zh: 'same-origin policy',
        plain: '协议、域名、端口都相同才算同源，否则脚本不能随意读对方数据。',
      },
      {
        en: 'HttpOnly',
        zh: 'HttpOnly cookie',
        plain: 'JS 读不到这个 cookie，能降低 XSS 窃取 token 的风险。',
      },
      {
        en: 'CSRF',
        zh: '跨站请求伪造',
        plain: '攻击者借用用户已登录的 cookie，诱导浏览器发起请求。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、一个真实场景' },
      {
        type: 'p',
        text:
          '安全审计报了一条：token 存在 localStorage，有效期七天。' +
          '这意味着任何一个第三方依赖里的 XSS，都能把七天的登录态完整打包带走，' +
          '而且服务端无法区分「本人」和「拿着 token 的人」。' +
          '问题不在存储本身，在于把长期凭证放在了脚本读得到的地方。',
      },

      { type: 'h2', text: '二、四种存储' },
      {
        type: 'table',
        head: ['方式', '容量', '特点'],
        rows: [
          ['Cookie', '约 4KB', '随请求发送，可设 HttpOnly / Secure / SameSite'],
          ['localStorage', '5–10MB', '同步、持久，XSS 可直接读取'],
          ['sessionStorage', '5–10MB', '标签页关闭即清'],
          ['IndexedDB', '较大', '异步、适合结构化数据'],
        ],
      },
      {
        type: 'p',
        text:
          '两个容易被忽略的细节：「同步」意味着读写 localStorage 会占用主线程，' +
          '在低端机上一次几 MB 的序列化能卡出几十毫秒；' +
          '另外配额按源共享，写满时抛异常而不是静默失败，' +
          '所以需要 try/catch——无痕模式下有些浏览器会直接拒绝写入。',
      },

      { type: 'h2', text: '三、同源与跨域' },
      {
        type: 'p',
        text:
          '同源策略限制的是「读」，不是「发」。' +
          '跨域请求可能已经到达服务端，只是响应被浏览器拦住。',
      },
      {
        type: 'p',
        text:
          '这条差别决定了 CSRF 的可行性：攻击者不需要读你的响应，只要让请求发出去就够。' +
          '带 Cookie 的跨域请求还需要服务端明确返回精确 Origin 与 Allow-Credentials，' +
          '不能用通配符——这既是限制，也是你排查「登录态丢失」时的第一现场。',
      },

      { type: 'h2', text: '四、XSS 与 CSRF 的前端责任' },
      {
        type: 'list',
        items: [
          '不要用 innerHTML 渲染用户输入',
          'token 优先放 HttpOnly cookie，而不是 localStorage',
          '写操作加 CSRF token 或使用 SameSite',
          '第三方脚本是最容易被忽视的入口',
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text:
          'XSS 防的是「注入」，CSRF 防的是「冒用」。两者的关系是互补而非替代：' +
          '把 token 塞进 HttpOnly 就挡住了 XSS 偷取，但请求会自动带上 cookie，' +
          '于是 CSRF 风险上升，需要 SameSite 或 CSRF token 补回来。安全设计永远是换风险，不是消灭风险。',
      },

      { type: 'h2', text: '五、敏感数据放哪' },
      {
        type: 'callout',
        kind: 'warn',
        text: 'localStorage 里的任何东西都可能被 XSS 读走。长期 token 不要放这里。',
      },
      {
        type: 'p',
        text:
          '常见组合是：短期 access token 放内存（刷新页面就没了，需要静默续期），' +
          '长期凭证放 HttpOnly + Secure + SameSite 的 cookie，页面脚本碰不到。' +
          '代价是实现复杂度上升，判断标准是这套系统的数据敏感到什么程度——' +
          '内部工具和支付后台，答案不一样。',
      },

      { type: 'h2', text: '六、失败模式' },
      {
        type: 'table',
        head: ['症状', '根因', '怎么确认'],
        rows: [
          ['登录后被莫名顶下线', 'cookie 的 SameSite 或域设置不一致', '对比请求里的 cookie 与 Set-Cookie'],
          ['刷新页面登录态丢失', 'token 只存在内存且无续期', '强刷后看是否重新跳登录'],
          ['无痕模式功能异常', '存储写入被拒未捕获', '无痕窗口复现'],
          ['v-html 渲染用户昵称被注入', '未转义直接拼 HTML', '搜 v-html 与 innerHTML'],
        ],
      },

      { type: 'h2', text: '七、边界与取舍' },
      {
        type: 'p',
        text:
          'SameSite=Lax 能挡掉大部分跨站 POST，但也会拦掉一些合法的跨域回调（比如第三方支付跳回）；' +
          '改成 None 就必须配 Secure，且 CSRF 防护要另做。' +
          '这里没有标准答案，只有「你的攻击面在哪」：' +
          '面向公网、有用户生成内容的系统，值得为安全多写两百行；纯内网后台可以务实一点，但要有明确记录。',
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'steps',
        items: [
          { t: '看一遍 cookie 属性', d: '登录后打开 Application 与响应头，确认 HttpOnly、Secure、SameSite 三个都符合预期。' },
          { t: '做一次注入实验', d: '在自己搭的页面上把输入渲染到 v-html，输入一段 script，看是否执行。' },
          { t: '验证跨域凭证', d: '用另一个端口起一个页面发带 cookie 的请求，观察是否被拦以及拦在哪一步。' },
        ],
      },

      { type: 'h2', text: '九、小结' },
      {
        type: 'p',
        text:
          '存储的选择其实是「谁能读」的选择：脚本能读的都可能被 XSS 拿走，' +
          '服务器能读的都要防 CSRF。先明确这两句话，再决定 token 放哪，比记任何最佳实践都管用。',
      },

      { type: 'h2', text: '十、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'token 存储位置是否合理', v: '看登录实现' },
          { k: 'cookie 属性是否齐全', v: 'HttpOnly / Secure / SameSite' },
          { k: '有没有直接渲染用户输入', v: '搜 innerHTML / v-html' },
          { k: '跨域配置是否精确', v: '不要用 *' },
        ],
      },

      { type: 'h2', text: '十一、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 localStorage 不适合存 token？',
          '同源策略能阻止请求发出吗？',
          'SameSite 能防住哪些 CSRF？',
          '把 token 移进 HttpOnly cookie 后，新增了什么风险？',
        ],
      },
    ],
  },
}

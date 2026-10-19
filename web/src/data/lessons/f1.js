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
      { type: 'h2', text: '一、请求链路' },
      {
        type: 'chain',
        items: ['URL', 'DNS 解析', 'TCP / TLS', 'HTTP 请求', 'HTML 响应'],
      },
      {
        type: 'p',
        text: 'DNS、连接、TLS 都可能成为瓶颈，尤其在弱网和跨地域场景。前端能做的是减少请求、复用连接、用 CDN。',
      },

      { type: 'h2', text: '二、解析与渲染' },
      {
        type: 'chain',
        items: ['HTML 解析成 DOM', 'CSS 解析成 CSSOM', '构建渲染树', '布局', '绘制', '合成'],
      },
      {
        type: 'p',
        text: 'CSS 会阻塞渲染，JS 会阻塞 HTML 解析。这就是为什么脚本位置和加载方式会影响首屏。',
      },

      { type: 'h2', text: '三、哪一步最贵' },
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

      { type: 'h2', text: '四、前端能控制什么' },
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

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '首屏关键资源数量', v: '看 Network 瀑布图' },
          { k: 'LCP / CLS 是否达标', v: 'Lighthouse 或真实用户指标' },
          { k: '有没有阻塞渲染的脚本', v: '看 head 里的 script' },
          { k: '图片是否有尺寸约束', v: '检查 img 标签' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 CSS 会阻塞渲染，JS 会阻塞解析？',
          '重排和重绘的区别是什么？',
          'defer 和 async 分别适合什么脚本？',
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
      { type: 'h2', text: '一、执行模型' },
      {
        type: 'chain',
        items: ['取一个宏任务', '执行', '清空微任务队列', '可能渲染', '下一轮'],
      },

      { type: 'h2', text: '二、顺序怎么排' },
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

      { type: 'h2', text: '三、渲染发生在什么时候' },
      {
        type: 'p',
        text:
          '浏览器在一轮任务和微任务清空后，才可能渲染。' +
          '如果微任务一直产生新微任务，页面会一直不更新。',
      },

      { type: 'h2', text: '四、常见坑' },
      {
        type: 'list',
        items: [
          '长任务阻塞渲染，页面卡住',
          '在微任务里无限递归，永远轮不到渲染',
          'await 循环里没有让出，仍然占满主线程',
          '误以为 setTimeout 能保证顺序',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '有没有超过 50ms 的长任务', v: 'Performance 面板' },
          { k: 'INP 是否达标', v: '真实用户指标' },
          { k: '异步顺序是否符合预期', v: '打日志验证' },
          { k: '复杂计算是否分片', v: '检查循环与递归' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 Promise 比 setTimeout 先执行？',
          'requestAnimationFrame 和 setTimeout 的区别？',
          '长任务为什么会影响交互？',
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
      { type: 'h2', text: '一、缓存决策' },
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

      { type: 'h2', text: '二、CDN 与回源' },
      {
        type: 'p',
        text:
          'CDN 节点没命中时会回源站取，第一次仍然慢。' +
          '发布新版本时要注意刷新 CDN 缓存，否则用户拿到的还是旧文件。',
      },

      { type: 'h2', text: '三、Service Worker 的边界' },
      {
        type: 'list',
        items: [
          '能离线、能拦截请求，但生命周期和更新很绕',
          '缓存策略写错，用户可能长期拿不到新版本',
          '没有 HTTPS 无法使用',
          '业务简单时，HTTP 缓存通常够用',
        ],
      },

      { type: 'h2', text: '四、常见错误' },
      {
        type: 'list',
        items: [
          '给 HTML 设了长强缓存，发布后用户看不到新版本',
          '静态资源文件名不带 hash，却设了长缓存',
          '跨域请求漏了 CORS 头，缓存行为异常',
          '304 响应体处理不当，页面拿到空内容',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'HTML 是否短缓存', v: '看响应头' },
          { k: '静态资源是否带 hash', v: '看构建产物' },
          { k: '发布后用户能拿到新版本', v: '强刷与普通刷新对比' },
          { k: 'CDN 刷新流程', v: '看发布脚本' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 HTML 不适合长强缓存？',
          'ETag 和 Last-Modified 哪个更精确？',
          'Service Worker 更新为什么会滞后？',
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
      { type: 'h2', text: '一、四种存储' },
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

      { type: 'h2', text: '二、同源与跨域' },
      {
        type: 'p',
        text:
          '同源策略限制的是「读」，不是「发」。' +
          '跨域请求可能已经到达服务端，只是响应被浏览器拦住。',
      },

      { type: 'h2', text: '三、XSS 与 CSRF 的前端责任' },
      {
        type: 'list',
        items: [
          '不要用 innerHTML 渲染用户输入',
          'token 优先放 HttpOnly cookie，而不是 localStorage',
          '写操作加 CSRF token 或使用 SameSite',
          '第三方脚本是最容易被忽视的入口',
        ],
      },

      { type: 'h2', text: '四、敏感数据放哪' },
      {
        type: 'callout',
        kind: 'warn',
        text: 'localStorage 里的任何东西都可能被 XSS 读走。长期 token 不要放这里。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'token 存储位置是否合理', v: '看登录实现' },
          { k: 'cookie 属性是否齐全', v: 'HttpOnly / Secure / SameSite' },
          { k: '有没有直接渲染用户输入', v: '搜 innerHTML / v-html' },
          { k: '跨域配置是否精确', v: '不要用 *' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 localStorage 不适合存 token？',
          '同源策略能阻止请求发出吗？',
          'SameSite 能防住哪些 CSRF？',
        ],
      },
    ],
  },
}

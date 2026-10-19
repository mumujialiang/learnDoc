export default {
  'F3-01': {
    code: 'F3-01',
    title: '响应式原理',
    chapter: 'Vue 深入',
    minutes: 50,
    lead:
      '「数据变了页面自动更新」不是魔法。\n' +
      '知道依赖是怎么收集的，才能解释为什么有些改动页面不刷新。',
    terms: [
      {
        en: '响应式',
        zh: 'reactivity',
        plain: '读取时记录依赖，修改时通知相关更新。',
      },
      {
        en: '依赖收集',
        zh: 'dependency tracking',
        plain: '渲染或计算过程中访问了哪些数据，就记下哪些依赖。',
      },
      {
        en: '调度',
        zh: 'scheduler',
        plain: '数据变化后不立刻重渲染，而是排队到微任务里批量更新。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、数据变，页面变' },
      {
        type: 'p',
        text:
          'Vue 3 用 Proxy 拦截读写：读的时候把当前副作用记进依赖表，写的时候通知这些副作用重新执行。',
      },

      { type: 'h2', text: '二、一次更新的链路' },
      {
        type: 'chain',
        items: ['读取数据', '记录依赖', '数据被修改', '触发调度', '批量重渲染'],
      },

      { type: 'h2', text: '三、为什么有些修改不生效' },
      {
        type: 'table',
        head: ['写法', '为什么会失去响应'],
        rows: [
          ['解构 props / reactive 对象', '拿到的是值的副本'],
          ['直接给整个对象重新赋值', '引用被替换，旧依赖还在旧对象上'],
          ['修改数组索引或长度', '部分场景不会触发通知'],
          ['把响应式对象传给非响应式库', '库内部读写绕过了 Proxy'],
        ],
      },

      { type: 'h2', text: '四、批量更新' },
      {
        type: 'callout',
        kind: 'info',
        text: '同一轮事件里改十次数据，通常只触发一次渲染。想在 DOM 更新后拿结果，用 nextTick。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '解构是否用 toRefs / 直接访问', v: '检查代码' },
          { k: '大数据对象是否整体替换', v: '看更新逻辑' },
          { k: 'DOM 读取是否在 nextTick 后', v: '检查时序' },
          { k: '有没有无意义的重渲染', v: 'DevTools 性能分析' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么解构会丢失响应式？',
          'Proxy 和 Object.defineProperty 的区别？',
          'nextTick 解决什么问题？',
        ],
      },
    ],
  },

  'F3-02': {
    code: 'F3-02',
    title: '组件设计',
    chapter: 'Vue 深入',
    minutes: 50,
    lead:
      '组件不是「按页面切块」，而是「按职责与变化频率切块」。\n' +
      '切错了，一个组件会越写越大，最后谁都不敢改。',
    terms: [
      {
        en: '单向数据流',
        zh: 'one-way data flow',
        plain: '父传子用 props，子通知父用事件，不在子组件里直接改 props。',
      },
      {
        en: '受控组件',
        zh: 'controlled component',
        plain: '值由外部传入、变化由外部决定，组件只负责展示与触发事件。',
      },
      {
        en: '插槽',
        zh: 'slot',
        plain: '把内容交给使用方决定，适合布局类、容器类组件。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、组件边界怎么切' },
      {
        type: 'list',
        items: [
          '一个组件只负责一件事',
          '变化频率不同的部分分开',
          '可复用的展示与业务逻辑分离',
          '超过三四百行就考虑拆分',
        ],
      },

      { type: 'h2', text: '二、props 与事件' },
      {
        type: 'p',
        text:
          'props 是输入，事件是输出。子组件不要修改 props，' +
          '需要改就发事件让父组件改，这样数据流才可追踪。',
      },

      { type: 'h2', text: '三、受控与非受控' },
      {
        type: 'table',
        head: ['模式', '特点', '适合'],
        rows: [
          ['受控', '值完全由外部控制', '表单联动、校验、回填'],
          ['非受控', '组件内部维护状态', '简单输入、性能敏感'],
          ['半受控', '外部给初值，内部维护', '编辑弹窗'],
        ],
      },

      { type: 'h2', text: '四、插槽与组合' },
      {
        type: 'p',
        text:
          '容器组件用插槽暴露扩展点，比堆一堆布尔 props 更清晰；' +
          '但插槽嵌套过深会让数据流难追踪。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '组件是否只做一件事', v: '读代码与模板' },
          { k: '有没有直接改 props', v: '搜 props.xxx =' },
          { k: '事件命名是否表意', v: 'update:modelValue 等' },
          { k: '插槽是否必要', v: '评估扩展点' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么子组件不应该修改 props？',
          '受控组件在什么场景下更好？',
          '什么时候该用插槽而不是 props？',
        ],
      },
    ],
  },

  'F3-03': {
    code: 'F3-03',
    title: '组合式 API 与副作用',
    chapter: 'Vue 深入',
    minutes: 50,
    lead:
      '组合式 API 让逻辑可以按功能组织，\n' +
      '但也让「副作用什么时候执行、什么时候清理」变得更需要自觉。',
    terms: [
      {
        en: '组合式 API',
        zh: 'composition API',
        plain: '用函数组合状态与逻辑，按功能而非选项组织代码。',
      },
      {
        en: '副作用',
        zh: 'side effect',
        plain: '请求、定时器、事件监听、DOM 操作等会影响外部世界的操作。',
      },
      {
        en: '清理函数',
        zh: 'cleanup',
        plain: '组件卸载或依赖变化时执行的收尾逻辑，用来防泄漏。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、组合式解决什么' },
      {
        type: 'list',
        items: [
          '相关逻辑放在一起，而不是分散在 data / methods / watch',
          '逻辑可以抽成 composable 复用',
          '类型推导更自然',
        ],
      },

      { type: 'h2', text: '二、副作用的生命周期' },
      {
        type: 'chain',
        items: ['组件挂载', '注册监听 / 请求', '依赖变化或卸载', '清理'],
      },

      { type: 'h2', text: '三、watch 与 computed' },
      {
        type: 'table',
        head: ['', 'computed', 'watch'],
        rows: [
          ['用途', '派生状态', '响应变化做副作用'],
          ['是否缓存', '是', '否'],
          ['适合', '模板展示', '请求、存储、日志'],
        ],
      },

      { type: 'h2', text: '四、常见泄漏' },
      {
        type: 'list',
        items: [
          '定时器没清',
          '事件监听没移除',
          '请求返回后组件已卸载，仍去改状态',
          'watch 里发请求没处理竞态',
        ],
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '定时器与监听是否清理', v: 'onUnmounted 检查' },
          { k: '请求是否可取消', v: 'AbortController' },
          { k: 'composable 是否可独立测试', v: '单测' },
          { k: 'watch 是否精确', v: '避免 deep 全量监听' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么组合式 API 更容易产生副作用泄漏？',
          'computed 和 watch 分别适合什么？',
          '组件卸载后请求返回，应该怎么处理？',
        ],
      },
    ],
  },

  'F3-04': {
    code: 'F3-04',
    title: '渲染性能',
    chapter: 'Vue 深入',
    minutes: 45,
    lead:
      '大部分「Vue 慢」不是框架慢，\n' +
      '是一次渲染了太多不该渲染的东西。',
    terms: [
      {
        en: 'key',
        zh: 'list key',
        plain: '告诉框架列表项的身份，帮助复用节点而不是重建。',
      },
      {
        en: '虚拟 DOM',
        zh: 'virtual DOM',
        plain: '用 JS 对象描述视图，比较差异后批量更新真实 DOM。',
      },
      {
        en: '代码分割',
        zh: 'code splitting',
        plain: '把不急着用的代码拆成单独文件，按需加载。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、什么时候会渲染' },
      {
        type: 'p',
        text:
          '组件依赖的响应式数据变化、父组件重渲染、key 变化，都会触发更新。' +
          '先确认「谁在渲染」，再谈优化。',
      },

      { type: 'h2', text: '二、key 的作用' },
      {
        type: 'p',
        text:
          '用索引当 key，在插入、删除、排序时会让节点错位复用，' +
          '导致输入框内容串位、动画异常。用稳定的业务 id。',
      },

      { type: 'h2', text: '三、列表与大数据' },
      {
        type: 'list',
        items: [
          '长列表用虚拟滚动，只渲染可视区域',
          '分页比一次性渲染一万条更实际',
          '避免在渲染函数里做重计算',
          '复杂行组件做缓存或拆分',
        ],
      },

      { type: 'h2', text: '四、懒加载' },
      {
        type: 'p',
        text:
          '路由级懒加载能显著减小首屏包体积；' +
          '组件级懒加载适合弹窗、重型图表等低频模块。',
      },

      { type: 'h2', text: '五、验收' },
      {
        type: 'checklist',
        items: [
          { k: '列表 key 是否稳定', v: '检查 v-for' },
          { k: '长列表是否虚拟化', v: '测一千条渲染' },
          { k: '路由是否懒加载', v: '看构建产物' },
          { k: '更新时组件渲染次数', v: 'DevTools 分析' },
        ],
      },

      { type: 'h2', text: '六、课后问题' },
      {
        type: 'list',
        items: [
          '为什么用索引当 key 会出问题？',
          '虚拟 DOM 一定比直接操作 DOM 快吗？',
          '首屏包体积和懒加载的关系？',
        ],
      },
    ],
  },
}

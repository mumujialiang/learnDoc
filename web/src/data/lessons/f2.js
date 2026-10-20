export default {
  'F2-01': {
    code: 'F2-01',
    title: '类型是约束，不是装饰',
    chapter: 'TypeScript',
    minutes: 45,
    lead:
      'TypeScript 的价值不在「写起来像 Java」，\n' +
      '而在于把「不可能的组合」挡在编译期。',
    terms: [
      {
        en: '结构类型',
        zh: 'structural typing',
        plain: '只看形状是否匹配，不要求显式继承或实现。',
      },
      {
        en: '类型推导',
        zh: 'inference',
        plain: '你不写类型，编译器自己算出来。多数局部变量不需要手写注解。',
      },
      {
        en: 'any 传染',
        zh: 'any propagation',
        plain: '一个 any 会沿着调用链扩散，让后续检查全部失效。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、类型解决什么问题' },
      {
        type: 'list',
        items: [
          '改字段名时，所有引用处一起报错',
          '把「可能为空」显式化，逼你处理',
          '约束函数入参和返回值',
          '让重构有安全感，而不是靠搜索替换',
        ],
      },

      { type: 'h2', text: '二、结构类型' },
      {
        type: 'p',
        text:
          'TS 不要求你实现某个接口，只要形状对得上就能赋值。' +
          '这很灵活，也意味着「多传字段」不会报错。',
      },

      { type: 'h2', text: '三、推导与注解的取舍' },
      {
        type: 'table',
        head: ['位置', '建议'],
        rows: [
          ['局部变量', '靠推导，少写注解'],
          ['函数参数 / 返回值', '显式标注，尤其是公共 API'],
          ['复杂对象', '定义类型，避免重复'],
          ['常量配置', '用 as const 保留字面量'],
        ],
      },

      { type: 'h2', text: '四、any 与 unknown' },
      {
        type: 'callout',
        kind: 'danger',
        text: 'any 会让类型检查失效，而且会传染。需要「未知类型」时用 unknown，用之前必须收窄。',
      },

      { type: 'h2', text: '五、类型边界要和数据流对齐' },
      {
        type: 'p',
        text:
          '表单输入、URL 参数、localStorage 和接口响应都属于外部数据。' +
          '在这些入口用 unknown 接住，再转换成领域类型；内部函数一旦拿到可信类型，就不必在每一层重复判断。',
      },
      {
        type: 'table',
        head: ['位置', '推荐做法'],
        rows: [
          ['外部输入', 'unknown + 运行时校验'],
          ['领域函数', '明确参数与返回类型'],
          ['组件内部', '依赖推导，避免重复注解'],
          ['遗留库', '局部封装 any，不让它扩散'],
        ],
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'strict 是否开启', v: '看 tsconfig' },
          { k: '有没有滥用 any', v: '搜 any 与 @ts-ignore' },
          { k: '公共函数是否有返回类型', v: '代码审查' },
          { k: '类型是否随重构一起更新', v: '改字段验证' },
        ],
      },

      { type: 'h2', text: '七、课后问题' },
      {
        type: 'list',
        items: [
          '结构类型和名义类型有什么区别？',
          '为什么公共 API 建议显式写返回类型？',
          'unknown 和 any 的区别是什么？',
        ],
      },
    ],
  },

  'F2-02': {
    code: 'F2-02',
    title: '泛型与类型体操的边界',
    chapter: 'TypeScript',
    minutes: 45,
    lead:
      '泛型让类型能复用，但类型体操写到别人看不懂，\n' +
      '就变成了新的维护成本。',
    terms: [
      {
        en: '泛型',
        zh: 'generics',
        plain: '把类型当参数，让一个函数或组件适配多种类型。',
      },
      {
        en: '条件类型',
        zh: 'conditional types',
        plain: '根据类型关系选择结果类型，是类型体操的基础。',
      },
      {
        en: '类型体操',
        zh: 'type gymnastics',
        plain: '用复杂类型运算推导结果。能解决问题，但可读性差。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、泛型解决复用' },
      {
        type: 'p',
        text:
          '一个请求函数要返回不同类型，用泛型而不是 any；' +
          '一个列表组件要渲染不同数据，用泛型约束元素形状。',
      },

      { type: 'h2', text: '二、什么时候停手' },
      {
        type: 'callout',
        kind: 'warn',
        text: '判断标准：团队里大多数人能不能在 30 秒内看懂。看不懂的类型，不如退一步用简单类型加运行时校验。',
      },

      { type: 'h2', text: '三、常用工具类型' },
      {
        type: 'table',
        head: ['类型', '作用'],
        rows: [
          ['Partial<T>', '全部可选'],
          ['Required<T>', '全部必填'],
          ['Pick<T, K>', '挑选字段'],
          ['Omit<T, K>', '排除字段'],
          ['Record<K, V>', '构造映射'],
        ],
      },

      { type: 'h2', text: '四、类型也需要测试' },
      {
        type: 'p',
        text:
          '复杂类型可以用类型断言测试：期望通过的、期望报错的，各写一组。' +
          '否则改类型时没人知道有没有破坏调用方。',
      },

      { type: 'h2', text: '五、从请求函数看边界' },
      {
        type: 'p',
        text:
          '例如 `request<T>(url)` 可以让调用方得到 T，但它不能证明服务器真的返回 T。' +
          '泛型只约束调用关系，数据进入系统的边界仍要配合 schema 校验；否则类型越漂亮，错误越晚暴露。',
      },
      {
        type: 'table',
        head: ['信号', '处理'],
        rows: [
          ['调用方都重复写同一约束', '提取一个有名字的泛型'],
          ['类型错误信息难读', '拆成两三个中间类型'],
          ['只为一次推导写复杂条件', '直接写明确接口'],
        ],
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: '泛型是否有明确约束', v: '看 extends' },
          { k: '有没有为了炫技写的类型', v: '代码审查' },
          { k: '复杂类型有测试', v: '类型测试文件' },
          { k: '错误信息是否可读', v: '故意传错类型' },
        ],
      },

      { type: 'h2', text: '七、课后问题' },
      {
        type: 'list',
        items: [
          '泛型和 any 的区别是什么？',
          '什么时候应该放弃类型体操？',
          '工具类型滥用会带来什么问题？',
        ],
      },
    ],
  },

  'F2-03': {
    code: 'F2-03',
    title: '类型收窄与不可信数据',
    chapter: 'TypeScript',
    minutes: 45,
    lead:
      '编译期类型正确，不代表运行时数据正确。\n' +
      '接口返回的 JSON，永远是「不可信输入」。',
    terms: [
      {
        en: '类型收窄',
        zh: 'narrowing',
        plain: '通过判断把宽类型缩小到具体类型，比如 typeof、in、判别联合。',
      },
      {
        en: '类型守卫',
        zh: 'type guard',
        plain: '返回类型谓词的函数，告诉编译器「这个值已经是某类型」。',
      },
      {
        en: '运行时校验',
        zh: 'runtime validation',
        plain: '在运行时检查数据结构，常用 schema 库，而不是只靠类型断言。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、类型不保证运行时' },
      {
        type: 'p',
        text:
          '`as User` 只是告诉编译器「相信我」，不会检查任何东西。' +
          '接口字段变了、后端返回 null，运行时照样崩。',
      },

      { type: 'h2', text: '二、unknown 的正确用法' },
      {
        type: 'list',
        items: [
          '外部数据先声明为 unknown',
          '用类型守卫或 schema 校验收窄',
          '收窄之后再进入业务代码',
          '不要用 as 跳过校验',
        ],
      },

      { type: 'h2', text: '三、收窄的常见写法' },
      {
        type: 'table',
        head: ['方式', '适用'],
        rows: [
          ['typeof', '基础类型判断'],
          ['in', '判断字段是否存在'],
          ['判别联合', '有 type / kind 字段的对象'],
          ['用户定义守卫', '复杂结构复用判断'],
          ['schema 校验', '接口数据、表单数据'],
        ],
      },

      { type: 'h2', text: '四、边界处理' },
      {
        type: 'p',
        text:
          '接口可能返回空数组、null、字段缺失。' +
          '类型里用可选字段表示，代码里显式处理，而不是假设一定存在。',
      },

      { type: 'h2', text: '五、把校验放在边界' },
      {
        type: 'steps',
        items: [
          { t: '收到 JSON', d: '先当 unknown，不在请求层直接断言。' },
          { t: '校验结构', d: '检查必填字段、枚举、数量范围。' },
          { t: '转换领域类型', d: '把字符串日期、金额转换成统一表示。' },
          { t: '进入组件', d: '组件只处理已经可信的类型。' },
        ],
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: '接口响应是否经过校验', v: '看请求层' },
          { k: '有没有大量 as', v: '搜 as ' },
          { k: '空值与缺失字段是否处理', v: '构造异常响应' },
          { k: '错误提示是否可读', v: '看兜底 UI' },
        ],
      },

      { type: 'h2', text: '七、课后问题' },
      {
        type: 'list',
        items: [
          '为什么 as 不能替代运行时校验？',
          'unknown 和 any 在使用上的区别？',
          '判别联合适合什么数据结构？',
        ],
      },
    ],
  },

  'F2-04': {
    code: 'F2-04',
    title: '声明文件与模块',
    chapter: 'TypeScript',
    minutes: 40,
    lead:
      '第三方库没有类型、路径别名不生效、类型找不到，\n' +
      '大多不是 TS 坏了，而是模块解析没配对。',
    terms: [
      {
        en: '声明文件',
        zh: '.d.ts',
        plain: '只描述类型、不产生运行时代码的文件。',
      },
      {
        en: '模块解析',
        zh: 'module resolution',
        plain: 'TS 按什么规则找到 import 对应的文件与类型。',
      },
      {
        en: '声明合并',
        zh: 'declaration merging',
        plain: '同名的接口或命名空间会合并，用来扩展第三方类型。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、什么时候需要 d.ts' },
      {
        type: 'list',
        items: [
          '库没有自带类型',
          '给全局变量补充类型',
          '扩展第三方模块的类型',
          '声明静态资源（图片、CSS 模块）',
        ],
      },

      { type: 'h2', text: '二、模块解析' },
      {
        type: 'p',
        text:
          '`moduleResolution` 决定了 TS 怎么找文件；' +
          '路径别名需要在 tsconfig 和构建工具里同时配置，否则一边能跑一边报错。',
      },

      { type: 'h2', text: '三、第三方类型缺失' },
      {
        type: 'table',
        head: ['情况', '做法'],
        rows: [
          ['有 @types 包', '安装对应类型包'],
          ['库自带类型', '直接使用'],
          ['完全没有类型', '写最小 d.ts，别用 any 铺满'],
          ['类型不准确', '局部扩展，不要全局覆盖'],
        ],
      },

      { type: 'h2', text: '四、发布类型' },
      {
        type: 'p',
        text:
          '自己写的库要在 package.json 里声明 types 字段，' +
          '并确保构建产物和类型声明一起发布。',
      },

      { type: 'h2', text: '五、排查「找不到类型」' },
      {
        type: 'steps',
        items: [
          { t: '先看导入路径', d: '确认运行时路径和类型路径指向同一个模块。' },
          { t: '再看 package.json', d: '检查 exports、types、module 的优先级。' },
          { t: '最后看工具链', d: '让 tsc、Vite、测试 runner 使用同一套别名。' },
        ],
      },

      { type: 'h2', text: '六、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'tsconfig 与构建别名一致', v: '对比配置' },
          { k: '没有用 any 铺满 d.ts', v: '代码审查' },
          { k: '编辑器能跳转到类型定义', v: 'Ctrl+点击' },
          { k: 'CI 里类型检查通过', v: '跑 tsc --noEmit' },
        ],
      },

      { type: 'h2', text: '七、课后问题' },
      {
        type: 'list',
        items: [
          '为什么路径别名只配一边会报错？',
          'd.ts 和普通 ts 文件有什么区别？',
          '扩展第三方类型有什么风险？',
        ],
      },
    ],
  },
}

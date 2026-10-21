export default {
  'B2-01': {
    code: 'B2-01',
    title: 'Token 与分词',
    chapter: '语言模型',
    minutes: 50,
    lead:
      '模型不直接看文字，它看的是 token。\n' +
      '同一个句子，中文、英文、数字的 token 数可能差好几倍 —— 这直接影响上下文长度和费用。',
    terms: [
      {
        en: 'Token',
        zh: '词元',
        plain: '模型处理文本的最小单位，可能是一个词、一个子词或一个字符。',
      },
      {
        en: '分词器',
        zh: 'tokenizer',
        plain: '把文本切成 token 并映射成编号的组件。',
      },
      {
        en: '子词',
        zh: 'subword',
        plain: '介于字符和词之间的单位，兼顾词表大小与未登录词。',
      },
      {
        en: '词表',
        zh: 'vocabulary',
        plain: '模型认识的所有 token 集合，通常几万到十几万。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个现象' },
      {
        type: 'p',
        text:
          '同一段意思，英文可能 10 个 token，中文可能 15 个，' +
          '一串数字可能被拆成很多 token。账单和上下文长度都按 token 算。',
      },

      { type: 'h2', text: '二、为什么不用「字」或「词」' },
      {
        type: 'table',
        head: ['粒度', '问题'],
        rows: [
          ['字符', '序列太长，语义太碎'],
          ['整词', '词表爆炸，新词无法处理'],
          ['子词', '折中：常见词整块，生僻词拆开'],
        ],
      },
      {
        type: 'p',
        text:
          'BPE、WordPiece、SentencePiece 都是子词算法：' +
          '从字符开始，反复合并高频组合，最终得到一套词表。',
      },

      { type: 'h2', text: '三、一个词怎么被切开' },
      {
        type: 'chain',
        items: ['unbelievable', 'un + believ + able', '三个 token', '映射成三个编号'],
      },
      {
        type: 'p',
        text:
          '常见词可能是一个 token，罕见词会被拆成多个；' +
          '这就是为什么模型有时会拼错生僻词或算错数字。',
      },

      { type: 'h2', text: '四、Token 影响什么' },
      {
        type: 'table',
        head: ['影响', '说明'],
        rows: [
          ['上下文长度', '窗口按 token 算，不是按字数'],
          ['成本', '输入输出都按 token 计费'],
          ['速度', 'token 越多，生成越慢'],
          ['怪现象', '数字、空格、特殊符号容易被切碎'],
        ],
      },

      { type: 'h2', text: '五、常见误解' },
      {
        type: 'list',
        items: [
          '一个汉字不等于一个 token',
          '同一个模型对不同语言的 token 效率不同',
          '分词器是模型的一部分，换模型通常要换分词器',
        ],
      },

      { type: 'h2', text: '六、边界' },
      {
        type: 'callout',
        kind: 'info',
        text: '不同厂商的 token 计数不通用。估算成本时要用对应模型的 tokenizer，不能按字数拍脑袋。',
      },

      { type: 'h2', text: '七、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: 'Token 是模型的文字单位。分词决定了模型看到什么，也决定了你的账单。',
      },

    ],
  },

  'B2-02': {
    code: 'B2-02',
    title: '预测下一个 token',
    chapter: '语言模型',
    minutes: 55,
    lead:
      '语言模型看起来在回答问题、写代码、聊天。\n' +
      '但它的全部工作只有一件事：根据前面的内容，猜下一个 token 最可能是什么。',
    terms: [
      {
        en: '自回归',
        zh: 'autoregressive',
        plain: '每次生成一个 token，再把它拼回输入，继续生成下一个。',
      },
      {
        en: '条件概率',
        zh: 'conditional probability',
        plain: '在给定前文的条件下，下一个 token 的概率分布。',
      },
      {
        en: '词表分布',
        zh: 'vocabulary distribution',
        plain: '模型对词表中每个 token 给出的概率。',
      },
      {
        en: '上下文',
        zh: 'context',
        plain: '当前能看到的所有前文，决定下一个 token 的预测。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个直觉' },
      {
        type: 'p',
        text:
          '「今天天气真」后面最可能是「好」。模型做的就是这个判断，' +
          '只不过它同时考虑几万个候选，并按概率选一个。',
      },

      { type: 'h2', text: '二、一次生成的完整过程' },
      {
        type: 'chain',
        items: ['输入前文', '模型输出词表概率', '选一个 token', '拼到前文后面', '重复直到结束符'],
      },
      {
        type: 'p',
        text:
          '这就是自回归：每生成一个 token，就把它当成新的输入，再预测下一个。' +
          '长文章、代码、对话，都是这样一个个 token 接出来的。',
      },

      { type: 'h2', text: '三、为什么看起来像“理解”' },
      {
        type: 'table',
        head: ['表象', '实际'],
        rows: [
          ['回答问题', '在前文后接最可能的回答'],
          ['写代码', '按代码分布逐个 token 生成'],
          ['推理', '把中间步骤也当成 token 生成'],
          ['记住上下文', '前文一直在窗口里'],
        ],
      },

      { type: 'h2', text: '四、训练目标是什么' },
      {
        type: 'p',
        text:
          '训练时把一段文本的每个位置都当作一次预测任务：' +
          '用前面的 token 预测下一个，和真实的下一个比较，算损失。',
      },

      { type: 'h2', text: '五、常见误解' },
      {
        type: 'list',
        items: [
          '模型不是先“想好整段”再输出，而是一个个生成',
          '它没有数据库检索，除非你给它工具',
          '概率高不等于事实正确，只代表“更像训练数据”',
        ],
      },

      { type: 'h2', text: '六、边界' },
      {
        type: 'callout',
        kind: 'warn',
        text: '下一个 token 预测解释了三件事：为什么会产生幻觉、为什么长回答可能跑偏、为什么上下文长度重要。',
      },

      { type: 'h2', text: '七、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '语言模型 = 条件概率 + 自回归。理解这一点，很多“智能”现象就说得通了。',
      },

    ],
  },

  'B2-03': {
    code: 'B2-03',
    title: '注意力机制',
    chapter: '语言模型',
    minutes: 55,
    lead:
      '一句话里，「它」指代谁，往往要看前面好几个词。\n' +
      '注意力机制解决的正是：当前这个词，应该重点看前文的哪些位置。',
    terms: [
      {
        en: 'Query',
        zh: '查询',
        plain: '当前 token 发出的“我想找什么”。',
      },
      {
        en: 'Key',
        zh: '键',
        plain: '每个历史 token 提供的“我有什么”。',
      },
      {
        en: 'Value',
        zh: '值',
        plain: '历史 token 真正被加权取用的内容。',
      },
      {
        en: '多头',
        zh: 'multi-head',
        plain: '同时用多组 Q/K/V，从不同角度关注不同关系。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个例子' },
      {
        type: 'p',
        text:
          '「小明把书放在桌上，因为它太重了。」' +
          '“它”更可能指书，而不是桌子 —— 注意力会给“书”更高的权重。',
      },

      { type: 'h2', text: '二、Q/K/V 的直觉' },
      {
        type: 'table',
        head: ['角色', '类比', '作用'],
        rows: [
          ['Query', '你在搜索框输入关键词', '当前 token 想找什么'],
          ['Key', '每篇文章的标题', '历史 token 能提供什么'],
          ['Value', '文章正文', '真正被取用的信息'],
        ],
      },
      {
        type: 'p',
        text:
          '用 Query 和每个 Key 算相似度，得到一组权重；' +
          '再用权重对 Value 加权求和，就得到当前 token 的新表示。',
      },

      { type: 'chain',
        items: ['当前 token 的 Q', '与所有 K 算相似度', 'softmax 成权重', '加权求和 V', '输出新表示'],
      },

      { type: 'h2', text: '三、为什么要多头' },
      {
        type: 'p',
        text:
          '一组注意力只能学一种关系。多头让模型同时关注语法、指代、位置等不同模式，' +
          '最后把多组结果拼起来。',
      },

      { type: 'h2', text: '四、代价' },
      {
        type: 'table',
        head: ['项', '影响'],
        rows: [
          ['序列长度 n', '注意力计算约 n²'],
          ['头数', '并行度与显存'],
          ['长上下文', '显存和延迟快速上升'],
        ],
      },
      {
        type: 'callout',
        kind: 'info',
        text: '这就是为什么长上下文很贵：不是字数多，而是注意力要两两比较。',
      },

      { type: 'h2', text: '五、常见误解' },
      {
        type: 'list',
        items: [
          '注意力不是“解释性”的，权重高不代表因果',
          '注意力不是数据库查询，没有精确匹配',
          '多头不是简单重复，而是不同子空间',
        ],
      },

      { type: 'h2', text: '六、边界' },
      {
        type: 'p',
        text:
          '注意力擅长捕捉长距离依赖，但对超长序列仍然吃力；' +
          '这也是各种稀疏注意力、滑动窗口等优化存在的原因。',
      },

      { type: 'h2', text: '七、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '注意力 = 用 Q 找 K，再按权重取 V。它让每个 token 动态决定看哪里。',
      },

    ],
  },

  'B2-04': {
    code: 'B2-04',
    title: 'Transformer',
    chapter: '语言模型',
    minutes: 55,
    lead:
      'Transformer 不是某一个新算子，\n' +
      '而是一套把注意力、前馈网络、残差和归一化组合起来、可以堆很深的架构。',
    terms: [
      {
        en: '自注意力',
        zh: 'self-attention',
        plain: '序列内部每个位置都和其他位置计算注意力。',
      },
      {
        en: '前馈网络',
        zh: 'feed-forward network',
        plain: '每个位置独立经过的两层全连接，负责特征变换。',
      },
      {
        en: '残差连接',
        zh: 'residual connection',
        plain: '把输入直接加到输出上，缓解深层网络训练困难。',
      },
      {
        en: '位置编码',
        zh: 'positional encoding',
        plain: '给 token 加入位置信息，否则模型分不清顺序。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看它解决了什么' },
      {
        type: 'p',
        text:
          'RNN 要按顺序一个个处理，难以并行，长距离依赖也容易丢。' +
          'Transformer 让所有位置同时计算注意力，训练可以大规模并行。',
      },

      { type: 'h2', text: '二、一个 Transformer 块' },
      {
        type: 'chain',
        items: ['输入', '自注意力', '残差 + 归一化', '前馈网络', '残差 + 归一化', '输出'],
      },
      {
        type: 'table',
        head: ['组件', '作用'],
        rows: [
          ['自注意力', '混合不同位置的信息'],
          ['前馈网络', '逐位置做非线性变换'],
          ['残差', '让梯度能传得更深'],
          ['归一化', '稳定训练'],
        ],
      },

      { type: 'h2', text: '三、为什么需要位置编码' },
      {
        type: 'p',
        text:
          '注意力本身不区分顺序，「猫追狗」和「狗追猫」在它眼里可能一样。' +
          '位置编码把顺序信息加进去，模型才知道谁在前谁在后。',
      },

      { type: 'h2', text: '四、三种形态' },
      {
        type: 'table',
        head: ['形态', '代表', '适合'],
        rows: [
          ['Encoder-only', 'BERT', '理解、分类、检索'],
          ['Decoder-only', 'GPT 类', '生成、对话'],
          ['Encoder-Decoder', 'T5、翻译模型', '输入到输出的转换'],
        ],
      },

      { type: 'h2', text: '五、常见误解' },
      {
        type: 'list',
        items: [
          'Transformer 不是只有注意力，前馈网络占大量参数',
          '层数越深不一定越好，训练和推理成本都上升',
          '位置编码不是可有可无的细节',
        ],
      },

      { type: 'h2', text: '六、边界' },
      {
        type: 'callout',
        kind: 'warn',
        text: 'Transformer 的瓶颈在注意力的 n² 复杂度和显存；长上下文优化大多围绕这两点。',
      },

      { type: 'h2', text: '七、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: 'Transformer = 自注意力 + 前馈 + 残差 + 归一化 + 位置编码，堆叠成深网络。',
      },

    ],
  },

  'B2-05': {
    code: 'B2-05',
    title: '解码策略',
    chapter: '语言模型',
    minutes: 50,
    lead:
      '同一个问题，模型每次回答都不一样。\n' +
      '不是它“心情变了”，而是解码策略在从概率分布里选 token。',
    terms: [
      {
        en: '贪心解码',
        zh: 'greedy decoding',
        plain: '每次选概率最高的 token，确定但容易重复。',
      },
      {
        en: '温度',
        zh: 'temperature',
        plain: '调整概率分布的陡峭程度，越高越随机。',
      },
      {
        en: 'Top-p',
        zh: 'nucleus sampling',
        plain: '只从累计概率达到 p 的最小候选集合里采样。',
      },
      {
        en: '重复惩罚',
        zh: 'repetition penalty',
        plain: '降低已出现 token 的概率，减少复读。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个现象' },
      {
        type: 'p',
        text:
          '温度 0 时，同一个问题答案基本固定；温度 1 时，每次措辞都不同，' +
          '偶尔还会跑题。',
      },

      { type: 'h2', text: '二、常见策略' },
      {
        type: 'table',
        head: ['策略', '做法', '特点'],
        rows: [
          ['贪心', '取概率最大', '稳定、易重复'],
          ['Beam Search', '保留多条候选路径', '质量高、多样性低'],
          ['Top-k', '从前 k 个里采样', '简单，k 固定'],
          ['Top-p', '从累计概率 p 的集合采样', '动态候选，更常用'],
        ],
      },

      { type: 'h2', text: '三、温度怎么起作用' },
      {
        type: 'p',
        text:
          '温度低，分布更尖锐，高概率 token 更容易被选中；' +
          '温度高，分布更平，低概率 token 也有机会。',
      },
      {
        type: 'table',
        head: ['温度', '效果', '适合'],
        rows: [
          ['0–0.3', '稳定、保守', '事实问答、代码'],
          ['0.7 左右', '平衡', '通用对话'],
          ['1.0+', '发散、创意', '写作、头脑风暴'],
        ],
      },

      { type: 'h2', text: '四、为什么需要重复惩罚' },
      {
        type: 'p',
        text:
          '自回归模型容易陷入循环，反复输出同一句。' +
          '重复惩罚会降低已出现 token 的概率，但调太高会让表达变得别扭。',
      },

      { type: 'h2', text: '五、常见误解' },
      {
        type: 'list',
        items: [
          '温度不是“智能程度”，只改变随机性',
          '温度 0 也不保证完全确定（并行计算与浮点误差）',
          'Top-p 和 Top-k 可以一起用，但通常只用一种',
        ],
      },

      { type: 'h2', text: '六、边界' },
      {
        type: 'callout',
        kind: 'info',
        text: '需要可复现的实验，固定温度、种子与模型版本；否则结果无法比较。',
      },

      { type: 'h2', text: '七、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '解码策略决定“从概率里怎么选”。稳定任务调低温度，创意任务调高。',
      },

    ],
  },
}

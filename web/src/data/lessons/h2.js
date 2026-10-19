export default {
  'H2-01': {
    code: 'H2-01',
    title: '会话与令牌',
    chapter: '认证与授权',
    minutes: 55,
    lead:
      '用户被禁用后，手里的 JWT 仍然能用 7 天；\n' +
      '把 token 放进 localStorage，一次 XSS 就被偷走。\n' +
      '认证方案的选择，决定了这些问题好不好收拾。',
    terms: [
      {
        en: '会话',
        zh: 'session',
        plain: '服务端保存登录状态，客户端只持有一个会话 id。',
      },
      {
        en: '令牌',
        zh: 'token',
        plain: '客户端持有的凭证，服务端通过校验签名或查库确认身份。',
      },
      {
        en: '刷新令牌',
        zh: 'refresh token',
        plain: '长期凭证，用来换取短期访问令牌，减少泄露风险。',
      },
      {
        en: '令牌撤销',
        zh: 'revocation',
        plain: '让已签发的令牌提前失效，通常靠黑名单、版本号或短过期。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '员工离职，管理员在后台禁用了账号。' +
          '但他手机里的 JWT 还没过期，照样能调接口 —— 因为服务端从不查库。',
      },

      { type: 'h2', text: '二、两种方案的取舍' },
      {
        type: 'table',
        head: ['', '服务端会话', 'JWT'],
        rows: [
          ['状态存在哪', '服务端', '客户端'],
          ['能否立即撤销', '能', '默认不能'],
          ['横向扩展', '需要共享会话存储', '天然无状态'],
          ['泄露风险', 'session id 可被劫持', 'token 可被窃取'],
          ['适合', '后台管理、强管控', '开放 API、多服务'],
        ],
      },

      { type: 'h2', text: '三、JWT 的结构' },
      {
        type: 'p',
        text:
          '头部、载荷、签名三段。载荷是明文 Base64，不是加密，' +
          '不要放密码、身份证等敏感信息。',
      },
      {
        type: 'callout',
        kind: 'warn',
        text: 'JWT 只保证「没被篡改」，不保证「没被看到」。任何拿到 token 的人都能读载荷。',
      },

      { type: 'h2', text: '四、怎么让 JWT 可撤销' },
      {
        type: 'list',
        items: [
          '短过期（15 分钟）+ refresh token',
          '用户表存 token 版本号，改密码/禁用时 +1',
          '黑名单存已撤销的 jti，注意清理',
          '高敏感操作二次验证，不只看 token',
        ],
      },

      { type: 'h2', text: '五、token 放哪' },
      {
        type: 'table',
        head: ['位置', '优点', '风险'],
        rows: [
          ['HttpOnly Cookie', 'JS 读不到，防 XSS 窃取', '需要考虑 CSRF'],
          ['localStorage', '实现简单', 'XSS 可直接读取'],
          ['内存', '刷新即失效', '刷新页面要重新登录'],
        ],
      },

      { type: 'h2', text: '六、刷新与轮换' },
      {
        type: 'p',
        text:
          'refresh token 要一次性使用并轮换：旧的在换新后立即失效。' +
          '如果检测到旧 token 被重复使用，说明可能被盗，撤销整个会话族。',
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '禁用用户后旧 token 失效', v: '禁用后立刻调接口' },
          { k: 'access token 过期时间短', v: '看配置' },
          { k: 'refresh token 会轮换', v: '连续刷新两次' },
          { k: 'token 不在 URL 里', v: '看日志与请求' },
          { k: '敏感操作有二次验证', v: '改密码/提现' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '登录拿到 token，解码看载荷里有什么',
          '禁用账号后再用旧 token 请求，确认被拒',
          '连续刷新两次，确认旧 refresh token 失效',
          '把 token 放到 URL 参数里，观察日志是否记录',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: 'JWT 解决的是「无状态校验」，不是「安全」。要撤销、要防盗，得额外设计。',
      },

      { type: 'h2', text: '十、延伸问题' },
      {
        type: 'list',
        items: [
          '为什么 JWT 载荷不能放敏感信息？',
          '短过期 + refresh 解决了什么问题？',
          'HttpOnly Cookie 为什么还需要防 CSRF？',
          'refresh token 被盗怎么发现？',
          '单点登录场景该选 session 还是 JWT？',
        ],
      },
    ],
  },

  'H2-02': {
    code: 'H2-02',
    title: 'OAuth2 与 OIDC',
    chapter: '认证与授权',
    minutes: 55,
    lead:
      '「用微信登录」背后不是把密码给对方，\n' +
      '而是 OAuth2 的授权流程。搞不清角色和令牌，接第三方登录一定踩坑。',
    terms: [
      {
        en: 'OAuth2',
        zh: '授权框架',
        plain: '让第三方在不知道密码的情况下，获得有限权限的访问令牌。',
      },
      {
        en: 'OIDC',
        zh: 'OpenID Connect',
        plain: '在 OAuth2 上补了身份层，用 ID Token 告诉客户端「用户是谁」。',
      },
      {
        en: 'PKCE',
        zh: 'Proof Key for Code Exchange',
        plain: '公共客户端用一次性校验码换取令牌，防止授权码被截获。',
      },
      {
        en: 'Scope',
        zh: '权限范围',
        plain: '令牌能访问哪些资源，申请时要最小化。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '产品要「用企业微信登录」。开发把 AppSecret 放进了前端，' +
          '被反编译后，攻击者可以冒充应用调用接口。',
      },

      { type: 'h2', text: '二、四个角色' },
      {
        type: 'table',
        head: ['角色', '是谁'],
        rows: [
          ['资源所有者', '用户'],
          ['客户端', '你的应用'],
          ['授权服务器', '发令牌的服务'],
          ['资源服务器', '存数据的 API'],
        ],
      },

      { type: 'h2', text: '三、授权码流程' },
      {
        type: 'chain',
        items: ['用户点击登录', '跳转授权页', '同意授权', '回调带 code', '后端换 token', '访问资源'],
      },
      {
        type: 'p',
        text:
          'code 只能换一次 token，且必须由后端用 client_secret 换。' +
          '前端只负责跳转和接收回调。',
      },

      { type: 'h2', text: '四、PKCE 解决什么' },
      {
        type: 'p',
        text:
          '移动端、SPA 没有安全的 client_secret。PKCE 让客户端生成随机串，' +
          '授权时带哈希，换 token 时带原值，截获 code 也没用。',
      },

      { type: 'h2', text: '五、access token 与 id token' },
      {
        type: 'table',
        head: ['令牌', '用途', '给谁看'],
        rows: [
          ['access token', '调用资源 API', '资源服务器'],
          ['id token', '证明用户身份', '客户端'],
          ['refresh token', '换新的 access token', '客户端后端'],
        ],
      },

      { type: 'h2', text: '六、常见错误' },
      {
        type: 'list',
        items: [
          '把 client_secret 放进前端',
          'scope 申请过多，拿到不该有的权限',
          '不校验 state，遭受 CSRF',
          '把 id token 当 access token 调接口',
          '回调地址没有白名单',
        ],
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: 'secret 只存在后端', v: '搜前端包' },
          { k: '使用授权码 + PKCE', v: '看流程' },
          { k: 'state 随机且校验', v: '看回调处理' },
          { k: 'scope 最小化', v: '看申请列表' },
          { k: '回调地址白名单', v: '看配置' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '抓包看授权码流程，确认 code 只出现一次',
          '重放同一个 code，确认被拒',
          '修改 state 后回调，确认被拒',
          '检查 access token 的 scope 是否超出需要',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: 'OAuth2 是授权，OIDC 是认证。授权码换 token 必须发生在后端，secret 不能出现在客户端。',
      },

      { type: 'h2', text: '十、延伸问题' },
      {
        type: 'list',
        items: [
          '授权码和 access token 有什么区别？',
          '为什么 SPA 也要用 PKCE？',
          'state 参数防的是什么攻击？',
          'id token 能直接拿去调接口吗？',
          'scope 申请多了会有什么后果？',
        ],
      },
    ],
  },

  'H2-03': {
    code: 'H2-03',
    title: 'SSO 与企业登录',
    chapter: '认证与授权',
    minutes: 50,
    lead:
      '公司有十几个系统，员工不想记十几套密码；\n' +
      '管理员也不想在每个系统里删一遍离职账号。\n' +
      'SSO 解决的不是登录体验，是账号生命周期。',
    terms: [
      {
        en: '单点登录',
        zh: 'SSO',
        plain: '一次登录，多个系统共享身份，不用重复输入密码。',
      },
      {
        en: '身份提供商',
        zh: 'IdP',
        plain: '负责认证用户并签发身份信息的系统，比如企业微信、Okta。',
      },
      {
        en: '服务提供商',
        zh: 'SP',
        plain: '依赖 IdP 完成登录的业务系统。',
      },
      {
        en: '账号绑定',
        zh: 'account linking',
        plain: '把外部身份与本地账号关联，处理重名、离职、换部门。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '接入了企业微信登录，但没有做账号绑定。' +
          '同一个员工换了部门，openid 变了，系统里多出一个新账号，历史数据对不上。',
      },

      { type: 'h2', text: '二、SSO 的基本流程' },
      {
        type: 'chain',
        items: ['访问系统', '跳转 IdP', '已登录则直接返回', '携带断言/令牌', '系统建立本地会话'],
      },

      { type: 'h2', text: '三、协议怎么选' },
      {
        type: 'table',
        head: ['协议', '特点', '常见场景'],
        rows: [
          ['OIDC', '基于 OAuth2，JSON，现代', '新系统、移动端'],
          ['SAML', 'XML，企业老系统多', '传统企业、AD 集成'],
          ['CAS', '简单，国内高校常用', '校园系统'],
        ],
      },

      { type: 'h2', text: '四、账号怎么落' },
      {
        type: 'list',
        items: [
          '首次登录自动创建本地账号',
          '用稳定的外部 id 绑定，不用昵称/邮箱',
          '离职由 IdP 停用，本地同步禁用',
          '多 IdP 时要有账号合并策略',
        ],
      },

      { type: 'h2', text: '五、权限从哪来' },
      {
        type: 'p',
        text:
          'SSO 只解决「你是谁」，不解决「你能干什么」。' +
          '角色和权限仍要在本地系统里维护，或从 IdP 的组映射过来。',
      },

      { type: 'h2', text: '六、常见坑' },
      {
        type: 'table',
        head: ['坑', '后果'],
        rows: [
          ['用邮箱做唯一键', '换邮箱/重名导致绑定错'],
          ['没处理离职同步', '离职员工仍能登录'],
          ['回调地址不校验', '开放重定向'],
          ['本地会话太长', 'IdP 已登出，本地还能用'],
        ],
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '外部 id 稳定且唯一', v: '看绑定字段' },
          { k: '离职停用能同步', v: '模拟 IdP 禁用' },
          { k: '本地会话有上限', v: '看配置' },
          { k: '回调地址白名单', v: '看配置' },
          { k: '多 IdP 账号能合并', v: '绑定两个来源' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '用一个账号登录，检查本地创建了哪些字段',
          '在 IdP 停用该账号，观察本地是否同步',
          '换一个邮箱重新登录，确认不会创建重复账号',
          '退出 IdP 后访问系统，确认本地会话也失效',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: 'SSO 的价值在账号生命周期管理。绑定键要稳定，离职同步要做，权限仍归本地。',
      },

      { type: 'h2', text: '十、延伸问题' },
      {
        type: 'list',
        items: [
          '为什么不能用邮箱做账号绑定键？',
          'SSO 能替代权限系统吗？',
          'IdP 登出后，本地会话应该怎么处理？',
          'SAML 和 OIDC 的主要差别是什么？',
          '多租户系统怎么做 SSO？',
        ],
      },
    ],
  },

  'H2-04': {
    code: 'H2-04',
    title: '密码、MFA 与授权模型',
    chapter: '认证与授权',
    minutes: 55,
    lead:
      '数据库里存着明文密码，一次拖库全泄露；\n' +
      '系统只有「管理员/普通用户」两种角色，新业务一上来就不够用。\n' +
      '认证的底线和授权的模型，都要提前设计。',
    terms: [
      {
        en: '密码哈希',
        zh: 'password hashing',
        plain: '用慢哈希（bcrypt/argon2）存密码，不可逆，带盐。',
      },
      {
        en: '多因素认证',
        zh: 'MFA',
        plain: '密码之外再加一种证明，比如短信、TOTP、硬件密钥。',
      },
      {
        en: 'RBAC',
        zh: '基于角色的访问控制',
        plain: '权限授予角色，角色授予用户。',
      },
      {
        en: 'ABAC',
        zh: '基于属性的访问控制',
        plain: '按用户、资源、环境属性动态判断，比角色更细。',
      },
    ],
    blocks: [
      { type: 'h2', text: '一、先看一个真实场景' },
      {
        type: 'p',
        text:
          '用户表里密码是 MD5，没有盐。拖库后彩虹表一跑，八成密码被还原。' +
          '另一个系统只有 admin/user 两个角色，运营需要「只能看本部门数据」，只能改代码。',
      },

      { type: 'h2', text: '二、密码怎么存' },
      {
        type: 'table',
        head: ['方式', '安全性', '说明'],
        rows: [
          ['明文', '无', '绝对不行'],
          ['MD5/SHA1', '低', '太快，易被彩虹表与暴力破解'],
          ['bcrypt', '高', '自带盐，可调成本'],
          ['argon2', '高', '内存硬，抗 GPU'],
        ],
      },
      {
        type: 'callout',
        kind: 'danger',
        text: '不要自己发明加密方案。用成熟的慢哈希库，成本参数随硬件升级。',
      },

      { type: 'h2', text: '三、MFA 怎么加' },
      {
        type: 'list',
        items: [
          'TOTP（验证器 App）成本低，推荐',
          '短信验证码有被拦截风险，但普及度高',
          '硬件密钥最强，适合高敏感角色',
          '恢复码要一次性、可撤销',
          '高风险操作强制二次验证',
        ],
      },

      { type: 'h2', text: '四、RBAC 的边界' },
      {
        type: 'p',
        text:
          'RBAC 适合「岗位职责」稳定的系统。' +
          '一旦出现「同角色但只能看自己部门」「按资源属性判断」，就需要 ABAC 或策略引擎。',
      },

      { type: 'h2', text: '五、授权模型对比' },
      {
        type: 'table',
        head: ['模型', '粒度', '适合'],
        rows: [
          ['RBAC', '角色', '后台管理、职责清晰'],
          ['ABAC', '属性', '多租户、数据权限'],
          ['对象级权限', '单条数据', '订单、文档、项目'],
          ['策略引擎', '规则组合', '复杂合规要求'],
        ],
      },

      { type: 'h2', text: '六、别把权限写死在代码里' },
      {
        type: 'p',
        text:
          '权限点应该是数据，不是 if 语句。新增角色、调整权限不应该发版；' +
          '但判断逻辑要集中，不能散落在每个接口。',
      },

      { type: 'h2', text: '七、验收' },
      {
        type: 'checklist',
        items: [
          { k: '密码使用慢哈希且带盐', v: '看用户表与代码' },
          { k: '登录失败不泄露账号是否存在', v: '试错误密码' },
          { k: '高敏感操作有 MFA', v: '看流程' },
          { k: '权限点是数据可配置', v: '看表结构' },
          { k: '对象级权限有统一入口', v: '看查询封装' },
        ],
      },

      { type: 'h2', text: '八、动手验证' },
      {
        type: 'list',
        items: [
          '查用户表，确认密码字段不是明文/MD5',
          '用错误密码和不存在账号分别登录，对比提示',
          '给普通用户开一个高权限接口，确认被拒',
          '新增一个角色，确认不需要改代码',
        ],
      },

      { type: 'h2', text: '九、本课小结' },
      {
        type: 'callout',
        kind: 'info',
        text: '认证的底线是慢哈希 + 不泄露账号存在性；授权的底线是默认拒绝 + 统一入口。',
      },

      { type: 'h2', text: '十、延伸问题' },
      {
        type: 'list',
        items: [
          '为什么 MD5 加盐也不够？',
          'TOTP 和短信验证码的风险差异在哪？',
          'RBAC 什么时候会不够用？',
          '对象级权限为什么要统一入口？',
          '权限变更需要审计吗？',
        ],
      },
    ],
  },
}

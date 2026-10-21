<script setup>
import Callout from '../components/Callout.vue'
import CodeBlock from '../components/CodeBlock.vue'
import PageNav from '../components/PageNav.vue'
import TermCard from '../components/TermCard.vue'
import ProbeSimulator from '../widgets/ProbeSimulator.vue'

const terms = [
  {
    en: 'probe',
    zh: '探针',
    plain: '一个专门给外部系统敲门用的网址。它返回 200，就代表"我正常"。',
  },
  {
    en: 'liveness',
    zh: '存活检查',
    plain: '"你还活着吗"。答不好，容器会被杀掉重启 —— 这是最重的惩罚。',
  },
  {
    en: 'readiness',
    zh: '就绪检查',
    plain: '"你能干活吗"。答不好，只是暂时不给你派活，进程继续活着。',
  },
  {
    en: '连接池',
    zh: 'connection pool',
    plain: '提前建好一批数据库连接重复使用。像停车场：车位有限，车多了要排队。',
  },
]

const codeCompose = `
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: mall
      POSTGRES_PASSWORD: mall
      POSTGRES_DB: mall
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mall"]
      interval: 5s
      retries: 10
`

const codeEngine = `
engine = create_async_engine(
    settings.database_url,
    pool_size=10,        # 常驻 10 个连接
    max_overflow=20,     # 高峰期最多再借 20 个
    pool_pre_ping=True,  # 借出去之前先探一下还通不通
)

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,   # 提交之后别让对象失忆
)
`

const codeCommitTrap = `
order = Order(user_id=1, amount=99)
session.add(order)
await session.commit()

print(order.id)
# ↑ 默认情况下，这一行会偷偷再发一条 SELECT 重新查一遍
`

const codeMissing = `MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here.`

const codeGetDb = `
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session          # 路由在这里执行
        except Exception:
            await session.rollback()
            raise
        else:
            await session.commit() # 正常返回才提交
`

const codeHealth = `
@router.get("/health/live")
async def liveness():
    # 只证明进程还在，不碰数据库、不碰 Redis
    return {"status": "ok"}

@router.get("/health")
async def readiness(session = Depends(get_db)):
    db_ok = await ping_db(session)
    redis_ok = await ping_redis()

    # 依赖挂了要返回 503，不能返回 500
    code = 200 if (db_ok and redis_ok) else 503
    return JSONResponse({...}, status_code=code)
`

const codeShell = `
docker compose up -d
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000

# 另开一个终端
python scripts/smoke.py health
`

const checklist = [
  { k: '两个容器的状态显示 healthy', v: 'docker compose ps' },
  { k: '/health/live 里没有数据库代码', v: '打开文件看一眼' },
  { k: '停掉 Redis 后 /health 返回 503，不是 500', v: '停掉再请求' },
  { k: '引擎参数里有 expire_on_commit=False', v: '读 db.py' },
  { k: '连接池有明确的数字上限', v: '读 config.py' },
  { k: '连接地址写的是 127.0.0.1，不是 localhost', v: '读 .env' },
  { k: 'alembic.ini 里没有中文', v: '读文件' },
]
</script>

<template>
  <div class="page">
    <div class="eyebrow">M0-01 · 后端心智模型 · 40 分钟</div>
    <h1>环境与骨架</h1>

    <p class="lead">
      先问一个问题：假设明天你请假，同事要接手这个项目。<br />
      他 clone 下来，多久能跑起来？
    </p>

    <p>
      如果答案是"看了半天文档还是起不来"，那这个项目的环境本身就是坏的。
      这一节要做的第一件事，就是把"任何人 5 分钟能跑起来"变成真的。
    </p>

    <p>
      第二件事更重要：搞懂<strong>为什么一个服务要写两个健康检查接口</strong>。
      这个问题的答案，能让你第一次看清"线上系统是怎么把自己搞挂的"。
    </p>

    <TermCard :terms="terms" />

    <h2>一、先搞清楚：谁在定时敲你的门</h2>
    <p>
      你的 FastAPI 启动之后，不是"你点一下它才动一下"的东西。它要一直跑着。
    </p>
    <p>那问题来了：<strong>谁来确认它没死？</strong></p>
    <p>
      真实部署里，有个程序叫 Kubernetes（下面简称 K8s）负责三件事：
    </p>
    <ul>
      <li>
        把你的服务启动起来 —— 通常一次开好几个一模一样的，每个叫一个 <strong>Pod</strong>，
        共同分担请求
      </li>
      <li>某个 Pod 挂了就重启它</li>
      <li>把请求只分给当前健康的那些 Pod</li>
    </ul>
    <p>
      它怎么知道谁健康？<strong>定时去访问你几个固定的网址</strong>，看你返回什么。
    </p>

    <Callout type="info">
      你在前端应该见过类似的东西：监控平台每隔 30 秒请求一次 <code>/api/ping</code>，
      没响应就发告警。区别只有一点 ——
      <strong>这里的敲门人有权重启你的进程</strong>。
    </Callout>

    <p>
      这几个专门给人敲门的网址，行业里管它叫「探针」。名字听着玄，
      本质就是<strong>一个普通接口</strong>，你在浏览器里直接打开也能看到返回。
    </p>

    <h2>二、为什么必须是两个网址，不是一个</h2>
    <p>
      先看只设一个会发生什么。假设这一个网址既检查"进程还在"，又检查"数据库通不通" ——
      听起来很周全，对吧。
    </p>
    <p>然后数据库抖了 10 秒。接下来发生的事像多米诺骨牌：</p>

    <div class="chain">
      <div class="chain-item bad">数据库抖 10 秒</div>
      <div class="chain-arrow">→</div>
      <div class="chain-item bad">K8s 敲门，没人应</div>
      <div class="chain-arrow">→</div>
      <div class="chain-item bad">判定你死了，重启</div>
      <div class="chain-arrow">→</div>
      <div class="chain-item bad">3 个副本同时重启</div>
      <div class="chain-arrow">→</div>
      <div class="chain-item fatal">全站 500</div>
    </div>

    <p>
      一次 10 秒的依赖抖动，被放大成一次全站事故。根因是：
      <strong>K8s 只有一个网址可看，于是它只能用最重的手段对付最轻的问题。</strong>
    </p>
    <p>所以拆成两个，让 K8s 对它们做完全不同的事：</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>网址</th>
            <th>它在回答什么</th>
            <th>答不好的后果</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/health/live</code></td>
            <td>我还没死</td>
            <td>被杀掉<strong>重启</strong></td>
          </tr>
          <tr>
            <td><code>/health</code></td>
            <td>我能干活</td>
            <td>暂时<strong>不给我派活</strong>，但让我继续活着</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p>
      第二行那个动作有个正式说法叫「摘流量」：把你从负载均衡的名单里拿掉，
      新请求不再发给你。进程没死，只是暂时不接客。依赖恢复后自动回名单。
    </p>

    <Callout type="warn">
      一句话记住：<strong>「活着」和「能干活」是两件事。</strong>
      数据库挂了不代表进程该重启 —— 它只是暂时没法干活。
    </Callout>

    <h2>三、亲手制造一次事故</h2>
    <p>下面这个台子可以让你把上面那条多米诺骨牌推一遍：</p>

    <div class="howto">
      <div class="howto-row">
        <span class="howto-key">停 PostgreSQL</span>
        <span class="howto-val">模拟依赖挂了。看 Pod 变<strong class="c-warn">黄色</strong> —— 摘流量，但没重启</span>
      </div>
      <div class="howto-row">
        <span class="howto-key">启用危险配置</span>
        <span class="howto-val">把数据库检查塞进「还活着吗」那个网址（错误做法）。再停 PG，看 Pod 变<strong class="c-bad">红色闪烁</strong></span>
      </div>
      <div class="howto-row">
        <span class="howto-key">看右下角</span>
        <span class="howto-val">「用户请求成功率」会跟着掉到 0%，底下的日志按时间倒序记录每一步</span>
      </div>
    </div>

    <ProbeSimulator />

    <Callout type="danger">
      <strong>黄色和红色的差别，就是这次事故的全部。</strong>
      黄色只是"这段别派活给我"，红色是"我要死了，正在重启"。
      后者在重启完成前，一个请求都处理不了。
    </Callout>

    <h2>四、一个开关：让数据「提交后别失忆」</h2>
    <p>
      这一段讲一个你必然会遇到的报错。先看现象：从数据库查出一条订单，
      改了状态，提交，然后继续往下走想读一下 <code>order.id</code>。
    </p>

    <CodeBlock :code="codeCommitTrap" lang="python" title="一段看起来很正常的代码" />

    <p>
      实际上最后那行 <code>print</code> 会<strong>偷偷再发一条 SQL</strong> 把数据重新查一遍。
      为什么？因为 SQLAlchemy 默认觉得"你提交完了，手上这份可能已经过时"，
      所以下次读属性时重新拿一份，保证是新的。
    </p>
    <p>
      在同步代码里，这个"偷偷查"你完全感觉不到。但在异步代码里，
      它不允许在你不注意的地方发起网络请求，于是直接掀桌子：
    </p>

    <CodeBlock :code="codeMissing" lang="text" title="运行时会直接报这个" open />

    <p>
      第一次撞上这个报错，九成人会以为异步配置写错了，然后排查半天。
      真正的原因就是上面那行 <code>print</code>。
    </p>
    <p>
      解法就是一个参数：<code>expire_on_commit</code>，字面意思是"提交时是否让对象过期"。
      设成 <strong>False</strong> 就行，一行的事。
    </p>

    <p>翻译成人话：<strong>提交之后别失忆，我手上这份数据还能用。</strong></p>

    <Callout type="warn">
      <strong>代价必须记住：</strong>提交后对象里是"提交前的值"。
      如果别人在这一瞬间改了这行数据，你读到的是旧的。
      所以交易场景里要展示给用户的数据，应该在提交前就转成普通字典或 DTO，
      而不是提交后直接返回那个 ORM 对象。
    </Callout>

    <h2>五、一个请求一个事务</h2>
    <p>这是后面所有课程的地基。它的逻辑只有四步，记住顺序就够了：</p>

    <div class="steps">
      <div class="step">
        <h4>借一条连接</h4>
        <p>请求进来，从连接池借一个连接，事务开始。</p>
      </div>
      <div class="step">
        <h4>执行，但不提交</h4>
        <p>路由和 service 全程只写不提交 —— SQL 已经发出去了，事务还开着。</p>
      </div>
      <div class="step">
        <h4>正常返回，才按手印</h4>
        <p>路由跑完、没抛异常，才真正提交。</p>
      </div>
      <div class="step">
        <h4>中途出错，全部撤销</h4>
        <p>任何一步抛异常，前面写过的全撤掉，像没发生过。</p>
      </div>
    </div>

    <p>
      注意最后两步的位置关系：<strong>提交发生在路由之外</strong>。
      路由里看不到 <code>commit</code>，它藏在一个统一的地方。
    </p>

    <CodeBlock :code="codeGetDb" lang="python" title="对应实现（app/core/db.py）" />

    <p>
      为什么必须这样，下一节会用模拟器讲清一笔订单是怎么变成"部分成功"的。
    </p>

    <h2>六、连接池：数据库的停车位</h2>
    <p>
      每次查数据库，都要先建立一条连接 —— 像打电话要先拨号。拨号很慢，
      所以没人每次都拨。做法是提前建好一批连接放在那儿重复用，这个池子就叫连接池。
    </p>
    <p>
      你在前端应该配过 axios 的并发上限吧？思路完全一样，
      只是这里限制的不是 HTTP 请求，是数据库连接。
    </p>

    <CodeBlock :code="codeEngine" lang="python" title="app/core/db.py" />

    <p>
      <code>pool_size</code> 是常驻几个车位，<code>max_overflow</code> 是高峰期最多临时加几个。
      但数据库那边的车位总数是固定的，默认只有 100 个。所以要算一道除法：
    </p>

    <Callout type="danger">
      部署 4 个副本时：4 × (10 + 20) = <strong>120</strong>，
      而 PostgreSQL 的默认上限是 <strong>100</strong>。<br />
      第 4 个 Pod 一启动，就开始报 too many connections。
    </Callout>

    <p>
      所以这两个数不是越大越好，而是<strong>总预算除以实例数</strong>。
      压测前先算这笔账，比事后反复调参数有用得多。
    </p>

    <h2>七、Windows 上的三个坑</h2>
    <p>这三个都是搭这套环境时真实踩到的，每一个都能卡半小时以上。</p>

    <div class="pitfall-list">
      <div class="pitfall">
        <div class="pf-num">01</div>
        <div class="pf-body">
          <div class="pf-title">localhost 连不上，但也不报错</div>
          <p>
            连接串写成 <code>localhost</code> 时，Windows 会优先解析到 IPv6 的 <code>::1</code>，
            而 Docker 的 IPv6 端口映射有时不通。表现不是"连接被拒绝"，而是<strong>一直挂着</strong>，
            接口等到超时。
          </p>
          <div class="pf-fix">统一写 <code>127.0.0.1</code>，并给每个客户端设连接超时</div>
        </div>
      </div>
      <div class="pitfall">
        <div class="pf-num">02</div>
        <div class="pf-body">
          <div class="pf-title">alembic.ini 里写中文会报编码错</div>
          <p>
            Alembic 用<strong>系统编码</strong>读这个文件（中文 Windows 是 GBK），文件本身是 UTF-8。
            两个编码对不上，一句中文注释就能让它 <code>UnicodeDecodeError</code>。
          </p>
          <div class="pf-fix">这个文件只写英文，注释也一样</div>
        </div>
      </div>
      <div class="pitfall">
        <div class="pf-num">03</div>
        <div class="pf-body">
          <div class="pf-title">请求本机接口，却拿到一个空 502</div>
          <p>
            机器上装了代理软件时，<code>httpx</code> 会把 <code>http://127.0.0.1:8000</code>
            也转给代理，于是拿到一个没有内容的 502。特别容易误判成"服务挂了"。
          </p>
          <div class="pf-fix">创建客户端时加 <code>trust_env=False</code></div>
        </div>
      </div>
    </div>

    <h2>八、动手跑起来</h2>

    <CodeBlock :code="codeShell" lang="powershell" title="终端" open />

    <p>两个接口的分工，一句话就能说清：</p>

    <div class="grid-2">
      <div class="card">
        <h4 style="margin-top: 0"><code>/health/live</code></h4>
        <p style="margin: 0; font-size: 13.5px">
          直接返回 ok。<strong>一行数据库代码都不碰。</strong>
        </p>
      </div>
      <div class="card">
        <h4 style="margin-top: 0"><code>/health</code></h4>
        <p style="margin: 0; font-size: 13.5px">
          查一次数据库，ping 一次 Redis。都通返回 200，有一个不通就返回 503。
        </p>
      </div>
    </div>

    <CodeBlock :code="codeHealth" lang="python" title="对应实现（app/api/health.py）" />

    <h2>九、验收清单</h2>
    <p>逐条打勾。哪条不满足，说明骨架有问题，别急着往下学。</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th>你要确认的事</th>
            <th style="width: 170px">怎么确认</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in checklist" :key="i">
            <td class="mono">{{ i + 1 }}</td>
            <td>{{ c.k }}</td>
            <td class="muted">{{ c.v }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PageNav :prev="{ path: '/', title: '课程首页' }" :next="{ path: '/m0-02', title: 'M0-02 事务边界' }" />
  </div>
</template>

<style scoped>
.chain {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 20px 0;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--danger-soft);
  border: 1px solid color-mix(in srgb, var(--danger) 18%, transparent);
}

.chain-item {
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--danger);
  white-space: nowrap;
}

.chain-item.fatal {
  background: var(--danger);
  color: #fff;
  font-weight: 700;
}

.chain-arrow {
  color: color-mix(in srgb, var(--danger) 55%, transparent);
  font-size: 12px;
}

.howto {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 14px 18px;
  margin: 0 0 4px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.howto-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  font-size: 12.5px;
  line-height: 1.7;
}

.howto-key {
  font-weight: 650;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.howto-val {
  color: var(--text-2);
}

.c-warn {
  color: var(--warning);
}

.c-bad {
  color: var(--danger);
}

.pitfall-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 22px 0;
}

.pitfall {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.pf-num {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--danger);
  background: var(--danger-soft);
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: none;
}

.pf-title {
  font-size: 14px;
  font-weight: 650;
  margin-bottom: 4px;
  color: var(--text);
}

.pitfall p {
  font-size: 13.5px;
  margin: 0 0 8px;
  line-height: 1.75;
}

.pf-fix {
  font-size: 12.5px;
  color: var(--success);
  background: var(--success-soft);
  padding: 4px 10px;
  border-radius: 7px;
  display: inline-block;
}

@media (max-width: 640px) {
  .howto-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

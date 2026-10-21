<script setup>
import Callout from '../components/Callout.vue'
import CodeBlock from '../components/CodeBlock.vue'
import PageNav from '../components/PageNav.vue'
import TermCard from '../components/TermCard.vue'
import TxnStage from '../widgets/TxnStage.vue'

const terms = [
  {
    en: 'transaction',
    zh: '事务',
    plain:
      '一组"要么全成功、要么全失败"的操作。像转账：扣钱和加钱必须一起成功，不能只扣不加。',
  },
  {
    en: 'commit',
    zh: '提交',
    plain: '按手印。按下之后改动永久生效，反悔不了。',
  },
  {
    en: 'flush',
    zh: '刷写',
    plain:
      '把 SQL 发给数据库，但还没按手印。相当于"表填好递进去了，还没盖章"。这时能拿到自增 ID。',
  },
  {
    en: 'rollback',
    zh: '回滚',
    plain: '撤销，当作什么都没发生过。',
  },
  {
    en: '部分提交',
    zh: 'partial commit',
    plain:
      '一个业务操作拆成了两个事务，前一个成功了，后一个失败了。系统自己不觉得有问题 —— 这才是最可怕的。',
  },
]

const codeBad = `
# 下单
async def create_order(session, body):
    order = Order(...)
    session.add(order)
    await session.commit()        # ← 第一个事务，按了手印

# 扣库存
async def deduct_stock(session, sku_id, qty):
    await session.execute(update(...))
    await session.commit()        # ← 第二个事务，如果这里失败…
`

const codeGood = `
@router.post("/orders")
async def create_order(body: OrderCreate, session = Depends(get_db)):
    order = Order(...)
    session.add(order)
    await session.flush()   # 递进去了，但没按手印
    await deduct_stock(session, ...)
    return order            # 最后由依赖层统一按手印
`

const codeIo = `
async with session.begin():
    order = Order(...)
    session.add(order)
    await sms.send(...)     # ✕ 短信发出去了，数据库还能回滚吗？
                            # ✕ 短信接口超时 30 秒，锁就握 30 秒
                            # ✕ 连接也不能还给池子
`

const codeFix = `
# 1. 事务内：只写库，然后按手印
order = Order(...)
session.add(order)
await session.commit()

# 2. 事务外：发消息、发短信
await notify_order_created(order.id)

# 3. 通知失败就重试，订单不回滚
`

const codeExp = `
# 终端 A：每 2 秒打印一次数据库连接状态
python scripts/smoke.py inspect -r 10

# 终端 B：50 个请求同时打一个"事务里睡觉"的接口
python scripts/smoke.py hammer -c 50 -s 10
`

const checklist = [
  { k: '路由和 service 里搜不到 session.commit()', v: '全局搜一下' },
  { k: '一个请求只产生一个事务', v: '开数据库日志数 BEGIN' },
  { k: '事务里没有调第三方接口', v: '逐行读代码' },
  { k: '故意抛异常时，数据确实没写进去', v: '加个测试接口' },
  { k: '数据库连接对象没有传进后台任务', v: '看有没有 BackgroundTasks' },
]
</script>

<template>
  <div class="page">
    <div class="eyebrow">M0-02 · 后端心智模型 · 60 分钟</div>
    <h1>事务边界</h1>

    <p class="lead">
      你去银行转账。柜员说"我先帮您查一下余额"，然后锁上窗口走了。<br />
      你人还坐在那儿，这个窗口就废了 —— 后面排队的人全办不了。
    </p>

    <p>
      这就是"在数据库事务里做慢操作"。前端没有这个概念，
      所以它是转后端的第一道真正的墙。
    </p>

    <TermCard :terms="terms" />

    <h2>一、直觉上会怎么写</h2>
    <p>需求特别普通：用户下单后，给他发条短信。直觉上会拆成两个函数，各管一件事：</p>

    <div class="grid-2">
      <div class="card">
        <h4 style="margin-top: 0">下单</h4>
        <p style="margin: 0; font-size: 13.5px">写订单，然后<strong>按手印</strong>。事务结束。</p>
      </div>
      <div class="card">
        <h4 style="margin-top: 0">扣库存</h4>
        <p style="margin: 0; font-size: 13.5px">改库存，然后<strong>按手印</strong>。又一个事务。</p>
      </div>
    </div>

    <p>
      问题就在这<strong>两次按手印</strong>里：一个下单请求，被拆成了两个独立的事务。
      按下去就反悔不了，所以第一个事务一旦成立，就再也回不去了。
    </p>
    <p>现在假设第二步扣库存失败了：</p>

    <CodeBlock :code="codeBad" lang="python" title="✕ 两个函数，各自提交" />

    <div class="flow-bad">
      <div class="fb-item ok">第一个事务已按手印<br /><span>订单真的存在了</span></div>
      <div class="fb-arrow">→</div>
      <div class="fb-item bad">第二个事务失败回滚<br /><span>库存一点没扣</span></div>
      <div class="fb-arrow">=</div>
      <div class="fb-result">卖出了一笔没有库存的订单</div>
    </div>

    <p>
      这种状态有个正式名字叫「部分提交」：一半成功了，另一半失败了。
      而最可怕的地方在于 —— <strong>系统自己完全不知道</strong>。
    </p>
    <p>
      没有报错，没有告警，日志里一切正常。要等三天后仓库说
      "这个商品怎么是负库存"，你才发现。
    </p>

    <h2>二、正确的做法：把「按手印」推迟到最后一刻</h2>
    <p>
      思路很简单：写库的时候不按手印，等整个请求都跑完了，由最外层的代码统一按一次。
      中间任何一步出错，就全部撤销。
    </p>

    <CodeBlock :code="codeGood" lang="python" title="✓ 一个请求，一次提交" />

    <p>
      <code>flush</code> 和 <code>commit</code> 的差别，是这一节最该记住的东西：
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>动作</th><th>发生了什么</th><th>拿到自增 ID 了吗</th><th>别人能看见吗</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>flush</code></td>
            <td>SQL 发出去了，但没盖章</td>
            <td>能</td>
            <td>不能</td>
          </tr>
          <tr>
            <td><code>commit</code></td>
            <td>盖章，事务结束</td>
            <td>能</td>
            <td>能</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="info">
      所以路由里能拿到 <code>order.id</code>（因为 flush 过了），但订单其实还没真正落地。
      真正的落地发生在上一节看过的 <code>get_db</code> 里 —— 就是那个把 <code>commit</code>
      写在 <code>yield</code> 之后、等路由跑完才执行的依赖。
    </Callout>

    <h2>三、事务里，绝对不能做的事</h2>
    <p>
      这是本课最重要的一条铁律：<strong>事务开着的时候，不要跟外部系统说话。</strong>
    </p>

    <Callout type="danger">
      具体长这样：事务开着，写了订单，中间夹一句"发短信"，然后才提交。<br />
      就这样一行，三个后果同时发生。
    </Callout>

    <p>为什么？因为外部世界不参与你的事务，它没法回滚。</p>

    <div class="grid-3">
      <div class="reason">
        <div class="reason-num">1</div>
        <div class="reason-t">撤不回来</div>
        <p>短信已经发出去了。你把数据库撤销了，用户收到"下单成功"但订单不存在。</p>
      </div>
      <div class="reason">
        <div class="reason-num">2</div>
        <div class="reason-t">窗口一直占着</div>
        <p>接口超时 30 秒，这 30 秒里这行数据被锁着，别人改不了。</p>
      </div>
      <div class="reason">
        <div class="reason-num">3</div>
        <div class="reason-t">车位不让出来</div>
        <p>事务不结束，连接就还不了。发 50 条短信 = 50 个车位被占死。</p>
      </div>
    </div>

    <p>第三条最直观。下面这块仪表盘把账直接算给你看：</p>

    <TxnStage />

    <div class="howto">
      <div class="howto-row">
        <span class="howto-key">拖滑块</span>
        <span class="howto-val">设置"短信接口有多慢"。拖到 3000ms，看时间轴被撑长、吞吐掉到个位数</span>
      </div>
      <div class="howto-row">
        <span class="howto-key">点「施加 50 并发」</span>
        <span class="howto-val">30 个槽位缓缓填满、变绿、释放；抢不到槽位的在右边堆成金色队列</span>
      </div>
      <div class="howto-row">
        <span class="howto-key">切「事务外」</span>
        <span class="howto-val">事务缩回 100ms，槽位飞快轮转，队列一个都堆不起来</span>
      </div>
    </div>

    <Callout type="warn">
      这个模拟器想说的其实就一句：
      <strong>你的代码逻辑完全正确，但性能从 300 掉到 9，只因为一行 await 放错了位置。</strong>
    </Callout>

    <p>正确的顺序，就是把这四件事彻底拆开：</p>

    <div class="steps">
      <div class="step">
        <h4>先在事务里把订单写完，提交</h4>
        <p>业务事实成立。到这一步，连接就可以还回去了。</p>
      </div>
      <div class="step">
        <h4>再在事务外发通知</h4>
        <p>短信、消息队列，随便发。这时候已经没有锁、没有事务了。</p>
      </div>
      <div class="step">
        <h4>发失败就重试</h4>
        <p>订单不受影响。通知失败只是通知失败。</p>
      </div>
    </div>

    <CodeBlock :code="codeFix" lang="python" title="✓ 先落库，再通知" />

    <Callout type="success">
      <strong>业务事实的优先级永远高于副作用。</strong>
      订单已经成立了，通知失败只是通知失败 —— 重试就行，不该让订单跟着消失。
    </Callout>

    <h2>四、长事务在数据库里长什么样</h2>
    <p>
      数据库有个状态叫 <code>idle in transaction</code>，直译是"事务里发呆"。
      意思是：事务开着，但人不在干活。
    </p>
    <p>
      这就像你去办事，取了号、占了窗口，然后开始玩手机。后面的人全在等你。
    </p>
    <p>
      更要命的是，数据库后台有个"清扫垃圾"的机制，它<strong>会被这种发呆的事务挡住</strong>。
      垃圾清不掉，表就越来越胖，查询越来越慢 —— 而你在业务代码里找不到任何原因。
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>形态</th><th>你看到的现象</th><th>通常是</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>显式长事务</td>
            <td><code>idle in transaction</code> 数量长时间不降</td>
            <td>事务里做了慢操作</td>
          </tr>
          <tr>
            <td>隐式长事务</td>
            <td>同一连接反复出现短事务，频率异常</td>
            <td>忘了提交，或自动提交被关了</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>五、亲手跑一遍</h2>
    <p>光看没用。开两个终端，一个盯着，一个使劲打。</p>

    <CodeBlock :code="codeExp" lang="powershell" title="两个终端" open />

    <p>
      你会看到 <code>idle in transaction</code> 从 1 一路涨到 <strong>30 左右</strong>，然后回落。
    </p>
    <p>
      为什么不是 50？因为连接池最多只能给 30 个（<code>10 + 20</code>），
      第 31 个请求根本拿不到连接，只能在外面排队。
      <strong>这个数字就是上一节那道除法题的答案。</strong>
    </p>

    <h2>六、验收清单</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th style="width: 40px">#</th><th>你要确认的事</th><th style="width: 150px">怎么确认</th></tr>
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

    <h3>AI 在这里最容易写错的地方</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>它写的</th><th>为什么会出事</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>每个 service 方法里 <code>commit()</code></td>
            <td>一个请求裂成多个事务，出错就变成部分提交</td>
          </tr>
          <tr>
            <td><code>try/except</code> 吞掉异常，返回 <code>{"code": 0}</code></td>
            <td>外层以为成功了，照样提交</td>
          </tr>
          <tr>
            <td>事务里 <code>await httpx.post(...)</code></td>
            <td>外部服务超时 → 长事务 → 车位全占满</td>
          </tr>
          <tr>
            <td>把 <code>AsyncSession</code> 传进后台任务</td>
            <td>请求结束时连接已关闭，任务里直接报错</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PageNav
      :prev="{ path: '/m0-01', title: 'M0-01 环境与骨架' }"
      :next="{ path: '/m1-01', title: 'M1-01 商品建模' }"
    />
  </div>
</template>

<style scoped>
.flow-bad {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin: 20px 0;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--danger-soft);
  border: 1px solid color-mix(in srgb, var(--danger) 18%, transparent);
}

.fb-item {
  font-size: 12px;
  font-weight: 650;
  padding: 8px 13px;
  border-radius: 9px;
  background: var(--surface);
  line-height: 1.5;
  text-align: center;
}

.fb-item span {
  font-weight: 500;
  font-size: 11px;
  color: var(--text-3);
}

.fb-item.ok {
  color: var(--success);
}

.fb-item.bad {
  color: var(--danger);
}

.fb-arrow {
  color: var(--text-3);
  font-size: 13px;
}

.fb-result {
  font-size: 13px;
  font-weight: 700;
  color: var(--danger);
  margin-left: auto;
}

.reason {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 15px 16px;
  box-shadow: var(--shadow-sm);
  position: relative;
}

.reason-num {
  position: absolute;
  top: 12px;
  right: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--danger);
  background: var(--danger-soft);
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: grid;
  place-items: center;
}

.reason-t {
  font-size: 13.5px;
  font-weight: 650;
  margin-bottom: 5px;
}

.reason p {
  font-size: 12.5px;
  line-height: 1.7;
  margin: 0;
  color: var(--text-3);
}

.howto {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 14px 18px;
  margin: 0 0 22px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.howto-row {
  display: grid;
  grid-template-columns: 130px 1fr;
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

@media (max-width: 640px) {
  .fb-result {
    margin-left: 0;
  }
  .howto-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

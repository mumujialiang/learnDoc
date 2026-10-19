<script setup>
import Callout from '../components/Callout.vue'
import CodeBlock from '../components/CodeBlock.vue'
import PageNav from '../components/PageNav.vue'
import TermCard from '../components/TermCard.vue'
import SkuMatrix from '../widgets/SkuMatrix.vue'

const terms = [
  {
    en: 'SPU',
    zh: '标准产品单位',
    plain:
      '挂在店里的那件样品。它只描述"这是什么商品"—— 标题、图片、品牌、类目。它不说卖多少钱，也不说有几件。',
  },
  {
    en: 'SKU',
    zh: '库存单元',
    plain:
      '仓库里那一件具体的货。"红色 M 码"和"红色 L 码"是两个 SKU。价格、库存、条码、成本，全都挂在它身上。',
  },
  {
    en: '笛卡尔积',
    zh: '所有组合',
    plain: '3 个颜色 × 4 个尺码 = 12 种搭配。数学上叫笛卡尔积，其实就是"把每种可能都列一遍"。',
  },
  {
    en: '属性字典',
    zh: 'attr / attr_value',
    plain:
      '把"颜色""尺码"这些维度，和"红""蓝""M""L"这些值，单独存成两张表。而不是写死在每个商品里。',
  },
  {
    en: '唯一约束',
    zh: 'unique',
    plain:
      '数据库层面的一条规矩：这几列的组合不许重复。谁写重复了，数据库直接报错挡住。',
  },
]

const codeJson = `
specs: Mapped[dict] = mapped_column(JSON)
# 实际存进去长这样：{"颜色": "红", "尺码": "M"}
`

const codeDdl = `
-- 1. 有哪些规格维度（颜色、尺码…）
create table attr (
  id         bigserial primary key,
  name       varchar(32) not null unique,
  input_type varchar(16) not null default 'select'
);

-- 2. 每个维度有哪些值（红、蓝…；S、M…）
create table attr_value (
  id      bigserial primary key,
  attr_id bigint not null references attr(id),
  value   varchar(64) not null,
  unique (attr_id, value)                   -- ① 同维度下不许重复
);

-- 3. 商品本身（标题、类目、上下架）
create table spu (
  id          bigserial primary key,
  category_id bigint not null references category(id),
  title       varchar(255) not null,
  status      smallint not null default 0
);

-- 4. 具体的那一件货（价格、成本、条码）
create table sku (
  id         bigserial primary key,
  spu_id     bigint not null references spu(id),
  sku_code   varchar(64) not null unique,
  spec_hash  char(32) not null,
  price      numeric(12,2) not null,
  cost_price numeric(12,2),
  status     smallint not null default 1,
  unique (spu_id, spec_hash)                -- ② 同一商品不许重复规格
);

-- 5. 某个 SKU 到底是什么规格
create table sku_attr_value (
  sku_id        bigint not null references sku(id),
  attr_id       bigint not null references attr(id),
  attr_value_id bigint not null references attr_value(id),
  primary key (sku_id, attr_id)             -- ③ 每个维度只能有一个值
);
`

const codeOrm = `
class Sku(Base):
    __tablename__ = "sku"
    __table_args__ = (UniqueConstraint("spu_id", "spec_hash", name="uq_sku_spec"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    spu_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("spu.id"))
    sku_code: Mapped[str] = mapped_column(String(64), unique=True)
    spec_hash: Mapped[str] = mapped_column(String(32))

    # 金额用 Numeric，不要用 Float
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    status: Mapped[int] = mapped_column(SmallInteger, default=1)

    spu: Mapped[Spu] = relationship(back_populates="skus")
    attr_values: Mapped[list["SkuAttrValue"]] = relationship(back_populates="sku")
`

const codeHash = `
def build_spec_hash(pairs: list[tuple[int, int]]) -> str:
    """pairs 是 [(属性ID, 属性值ID), ...]"""
    raw = "|".join(f"{a}:{v}" for a, v in sorted(pairs))   # 必须排序
    return hashlib.md5(raw.encode()).hexdigest()
`

const codeReport = `
select av.value               as color,
       sum(oi.qty)            as qty,
       sum(oi.qty * oi.price) as amount
from order_item oi
join sku s              on s.id = oi.sku_id
join sku_attr_value sav on sav.sku_id = s.id
join attr a             on a.id = sav.attr_id and a.name = '颜色'
join attr_value av      on av.id = sav.attr_value_id
group by av.value
order by amount desc;
`

const concepts = [
  { n: 'category', q: '这件东西属于哪个类目', who: '前台导航、后台权限' },
  { n: 'attr / attr_value', q: '有哪些规格维度，每个维度有哪些值', who: '筛选器、报表分组' },
  { n: 'spu', q: '这个商品"是什么"', who: '详情页展示' },
  { n: 'sku', q: '这个商品"怎么卖"', who: '订单、库存、采购' },
  { n: 'sku_attr_value', q: '某个 SKU 的规格组合是什么', who: '详情页的规格选择器' },
]

const checklist = [
  { k: '价格挂在 sku 上，不在 spu 上', v: '同款不同码价格必然不同' },
  { k: '属性值有自己的 ID，SKU 引用 ID', v: '否则改名要洗全表数据' },
  { k: 'sku_attr_value 上建了 (attr_id, attr_value_id) 索引', v: '否则报表全表扫' },
  { k: '有 (spu_id, spec_hash) 唯一约束', v: '并发时能挡住重复规格' },
  { k: '算 spec_hash 时排了序', v: '否则顺序不同算出两个值' },
  { k: 'SKU 下架用 status 字段，不物理删除', v: '历史订单的外键不能断' },
  { k: '金额用 Numeric，不用 Float', v: '否则会出现 0.30000000000004' },
  { k: '时间用 timestamptz', v: '跨时区不会错乱' },
]
</script>

<template>
  <div class="page">
    <div class="eyebrow">M1-01 · 领域建模 · 90 分钟 · 核心</div>
    <h1>商品建模：SPU / SKU</h1>

    <p class="lead">
      服装店里挂着一件 T 恤样品 —— 这是 <strong>SPU</strong>。<br />
      仓库里"红色 M 码"的那一件 —— 这是 <strong>SKU</strong>。
    </p>

    <p>
      顾客看的是样品，但真正被卖掉、被盘点、被算成本的，永远是仓库里那一件。
      这一节要解决的，就是<strong>怎么把"样品"和"那一件"分开存</strong>。
    </p>

    <Callout type="warn">
      这是整门课最重要的一节。后面的库存、订单、采购、报表全部长在这张图上。
      <strong>这里建错了，后面每一节课都要还债。</strong>
    </Callout>

    <TermCard :terms="terms" />

    <div class="think">
      <div class="think-head">先想 15 分钟，别问 AI</div>
      <ol>
        <li>规格能不能存成一个 JSON 字段？如果能，下面四个需求分别怎么实现？</li>
        <li>"颜色"这个属性，值应该存成"红"这个字符串，还是存一个 ID？</li>
        <li>价格放在商品上，还是放在规格上？</li>
        <li>3 种颜色 × 4 个尺码 = 12 个规格，但如果实际只卖 8 个呢？</li>
      </ol>
    </div>

    <p>四个需求来自三个部门，但它们指向同一个模型：</p>

    <div class="grid-2">
      <div class="req"><span class="req-who">运营</span>按规格查还有多少库存</div>
      <div class="req"><span class="req-who">财务</span>按"颜色"维度出销售报表</div>
      <div class="req"><span class="req-who">采购</span>采购单要能指向具体某个规格</div>
      <div class="req"><span class="req-who">前台</span>详情页要展示可选规格组合</div>
    </div>

    <h2>一、一件商品，两个身份</h2>
    <p>
      为什么非要拆成两个东西？因为"是什么"和"怎么卖"的变化频率完全不同。
    </p>

    <div class="grid-2">
      <div class="split-card">
        <div class="sc-tag">SPU</div>
        <div class="sc-title">样品</div>
        <ul class="sc-list">
          <li>标题、详情图、品牌、类目</li>
          <li>一年可能只改两三次</li>
          <li>全店只有一条记录</li>
        </ul>
      </div>
      <div class="split-card">
        <div class="sc-tag ok">SKU</div>
        <div class="sc-title">仓库里的那件货</div>
        <ul class="sc-list">
          <li>价格、成本、条码、库存</li>
          <li>每天在变</li>
          <li>一个商品有 N 条</li>
        </ul>
      </div>
    </div>

    <p>
      如果把这两类东西塞进一张表，你会遇到一个死结：
      一个商品有 12 个规格，那价格、库存这些字段到底填哪一个的？
    </p>

    <p>完整的五个概念，各自管一件事：</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>概念</th><th>它负责回答</th><th>谁在用</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in concepts" :key="c.n">
            <td><code>{{ c.n }}</code></td>
            <td>{{ c.q }}</td>
            <td class="muted">{{ c.who }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p>
      一句话记法：<strong>SPU 是"商品"，SKU 是"货品"</strong>。
      所有交易、库存、成本，全部挂在 SKU 上。
    </p>

    <h2>二、点一点，看这 12 个格子怎么来的</h2>
    <p>
      3 个颜色 × 4 个尺码 = 12 个 SKU。这就是「笛卡尔积」，说人话就是"每种搭配都列一遍"。
      但真实世界里总有几个组合不卖 —— 点掉它们，看下游会怎么反应。
    </p>

    <SkuMatrix />

    <div class="howto">
      <div class="howto-row">
        <span class="howto-key">点格子</span>
        <span class="howto-val">切换上架/下架。每格右下角那串数字是 <code>spec_hash</code> 前 8 位</span>
      </div>
      <div class="howto-row">
        <span class="howto-key">点「执行查询」</span>
        <span class="howto-val">看同一个需求，JSON 存法和拆表存法的差别</span>
      </div>
      <div class="howto-row">
        <span class="howto-key">切「置灰 / 消失」</span>
        <span class="howto-val">同一份数据，用户在详情页看到的完全是两回事</span>
      </div>
    </div>

    <Callout type="info">
      试试点掉「红 · M」，然后切到「消失」模式。
      用户上一秒还看见 M 码，选完颜色它就不见了 —— 这是最常见的体验 bug，
      而根因在<strong>后端接口返回了什么形状的数据</strong>，不在前端。
    </Callout>

    <h2>三、为什么不能用 JSON 存规格</h2>
    <p>
      AI 优化的是"写得短"，不是"能查询"。你让它写商品模型，十次有九次是这样：
      一个 <code>specs</code> 列，类型是 JSON，里面塞着
      <code>{"颜色": "红", "尺码": "M"}</code>。
    </p>

    <p>
      能跑通详情页，看起来很优雅。但运营过来说一句话，它就废了：
    </p>

    <Callout type="danger">
      <strong>「给我看看这个月红色卖了多少钱。」</strong><br />
      规格存在 JSON 里，这句话没法用 SQL 回答。你必须把所有商品读进内存，
      一条条解析 JSON、手工加总。商品上万条时，这个查询要跑几分钟，还不能分页。
    </Callout>

    <p>换成一张对照表，看得更清楚：</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>需求</th><th>JSON 存法</th><th>拆表存法</th></tr>
        </thead>
        <tbody>
          <tr><td>按规格查库存</td><td>全表扫 + 代码里过滤</td><td>走索引，毫秒级</td></tr>
          <tr><td>采购单指向规格</td><td>没有外键，只能存字符串</td><td>外键到 <code>sku_id</code></td></tr>
          <tr><td>按颜色出报表</td><td><strong class="bad-text">做不到</strong></td><td>一条 SQL</td></tr>
          <tr><td>属性改名</td><td>洗全表数据</td><td>改一行</td></tr>
          <tr><td>防止重复规格</td><td>没有任何约束</td><td>数据库帮你挡</td></tr>
        </tbody>
      </table>
    </div>

    <Callout type="warn">
      <strong>一条判断标准，记下来就够用：</strong>
      只要这个字段会被<strong>查询、聚合、引用</strong>，它就必须是一个独立的列或表，不能是 JSON。
      JSON 只适合"纯展示、永远不会被检索"的冗余字段。
    </Callout>

    <h2>四、五张表，每张只管一件事</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>表</th><th>管什么</th><th>关键约束</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>attr</code></td>
            <td>有哪些规格维度：颜色、尺码</td>
            <td>维度名唯一</td>
          </tr>
          <tr>
            <td><code>attr_value</code></td>
            <td>每个维度有哪些值：红、蓝、M、L</td>
            <td>同一维度下值不重复</td>
          </tr>
          <tr>
            <td><code>spu</code></td>
            <td>商品是什么：标题、类目、上下架</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>sku</code></td>
            <td>怎么卖：价格、成本、条码、规格指纹</td>
            <td>同一商品下规格指纹唯一</td>
          </tr>
          <tr>
            <td><code>sku_attr_value</code></td>
            <td>某个 SKU 到底由哪些属性值组成</td>
            <td>一个 SKU 在一个维度上只能有一个值</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Callout type="danger">
      <strong>三条约束，少一条就出问题：</strong><br />
      ① 同一维度下值不重复 —— 否则「红」和「红色」会变成两个值，报表裂开<br />
      ② 同一商品下规格指纹唯一 —— 并发建 SKU 时靠它挡住重复<br />
      ③ 一个 SKU 在一个维度上只能一个值 —— 否则「红 + 蓝」这种非法组合能存进去
    </Callout>

    <p>
      金额字段的存储类型是 <code>numeric(12,2)</code>，不是浮点数。
      这一条在 M1-02 会专门讲，现在记住"钱不用 float"就够了。
    </p>

    <h3>spec_hash：把一个规格压成一个指纹</h3>
    <p>12 个格子，每格都要能唯一识别。做法只有三步：</p>

    <div class="steps">
      <div class="step">
        <h4>列出这个 SKU 用了哪些属性值</h4>
        <p>比如「颜色=红」「尺码=M」，记成两对 ID。</p>
      </div>
      <div class="step">
        <h4>按属性 ID 排序，拼成一个字符串</h4>
        <p>排序是关键，下一步会说为什么。</p>
      </div>
      <div class="step">
        <h4>算一次哈希，得到一个 32 位指纹</h4>
        <p>存进 <code>spec_hash</code> 列，配合唯一索引防重复。</p>
      </div>
    </div>

    <Callout type="warn">
      <strong>为什么要排序？</strong>
      「颜色=红, 尺码=M」和「尺码=M, 颜色=红」是同一个规格。
      不排序会算出两个不同的指纹，唯一约束就形同虚设 —— 用户点两次加购，可能建出两个一模一样的 SKU。
    </Callout>

    <h2>五、怎么验证自己建对了</h2>
    <p>
      唯一的检验标准是：<strong>相关报表能不能一条 SQL 出结果。</strong>
      能，说明模型可用；不能，说明白建了。
    </p>

    <p>
      按「颜色」维度统计销量和金额 —— 从订单明细出发，join 到 SKU，
      再 join 到属性值表，最后按颜色分组。四张表串起来，一条查询就够了，
      不需要把数据读到内存里解析。
    </p>

    <CodeBlock :code="codeReport" lang="sql" title="按颜色统计销量（AI 能写，需要时展开对照）" />

    <p>
      一条 SQL 出结果。另一个必测的是详情页的规格选择器 ——
      也要能一条 SQL 拿到"所有规格 + 每个组合是否可卖"。
    </p>

    <Callout type="info">
      <strong>顺便纠正一个常见误解：</strong>用 SQLAlchemy 不是为了"逃离 SQL"。
      ERP 里的报表几乎全是手写 SQL，ORM 只负责写入和单条读取。
      这个认知在 M4 会反复出现。
    </Callout>

    <h2>六、动手</h2>
    <div class="steps">
      <div class="step">
        <h4>自己先写一遍模型</h4>
        <p>别抄上面的代码。写完再对照，差异的地方就是你要补的认知。</p>
      </div>
      <div class="step">
        <h4>让 Alembic 生成建表脚本</h4>
        <p><code>alembic revision --autogenerate -m "add catalog tables"</code></p>
      </div>
      <div class="step">
        <h4>逐行检查生成出来的脚本</h4>
        <p>重点看那三条唯一约束和索引有没有真的生成。自动生成不是万能的。</p>
      </div>
      <div class="step">
        <h4>造数据，跑通报表 SQL</h4>
        <p>让 AI 写造数脚本，但你要检查它用的是属性值 ID，还是直接写了"红"这个字符串。</p>
      </div>
    </div>

    <h2>七、验收清单</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th style="width: 40px">#</th><th>你要确认的事</th><th style="width: 190px">不满足会怎样</th></tr>
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

    <h3>AI 在这里几乎一定会犯的错</h3>
    <p>遇到这几条，直接拿右列的问题去问它：</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>它写的</th><th>你就这么问</th></tr>
        </thead>
        <tbody>
          <tr><td>用 JSON 存 specs</td><td>"运营要按颜色出报表，你的 SQL 怎么写？"</td></tr>
          <tr><td>属性值存字符串</td><td>"把'红'改成'正红'，历史报表还对吗？"</td></tr>
          <tr><td>价格放在 SPU 上</td><td>"S 码卖 99、XXL 卖 119，怎么存？"</td></tr>
          <tr><td>没有 spec_hash</td><td>"两个人同时给同一个商品加规格，会怎样？"</td></tr>
          <tr><td>直接删掉一个 SKU</td><td>"删了之后，历史订单的 sku_id 指向谁？"</td></tr>
        </tbody>
      </table>
    </div>

    <h2>八、课后问题</h2>
    <ul>
      <li>如果规格维度本身会变（今天 2 个维度，明天 3 个），这个模型还撑得住吗？</li>
      <li>不同类目要用不同的属性值集合（衣服有尺码，手机有内存），应该怎么改？</li>
      <li>套装商品（一个 SKU 由多个 SKU 组成）要怎么扩展？</li>
    </ul>

    <PageNav
      :prev="{ path: '/m0-02', title: 'M0-02 事务边界' }"
      :next="{ path: '/', title: '返回课程首页' }"
    />
  </div>
</template>

<style scoped>
.think {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--warning);
  border-radius: var(--radius);
  padding: 18px 22px;
  margin: 26px 0;
  box-shadow: var(--shadow-sm);
}

.think-head {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--warning);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.think ol {
  margin: 0;
  padding-left: 20px;
  font-size: 14.5px;
}

.think li {
  margin-bottom: 5px;
}

.req {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
}

.req-who {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 2px 7px;
  border-radius: 5px;
  flex: none;
}

.bad-text {
  color: var(--danger);
}

.split-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.sc-tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 2px 8px;
  border-radius: 5px;
  margin-bottom: 8px;
}

.sc-tag.ok {
  color: var(--success);
  background: var(--success-soft);
}

.sc-title {
  font-size: 14.5px;
  font-weight: 650;
  margin-bottom: 8px;
}

.sc-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.9;
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
  .howto-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

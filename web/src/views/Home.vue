<script setup>
import { chapters, readyLessons } from '../data/course'

const steps = [
  { t: '给一个模糊需求', d: '像产品经理扔过来的那种，缺一半信息' },
  { t: '你先自己写 10 分钟', d: '数据怎么存、接口怎么设计，不许问 AI' },
  { t: '让 AI 实现', d: '要求它先出方案，再出代码' },
  { t: '照清单挑错', d: '清单会点名"这里它大概率写错"' },
  { t: '破坏性验证', d: '并发、脏数据、重复请求、依赖故障' },
  { t: '写 3 行 ADR', d: '为什么这么选，代价是什么' },
]

const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0)

const featuredCodes = ['M0-02', 'M1-01', 'M3-04', 'M4-02', 'M5-02', 'M6-04']
const featured = featuredCodes
  .map((c) => readyLessons.find((l) => l.code === c))
  .filter(Boolean)
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="eyebrow">商城 / ERP 后端 · 可视化讲义</div>
      <h1>把后端那些"看不见"的东西<br />画出来给你看</h1>
      <p class="lead">
        给有前端经验、正在转全栈的工程师。不教语法 —— 教你怎么判断 AI 写的后端代码能不能上生产。
      </p>

      <div class="hero-stats">
        <div class="hs">
          <span class="hs-num">{{ totalLessons }}</span>
          <span class="hs-cap">节课</span>
        </div>
        <div class="hs">
          <span class="hs-num">8</span>
          <span class="hs-cap">个模块</span>
        </div>
        <div class="hs">
          <span class="hs-num">2</span>
          <span class="hs-cap">套系统</span>
        </div>
        <div class="hs">
          <span class="hs-num">3</span>
          <span class="hs-cap">个交互模拟器</span>
        </div>
      </div>
    </section>

    <h2>为什么这么排</h2>
    <p>
      直接讲 FastAPI 教程对你是浪费。你的短板不在写接口，而在三件前端很少遇到的事：
    </p>

    <div class="grid-3">
      <div class="card card-hover">
        <div class="mini-icon">◧</div>
        <h4 style="margin-top: 10px">数据不是画面</h4>
        <p style="font-size: 13.5px; margin: 0">
          前端看到什么渲染什么，后端要想的是：数据长什么样，才让所有下游都能用。
        </p>
      </div>
      <div class="card card-hover">
        <div class="mini-icon">◨</div>
        <h4 style="margin-top: 10px">调用方不可信</h4>
        <p style="font-size: 13.5px; margin: 0">
          你能重放任何请求十次。后端必须假设每个写接口都会被执行两次以上。
        </p>
      </div>
      <div class="card card-hover">
        <div class="mini-icon">◩</div>
        <h4 style="margin-top: 10px">时间会错位</h4>
        <p style="font-size: 13.5px; margin: 0">
          并发、部分失败、最终一致。这三件事在前端世界里几乎不存在。
        </p>
      </div>
    </div>

    <h2>主线：一个商城，一个 ERP</h2>
    <p>
      两套系统共用一套主数据。这不是为了省事，是整门课的核心命题 ——
    </p>

    <div class="arch">
      <div class="arch-node mall">
        <div class="an-title">MiniMall</div>
        <div class="an-desc">用户下单 / 支付 / 售后</div>
      </div>
      <div class="arch-link"><span>可售量</span></div>
      <div class="arch-node core">
        <div class="an-title">共享主数据</div>
        <div class="an-desc">商品 · 库存台账 · 单据</div>
      </div>
      <div class="arch-link"><span>实物库存</span></div>
      <div class="arch-node erp">
        <div class="an-title">MiniERP</div>
        <div class="an-desc">采购 / 入库 / 调拨 / 盘点</div>
      </div>
    </div>

    <div class="callout success">
      <span class="callout-icon">✓</span>
      <div class="callout-body">
        <strong>「商城显示库存 10 件」和「仓库里有 10 件」不是同一个数字。</strong>
        中间隔着预占、在途、锁定、批次、成本。把这条链路亲手走通一次，你对电商后端的理解会超过写三年 CRUD 的人。
      </div>
    </div>

    <h2>每节课固定六步</h2>
    <div class="steps">
      <div v-for="(s, i) in steps" :key="i" class="step">
        <h4>{{ s.t }}</h4>
        <p>{{ s.d }}</p>
      </div>
    </div>

    <div class="callout warn">
      <span class="callout-icon">▲</span>
      <div class="callout-body">
        第 2 步和第 4 步是全部价值所在。跳过它们，看再多课也没用 ——
        <strong>你的竞争力是"能判断 AI 写错了"，不是"能写出代码"</strong>。
      </div>
    </div>

    <h2>全部 {{ readyLessons.length }} 节已上线</h2>
    <p>
      挑几节最有代表性的。左侧目录可以进入全部课程 —— 每节都按同样的标准写：
      术语先解释、给生活类比、配验收清单。
    </p>
    <div class="lesson-list">
      <router-link
        v-for="l in featured"
        :key="l.code"
        :to="l.path"
        class="lesson-card card card-hover"
      >
        <div class="lc-top">
          <span class="mono lc-code">{{ l.code }}</span>
          <span class="pill">{{ l.minutes }} 分钟</span>
        </div>
        <div class="lc-title">{{ l.title }}</div>
        <div class="lc-chapter">{{ l.chapterLabel }}</div>
      </router-link>
    </div>

    <h2>技术栈</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>层</th><th>选择</th><th>为什么</th></tr>
        </thead>
        <tbody>
          <tr><td>Web</td><td><code>FastAPI</code></td><td>Pydantic 模型对你像 TS interface，心智迁移最顺</td></tr>
          <tr><td>ORM</td><td><code>SQLAlchemy 2.0 async</code></td><td>显式查询，ERP 的复杂 SQL 不会被框架挡住</td></tr>
          <tr><td>数据库</td><td><code>PostgreSQL 16</code></td><td>窗口函数、部分索引、<code>ON CONFLICT</code> 都用得上</td></tr>
          <tr><td>缓存</td><td><code>Redis 7</code></td><td>库存预占、热点商品</td></tr>
          <tr><td>迁移</td><td><code>Alembic</code></td><td>schema 演进必须可回滚</td></tr>
        </tbody>
      </table>
    </div>

    <div class="cta">
      <div>
        <div class="cta-title">准备好了就从第一节开始</div>
        <div class="cta-desc">40 分钟，把环境跑通，顺便理解探针为什么要拆成两个</div>
      </div>
      <router-link to="/m0-01" class="btn primary">开始 M0-01 →</router-link>
    </div>
  </div>
</template>

<style scoped>
.hero {
  padding-bottom: 18px;
}

.hero h1 {
  font-size: 42px;
  line-height: 1.25;
  letter-spacing: -1.2px;
}

.hero-stats {
  display: flex;
  gap: 28px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.hs {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.hs-num {
  font-family: var(--font-mono);
  font-size: 25px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.5px;
}

.hs-cap {
  font-size: 12px;
  color: var(--text-3);
}

.mini-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  font-size: 15px;
}

.arch {
  display: grid;
  grid-template-columns: 1fr auto 1.2fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin: 26px 0;
}

.arch-node {
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 16px 14px;
  text-align: center;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.an-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 3px;
}

.an-desc {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.6;
}

.arch-node.mall {
  border-color: color-mix(in srgb, #3b82f6 35%, transparent);
}
.arch-node.mall .an-title {
  color: #3b82f6;
}

.arch-node.core {
  border-color: color-mix(in srgb, var(--primary) 40%, transparent);
  background: var(--primary-soft);
}
.arch-node.core .an-title {
  color: var(--primary);
}

.arch-node.erp {
  border-color: color-mix(in srgb, var(--success) 35%, transparent);
}
.arch-node.erp .an-title {
  color: var(--success);
}

.arch-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-3);
  font-size: 9.5px;
  white-space: nowrap;
}

.arch-link::after {
  content: '⟷';
  font-size: 14px;
  color: var(--border-strong);
}

.lesson-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
  margin-bottom: 10px;
}

.lesson-card {
  text-decoration: none;
  color: inherit;
  display: block;
  border-bottom-color: var(--border);
}

.lesson-card:hover {
  border-bottom-color: var(--primary);
}

.lc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.lc-code {
  font-size: 11px;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.3px;
}

.lc-title {
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 4px;
  letter-spacing: -0.2px;
}

.lc-chapter {
  font-size: 11.5px;
  color: var(--text-3);
}

.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 48px;
  padding: 22px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary-soft), transparent 70%);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  flex-wrap: wrap;
}

.cta-title {
  font-size: 15.5px;
  font-weight: 650;
  margin-bottom: 3px;
}

.cta-desc {
  font-size: 12.5px;
  color: var(--text-3);
}

@media (max-width: 720px) {
  .hero h1 {
    font-size: 30px;
  }
  .arch {
    grid-template-columns: 1fr;
  }
  .arch-link {
    flex-direction: row;
    justify-content: center;
  }
  .arch-link::after {
    content: '↓';
  }
}
</style>

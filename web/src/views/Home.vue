<script setup>
import { chapters, readyLessons } from '../data/course'
import {
  courses,
  coursePath,
  courseLessonCount,
  courseReadyLessons,
  courseMinutes,
} from '../data/courses'

const totalModules = chapters.length
const totalLessons = readyLessons.length
const order = [
  'backend',
  'database',
  'concurrency',
  'architecture',
  'engineering',
  'erp',
  'ai',
  'ai-basics',
  'ai-app',
  'ai-media',
  'dsh',
  'frontend',
]
const learningPath = order.map((id) => courses.find((c) => c.id === id)).filter(Boolean)

function cardMeta(c) {
  if (c.status === 'coming') return '筹备中'
  const ready = courseReadyLessons(c).length
  const total = courseLessonCount(c)
  return `${c.chapterIds.length} 个模块 · ${ready}${ready < total ? ` / ${total}` : ''} 节`
}

function courseDesc(c) {
  if (c.status === 'coming') return '大纲已定，内容在写'
  return `约 ${Math.round(courseMinutes(c) / 60)} 小时`
}
</script>

<template>
  <div class="page portal">
    <section class="hero">
      <div class="eyebrow">全栈工程课 · 可视化讲义</div>
      <h1>把全栈拆开讲，<br />每门课只说清一件事</h1>
      <p class="lead">
        一套主线（商城 + ERP），拆成后端、数据库、并发、ERP、AI 编程与前端六门课。
        不教语法 —— 教你怎么判断 AI 写的代码能不能上生产。
      </p>

      <div class="hero-stats">
        <div class="hs">
          <span class="hs-num">{{ courses.length }}</span>
          <span class="hs-cap">门课</span>
        </div>
        <div class="hs">
          <span class="hs-num">{{ totalModules }}</span>
          <span class="hs-cap">个模块</span>
        </div>
        <div class="hs">
          <span class="hs-num">{{ totalLessons }}</span>
          <span class="hs-cap">节已上线</span>
        </div>
      </div>
    </section>

    <h2>选择一门课</h2>
    <div class="course-grid">
      <router-link
        v-for="c in courses"
        :key="c.id"
        :to="coursePath(c)"
        class="course-card card card-hover"
        :class="{ coming: c.status === 'coming' }"
      >
        <div class="cc-top">
          <span class="cc-icon">{{ c.icon }}</span>
          <span class="pill" :class="{ primary: c.status !== 'coming' }">{{ cardMeta(c) }}</span>
        </div>
        <h3>{{ c.name }}</h3>
        <div class="cc-sub">{{ c.subtitle }}</div>
        <p class="cc-desc">{{ c.tagline }}</p>
        <div class="cc-foot">
          <span>{{ courseDesc(c) }}</span>
          <span class="cc-arrow">{{ c.status === 'coming' ? '看大纲' : '进入课程' }} →</span>
        </div>
      </router-link>
    </div>

    <h2>建议的学习顺序</h2>
    <p>
      六门课可以独立看，但按这个顺序走，前面的概念会在后面的课里反复用到。
    </p>
    <div class="path">
      <template v-for="(c, i) in learningPath" :key="c.id">
        <router-link :to="coursePath(c)" class="path-node" :class="{ soon: c.status === 'coming' }">
          {{ c.name }}
        </router-link>
        <span v-if="i < learningPath.length - 1" class="path-arrow">→</span>
      </template>
    </div>
    <div class="callout info">
      <span class="callout-icon">i</span>
      <div class="callout-body">
        前端课面向「后端转前端」，从浏览器运行时、TypeScript 讲到 Vue 与工程化，不只讲 Vue。
      </div>
    </div>

    <h2>每节课都按同一个标准写</h2>
    <div class="grid-3">
      <div class="card card-hover">
        <div class="mini-icon">◧</div>
        <h4 style="margin-top: 10px">术语先解释</h4>
        <p style="font-size: 13.5px; margin: 0">
          不假设你懂后端黑话。每个术语先给一句人话，再谈它解决什么问题。
        </p>
      </div>
      <div class="card card-hover">
        <div class="mini-icon">◨</div>
        <h4 style="margin-top: 10px">从失败场景出发</h4>
        <p style="font-size: 13.5px; margin: 0">
          先看一个线上会出事的场景，再讲机制。知道「怎么坏」，才会判断「能不能上线」。
        </p>
      </div>
      <div class="card card-hover">
        <div class="mini-icon">◩</div>
        <h4 style="margin-top: 10px">每节一张验收清单</h4>
        <p style="font-size: 13.5px; margin: 0">
          这部分代码上生产前必须确认什么、怎么确认，逐条列出来，能直接拿去用。
        </p>
      </div>
    </div>

    <div class="cta">
      <div>
        <div class="cta-title">不知道从哪开始？</div>
        <div class="cta-desc">先上后端课：从心智模型、事务边界和幂等开始</div>
      </div>
      <router-link to="/course/backend" class="btn primary">进入后端课 →</router-link>
    </div>
  </div>
</template>

<style scoped>
.hero {
  padding-bottom: 14px;
}

.hero h1 {
  font-size: 42px;
  line-height: 1.25;
  letter-spacing: -1.2px;
}

.hero-stats {
  display: flex;
  gap: 28px;
  margin-top: 30px;
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

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
  margin: 22px 0 12px;
}

.course-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  padding: 20px;
  min-height: 210px;
}

.course-card h3 {
  margin: 14px 0 4px;
  font-size: 18px;
  letter-spacing: -0.3px;
}

.course-card.coming {
  border-style: dashed;
  opacity: 0.82;
}

.cc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cc-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  font-size: 17px;
}

.cc-sub {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  letter-spacing: 0.2px;
}

.cc-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.7;
  margin: 10px 0 16px;
}

.cc-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-3);
}

.cc-arrow {
  color: var(--primary);
  font-weight: 600;
}

.path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0 18px;
}

.path-node {
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--text-2);
  text-decoration: none;
  background: var(--surface);
}

.path-node:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.path-node.soon {
  border-style: dashed;
  color: var(--text-3);
}

.path-arrow {
  color: var(--border-strong);
  font-size: 13px;
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

.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 44px;
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
}
</style>

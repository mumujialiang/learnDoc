<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import {
  courseById,
  courseChapters,
  courseLessons,
  courseMinutes,
} from '../data/courses'
import { useProgress } from '../composables/useProgress'

const route = useRoute()
const { isLearned } = useProgress()

const course = computed(() => courseById[route.params.courseId] || null)
const chapters = computed(() => (course.value ? courseChapters(course.value) : []))
const lessons = computed(() => (course.value ? courseLessons(course.value) : []))
const readyLessons = computed(() => lessons.value.filter((l) => l.status === 'ready'))
const learnedCount = computed(
  () => readyLessons.value.filter((l) => isLearned(l.path)).length
)
const nextLesson = computed(
  () => readyLessons.value.find((l) => !isLearned(l.path)) || readyLessons.value[0] || null
)
const hours = computed(() =>
  Math.max(1, Math.round(courseMinutes(course.value) / 60))
)

const LEVEL_LABEL = { core: '核心', important: '重要', optional: '选学' }
const levelLabel = (level) => LEVEL_LABEL[level] || '重要'

function moduleProgress(ch) {
  const list = ch.lessons.filter((l) => l.status === 'ready')
  const done = list.filter((l) => isLearned(l.path)).length
  return `${done}/${list.length}`
}
</script>

<template>
  <div v-if="course" class="page course-page">
    <div class="eyebrow">课程</div>
    <h1>{{ course.name }}</h1>
    <p class="lead">{{ course.tagline }}</p>

    <div class="course-meta">
      <span class="pill">{{ course.subtitle }}</span>
      <span class="pill">{{ chapters.length }} 个模块</span>
      <span class="pill">已上线 {{ readyLessons.length }} / {{ lessons.length }} 节</span>
      <span class="pill">约 {{ hours }} 小时</span>
      <span class="pill">已学 {{ learnedCount }} 节</span>
    </div>

    <div class="course-progress">
      <div class="cp-bar">
        <span
          :style="{
            width:
              (readyLessons.length ? (learnedCount / readyLessons.length) * 100 : 0) + '%',
          }"
        />
      </div>
      <span class="cp-text">
        {{ readyLessons.length ? Math.round((learnedCount / readyLessons.length) * 100) : 0 }}%
      </span>
    </div>

    <h2>课程目录</h2>
    <p class="order-note">按模块顺序学习；每节课学完后点右下角「标记为已学」。</p>

    <section v-for="ch in chapters" :key="ch.id" class="module-block">
      <div class="module-head">
        <span class="module-code mono">{{ ch.id }}</span>
        <h3>{{ ch.label }}</h3>
        <span class="level-badge" :class="'lv-' + ch.level">{{ levelLabel(ch.level) }}</span>
        <span class="module-progress">{{ moduleProgress(ch) }}</span>
      </div>
      <div class="lesson-list">
        <router-link
          v-for="l in ch.lessons"
          :key="l.code"
          :to="l.path"
          class="lesson-card card card-hover"
          :class="{ draft: l.status !== 'ready', done: isLearned(l.path) }"
        >
          <div class="lc-top">
            <span class="mono lc-code">{{ l.code }}</span>
            <span v-if="l.status !== 'ready'" class="pill">待写</span>
            <span v-else-if="isLearned(l.path)" class="pill ok">已学 ✓</span>
            <span v-else class="pill">{{ l.minutes }} 分钟</span>
          </div>
          <div class="lc-title">{{ l.title }}</div>
          <div class="lc-foot">
            <span class="level-badge small" :class="'lv-' + (l.level || ch.level)">
              {{ levelLabel(l.level || ch.level) }}
            </span>
          </div>
        </router-link>
      </div>
    </section>

    <div v-if="nextLesson" class="cta">
      <div>
        <div class="cta-title">
          {{ learnedCount ? '继续学习' : '从第一节开始' }}
        </div>
        <div class="cta-desc">{{ nextLesson.code }} · {{ nextLesson.title }}</div>
      </div>
      <router-link :to="nextLesson.path" class="btn primary">继续 →</router-link>
    </div>
  </div>

  <div v-else class="page">
    <div class="eyebrow">课程</div>
    <h1>没有这门课</h1>
    <p>课程编号 <code>{{ route.params.courseId }}</code> 不存在。</p>
    <router-link to="/" class="btn">返回全部课程</router-link>
  </div>
</template>

<style scoped>
.course-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 18px 0 12px;
}

.course-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
}

.cp-bar {
  flex: 1;
  max-width: 320px;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.cp-bar span {
  display: block;
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.cp-text {
  font-size: 11.5px;
  color: var(--text-3);
}

.order-note {
  font-size: 12.5px;
  color: var(--text-3);
  margin: -4px 0 8px;
}

.module-block {
  margin: 30px 0;
}

.module-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.module-head h3 {
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.2px;
}

.module-code {
  font-size: 11px;
  color: var(--primary);
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
  background: var(--primary-soft);
  padding: 2px 7px;
  border-radius: 6px;
}

.module-progress {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-3);
  font-family: var(--font-mono);
}

.lesson-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.lesson-card {
  text-decoration: none;
  color: inherit;
  display: block;
}

.lesson-card.draft {
  border-style: dashed;
  opacity: 0.72;
}

.lesson-card.done {
  border-color: color-mix(in srgb, var(--success) 40%, transparent);
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
  letter-spacing: -0.2px;
}

.lc-foot {
  margin-top: 10px;
}

.level-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.level-badge.small {
  font-size: 10px;
  padding: 1px 7px;
}

.level-badge.lv-core {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: color-mix(in srgb, var(--primary) 30%, transparent);
}

.level-badge.lv-important {
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
}

.level-badge.lv-optional {
  color: var(--text-3);
  background: var(--surface-2, rgba(0, 0, 0, 0.03));
  border-color: var(--border);
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
</style>

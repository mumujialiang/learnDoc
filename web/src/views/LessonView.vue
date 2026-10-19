<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import Lesson01 from './Lesson01.vue'
import Lesson02 from './Lesson02.vue'
import Lesson03 from './Lesson03.vue'

import LessonRenderer from '../components/LessonRenderer.vue'
import PageNav from '../components/PageNav.vue'
import TermCard from '../components/TermCard.vue'
import { lessons } from '../data/lessons'
import { allLessons } from '../data/course'
import { courseOfLesson, courseLessons, coursePath } from '../data/courses'
import { useProgress } from '../composables/useProgress'
import { md } from '../utils/md'

const route = useRoute()
const { isLearned } = useProgress()
const code = computed(() => String(route.params.code || '').toUpperCase())

// 前 3 节有专属交互模拟器，走独立组件
const handmade = {
  'M0-01': Lesson01,
  'M0-02': Lesson02,
  'M1-01': Lesson03,
}

const Comp = computed(() => handmade[code.value] || null)
const lesson = computed(() => lessons[code.value] || null)

const course = computed(() => courseOfLesson(code.value))
const courseLessonList = computed(() =>
  course.value ? courseLessons(course.value) : allLessons
)

const index = computed(() =>
  courseLessonList.value.findIndex((l) => l.code === code.value)
)
const currentMeta = computed(() =>
  courseLessonList.value.find((l) => l.code === code.value)
)
const lessonLevel = computed(() => currentMeta.value?.level || 'important')
const LEVEL_LABEL = { core: '核心', important: '重要', optional: '选学' }
const levelLabel = computed(() => LEVEL_LABEL[lessonLevel.value] || '重要')

const pendingBefore = computed(() =>
  courseLessonList.value
    .slice(0, Math.max(0, index.value))
    .filter((l) => l.status === 'ready' && !isLearned(l.path))
)

const prev = computed(() => {
  const p = courseLessonList.value[index.value - 1]
  return p && p.status === 'ready'
    ? { path: p.path, title: `${p.code} ${p.title}` }
    : null
})
const next = computed(() => {
  const n = courseLessonList.value[index.value + 1]
  return n && n.status === 'ready'
    ? { path: n.path, title: `${n.code} ${n.title}` }
    : null
})
</script>

<template>
  <component :is="Comp" v-if="Comp" />

  <div v-else-if="lesson" class="page">
    <div v-if="course" class="crumb">
      <router-link to="/" class="crumb-root">全部课程</router-link>
      <span class="crumb-sep">/</span>
      <router-link :to="coursePath(course)">{{ course.name }}</router-link>
    </div>

    <div class="eyebrow">
      {{ lesson.code }} · {{ lesson.chapter }} · {{ lesson.minutes }} 分钟
    </div>
    <h1>{{ lesson.title }}</h1>

    <div class="lesson-meta">
      <span class="level-badge" :class="'lv-' + lessonLevel">{{ levelLabel }}</span>
      <span class="meta-text">
        第 {{ index + 1 }} / {{ courseLessonList.length }} 节
      </span>
    </div>

    <div v-if="pendingBefore.length" class="seq-hint">
      <strong>建议按顺序学习。</strong>
      前面还有 {{ pendingBefore.length }} 节未标记已学，
      <router-link :to="pendingBefore[0].path">
        先看 {{ pendingBefore[0].code }} {{ pendingBefore[0].title }}
      </router-link>
    </div>

    <p v-if="lesson.lead" class="lead" v-html="md(lesson.lead)" />

    <TermCard v-if="lesson.terms && lesson.terms.length" :terms="lesson.terms" />

    <LessonRenderer :blocks="lesson.blocks" />

    <PageNav :prev="prev" :next="next" />
  </div>

  <div v-else class="page">
    <div class="eyebrow">课程</div>
    <h1>这节还没写</h1>
    <p>课程编号 <code>{{ code }}</code> 不存在或尚未上线。</p>
    <router-link to="/" class="btn">返回全部课程</router-link>
  </div>
</template>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 14px;
}

.crumb a {
  color: var(--text-3);
  text-decoration: none;
}

.crumb a:hover {
  color: var(--primary);
}

.crumb-root {
  color: var(--text-2);
  font-weight: 600;
}

.crumb-sep {
  color: var(--border-strong);
}

.lesson-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -6px 0 20px;
}

.level-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
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

.meta-text {
  font-size: 11.5px;
  color: var(--text-3);
}

.seq-hint {
  margin: 0 0 22px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--primary) 35%, transparent);
  background: var(--primary-soft);
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.7;
}

.seq-hint a {
  color: var(--primary);
  font-weight: 600;
}
</style>

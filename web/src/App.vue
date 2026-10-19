<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

import { readyLessons } from './data/course'
import {
  courses,
  courseById,
  courseChapters,
  courseLessons,
  courseOfLesson,
  coursePath,
} from './data/courses'
import { useProgress } from './composables/useProgress'

const route = useRoute()
const { isLearned, toggleLearned } = useProgress()

function toggleCurrentLesson() {
  if (route.name === 'lesson') toggleLearned(route.path)
}

const theme = ref(localStorage.getItem('lm-theme') || 'light')
const progress = ref(0)
const menuOpen = ref(false)

const currentCourse = computed(() => {
  if (route.name === 'course') return courseById[route.params.courseId] || null
  if (route.name === 'lesson') {
    return courseOfLesson(String(route.params.code || '').toUpperCase())
  }
  return null
})

const navChapters = computed(() =>
  currentCourse.value ? courseChapters(currentCourse.value) : []
)
const progressLessons = computed(() =>
  currentCourse.value ? courseLessons(currentCourse.value) : readyLessons
)

watch(
  theme,
  (v) => {
    document.documentElement.dataset.theme = v
    localStorage.setItem('lm-theme', v)
  },
  { immediate: true }
)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    window.scrollTo(0, 0)
    requestAnimationFrame(updateProgress)
  }
)

function updateProgress() {
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0
}

onMounted(() => window.addEventListener('scroll', updateProgress, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', updateProgress))

const doneCount = computed(
  () => progressLessons.value.filter((l) => isLearned(l.path)).length
)
const donePercent = computed(() =>
  progressLessons.value.length
    ? Math.round((doneCount.value / progressLessons.value.length) * 100)
    : 0
)

const RING_R = 11
const RING_C = 2 * Math.PI * RING_R

function isActive(path) {
  return route.path === path
}
function isDone(path) {
  return isLearned(path)
}
</script>

<template>
  <div class="mobile-bar">
    <button @click="menuOpen = !menuOpen" aria-label="菜单">☰</button>
    <span style="font-size: 13px; font-weight: 600">全栈工程课</span>
    <button
      style="margin-left: auto"
      @click="theme = theme === 'light' ? 'dark' : 'light'"
      aria-label="切换主题"
    >
      {{ theme === 'light' ? '◐' : '◑' }}
    </button>
  </div>

  <div v-if="menuOpen" class="overlay" @click="menuOpen = false" />

  <div class="shell">
    <aside class="sidebar" :class="{ open: menuOpen }">
      <div class="sidebar-head">
        <router-link to="/" class="brand">
          <span class="brand-mark">L</span>
          <span class="brand-text">
            <strong>全栈工程课</strong>
            <span>后端 · 数据库 · 前端 · AI</span>
          </span>
        </router-link>
      </div>

      <nav class="sidebar-scroll">
        <template v-if="currentCourse">
          <router-link to="/" class="nav-item course-back">
            <span class="nav-dot" />
            <span>← 全部课程</span>
          </router-link>

          <div class="chapter-label course-title">{{ currentCourse.name }}</div>

          <div v-for="ch in navChapters" :key="ch.id" class="chapter">
            <div class="chapter-label">
              {{ ch.id }} · {{ ch.label }}
              <span v-if="ch.star" class="badge-mini">核心</span>
            </div>
            <router-link
              v-for="l in ch.lessons"
              :key="l.code"
              :to="l.path || route.path"
              class="nav-item"
              :class="{
                active: isActive(l.path),
                disabled: l.status !== 'ready',
                done: isDone(l.path),
              }"
            >
              <span class="nav-dot" :class="'lv-' + (l.level || 'important')" />
              <span>{{ l.title }}</span>
              <span class="nav-code">{{ l.code }}</span>
            </router-link>
          </div>

          <div v-if="!navChapters.length" class="course-empty">课程筹备中</div>
        </template>

        <template v-else>
          <div class="chapter">
            <div class="chapter-label">课程</div>
            <router-link
              v-for="c in courses"
              :key="c.id"
              :to="coursePath(c)"
              class="nav-item"
              :class="{ active: route.path === coursePath(c) }"
            >
              <span class="nav-dot" />
              <span>{{ c.name }}</span>
              <span class="nav-code">
                {{ c.status === 'coming' ? '待开' : `${c.chapterIds.length}M` }}
              </span>
            </router-link>
          </div>
        </template>

        <div class="nav-divider" />

        <router-link
          to="/sqlserver"
          class="nav-item"
          :class="{ active: route.path === '/sqlserver' }"
        >
          <span class="nav-dot" />
          <span>SQL Server 对照</span>
          <span class="nav-code">REF</span>
        </router-link>
      </nav>

      <div class="sidebar-foot">
        <div class="progress-ring-wrap">
          <svg width="30" height="30" viewBox="0 0 30 30" style="transform: rotate(-90deg)">
            <circle cx="15" cy="15" :r="RING_R" fill="none" stroke="var(--border)" stroke-width="3" />
            <circle
              cx="15"
              cy="15"
              :r="RING_R"
              fill="none"
              stroke="var(--primary)"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="RING_C"
              :stroke-dashoffset="RING_C - (RING_C * donePercent) / 100"
              style="transition: stroke-dashoffset 0.5s ease"
            />
          </svg>
          <span>
            <template v-if="progressLessons.length">
              已学 {{ doneCount }} / {{ progressLessons.length }}
              <br />
              <span style="font-size: 10px">
                {{ currentCourse ? currentCourse.name : '全部课程' }} · {{ donePercent }}%
              </span>
            </template>
            <template v-else>课程筹备中</template>
          </span>
        </div>
        <button
          class="theme-btn"
          @click="theme = theme === 'light' ? 'dark' : 'light'"
          :title="theme === 'light' ? '切换到深色' : '切换到浅色'"
        >
          {{ theme === 'light' ? '◐' : '◑' }}
        </button>
      </div>
    </aside>

    <main class="main">
      <div class="reading-bar"><span :style="{ width: progress + '%' }" /></div>
      <router-view :key="route.path" />
    </main>
  </div>

  <button
    v-if="route.name === 'lesson'"
    class="learn-fab"
    :class="{ done: isLearned(route.path) }"
    @click="toggleCurrentLesson"
  >
    {{ isLearned(route.path) ? '已学 ✓ 点击取消' : '标记为已学' }}
  </button>
</template>

<style scoped>
.course-back {
  font-weight: 600;
  color: var(--text-2);
}

.course-title {
  margin: 16px 0 8px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.2px;
}

.course-empty {
  padding: 8px 10px 14px;
  font-size: 12px;
  color: var(--text-3);
}

.nav-dot.lv-core {
  background: var(--primary);
}

.nav-dot.lv-important {
  background: var(--text-3);
}

.nav-dot.lv-optional {
  background: var(--border-strong);
}

.learn-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 40;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
  background: var(--surface);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}

.learn-fab:hover {
  background: var(--primary-soft);
}

.learn-fab.done {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

@media (max-width: 720px) {
  .learn-fab {
    right: 16px;
    bottom: 16px;
    padding: 9px 14px;
  }
}
</style>

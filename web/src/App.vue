<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { chapters, readyLessons } from './data/course'

const route = useRoute()

const theme = ref(localStorage.getItem('lm-theme') || 'light')
const visited = ref(JSON.parse(localStorage.getItem('lm-visited') || '[]'))
const progress = ref(0)
const menuOpen = ref(false)

watch(
  theme,
  (v) => {
    document.documentElement.dataset.theme = v
    localStorage.setItem('lm-theme', v)
  },
  { immediate: true }
)

watch(
  () => route.path,
  (p) => {
    if (p.startsWith('/m') && !visited.value.includes(p)) {
      visited.value = [...visited.value, p]
      localStorage.setItem('lm-visited', JSON.stringify(visited.value))
    }
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
  () => readyLessons.filter((l) => visited.value.includes(l.path)).length
)
const donePercent = computed(() =>
  readyLessons.length ? Math.round((doneCount.value / readyLessons.length) * 100) : 0
)

const RING_R = 11
const RING_C = 2 * Math.PI * RING_R

function isActive(path) {
  return route.path === path
}
function isDone(path) {
  return visited.value.includes(path)
}
</script>

<template>
  <div class="mobile-bar">
    <button @click="menuOpen = !menuOpen" aria-label="菜单">☰</button>
    <span style="font-size: 13px; font-weight: 600">商城 / ERP 后端课</span>
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
          <span class="brand-mark">ML</span>
          <span class="brand-text">
            <strong>MiniMall 工程课</strong>
            <span>商城 + ERP 可视化讲义</span>
          </span>
        </router-link>
      </div>

      <nav class="sidebar-scroll">
        <div v-for="ch in chapters" :key="ch.id" class="chapter">
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
            <span class="nav-dot" />
            <span>{{ l.title }}</span>
            <span class="nav-code">{{ l.code }}</span>
          </router-link>
        </div>

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
            已学 {{ doneCount }} / {{ readyLessons.length }}
            <br />
            <span style="font-size: 10px">完成度 {{ donePercent }}%</span>
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
</template>

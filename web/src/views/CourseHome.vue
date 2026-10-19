<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { courseById, courseChapters, courseLessons, courseMinutes } from '../data/courses'

const route = useRoute()
const course = computed(() => courseById[route.params.courseId] || null)
const chapters = computed(() => (course.value ? courseChapters(course.value) : []))
const lessons = computed(() => (course.value ? courseLessons(course.value) : []))
const firstLesson = computed(() => lessons.value[0] || null)
const hours = computed(() => Math.max(1, Math.round(courseMinutes(course.value) / 60)))
</script>

<template>
  <div v-if="course" class="page course-page">
    <div class="eyebrow">课程</div>
    <h1>{{ course.name }}</h1>
    <p class="lead">{{ course.tagline }}</p>

    <div class="course-meta">
      <span class="pill">{{ course.subtitle }}</span>
      <span v-if="course.status !== 'coming'" class="pill">{{ chapters.length }} 个模块</span>
      <span v-if="course.status !== 'coming'" class="pill">{{ lessons.length }} 节</span>
      <span v-if="course.status !== 'coming'" class="pill">约 {{ hours }} 小时</span>
      <span v-else class="pill">筹备中</span>
    </div>

    <template v-if="course.status === 'coming'">
      <h2>计划中的大纲</h2>
      <ol class="outline">
        <li v-for="(item, i) in course.outline" :key="i">{{ item }}</li>
      </ol>
      <div class="callout info">
        <span class="callout-icon">i</span>
        <div class="callout-body">
          这门课还在筹备。先看其他课程，或者回到门户挑一门。
        </div>
      </div>
      <router-link to="/" class="btn">返回全部课程</router-link>
    </template>

    <template v-else>
      <h2>课程目录</h2>
      <section v-for="ch in chapters" :key="ch.id" class="module-block">
        <div class="module-head">
          <span class="module-code mono">{{ ch.id }}</span>
          <h3>{{ ch.label }}</h3>
          <span class="pill">{{ ch.lessons.length }} 节</span>
        </div>
        <div class="lesson-list">
          <router-link
            v-for="l in ch.lessons"
            :key="l.code"
            :to="l.path"
            class="lesson-card card card-hover"
          >
            <div class="lc-top">
              <span class="mono lc-code">{{ l.code }}</span>
              <span class="pill">{{ l.minutes }} 分钟</span>
            </div>
            <div class="lc-title">{{ l.title }}</div>
          </router-link>
        </div>
      </section>

      <div class="cta">
        <div>
          <div class="cta-title">从第一节开始</div>
          <div class="cta-desc">{{ firstLesson?.code }} · {{ firstLesson?.title }}</div>
        </div>
        <router-link v-if="firstLesson" :to="firstLesson.path" class="btn primary">
          开始学习 →
        </router-link>
      </div>
    </template>
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
  margin: 18px 0 8px;
}

.module-block {
  margin: 30px 0;
}

.module-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
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

.outline {
  margin: 16px 0 22px;
  padding-left: 22px;
  line-height: 2;
  font-size: 14px;
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

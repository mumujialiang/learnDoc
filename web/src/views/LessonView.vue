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
import { md } from '../utils/md'

const route = useRoute()
const code = computed(() => String(route.params.code || '').toUpperCase())

// 前 3 节有专属交互模拟器，走独立组件
const handmade = {
  'M0-01': Lesson01,
  'M0-02': Lesson02,
  'M1-01': Lesson03,
}

const Comp = computed(() => handmade[code.value] || null)
const lesson = computed(() => lessons[code.value] || null)

const index = computed(() => allLessons.findIndex((l) => l.code === code.value))
const prev = computed(() => {
  const p = allLessons[index.value - 1]
  return p && p.status === 'ready' ? { path: p.path, title: `${p.code} ${p.title}` } : null
})
const next = computed(() => {
  const n = allLessons[index.value + 1]
  return n && n.status === 'ready' ? { path: n.path, title: `${n.code} ${n.title}` } : null
})
</script>

<template>
  <component :is="Comp" v-if="Comp" />

  <div v-else-if="lesson" class="page">
    <div class="eyebrow">
      {{ lesson.code }} · {{ lesson.chapter }} · {{ lesson.minutes }} 分钟
    </div>
    <h1>{{ lesson.title }}</h1>

    <p v-if="lesson.lead" class="lead" v-html="md(lesson.lead)" />

    <TermCard v-if="lesson.terms && lesson.terms.length" :terms="lesson.terms" />

    <LessonRenderer :blocks="lesson.blocks" />

    <PageNav :prev="prev" :next="next" />
  </div>

  <div v-else class="page">
    <div class="eyebrow">课程</div>
    <h1>这节还没写</h1>
    <p>课程编号 <code>{{ code }}</code> 不存在或尚未上线。</p>
    <router-link to="/" class="btn">返回课程首页</router-link>
  </div>
</template>

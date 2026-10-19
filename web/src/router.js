import { createRouter, createWebHashHistory } from 'vue-router'

import Home from './views/Home.vue'
import CourseHome from './views/CourseHome.vue'
import LessonView from './views/LessonView.vue'
import SqlServerRef from './views/SqlServerRef.vue'
import { lessons } from './data/lessons'
import { courseById } from './data/courses'

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: '全栈工程课' } },
  { path: '/course/:courseId', name: 'course', component: CourseHome, meta: { title: '课程' } },
  { path: '/lesson/:code', name: 'lesson', component: LessonView },
  {
    path: '/sqlserver',
    name: 'sqlserver',
    component: SqlServerRef,
    meta: { title: 'SQL Server 对照' },
  },
  // 早期路径兼容
  { path: '/m0-01', redirect: '/lesson/M0-01' },
  { path: '/m0-02', redirect: '/lesson/M0-02' },
  { path: '/m1-01', redirect: '/lesson/M1-01' },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.name === 'home') {
    document.title = '全栈工程课 · 可视化讲义'
    return
  }
  const code = to.params.code ? String(to.params.code).toUpperCase() : ''
  const course = to.params.courseId ? courseById[to.params.courseId] : null
  const title = (code && lessons[code]?.title) || course?.name || to.meta.title
  document.title = title ? `${title} · 全栈工程课` : '全栈工程课'
})

export default router

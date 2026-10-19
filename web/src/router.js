import { createRouter, createWebHashHistory } from 'vue-router'

import Home from './views/Home.vue'
import LessonView from './views/LessonView.vue'
import SqlServerRef from './views/SqlServerRef.vue'

const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: '课程首页' } },
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
  document.title = to.meta.title ? `${to.meta.title} · 商城/ERP 后端课` : '商城/ERP 后端课'
})

export default router

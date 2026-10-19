import { chapters } from './course'

const chapterMap = Object.fromEntries(chapters.map((c) => [c.id, c]))

export const courses = [
  {
    id: 'backend',
    name: '后端工程师课',
    subtitle: '给前端的后端入门',
    tagline: '从心智模型、领域建模、API 到交易、异步、可观测与安全，教你判断 AI 写的代码能不能上生产。',
    icon: '◧',
    chapterIds: ['M0', 'M1', 'M2', 'M3', 'M5', 'M6', 'M8'],
  },
  {
    id: 'database',
    name: '数据库课',
    subtitle: '事务、索引、对象与运维',
    tagline: '不背语法：隔离级别、锁、执行计划、迁移与容量，这些才决定数据库在真实负载下的表现。',
    icon: '▦',
    chapterIds: ['M9', 'M10', 'M11', 'M12'],
  },
  {
    id: 'concurrency',
    name: '并发与性能课',
    subtitle: '线程、协程与资源保护',
    tagline: '从进程线程协程，到连接池、背压、限流，再到并发下的幂等与一致性。',
    icon: '◫',
    chapterIds: ['M13', 'M14', 'M15'],
  },
  {
    id: 'erp',
    name: 'ERP 与业务系统课',
    subtitle: '从单据到台账',
    tagline: '商城和 ERP 共用一套主数据：单据、台账、批次、成本、审批与库存同步。',
    icon: '▤',
    chapterIds: ['M4', 'E1', 'E2', 'E3'],
  },
  {
    id: 'ai',
    name: 'AI 编程课',
    subtitle: '把 AI 用成靠谱的同事',
    tagline: '上下文工程、验收清单与 Review：让 AI 写代码，但由你决定能不能上线。',
    icon: '✦',
    chapterIds: ['M7', 'A1', 'A2', 'A3'],
  },
  {
    id: 'frontend',
    name: '前端工程师课',
    subtitle: '后端转前端 · Vue 方向',
    tagline: '不只讲 Vue：浏览器运行时、TypeScript、组件设计、状态管理、工程化与性能。',
    icon: '◐',
    chapterIds: ['F1', 'F2', 'F3', 'F4', 'F5'],
  },
]

export const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

export function coursePath(course) {
  return `/course/${course.id}`
}

export function courseChapters(course) {
  if (!course || !course.chapterIds) return []
  return course.chapterIds.map((id) => chapterMap[id]).filter(Boolean)
}

export function courseLessons(course) {
  return courseChapters(course).flatMap((c) =>
    c.lessons.map((l) => ({ ...l, chapterId: c.id, chapterLabel: c.label }))
  )
}

export function courseOfLesson(code) {
  return (
    courses.find((c) =>
      (c.chapterIds || []).some((id) =>
        (chapterMap[id]?.lessons || []).some((l) => l.code === code)
      )
    ) || null
  )
}

export function courseLessonCount(course) {
  return courseLessons(course).length
}

export function courseMinutes(course) {
  return courseLessons(course).reduce((sum, l) => sum + l.minutes, 0)
}

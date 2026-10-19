import { chapters } from './course'

const chapterMap = Object.fromEntries(chapters.map((c) => [c.id, c]))

export const courses = [
  {
    id: 'backend',
    name: '后端工程师课',
    subtitle: '给前端的后端入门',
    tagline: '从心智模型、领域建模、API 到交易、异步、可观测与安全，教你判断 AI 写的代码能不能上生产。',
    icon: '◧',
    chapterIds: ['M0', 'M1', 'M2', 'M3', 'M5', 'M6', 'M8', 'H1', 'H2', 'H5', 'H7', 'H9', 'H11'],
  },
  {
    id: 'database',
    name: '数据库课',
    subtitle: '事务、索引、对象与运维',
    tagline: '不背语法：隔离级别、锁、执行计划、迁移与容量，这些才决定数据库在真实负载下的表现。',
    icon: '▦',
    chapterIds: ['M9', 'M10', 'M11', 'M12', 'H8'],
  },
  {
    id: 'concurrency',
    name: '并发与性能课',
    subtitle: '线程、协程与资源保护',
    tagline: '从进程线程协程，到连接池、背压、限流，再到并发下的幂等与一致性。',
    icon: '◫',
    chapterIds: ['M13', 'M14', 'M15', 'H6'],
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
    id: 'ai-app',
    name: 'AI 应用开发课',
    subtitle: '把 LLM 做成可靠功能',
    tagline: 'RAG、Agent、评测、Prompt 版本、成本与安全：做 AI 功能，而不只是用 AI 写代码。',
    icon: '✧',
    chapterIds: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
  },
  {
    id: 'architecture',
    name: '全栈架构设计课',
    subtitle: '从需求到演进',
    tagline: '需求拆解、模块边界、数据一致性、部署拓扑与架构演进，一套完整的判断框架。',
    icon: '▣',
    chapterIds: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  },
  {
    id: 'ai-basics',
    name: 'AI 概念课',
    subtitle: '从神经元到多模态',
    tagline: '下一个 token、卷积、注意力、扩散、多模态：把 AI 的底层概念讲成人话。',
    icon: '◎',
    chapterIds: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
  },
  {
    id: 'ai-media',
    name: 'AI 生成应用课',
    subtitle: '图像、视频、音频怎么生成',
    tagline: '文生图、文生视频、TTS、声音克隆：理解生成应用的原理、成本与边界。',
    icon: '▷',
    chapterIds: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
  },
  {
    id: 'dsh',
    name: 'DeepSeek Harness 实战课',
    subtitle: '个人使用与工程落地',
    tagline: '从安装、模型配置到插件开发、权限与 CI：把 DSH 用成日常工具，也接进工程流程。',
    icon: '⌘',
    chapterIds: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
  },
  {
    id: 'frontend',
    name: '前端工程师课',
    subtitle: '后端转前端 · Vue 方向',
    tagline: '不只讲 Vue：浏览器运行时、TypeScript、组件设计、状态管理、工程化与性能。',
    icon: '◐',
    chapterIds: ['F1', 'F2', 'F3', 'F4', 'F5', 'H15'],
  },
  {
    id: 'engineering',
    name: '工程化与架构课',
    subtitle: '可观测、发布、架构与合规',
    tagline: '上线之后才真正开始：指标与告警、流水线与回滚、架构边界、对象存储与合规。',
    icon: '◈',
    chapterIds: ['H3', 'H4', 'H13', 'H14', 'H10', 'H12', 'H16'],
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
    c.lessons.map((l) => ({
      ...l,
      level: l.level || c.level || 'important',
      chapterId: c.id,
      chapterLabel: c.label,
    }))
  )
}

export function courseReadyLessons(course) {
  return courseLessons(course).filter((l) => l.status === 'ready')
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

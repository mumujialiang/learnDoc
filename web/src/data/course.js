const L = (code, title, minutes) => ({
  code,
  title,
  path: `/lesson/${code}`,
  minutes,
  status: 'ready',
})

export const chapters = [
  {
    id: 'M0',
    label: '后端心智模型',
    lessons: [
      L('M0-01', '环境与骨架', 40),
      L('M0-02', '事务边界', 60),
      L('M0-03', '幂等', 50),
      L('M0-04', '错误处理与统一响应', 40),
    ],
  },
  {
    id: 'M1',
    label: '领域建模',
    star: true,
    lessons: [
      L('M1-01', '商品建模 SPU / SKU', 90),
      L('M1-02', '金额与精度', 45),
      L('M1-03', '主数据 / 单据 / 台账', 50),
      L('M1-04', '状态机', 45),
      L('M1-05', '软删除与审计', 40),
      L('M1-06', '多租户建模', 50),
    ],
  },
  {
    id: 'M2',
    label: 'API 与鉴权',
    lessons: [
      L('M2-01', '资源建模 vs 动作建模', 40),
      L('M2-02', '分页', 40),
      L('M2-03', '鉴权与 RBAC', 55),
      L('M2-04', '校验与 DTO 分层', 40),
      L('M2-05', '接口版本与兼容', 35),
    ],
  },
  {
    id: 'M3',
    label: '交易核心',
    star: true,
    lessons: [
      L('M3-01', '购物车与价格快照', 50),
      L('M3-02', '价格计算与优惠分摊', 60),
      L('M3-03', '库存模型', 55),
      L('M3-04', '下单扣减与超卖', 70),
      L('M3-05', '支付回调', 60),
      L('M3-06', '订单状态机与履约', 50),
      L('M3-07', '售后与逆向流程', 55),
    ],
  },
  {
    id: 'M4',
    label: 'ERP 核心',
    star: true,
    lessons: [
      L('M4-01', '单据模型', 55),
      L('M4-02', '库存台账 vs 余额', 60),
      L('M4-03', '批次 / 序列号 / 有效期', 50),
      L('M4-04', '业财一体', 60),
      L('M4-05', '成本核算', 55),
      L('M4-06', '审批流引擎', 50),
      L('M4-07', '商城与 ERP 库存同步', 55),
    ],
  },
  {
    id: 'M5',
    label: '异步与一致性',
    lessons: [
      L('M5-01', '任务队列与任务幂等', 50),
      L('M5-02', '事件驱动与 Outbox', 60),
      L('M5-03', '什么时候不需要分布式事务', 40),
      L('M5-04', '缓存穿透 / 击穿 / 雪崩', 50),
      L('M5-05', '缓存与数据库一致性', 45),
    ],
  },
  {
    id: 'M6',
    label: '可观测与工程化',
    lessons: [
      L('M6-01', '结构化日志与 trace_id', 40),
      L('M6-02', '测试分层', 45),
      L('M6-03', '迁移与灰度发布', 40),
      L('M6-04', '秒杀演练', 60),
    ],
  },
  {
    id: 'M7',
    label: 'AI 协作方法论',
    lessons: [
      L('M7-01', '上下文工程', 40),
      L('M7-02', '验收清单与 Review', 40),
    ],
  },
]

export const allLessons = chapters.flatMap((c) =>
  c.lessons.map((l) => ({ ...l, chapterId: c.id, chapterLabel: c.label }))
)

export const readyLessons = allLessons.filter((l) => l.status === 'ready')

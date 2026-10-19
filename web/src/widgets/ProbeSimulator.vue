<script setup>
import { ref, computed, watch } from 'vue'

const dbDown = ref(false)
const redisDown = ref(false)
const badLiveness = ref(false)

const clock = ref(0)
const logs = ref([
  { t: '00:00', msg: '三副本正常运行，全部在流量池中', kind: 'ok' },
])

function now() {
  clock.value += 1
  const s = String(clock.value).padStart(2, '0')
  return `00:${s}`
}

function push(msg, kind = 'info') {
  logs.value.unshift({ t: now(), msg, kind })
  if (logs.value.length > 7) logs.value.pop()
}

const liveStatus = computed(() => (badLiveness.value && dbDown.value ? 503 : 200))
const readyStatus = computed(() => (dbDown.value || redisDown.value ? 503 : 200))

const pods = computed(() =>
  [1, 2, 3].map((id) => {
    if (liveStatus.value === 503) return { id, state: 'restart' }
    if (readyStatus.value === 503) return { id, state: 'drained' }
    return { id, state: 'serving' }
  })
)

const successRate = computed(() => {
  const serving = pods.value.filter((p) => p.state === 'serving').length
  return Math.round((serving / 3) * 100)
})

const verdict = computed(() => {
  if (liveStatus.value === 503) {
    return {
      level: 'fatal',
      title: '全站雪崩',
      text: dbDown.value && badLiveness.value
        ? 'PG 抖了一下，存活探针失败，三个副本被同时重启。重启中的进程接不了请求，于是所有用户 502。'
        : '',
    }
  }
  if (readyStatus.value === 503) {
    return {
      level: 'warn',
      title: '优雅降级',
      text: '就绪探针失败，三个副本被摘出流量池。进程仍然活着，依赖恢复后会立刻回来。',
    }
  }
  return { level: 'ok', title: '一切正常', text: '两个探针都通过，三副本均匀分担流量。' }
})

watch(dbDown, (v) => {
  push(v ? 'PostgreSQL 停止响应' : 'PostgreSQL 恢复', v ? 'bad' : 'ok')
  if (v && badLiveness.value) {
    push('存活探针开始失败 → kubelet 判定容器已死', 'bad')
  }
})
watch(redisDown, (v) => push(v ? 'Redis 停止响应' : 'Redis 恢复', v ? 'bad' : 'ok'))
watch(badLiveness, (v) => {
  push(v ? '有人把数据库检查写进了存活探针' : '存活探针恢复为纯净实现', v ? 'bad' : 'ok')
})

watch(liveStatus, (v, old) => {
  if (v === 503 && old === 200) push('全部副本进入重启流程，期间无法处理任何请求', 'bad')
})
watch(readyStatus, (v) => {
  if (v === 503) push('全部副本被摘出流量池（不是重启）', 'warn')
  else push('副本重新加入流量池', 'ok')
})

function reset() {
  dbDown.value = false
  redisDown.value = false
  badLiveness.value = false
  push('环境重置', 'ok')
}
</script>

<template>
  <div class="widget dark-stage">
    <div class="widget-head">
      <span class="widget-tag">交互</span>
      <span class="widget-title">探针故障演练台</span>
      <span class="widget-hint">拨开关，看它怎么处置这三个 Pod</span>
    </div>

    <div class="widget-body">
      <div class="switches">
        <button class="switch" :class="{ on: dbDown }" @click="dbDown = !dbDown">
          <span class="dot" />
          PostgreSQL {{ dbDown ? '已停止' : '正常' }}
        </button>
        <button class="switch" :class="{ on: redisDown }" @click="redisDown = !redisDown">
          <span class="dot" />
          Redis {{ redisDown ? '已停止' : '正常' }}
        </button>
        <button class="switch danger" :class="{ on: badLiveness }" @click="badLiveness = !badLiveness">
          <span class="dot" />
          {{ badLiveness ? '存活探针已含 DB 检查' : '启用危险配置' }}
        </button>
        <button class="btn sm" style="margin-left: auto" @click="reset">重置</button>
      </div>

      <div class="probes">
        <div class="probe" :class="liveStatus === 200 ? 'p-ok' : 'p-bad'">
          <div class="probe-head">
            <span class="mono">GET /health/live</span>
            <span class="code-pill">{{ liveStatus }}</span>
          </div>
          <div class="probe-desc">
            {{ badLiveness ? '会查询数据库（错误做法）' : '只返回 ok，不碰任何依赖' }}
          </div>
          <div class="probe-effect" :class="liveStatus === 200 ? 'te-ok' : 'te-bad'">
            {{ liveStatus === 200 ? '容器保持运行' : '容器被重启' }}
          </div>
        </div>

        <div class="probe" :class="readyStatus === 200 ? 'p-ok' : 'p-bad'">
          <div class="probe-head">
            <span class="mono">GET /health</span>
            <span class="code-pill">{{ readyStatus }}</span>
          </div>
          <div class="probe-desc">检查 db + redis 连通性</div>
          <div class="probe-effect" :class="readyStatus === 200 ? 'te-ok' : 'te-warn'">
            {{ readyStatus === 200 ? '接流量' : '摘流量，不重启' }}
          </div>
        </div>
      </div>

      <div class="pods">
        <div v-for="p in pods" :key="p.id" class="pod" :class="'pod-' + p.state">
          <div class="pod-icon">
            {{ p.state === 'serving' ? '●' : p.state === 'drained' ? '◐' : '◌' }}
          </div>
          <div class="pod-name mono">pod-{{ p.id }}</div>
          <div class="pod-state">
            {{ p.state === 'serving' ? '服务中' : p.state === 'drained' ? '已摘流量' : '重启中' }}
          </div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <span class="metric-label">用户请求成功率</span>
          <span class="metric-value" :class="successRate === 100 ? 'v-ok' : 'v-bad'">
            {{ successRate }}%
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">健康副本数</span>
          <span class="metric-value">{{ pods.filter((p) => p.state === 'serving').length }} / 3</span>
        </div>
        <div class="metric verdict" :class="'vd-' + verdict.level">
          <span class="metric-label">{{ verdict.title }}</span>
          <span class="verdict-text">{{ verdict.text }}</span>
        </div>
      </div>

      <div class="log">
        <div class="log-title">事件日志</div>
        <div v-for="(l, i) in logs" :key="i" class="log-row" :class="'lg-' + l.kind">
          <span class="log-time mono">{{ l.t }}</span>
          <span>{{ l.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 深色舞台：只覆盖 CSS 变量，内部组件不用改模板 */
.widget.dark-stage {
  background:
    radial-gradient(140% 110% at 50% 0%, rgba(24, 52, 92, 0.5), rgba(5, 8, 16, 0.92) 62%),
    #05080f;
  border-color: rgba(110, 160, 230, 0.13);
  border-radius: 18px;
  box-shadow: 0 26px 60px -22px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05);

  --surface: #0b111c;
  --surface-2: #101828;
  --surface-3: #182334;
  --text: #e8f2ff;
  --text-2: #a4b8d0;
  --text-3: #62788f;
  --border: #1d2a3c;
  --border-strong: #2b3d55;
  --primary: #3ce0ff;
  --primary-2: #6ff0ff;
  --primary-soft: #0e2a3d;
  --success: #5ff2c2;
  --success-soft: #0d2e26;
  --danger: #ff5c7c;
  --danger-soft: #2e1220;
  --warning: #ffc857;
  --warning-soft: #2b2210;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 6px 18px rgba(0, 0, 0, 0.45);
}

.dark-stage :deep(.widget-head) {
  background: rgba(255, 255, 255, 0.02);
  border-bottom-color: rgba(110, 160, 230, 0.1);
}

.switches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 18px;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  transition: all 0.16s ease;
}

.switch:hover {
  border-color: var(--border-strong);
}

.switch .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  transition: all 0.2s ease;
}

.switch.on {
  background: var(--danger-soft);
  border-color: transparent;
  color: var(--danger);
}

.switch.on .dot {
  background: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 22%, transparent);
}

.switch.danger {
  border-style: dashed;
}

.probes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.probe {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--surface-2);
  transition: all 0.25s ease;
}

.probe.p-ok {
  border-color: color-mix(in srgb, var(--success) 35%, transparent);
}

.probe.p-bad {
  border-color: color-mix(in srgb, var(--danger) 40%, transparent);
  background: var(--danger-soft);
}

.probe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}

.probe-head .mono {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.code-pill {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 6px;
  background: var(--surface-3);
  color: var(--text-2);
  flex: none;
}

.p-ok .code-pill {
  background: var(--success-soft);
  color: var(--success);
}

.p-bad .code-pill {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.probe-desc {
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.6;
  margin-bottom: 8px;
}

.probe-effect {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 7px;
  display: inline-block;
}

.te-ok {
  background: var(--success-soft);
  color: var(--success);
}
.te-bad {
  background: color-mix(in srgb, var(--danger) 16%, transparent);
  color: var(--danger);
}
.te-warn {
  background: var(--warning-soft);
  color: var(--warning);
}

.pods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.pod {
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 12px;
  text-align: center;
  background: var(--surface-2);
  transition: all 0.3s ease;
}

.pod-icon {
  font-size: 15px;
  line-height: 1;
  margin-bottom: 6px;
}

.pod-name {
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 3px;
}

.pod-state {
  font-size: 11.5px;
  font-weight: 600;
}

.pod-serving {
  border-color: color-mix(in srgb, var(--success) 32%, transparent);
}
.pod-serving .pod-icon,
.pod-serving .pod-state {
  color: var(--success);
}

.pod-drained {
  border-color: color-mix(in srgb, var(--warning) 38%, transparent);
  background: var(--warning-soft);
}
.pod-drained .pod-icon,
.pod-drained .pod-state {
  color: var(--warning);
}

.pod-restart {
  border-color: color-mix(in srgb, var(--danger) 42%, transparent);
  background: var(--danger-soft);
  animation: pulse 1.4s ease-in-out infinite;
}
.pod-restart .pod-icon,
.pod-restart .pod-state {
  color: var(--danger);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 10px;
  margin-bottom: 16px;
}

.metric {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 11px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.2px;
}

.metric-value {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.v-ok {
  color: var(--success);
}
.v-bad {
  color: var(--danger);
}

.verdict {
  justify-content: center;
}

.verdict-text {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-2);
}

.vd-fatal {
  border-color: color-mix(in srgb, var(--danger) 40%, transparent);
  background: var(--danger-soft);
}
.vd-fatal .metric-label {
  color: var(--danger);
  font-weight: 700;
}

.vd-warn {
  border-color: color-mix(in srgb, var(--warning) 38%, transparent);
  background: var(--warning-soft);
}
.vd-warn .metric-label {
  color: var(--warning);
  font-weight: 700;
}

.vd-ok .metric-label {
  color: var(--success);
  font-weight: 700;
}

.log {
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}

.log-title {
  font-size: 10.5px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 700;
  margin-bottom: 7px;
}

.log-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--text-2);
  padding: 2px 0;
}

.log-time {
  font-size: 10.5px;
  color: var(--text-3);
  flex: none;
  padding-top: 2px;
}

.lg-bad {
  color: var(--danger);
}
.lg-warn {
  color: var(--warning);
}
.lg-ok {
  color: var(--success);
}

@media (max-width: 720px) {
  .probes,
  .metrics,
  .pods {
    grid-template-columns: 1fr;
  }
}
</style>

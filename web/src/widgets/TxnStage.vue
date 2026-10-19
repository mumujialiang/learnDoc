<script setup>
import { computed, reactive, ref } from 'vue'
import CanvasStage from '../components/CanvasStage.vue'

const CYAN = 'rgba(60,224,255,'
const GOLD = 'rgba(255,200,87,'
const MINT = 'rgba(95,242,194,'
const ROSE = 'rgba(255,92,124,'

const INK = '#e8f2ff'
const DIM = '#7e94b3'
const FAINT = '#4e6483'
const MONO = 'ui-monospace, Consolas, "Cascadia Mono", monospace'

const WRITE_MS = 60
const COMMIT_MS = 40
const POOL = 30
const TOTAL_REQ = 50

const externalMs = ref(800)
const mode = ref('bad')

const sim = reactive({
  slots: new Array(POOL).fill(0),
  queue: 0,
  done: 0,
  spawned: 0,
  clock: 0,
  running: false,
  peakQueue: 0,
  peakBusy: 0,
})

const txMs = computed(() =>
  mode.value === 'bad' ? WRITE_MS + externalMs.value + COMMIT_MS : WRITE_MS + COMMIT_MS
)

const throughput = computed(() => Math.round((POOL / (txMs.value / 1000)) * 10) / 10)
const goodThroughput = Math.round(POOL / ((WRITE_MS + COMMIT_MS) / 1000))

const segments = computed(() => {
  const segs = [{ label: '写订单', ms: WRITE_MS, color: CYAN }]
  if (mode.value === 'bad' && externalMs.value > 0) {
    segs.push({ label: '调第三方', ms: externalMs.value, color: ROSE })
  }
  segs.push({ label: 'COMMIT', ms: COMMIT_MS, color: MINT })
  return segs
})

const totalMs = computed(() => segments.value.reduce((s, x) => s + x.ms, 0))

/**
 * 视觉时长必须和请求到达速率匹配，否则永远看不到排队：
 * 只有「生成速率 > 释放速率」时槽位才会堆满。
 * 这里固定到达间隔 0.04s（25 req/s），900ms 事务对应 1.8s 占用，
 * 释放速率 16.7 req/s < 到达速率，队列就堆起来了。
 */
function visualDur() {
  return Math.min(3.0, Math.max(0.4, txMs.value / 400))
}

function resetSim() {
  sim.slots = new Array(POOL).fill(0)
  sim.queue = 0
  sim.done = 0
  sim.spawned = 0
  sim.clock = 0
  sim.running = false
  sim.peakQueue = 0
  sim.peakBusy = 0
}

function run() {
  resetSim()
  sim.running = true
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function draw({ ctx, w, h, dt }) {
  const PAD = 24
  const innerW = w - PAD * 2

  // ── 推进模拟 ──────────────────────────────
  if (sim.running) {
    sim.clock += dt
    const dur = visualDur()

    // 每 0.05s 来一个请求，50 个约 2.5 秒到齐
    while (sim.spawned < TOTAL_REQ && sim.clock >= sim.spawned * 0.05) {
      sim.spawned += 1
      const free = sim.slots.findIndex((v) => v === 0)
      if (free >= 0) sim.slots[free] = sim.clock + dur
      else {
        sim.queue += 1
        sim.peakQueue = Math.max(sim.peakQueue, sim.queue)
      }
    }

    for (let i = 0; i < POOL; i++) {
      if (sim.slots[i] && sim.slots[i] <= sim.clock) {
        sim.slots[i] = 0
        sim.done += 1
      }
    }

    while (sim.queue > 0) {
      const free = sim.slots.findIndex((v) => v === 0)
      if (free < 0) break
      sim.slots[free] = sim.clock + dur
      sim.queue -= 1
    }

    sim.peakBusy = Math.max(sim.peakBusy, sim.slots.filter((v) => v > 0).length)

    if (sim.spawned >= TOTAL_REQ && sim.queue === 0 && sim.slots.every((v) => v === 0)) {
      sim.running = false
    }
  }

  // ── 时间轴 ──────────────────────────────
  const txTop = 38
  const barH = 34
  const weights = segments.value.map((s) => Math.max(s.ms, 130))
  const wsum = weights.reduce((a, b) => a + b, 0)

  ctx.font = `600 9.5px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'left'
  ctx.fillText('BEGIN', PAD, txTop - 9)
  ctx.textAlign = 'right'
  ctx.fillText('COMMIT', PAD + innerW, txTop - 9)

  let x = PAD
  segments.value.forEach((s, i) => {
    const segW = (weights[i] / wsum) * innerW
    const g = ctx.createLinearGradient(x, txTop, x, txTop + barH)
    const alpha = s.color === ROSE ? ['0.22', '0.5'] : ['0.14', '0.34']
    g.addColorStop(0, s.color + alpha[0] + ')')
    g.addColorStop(1, s.color + alpha[1] + ')')
    ctx.fillStyle = g
    roundRect(ctx, x + 1, txTop, segW - 2, barH, 7)
    ctx.fill()

    ctx.strokeStyle = s.color + '0.45)'
    ctx.lineWidth = 1
    roundRect(ctx, x + 1, txTop, segW - 2, barH, 7)
    ctx.stroke()

    if (segW > 46) {
      ctx.font = `600 10.5px ${MONO}`
      ctx.fillStyle = 'rgba(232,242,255,0.92)'
      ctx.textAlign = 'center'
      ctx.fillText(s.label, x + segW / 2, txTop + 15)
      ctx.font = `500 9px ${MONO}`
      ctx.fillStyle = 'rgba(232,242,255,0.5)'
      ctx.fillText(`${s.ms}ms`, x + segW / 2, txTop + 27)
    }
    x += segW
  })

  // 锁持有条
  ctx.fillStyle = ROSE + '0.5)'
  ctx.fillRect(PAD, txTop + barH + 5, innerW, 2)
  ctx.font = `600 8.5px ${MONO}`
  ctx.fillStyle = ROSE + '0.6)'
  ctx.textAlign = 'left'
  ctx.fillText('连接与行锁被占用的全过程', PAD, txTop + barH + 22)

  // ── 指标 ──────────────────────────────
  const mTop = txTop + barH + 48
  const metrics = [
    { k: '事务时长', v: `${totalMs.value}`, u: 'ms', c: totalMs.value > 600 ? ROSE : MINT },
    { k: '理论吞吐', v: `${throughput.value}`, u: 'req/s', c: throughput.value < 60 ? ROSE : MINT },
    { k: '外部可回滚', v: mode.value === 'bad' ? '否' : '是', u: '', c: mode.value === 'bad' ? ROSE : MINT },
    {
      k: sim.running ? '池外排队' : '峰值排队',
      v: `${sim.running ? sim.queue : sim.peakQueue}`,
      u: '',
      c: (sim.running ? sim.queue : sim.peakQueue) > 0 ? GOLD : DIM,
    },
  ]

  const cellW = innerW / metrics.length
  metrics.forEach((m, i) => {
    const cx = PAD + i * cellW
    if (i > 0) {
      ctx.strokeStyle = 'rgba(120,170,255,0.09)'
      ctx.beginPath()
      ctx.moveTo(cx, mTop - 10)
      ctx.lineTo(cx, mTop + 24)
      ctx.stroke()
    }
    ctx.font = `600 8.5px ${MONO}`
    ctx.fillStyle = FAINT
    ctx.textAlign = 'left'
    ctx.fillText(m.k, cx + 10, mTop)
    ctx.font = `700 17px ${MONO}`
    ctx.fillStyle = m.c + '1)'
    ctx.fillText(m.v, cx + 10, mTop + 20)
    if (m.u) {
      const vw = ctx.measureText(m.v).width
      ctx.font = `500 8.5px ${MONO}`
      ctx.fillStyle = DIM
      ctx.fillText(m.u, cx + 12 + vw, mTop + 20)
    }
  })

  // ── 连接池 ──────────────────────────────
  const poolTop = mTop + 50
  const cols = 10
  const rows = 3
  const gap = 5
  // 上限 34：池子占宽必须给右侧队列留出空间，否则排队区会被挤没
  const bw = Math.min(34, (innerW - gap * (cols - 1)) / cols)
  const bh = 26
  const poolW = cols * bw + gap * (cols - 1)
  const poolX = PAD

  ctx.font = `600 8.5px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'left'
  ctx.fillText(`连接池 ${POOL}`, poolX, poolTop - 8)

  const busy = sim.slots.filter((v) => v > 0).length
  ctx.textAlign = 'right'
  const busyLabel = sim.running ? `${busy} 占用` : `峰值 ${sim.peakBusy} 占用`
  ctx.fillStyle = (sim.running ? busy : sim.peakBusy) >= POOL ? ROSE + '0.9)' : DIM
  ctx.fillText(busyLabel, poolX + poolW, poolTop - 8)

  const dur = visualDur()
  for (let i = 0; i < POOL; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const bx = poolX + c * (bw + gap)
    const by = poolTop + r * (bh + gap)
    const left = sim.slots[i] === 0 ? 0 : Math.max(0, sim.slots[i] - sim.clock) / dur

    ctx.fillStyle = 'rgba(120,170,255,0.05)'
    roundRect(ctx, bx, by, bw, bh, 5)
    ctx.fill()

    if (left > 0) {
      ctx.fillStyle = left < 0.25 ? MINT + '0.85)' : CYAN + '0.72)'
      ctx.shadowBlur = 8
      ctx.shadowColor = left < 0.25 ? MINT + '0.8)' : CYAN + '0.6)'
      roundRect(ctx, bx, by, bw, bh, 5)
      ctx.fill()
      ctx.shadowBlur = 0

      // 剩余进度
      ctx.fillStyle = 'rgba(6,14,26,0.55)'
      ctx.fillRect(bx, by + bh - 3, bw * (1 - left), 3)
    } else {
      ctx.strokeStyle = 'rgba(120,170,255,0.13)'
      ctx.lineWidth = 1
      roundRect(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, 5)
      ctx.stroke()
    }
  }

  // ── 队列 ──────────────────────────────
  const qx = poolX + poolW + 26
  const qw = w - PAD - qx
  if (qw > 60) {
    ctx.font = `600 8.5px ${MONO}`
    ctx.fillStyle = FAINT
    ctx.textAlign = 'left'
    ctx.fillText('等待队列', qx, poolTop - 8)

    const dot = 7
    const perRow = Math.max(1, Math.floor(qw / (dot + 4)))
    const total = sim.queue
    for (let i = 0; i < total && i < 40; i++) {
      const c = i % perRow
      const r = Math.floor(i / perRow)
      const px = qx + c * (dot + 4)
      const py = poolTop + 4 + r * (dot + 4)
      ctx.fillStyle = GOLD + '0.75)'
      ctx.shadowBlur = 6
      ctx.shadowColor = GOLD + '0.7)'
      ctx.beginPath()
      ctx.arc(px + dot / 2, py + dot / 2, dot / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    if (total === 0) {
      ctx.font = `500 9.5px ${MONO}`
      ctx.fillStyle = 'rgba(120,170,255,0.25)'
      ctx.fillText('空闲', qx, poolTop + 16)
    }

    // 完成数
    ctx.font = `700 15px ${MONO}`
    ctx.fillStyle = MINT + '0.9)'
    ctx.textAlign = 'left'
    ctx.fillText(`${sim.done}`, qx, poolTop + 92)
    ctx.font = `600 8.5px ${MONO}`
    ctx.fillStyle = FAINT
    ctx.fillText(`/ ${TOTAL_REQ} 完成`, qx + 2, poolTop + 104)
  }
}

function setMode(m) {
  mode.value = m
  resetSim()
}

function onSlide() {
  resetSim()
}
</script>

<template>
  <div class="viz">
    <CanvasStage :on-frame="draw" :height="302" label="Connection Pool · 事务如何吃掉连接">
      <template #tag>
        <span class="tag-pill">{{ mode === 'bad' ? '外部调用在事务内' : '外部调用在事务外' }}</span>
      </template>
    </CanvasStage>

    <div class="viz-ctl">
      <div class="ctl-group">
        <span class="ctl-label">第三方耗时</span>
        <input
          type="range"
          min="0"
          max="3000"
          step="100"
          v-model.number="externalMs"
          :disabled="mode === 'good'"
          @input="onSlide"
        />
        <span class="mono val">{{ externalMs }}ms</span>
      </div>

      <div class="ctl-group">
        <button class="chip" :class="{ on: mode === 'bad' }" @click="setMode('bad')">事务内</button>
        <button class="chip" :class="{ on: mode === 'good' }" @click="setMode('good')">
          事务外
        </button>
      </div>

      <button class="chip primary" @click="run" :disabled="sim.running">
        {{ sim.running ? '模拟中…' : `施加 ${TOTAL_REQ} 并发` }}
      </button>
      <button class="chip" @click="resetSim">重置</button>
    </div>

    <p class="viz-hint">
      理论吞吐 = 连接数 ÷ 事务时长。事务被外部调用撑到
      <span class="mono">{{ totalMs }}ms</span>，30 个连接就只能扛
      <span class="mono">{{ throughput }}</span> req/s ——
      同样的服务器，同样的代码，只差一行 <code>await</code> 的位置。
    </p>
  </div>
</template>

<style scoped>
.viz {
  margin: 28px 0;
}

.viz :deep(.stage-shell) {
  margin-bottom: 0;
  border-radius: 18px 18px 0 0;
  border-bottom: none;
}

.tag-pill {
  margin-left: auto;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(60, 224, 255, 0.1);
  color: #6fd8f2;
}

.viz-ctl {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 18px;
  background: #070b14;
  border: 1px solid rgba(110, 160, 230, 0.13);
  border-top: 1px solid rgba(110, 160, 230, 0.08);
  border-radius: 0 0 18px 18px;
  box-shadow: 0 26px 60px -22px rgba(0, 0, 0, 0.55);
}

.ctl-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctl-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5c7392;
  white-space: nowrap;
}

.mono {
  font-family: var(--font-mono);
}

.val {
  font-size: 11px;
  color: #ffc857;
  min-width: 52px;
  text-align: right;
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 130px;
  height: 22px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(60, 224, 255, 0.7), rgba(255, 92, 124, 0.5));
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  margin-top: -5px;
  border-radius: 50%;
  background: #eaf7ff;
  border: 3px solid #0b1626;
  box-shadow: 0 0 0 1px rgba(60, 224, 255, 0.9), 0 0 12px rgba(60, 224, 255, 0.6);
}

input[type='range']:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.chip {
  font-family: var(--font-sans);
  font-size: 11.5px;
  padding: 4px 12px;
  border-radius: 7px;
  border: 1px solid rgba(120, 170, 255, 0.16);
  background: rgba(120, 180, 255, 0.04);
  color: #8ba3c2;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.chip:hover:not(:disabled) {
  border-color: rgba(120, 180, 255, 0.38);
  color: #cfe2f7;
}

.chip.on {
  background: rgba(60, 224, 255, 0.14);
  border-color: rgba(60, 224, 255, 0.5);
  color: #d9f8ff;
  box-shadow: inset 0 0 18px rgba(60, 224, 255, 0.12);
}

.chip.primary {
  margin-left: auto;
  color: #04101f;
  background: linear-gradient(180deg, #eaf8ff, #b9dcf5);
  border-color: transparent;
  font-weight: 600;
}

.chip.primary:disabled {
  opacity: 0.55;
  cursor: default;
}

.viz-hint {
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--text-3);
  margin: 10px 0 0;
}

.viz-hint code {
  font-size: 11.5px;
}

@media (max-width: 640px) {
  .chip.primary {
    margin-left: 0;
  }
  input[type='range'] {
    width: 100px;
  }
}
</style>

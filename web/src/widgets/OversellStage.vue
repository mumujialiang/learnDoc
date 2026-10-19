<script setup>
import { computed, reactive, ref } from 'vue'
import CanvasStage from '../components/CanvasStage.vue'

const state = reactive({ n: 2, mode: 'unsafe', speed: 1 })
const playing = ref(true)

const CYAN = 'rgba(60,224,255,'
const GOLD = 'rgba(255,200,87,'
const MINT = 'rgba(95,242,194,'
const ROSE = 'rgba(255,92,124,'

const INK = '#e8f2ff'
const DIM = '#7e94b3'
const FAINT = '#4e6483'
const MONO = 'ui-monospace, Consolas, "Cascadia Mono", monospace'
const SANS = '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

const READ = 0.34
const CHECK = 0.22
const WRITE = 0.28
const STOCK0 = 1

let vt = 0
let plan = null
let lastKey = ''

function buildPlan() {
  const n = state.n
  const reqs = []
  for (let i = 0; i < n; i++) {
    const s = 0.28 + i * 0.42
    reqs.push({
      id: i,
      start: s,
      readEnd: s + READ,
      checkEnd: s + READ + CHECK,
      writeEnd: s + READ + CHECK + WRITE,
      ok: true,
    })
  }

  // 按写入时刻顺序执行，模拟真实的串行落库
  const seq = [...reqs].sort((a, b) => a.writeEnd - b.writeEnd)
  let stock = STOCK0
  for (const r of seq) {
    if (state.mode === 'atomic') {
      r.ok = stock >= 1
      if (r.ok) stock -= 1
    } else {
      r.ok = true
      stock -= 1
    }
  }

  const total = Math.max(...reqs.map((r) => r.writeEnd)) + 1.0
  const oversold = seq.filter((r) => r.ok).length - STOCK0
  return { reqs, seq, total, finalStock: stock, oversold: Math.max(0, oversold) }
}

function ensurePlan() {
  const key = `${state.n}-${state.mode}`
  if (key !== lastKey) {
    lastKey = key
    plan = buildPlan()
    vt = 0
  }
  return plan
}

const hint = computed(() => {
  if (state.mode === 'atomic') {
    return `判断和扣减写在同一条 SQL 里：只有第 1 个请求能扣成功，其余 ${
      state.n - 1
    } 个影响 0 行，订单失败。`
  }
  return `${state.n} 个请求都在对方提交前读到了「还剩 1 件」，于是全都扣了 —— 库存变成负数，货发不出去。`
})

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, Math.abs(w) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function draw({ ctx, w, h, dt }) {
  const p = ensurePlan()

  if (playing.value) {
    vt += dt * state.speed
    if (vt > p.total + 1.1) vt = 0
  }

  const PAD_L = 46
  const PAD_R = 18
  const TOP = 88
  const ROW_H = 40
  const BAR_H = 16
  const plotW = Math.max(40, w - PAD_L - PAD_R)
  const X = (t) => PAD_L + (t / p.total) * plotW

  // ── 顶部读数 ──────────────────────────────
  const stock = p.seq.reduce((s, r) => (r.writeEnd <= vt && r.ok ? s - 1 : s), STOCK0)
  const done = p.seq.filter((r) => r.writeEnd <= vt && r.ok).length
  const bad = stock < 0

  ctx.save()
  ctx.font = `600 11px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'left'
  ctx.letterSpacing = '1.4px'
  ctx.fillText('当前库存', PAD_L, 26)

  ctx.font = `700 40px ${MONO}`
  ctx.fillStyle = bad ? ROSE + '1)' : MINT + '1)'
  ctx.shadowBlur = 22
  ctx.shadowColor = bad ? ROSE + '0.8)' : MINT + '0.6)'
  ctx.fillText(String(stock), PAD_L - 1, 64)
  ctx.shadowBlur = 0

  ctx.font = `600 11px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'right'
  ctx.fillText('已成功下单', w - PAD_R, 26)
  ctx.font = `700 22px ${MONO}`
  ctx.fillStyle = done > STOCK0 ? ROSE + '1)' : CYAN + '1)'
  ctx.fillText(String(done), w - PAD_R, 54)

  if (bad) {
    ctx.font = `700 11px ${MONO}`
    ctx.fillStyle = ROSE + '0.95)'
    ctx.fillText(`超卖 ${-stock} 件`, w - PAD_R, 74)
  } else if (state.mode === 'atomic' && done >= 1) {
    ctx.font = `700 11px ${MONO}`
    ctx.fillStyle = MINT + '0.9)'
    ctx.fillText('无超卖', w - PAD_R, 74)
  }
  ctx.restore()

  // ── 未提交窗口 ──────────────────────────────
  const winTop = TOP - 14
  const winH = p.reqs.length * ROW_H + 4
  for (const r of p.reqs) {
    const x0 = X(r.readEnd)
    const x1 = X(r.writeEnd)
    const g = ctx.createLinearGradient(x0, 0, x1, 0)
    g.addColorStop(0, ROSE + '0.16)')
    g.addColorStop(1, ROSE + '0.05)')
    ctx.fillStyle = g
    ctx.fillRect(x0, winTop, x1 - x0, winH)
    ctx.strokeStyle = ROSE + '0.14)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, winTop)
    ctx.lineTo(x0, winTop + winH)
    ctx.stroke()
  }

  ctx.font = `600 9.5px ${MONO}`
  ctx.fillStyle = ROSE + '0.55)'
  ctx.textAlign = 'left'
  ctx.fillText('未提交窗口', X(p.reqs[0].readEnd) + 4, winTop - 5)

  // ── 每个请求一行 ──────────────────────────────
  p.reqs.forEach((r, i) => {
    const y = TOP + i * ROW_H
    const active = vt >= r.start && vt <= r.writeEnd
    const settled = vt > r.writeEnd

    ctx.font = `600 11px ${MONO}`
    ctx.fillStyle = active ? INK : FAINT
    ctx.textAlign = 'right'
    ctx.fillText(`R${r.id + 1}`, PAD_L - 12, y + BAR_H - 2)

    const seg = (x0, x1, color, alpha, label) => {
      const xa = X(x0)
      const xb = X(x1)
      if (xb - xa < 0.5) return
      ctx.fillStyle = color + alpha + ')'
      roundRect(ctx, xa, y, xb - xa, BAR_H, 4)
      ctx.fill()
      if (xb - xa > 34) {
        ctx.font = `600 8.5px ${MONO}`
        ctx.fillStyle = 'rgba(6,12,22,0.72)'
        ctx.textAlign = 'center'
        ctx.fillText(label, (xa + xb) / 2, y + BAR_H - 4.5)
      }
    }

    // 底槽
    ctx.fillStyle = 'rgba(120,170,255,0.045)'
    roundRect(ctx, X(0), y, plotW, BAR_H, 4)
    ctx.fill()

    seg(r.start, r.readEnd, CYAN, settled ? '0.75' : '0.9', '读')
    seg(r.readEnd, r.checkEnd, GOLD, settled ? '0.6' : '0.85', '判')
    if (settled && !r.ok) {
      seg(r.checkEnd, r.writeEnd, 'rgba(255,92,124,', '0.18', '×')
      ctx.strokeStyle = ROSE + '0.55)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      roundRect(ctx, X(r.checkEnd), y, X(r.writeEnd) - X(r.checkEnd), BAR_H, 4)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      seg(r.checkEnd, r.writeEnd, MINT, settled ? '0.8' : '0.9', '扣')
    }

    // 播放头
    if (active && playing.value) {
      const px = X(vt)
      ctx.save()
      ctx.strokeStyle = INK
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, y - 4)
      ctx.lineTo(px, y + BAR_H + 4)
      ctx.stroke()
      ctx.restore()
    }
  })

  // ── 时间轴基线 ──────────────────────────────
  const baseY = TOP + p.reqs.length * ROW_H + 8
  ctx.strokeStyle = 'rgba(120,170,255,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD_L, baseY)
  ctx.lineTo(PAD_L + plotW, baseY)
  ctx.stroke()

  ctx.font = `500 9px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'left'
  ctx.fillText('t = 0', PAD_L, baseY + 13)
  ctx.textAlign = 'right'
  ctx.fillText(`${p.total.toFixed(1)}s`, PAD_L + plotW, baseY + 13)
}

function reset() {
  vt = 0
}

function setMode(m) {
  state.mode = m
  vt = 0
}

function setN(n) {
  state.n = n
  vt = 0
}
</script>

<template>
  <div class="viz">
    <CanvasStage
      :on-frame="draw"
      :height="112 + state.n * 44"
      label="Transaction Race · 并发扣减时序"
    >
      <template #tag>
        <span class="tag-pill">{{ state.mode === 'atomic' ? '条件更新' : '先查后改' }}</span>
      </template>
    </CanvasStage>

    <div class="viz-ctl">
      <div class="ctl-group">
        <span class="ctl-label">并发请求</span>
        <button
          v-for="n in 5"
          :key="n"
          class="chip"
          :class="{ on: state.n === n }"
          @click="setN(n)"
        >
          {{ n }}
        </button>
      </div>

      <div class="ctl-group">
        <span class="ctl-label">扣减方式</span>
        <button class="chip wide" :class="{ on: state.mode === 'unsafe' }" @click="setMode('unsafe')">
          先查后改
        </button>
        <button class="chip wide" :class="{ on: state.mode === 'atomic' }" @click="setMode('atomic')">
          条件更新
        </button>
      </div>

      <div class="ctl-group right">
        <button class="chip" @click="playing = !playing">{{ playing ? '暂停' : '播放' }}</button>
        <button class="chip" @click="reset">重播</button>
      </div>
    </div>

    <p class="viz-hint">{{ hint }}</p>
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

.viz-ctl {
  display: flex;
  align-items: center;
  gap: 20px;
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
  gap: 6px;
}

.ctl-group.right {
  margin-left: auto;
}

.ctl-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5c7392;
  margin-right: 4px;
  white-space: nowrap;
}

.chip {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid rgba(120, 170, 255, 0.16);
  background: rgba(120, 180, 255, 0.04);
  color: #8ba3c2;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.chip.wide {
  font-family: var(--font-sans);
  padding: 4px 12px;
}

.chip:hover {
  border-color: rgba(120, 180, 255, 0.38);
  color: #cfe2f7;
}

.chip.on {
  background: rgba(60, 224, 255, 0.14);
  border-color: rgba(60, 224, 255, 0.5);
  color: #d9f8ff;
  box-shadow: inset 0 0 18px rgba(60, 224, 255, 0.12);
}

.viz-hint {
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--text-3);
  margin: 10px 0 0;
  padding-left: 2px;
}

@media (max-width: 640px) {
  .ctl-group.right {
    margin-left: 0;
  }
}
</style>

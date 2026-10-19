<script setup>
import { reactive } from 'vue'
import CanvasStage from '../components/CanvasStage.vue'

const CYAN = 'rgba(60,224,255,'
const GOLD = 'rgba(255,200,87,'
const MINT = 'rgba(95,242,194,'
const ROSE = 'rgba(255,92,124,'

const INK = '#e8f2ff'
const DIM = '#7e94b3'
const FAINT = '#4e6483'
const MONO = 'ui-monospace, Consolas, "Cascadia Mono", monospace'

// 固定标尺 150：100 件时占 2/3，视觉上有变化空间；
// 超过 150 后改用实际值，避免溢出。
const scaleOf = (p) => Math.max(150, p + 1)

const s = reactive({ physical: 100, locked: 0, shipped: 0 })
const disp = reactive({ physical: 100, locked: 0, shipped: 0 })

// 最近一次操作的提示
const note = reactive({ text: '初始状态：仓库里 100 件，全部可售', tone: 'dim' })

function clampTo() {
  s.locked = Math.min(s.locked, s.physical)
  s.physical = Math.max(0, s.physical)
  s.shipped = Math.max(0, s.shipped)
}

function order(qty = 10) {
  const avail = s.physical - s.locked
  if (avail < qty) {
    note.text = `可售只剩 ${avail} 件，不够下单 ${qty} 件`
    note.tone = 'bad'
    return
  }
  s.locked += qty
  clampTo()
  note.text = `下单 ${qty} 件 → 从可售挪到锁定。实物没变，但别人买不到了`
  note.tone = 'warn'
}

function pay() {
  if (s.locked <= 0) {
    note.text = '没有锁定的库存可以支付'
    note.tone = 'bad'
    return
  }
  const n = s.locked
  s.physical -= n
  s.shipped += n
  s.locked = 0
  clampTo()
  note.text = `支付 ${n} 件 → 锁定转成已出库，实物库存真正减少`
  note.tone = 'ok'
}

function cancel() {
  if (s.locked <= 0) {
    note.text = '没有锁定的库存可以释放'
    note.tone = 'bad'
    return
  }
  const n = s.locked
  s.locked = 0
  clampTo()
  note.text = `超时取消 ${n} 件 → 锁定退回可售。实物从头到尾没动过`
  note.tone = 'ok'
}

function restock(qty = 50) {
  s.physical += qty
  clampTo()
  note.text = `入库 ${qty} 件 → 实物和可售同时增加`
  note.tone = 'ok'
}

function reset() {
  s.physical = 100
  s.locked = 0
  s.shipped = 0
  note.text = '已重置为：100 件实物，全部可售'
  note.tone = 'dim'
}

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
  const k = Math.min(1, dt * 7)
  disp.physical += (s.physical - disp.physical) * k
  disp.locked += (s.locked - disp.locked) * k
  disp.shipped += (s.shipped - disp.shipped) * k

  const PAD = 26
  const innerW = w - PAD * 2
  const barY = 26
  const barH = 44

  const avail = Math.max(0, disp.physical - disp.locked)

  // ── 容量底线 ──────────────────────────────
  ctx.fillStyle = 'rgba(120,170,255,0.05)'
  roundRect(ctx, PAD, barY, innerW, barH, 8)
  ctx.fill()

  // ── 可售段 ──────────────────────────────
  const totalW = (disp.physical / scaleOf(disp.physical)) * innerW
  const availW = disp.physical > 0 ? (avail / disp.physical) * totalW : 0
  const lockW = disp.physical > 0 ? (disp.locked / disp.physical) * totalW : 0

  if (availW > 0.5) {
    const g = ctx.createLinearGradient(PAD, barY, PAD, barY + barH)
    g.addColorStop(0, CYAN + '0.55)')
    g.addColorStop(1, CYAN + '0.22)')
    ctx.fillStyle = g
    roundRect(ctx, PAD, barY, availW, barH, 8)
    ctx.fill()
    ctx.strokeStyle = CYAN + '0.6)'
    ctx.lineWidth = 1
    roundRect(ctx, PAD + 0.5, barY + 0.5, availW - 1, barH - 1, 8)
    ctx.stroke()
  }

  if (lockW > 0.5) {
    const g = ctx.createLinearGradient(PAD, barY, PAD, barY + barH)
    g.addColorStop(0, GOLD + '0.6)')
    g.addColorStop(1, GOLD + '0.28)')
    ctx.fillStyle = g
    roundRect(ctx, PAD + availW, barY, lockW, barH, 8)
    ctx.fill()
    ctx.strokeStyle = GOLD + '0.7)'
    ctx.lineWidth = 1
    roundRect(ctx, PAD + availW + 0.5, barY + 0.5, lockW - 1, barH - 1, 8)
    ctx.stroke()
  }

  // 段内数字
  if (availW > 54) {
    ctx.font = `700 15px ${MONO}`
    ctx.fillStyle = 'rgba(6,14,26,0.78)'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(avail)}`, PAD + availW / 2, barY + 27)
    ctx.font = `600 8px ${MONO}`
    ctx.fillStyle = 'rgba(6,14,26,0.55)'
    ctx.fillText('可售', PAD + availW / 2, barY + 38)
  }
  if (lockW > 42) {
    ctx.font = `700 13px ${MONO}`
    ctx.fillStyle = 'rgba(40,26,4,0.8)'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(disp.locked)}`, PAD + availW + lockW / 2, barY + 27)
  }

  // ── 图例 ──────────────────────────────
  const legend = [
    { c: CYAN, t: '可售 — 现在能卖' },
    { c: GOLD, t: '锁定 — 已下单未付款' },
  ]
  let lx = PAD
  ctx.font = `500 10px ${MONO}`
  legend.forEach((l) => {
    ctx.fillStyle = l.c + '0.9)'
    ctx.beginPath()
    ctx.arc(lx + 4, barY + barH + 18, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = DIM
    ctx.textAlign = 'left'
    ctx.fillText(l.t, lx + 12, barY + barH + 21)
    lx += ctx.measureText(l.t).width + 34
  })

  // ── 数字面板 ──────────────────────────────
  const pTop = barY + barH + 44
  const cells = [
    { k: '实物库存', v: Math.round(disp.physical), c: INK, sub: '仓库里真实有的' },
    { k: '可售', v: Math.round(avail), c: avail < disp.physical ? CYAN : MINT, sub: '能卖给用户的' },
    { k: '锁定', v: Math.round(disp.locked), c: disp.locked > 0 ? GOLD : DIM, sub: '占了但还没付钱' },
    { k: '已出库', v: Math.round(disp.shipped), c: disp.shipped > 0 ? ROSE : DIM, sub: '累计卖出去的' },
  ]
  const cw = innerW / cells.length
  cells.forEach((c, i) => {
    const cx = PAD + i * cw
    if (i > 0) {
      ctx.strokeStyle = 'rgba(120,170,255,0.09)'
      ctx.beginPath()
      ctx.moveTo(cx, pTop - 12)
      ctx.lineTo(cx, pTop + 36)
      ctx.stroke()
    }
    ctx.font = `600 8.5px ${MONO}`
    ctx.fillStyle = FAINT
    ctx.textAlign = 'left'
    ctx.fillText(c.k, cx + 10, pTop)
    ctx.font = `700 24px ${MONO}`
    ctx.fillStyle = c.c + '1)'
    ctx.fillText(String(c.v), cx + 10, pTop + 26)
    ctx.font = `500 8px ${MONO}`
    ctx.fillStyle = 'rgba(120,170,255,0.35)'
    ctx.fillText(c.sub, cx + 10, pTop + 38)
  })

  // ── 提示语 ──────────────────────────────
  const noteY = pTop + 62
  if (noteY < h - 6) {
    const color =
      note.tone === 'bad' ? ROSE : note.tone === 'warn' ? GOLD : note.tone === 'ok' ? MINT : DIM
    ctx.font = `500 10.5px ${MONO}`
    ctx.fillStyle = color + '0.85)'
    ctx.textAlign = 'left'
    ctx.fillText(note.text, PAD, noteY)
  }
}
</script>

<template>
  <div class="viz">
    <CanvasStage :on-frame="draw" :height="212" label="Stock Model · 库存不是一个数字">
      <template #tag>
        <span class="tag-pill">实物 {{ s.physical }} · 可售 {{ s.physical - s.locked }}</span>
      </template>
    </CanvasStage>

    <div class="viz-ctl">
      <button class="chip" @click="order(10)">下单 10 件</button>
      <button class="chip" @click="pay">支付</button>
      <button class="chip" @click="cancel">超时取消</button>
      <button class="chip" @click="restock(50)">入库 50 件</button>
      <button class="chip ghost" @click="reset">重置</button>
    </div>
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
  font-family: var(--font-mono);
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
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 18px;
  background: #070b14;
  border: 1px solid rgba(110, 160, 230, 0.13);
  border-top: 1px solid rgba(110, 160, 230, 0.08);
  border-radius: 0 0 18px 18px;
  box-shadow: 0 26px 60px -22px rgba(0, 0, 0, 0.55);
}

.chip {
  font-family: var(--font-sans);
  font-size: 11.5px;
  padding: 5px 13px;
  border-radius: 7px;
  border: 1px solid rgba(120, 170, 255, 0.16);
  background: rgba(120, 180, 255, 0.04);
  color: #8ba3c2;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.chip:hover {
  border-color: rgba(120, 180, 255, 0.4);
  color: #cfe2f7;
  background: rgba(120, 180, 255, 0.09);
}

.chip.ghost {
  margin-left: auto;
  opacity: 0.7;
}
</style>

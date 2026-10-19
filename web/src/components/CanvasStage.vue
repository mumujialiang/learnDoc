<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  onFrame: { type: Function, required: true },
  height: { type: Number, default: 340 },
  label: { type: String, default: '' },
})

const host = ref(null)
const cv = ref(null)

let raf = 0
let ro = null
let io = null
let visible = true
let last = 0
const st = { w: 1, h: 1, dpr: 1, ctx: null }

function measure() {
  const el = cv.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  st.w = Math.max(1, Math.round(r.width))
  st.h = Math.max(1, Math.round(r.height))
  st.dpr = dpr
  const W = Math.round(st.w * dpr)
  const H = Math.round(st.h * dpr)
  if (el.width !== W || el.height !== H) {
    el.width = W
    el.height = H
  }
}

function loop(now) {
  raf = requestAnimationFrame(loop)
  if (!visible || document.hidden) {
    last = now
    return
  }
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const ctx = st.ctx
  if (!ctx) return
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0)
  ctx.clearRect(0, 0, st.w, st.h)
  props.onFrame({ ctx, w: st.w, h: st.h, t: now / 1000, dt })
}

onMounted(() => {
  st.ctx = cv.value.getContext('2d')
  measure()
  if (window.ResizeObserver) {
    ro = new ResizeObserver(measure)
    ro.observe(cv.value)
  }
  if (window.IntersectionObserver) {
    io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
      },
      { rootMargin: '120px' }
    )
    io.observe(host.value)
  }
  last = performance.now()
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  io?.disconnect()
})
</script>

<template>
  <div ref="host" class="stage-shell">
    <div v-if="label || $slots.tag" class="stage-top">
      <span class="stage-dot" />
      <span class="stage-label">{{ label }}</span>
      <slot name="tag" />
    </div>
    <div class="stage-canvas-wrap" :style="{ height: height + 'px' }">
      <canvas ref="cv" />
      <div v-if="$slots.overlay" class="stage-overlay">
        <slot name="overlay" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage-shell {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(140% 110% at 50% 0%, rgba(24, 52, 92, 0.55), rgba(5, 8, 16, 0.9) 62%),
    #05080f;
  border: 1px solid rgba(110, 160, 230, 0.13);
  box-shadow: 0 26px 60px -22px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  margin: 26px 0;
}

.stage-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(120, 170, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(120, 170, 255, 0.05) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 88%);
}

.stage-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 18px;
  border-bottom: 1px solid rgba(110, 160, 230, 0.1);
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7f96b5;
  z-index: 1;
}

.stage-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3ce0ff;
  box-shadow: 0 0 10px rgba(60, 224, 255, 0.85);
  flex: none;
  animation: stage-blink 2.4s ease-in-out infinite;
}

@keyframes stage-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.stage-label {
  color: #9fb6d4;
}

.stage-canvas-wrap {
  position: relative;
  width: 100%;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.stage-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stage-overlay :deep(button),
.stage-overlay :deep(input) {
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .stage-dot {
    animation: none;
  }
}
</style>

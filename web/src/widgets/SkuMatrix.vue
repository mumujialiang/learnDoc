<script setup>
import { ref, computed } from 'vue'

const colors = ref([
  { id: 1, name: '红' },
  { id: 2, name: '蓝' },
  { id: 3, name: '黑' },
])
const sizes = ref([
  { id: 11, name: 'S' },
  { id: 12, name: 'M' },
  { id: 13, name: 'L' },
  { id: 14, name: 'XL' },
])

const offSet = ref(new Set(['2-13']))
const selectedColor = ref(1)
const selectedSize = ref(12)
const renderMode = ref('gray') // gray = 置灰（正确）；hide = 消失（错误）
const reportRan = ref(false)

function key(c, s) {
  return `${c}-${s}`
}

function isOn(c, s) {
  return !offSet.value.has(key(c, s))
}

function toggle(c, s) {
  const k = key(c, s)
  const next = new Set(offSet.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  offSet.value = next
  reportRan.value = false
}

const combos = computed(() =>
  colors.value.flatMap((c) =>
    sizes.value.map((s) => ({
      key: key(c.id, s.id),
      color: c,
      size: s,
      on: isOn(c.id, s.id),
    }))
  )
)

const total = computed(() => combos.value.length)
const onCount = computed(() => combos.value.filter((x) => x.on).length)
const offCount = computed(() => total.value - onCount.value)

function hash(id, sid) {
  const raw = `${id}:${sid}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  const part = h.toString(16).padStart(8, '0')
  return (part + part + part + part).slice(0, 32)
}

function hashOf(c, s) {
  return hash(c, s).slice(0, 8)
}

// 尺码可用性取决于当前选中的颜色
const sizeAvailability = computed(() =>
  sizes.value.map((s) => ({
    ...s,
    available: isOn(selectedColor.value, s.id),
  }))
)

const visibleSizes = computed(() =>
  renderMode.value === 'hide'
    ? sizeAvailability.value.filter((s) => s.available)
    : sizeAvailability.value
)

const report = computed(() =>
  colors.value.map((c) => ({
    color: c.name,
    on: sizes.value.filter((s) => isOn(c.id, s.id)).length,
    off: sizes.value.filter((s) => !isOn(c.id, s.id)).length,
  }))
)

function reset() {
  offSet.value = new Set(['2-13'])
  selectedColor.value = 1
  selectedSize.value = 12
  reportRan.value = false
}

const sql = `select av.value as color, count(*) as sku_cnt
from sku s
join sku_attr_value sav on sav.sku_id = s.id
join attr a on a.id = sav.attr_id and a.name = '颜色'
join attr_value av on av.id = sav.attr_value_id
where s.status = 1
group by av.value;`
</script>

<template>
  <div class="widget dark-stage">
    <div class="widget-head">
      <span class="widget-tag">交互</span>
      <span class="widget-title">SPU / SKU 规格矩阵</span>
      <span class="widget-hint">点格子下架，看下游怎么反应</span>
    </div>

    <div class="widget-body">
      <div class="topline">
        <div class="stats-inline">
          <span class="pill primary">笛卡尔积 {{ total }}</span>
          <span class="pill ok">在售 {{ onCount }}</span>
          <span class="pill bad">下架 {{ offCount }}</span>
        </div>
        <button class="btn sm" @click="reset">重置</button>
      </div>

      <div
        class="matrix"
        :style="{ gridTemplateColumns: `52px repeat(${sizes.length}, minmax(0, 1fr))` }"
      >
        <div class="mx-corner">规格</div>
        <div v-for="s in sizes" :key="'h' + s.id" class="mx-head">{{ s.name }}</div>

        <template v-for="c in colors" :key="'r' + c.id">
          <div class="mx-head side">{{ c.name }}</div>
          <div
            v-for="s in sizes"
            :key="c.id + '-' + s.id"
            class="cell"
            :class="{ off: !isOn(c.id, s.id) }"
            @click="toggle(c.id, s.id)"
          >
            <span class="cell-mark">{{ isOn(c.id, s.id) ? '✓' : '✕' }}</span>
            <span class="cell-hash mono">{{ hashOf(c.id, s.id) }}</span>
          </div>
        </template>
      </div>

      <div class="hint-line">
        每格是一个 SKU，右下角是 <code>spec_hash</code> 前 8 位。
        同一个 (SPU, 规格组合) 只能存在一条，靠数据库唯一约束兜底。
      </div>

      <div class="divider-row">
        <span class="divider-text">下游会怎么反应</span>
      </div>

      <div class="experiments">
        <!-- 实验一：报表 -->
        <div class="exp">
          <div class="exp-head">
            <span class="exp-title">按颜色统计 SKU 数</span>
          </div>
          <p class="exp-desc">同一个需求，两种存法，看谁能一条 SQL 出结果。</p>
          <button class="btn sm" @click="reportRan = !reportRan">
            {{ reportRan ? '收起' : '执行查询' }}
          </button>

          <transition name="expand">
            <div v-if="reportRan" class="exp-body">
              <div class="scheme fail">
                <span class="scheme-label">JSON 存 specs</span>
                <div class="scheme-msg">
                  ✕ 无法用一条 SQL 完成。必须把所有 SPU 读进内存，
                  逐个解析 <code>{"颜色":"红"}</code> 再手工聚合。
                </div>
              </div>
              <div class="scheme pass">
                <span class="scheme-label">属性拆表</span>
                <div class="scheme-msg">
                  ✓ 一条 SQL 出结果
                </div>
                <pre class="mini-sql">{{ sql }}</pre>
                <div class="result-table">
                  <div class="rt-row rt-head">
                    <span>颜色</span><span>在售 SKU</span><span>下架</span>
                  </div>
                  <div v-for="r in report" :key="r.color" class="rt-row">
                    <span>{{ r.color }}</span>
                    <span class="mono ok-num">{{ r.on }}</span>
                    <span class="mono muted">{{ r.off }}</span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 实验二：选择器 -->
        <div class="exp">
          <div class="exp-head">
            <span class="exp-title">详情页规格选择器</span>
          </div>

          <div class="seg-control tight">
            <button :class="{ on: renderMode === 'gray' }" @click="renderMode = 'gray'">
              置灰
            </button>
            <button :class="{ on: renderMode === 'hide' }" @click="renderMode = 'hide'">
              消失
            </button>
          </div>

          <div class="selector">
            <div class="sel-row">
              <span class="sel-label">颜色</span>
              <button
                v-for="c in colors"
                :key="c.id"
                class="chip"
                :class="{ active: selectedColor === c.id }"
                @click="selectedColor = c.id"
              >
                {{ c.name }}
              </button>
            </div>
            <div class="sel-row">
              <span class="sel-label">尺码</span>
              <button
                v-for="s in visibleSizes"
                :key="s.id"
                class="chip"
                :class="{
                  active: selectedSize === s.id,
                  disabled: !s.available,
                }"
                :disabled="!s.available"
                @click="s.available && (selectedSize = s.id)"
              >
                {{ s.name }}
              </button>
            </div>
          </div>

          <div class="exp-note" :class="renderMode === 'gray' ? 'note-ok' : 'note-bad'">
            {{
              renderMode === 'gray'
                ? '下架组合置灰不可选 —— 用户知道"有这款但没货"，不会怀疑自己点错了。'
                : '下架组合直接消失 —— 用户会困惑："我明明记得有 M 码"。'
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 深色舞台：只覆盖 CSS 变量 */
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

.topline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.stats-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.topline .btn {
  margin-left: auto;
}

.matrix {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}

.mx-head {
  font-size: 11.5px;
  color: var(--text-3);
  text-align: center;
  padding: 5px 0;
  font-weight: 600;
}

.mx-head.side {
  display: grid;
  place-items: center;
  color: var(--text-2);
}

.mx-corner {
  font-size: 10px;
  color: var(--text-3);
  display: grid;
  place-items: center;
}

.cell {
  position: relative;
  height: 46px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
  background: var(--success-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.18s ease;
  overflow: hidden;
}

.cell:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.cell-mark {
  font-size: 13px;
  color: var(--success);
  font-weight: 700;
  transition: all 0.18s ease;
}

.cell-hash {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 7.5px;
  color: var(--text-3);
  opacity: 0.5;
  letter-spacing: -0.3px;
}

.cell.off {
  background: repeating-linear-gradient(
    -45deg,
    var(--surface-3),
    var(--surface-3) 5px,
    var(--surface-2) 5px,
    var(--surface-2) 10px
  );
  border-color: var(--border);
}

.cell.off .cell-mark {
  color: var(--text-3);
}

.hint-line {
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.75;
  margin-bottom: 20px;
}

.hint-line code {
  font-size: 10.5px;
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.divider-row::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.divider-text {
  font-size: 10.5px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 700;
}

.experiments {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.exp {
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 15px;
  background: var(--surface-2);
}

.exp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
}

.exp-title {
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text);
}

.exp-desc {
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.7;
  margin: 0 0 10px;
}

.exp-body {
  margin-top: 12px;
}

.scheme {
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 9px;
  font-size: 11.5px;
  line-height: 1.7;
}

.scheme-label {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.scheme.fail {
  background: var(--danger-soft);
  color: var(--text-2);
}
.scheme.fail .scheme-label {
  color: var(--danger);
}

.scheme.pass {
  background: var(--success-soft);
  color: var(--text-2);
}
.scheme.pass .scheme-label {
  color: var(--success);
}

.scheme-msg code {
  font-size: 10px;
}

.mini-sql {
  font-size: 9.5px;
  line-height: 1.65;
  padding: 10px 11px;
  margin: 8px 0 8px;
  border-radius: 8px;
  box-shadow: none;
}

.result-table {
  border-top: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
  padding-top: 6px;
}

.rt-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  font-size: 11px;
  padding: 2px 0;
  color: var(--text-2);
}

.rt-head {
  color: var(--text-3);
  font-size: 10px;
  letter-spacing: 0.3px;
}

.ok-num {
  color: var(--success);
  font-weight: 700;
}

.seg-control {
  display: flex;
  background: var(--surface-3);
  border-radius: 9px;
  padding: 2px;
  gap: 2px;
  margin-bottom: 12px;
}

.seg-control.tight {
  width: fit-content;
}

.seg-control button {
  border: none;
  background: transparent;
  color: var(--text-2);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 550;
  padding: 5px 12px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-control button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.selector {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 12px;
}

.sel-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sel-label {
  font-size: 11px;
  color: var(--text-3);
  width: 30px;
  flex: none;
}

.chip {
  font-family: inherit;
  font-size: 11.5px;
  padding: 4px 11px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover:not(.disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.chip.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  text-decoration: line-through;
}

.exp-note {
  font-size: 11px;
  line-height: 1.7;
  padding: 8px 11px;
  border-radius: 8px;
}

.note-ok {
  background: var(--success-soft);
  color: var(--text-2);
}

.note-bad {
  background: var(--danger-soft);
  color: var(--text-2);
}

.expand-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.expand-enter-from {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 820px) {
  .experiments {
    grid-template-columns: 1fr;
  }
}
</style>

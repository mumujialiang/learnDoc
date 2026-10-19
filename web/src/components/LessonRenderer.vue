<script setup>
import Callout from './Callout.vue'
import CodeBlock from './CodeBlock.vue'
import ProbeSimulator from '../widgets/ProbeSimulator.vue'
import SkuMatrix from '../widgets/SkuMatrix.vue'
import OversellStage from '../widgets/OversellStage.vue'
import TxnStage from '../widgets/TxnStage.vue'
import StockFlow from '../widgets/StockFlow.vue'
import { md } from '../utils/md'

defineProps({
  blocks: { type: Array, required: true },
})

const widgetMap = {
  probe: ProbeSimulator,
  sku: SkuMatrix,
  oversell: OversellStage,
  txn: TxnStage,
  stock: StockFlow,
}
</script>

<template>
  <template v-for="(b, i) in blocks" :key="i">
    <h2 v-if="b.type === 'h2'" v-html="md(b.text)" />
    <h3 v-else-if="b.type === 'h3'" v-html="md(b.text)" />

    <p v-else-if="b.type === 'p'" v-html="md(b.text)" />

    <p v-else-if="b.type === 'lead'" class="lead" v-html="md(b.text)" />

    <div v-else-if="b.type === 'goal'" class="goal">
      <span class="goal-tag">目标</span>
      <span v-html="md(b.text)" />
    </div>

    <ul v-else-if="b.type === 'list'">
      <li v-for="(it, j) in b.items" :key="j" v-html="md(it)" />
    </ul>

    <ol v-else-if="b.type === 'olist'">
      <li v-for="(it, j) in b.items" :key="j" v-html="md(it)" />
    </ol>

    <Callout v-else-if="b.type === 'callout'" :type="b.kind || 'info'">
      <span v-html="md(b.text)" />
    </Callout>

    <CodeBlock
      v-else-if="b.type === 'code'"
      :code="b.code"
      :lang="b.lang || ''"
      :title="b.title || ''"
    />

    <div v-else-if="b.type === 'table'" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="(h, j) in b.head" :key="j" v-html="md(h)" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, j) in b.rows" :key="j">
            <td v-for="(cell, k) in row" :key="k" v-html="md(cell)" />
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="b.type === 'chain'" class="chain" :class="b.kind || ''">
      <template v-for="(it, j) in b.items" :key="j">
        <span v-if="j > 0" class="chain-arrow">→</span>
        <span class="chain-item" :class="{ mark: it.mark }" v-html="md(it.text || it)" />
      </template>
    </div>

    <div v-else-if="b.type === 'howto'" class="howto">
      <div v-for="(r, j) in b.rows" :key="j" class="howto-row">
        <span class="howto-key" v-html="md(r.k)" />
        <span class="howto-val" v-html="md(r.v)" />
      </div>
    </div>

    <div v-else-if="b.type === 'steps'" class="steps">
      <div v-for="(s, j) in b.items" :key="j" class="step">
        <h4 v-html="md(s.t)" />
        <p v-html="md(s.d)" />
      </div>
    </div>

    <template v-else-if="b.type === 'checklist'">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 40px">#</th>
              <th>你要确认的事</th>
              <th style="width: 180px">怎么确认</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, j) in b.items" :key="j">
              <td class="mono">{{ j + 1 }}</td>
              <td v-html="md(c.k)" />
              <td class="muted" v-html="md(c.v)" />
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <component v-else-if="b.type === 'widget'" :is="widgetMap[b.name]" />

    <p v-else-if="b.type === 'figure'" class="lesson-fig" v-html="md(b.text)" />

    <hr v-else-if="b.type === 'hr'" />
  </template>
</template>

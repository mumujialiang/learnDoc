<script setup>
defineProps({
  terms: { type: Array, required: true },
})
</script>

<template>
  <div class="term-card">
    <div class="tc-head">
      <span class="tc-dot" />
      这节会出现几个新词，先混个脸熟
    </div>
    <div class="tc-list">
      <div v-for="(t, i) in terms" :key="i" class="tc-item">
        <div class="tc-name">
          <code class="tc-en">{{ t.en }}</code>
          <span class="tc-zh">{{ t.zh }}</span>
        </div>
        <div class="tc-plain">{{ t.plain }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.term-card {
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 18px 20px;
  margin: 26px 0 32px;
  background: var(--surface-2);
}

.tc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-2);
  margin-bottom: 14px;
  letter-spacing: 0.2px;
}

.tc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  flex: none;
}

.tc-list {
  display: grid;
  gap: 12px;
}

.tc-item {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 14px;
  align-items: baseline;
}

.tc-name {
  display: flex;
  align-items: baseline;
  gap: 7px;
  flex-wrap: wrap;
}

.tc-en {
  font-size: 12px;
  background: var(--surface-3);
  border-color: var(--border);
  color: var(--text);
  padding: 2px 7px;
  white-space: nowrap;
}

.tc-zh {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}

.tc-plain {
  font-size: 13px;
  line-height: 1.75;
  color: var(--text-2);
}

@media (max-width: 640px) {
  .tc-item {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
</style>

<script setup>
defineProps({
  code: { type: String, required: true },
  lang: { type: String, default: '' },
  title: { type: String, default: '' },
  // 默认折叠。只有必须当场看见的东西（命令、报错原文）才设 open
  open: { type: Boolean, default: false },
})
</script>

<template>
  <details class="code-fold" :open="open">
    <summary>
      <span class="cf-mark" />
      <span class="cf-title">{{ title || '展开' }}</span>
      <span v-if="lang" class="cf-lang">{{ lang }}</span>
    </summary>
    <div class="code-block">
      <pre><code>{{ code.trim() }}</code></pre>
    </div>
  </details>
</template>

<style scoped>
.code-fold {
  margin: 0 0 18px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: transparent;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.code-fold:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
}

.code-fold summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-3);
  list-style: none;
  user-select: none;
  transition: color 0.15s ease;
}

.code-fold summary::-webkit-details-marker {
  display: none;
}

.code-fold summary::marker {
  content: '';
}

.code-fold summary:hover {
  color: var(--text-2);
}

/* 用 CSS 画三角，比字形更稳定 */
.cf-mark {
  width: 0;
  height: 0;
  border-left: 4px solid var(--primary);
  border-top: 3.5px solid transparent;
  border-bottom: 3.5px solid transparent;
  flex: none;
  opacity: 0.75;
  transition: transform 0.18s ease;
}

.code-fold[open] .cf-mark {
  transform: rotate(90deg);
}

.cf-title {
  flex: 1;
  min-width: 0;
}

.cf-lang {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
  flex: none;
}

.code-fold[open] summary {
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.code-fold .code-block {
  margin: 0;
}

.code-fold pre {
  border-radius: 0;
  box-shadow: none;
  border: none;
  margin: 0;
}
</style>

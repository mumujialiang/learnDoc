<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'info' },
})

const icon = computed(
  () =>
    ({
      info: '◆',
      warn: '▲',
      danger: '✕',
      success: '✓',
    })[props.type] || '◆'
)
</script>

<template>
  <div class="callout" :class="type">
    <span class="callout-icon">{{ icon }}</span>
    <div class="callout-body"><slot /></div>
  </div>
</template>

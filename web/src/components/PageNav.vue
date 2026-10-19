<script setup>
defineProps({
  prev: { type: Object, default: null },
  next: { type: Object, default: null },
})
</script>

<template>
  <nav class="page-nav">
    <router-link v-if="prev" :to="prev.path">
      <span class="dir">← 上一节</span>
      <span class="t">{{ prev.title }}</span>
    </router-link>
    <span v-else style="flex: 1" />
    <router-link v-if="next" :to="next.path" class="next">
      <span class="dir">下一节 →</span>
      <span class="t">{{ next.title }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
defineProps<{name?: string}>()
</script>

<template>
  <div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
    <strong>Hello from hello.vue!</strong>
    <span v-if="name"> - {{ name }}</span>
  </div>
</template>
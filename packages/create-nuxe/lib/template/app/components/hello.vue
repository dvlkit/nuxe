<template>
  <div>Hello, {{ name }}!</div>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>

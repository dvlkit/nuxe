<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <label>
    {{ label }}: <input type="text" >
  </label>
</template>
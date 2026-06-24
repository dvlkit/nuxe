<script setup lang="ts">
const now = useNow()
</script>

<template>
  <h1>Hello from pages/index.vue</h1>
  <p>Current time: {{ now.toLocaleString() }}</p>
  <Hello name="nuxe" />
  <FormsInput label="Test" />
</template>
<template>
  <div>
    <h1>Welcome to your vuxe app</h1>
    <p>Current time: {{ now.toLocaleString() }}</p>
    <Hello name="World" />
  </div>
</template>

<script setup lang="ts">
const now = useNow()
</script>

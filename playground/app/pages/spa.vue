<script setup>
definePage({
  routeRules: { ssr: false },
})

useHead({
  title: 'SPA Mode | nuxe',
})

const counter = ref(0)
</script>

<template>
  <div>
    <h1>SPA Mode</h1>
    <p>This page is rendered only on the client.</p>
    <p>Counter: {{ counter }}</p>
    <button type="button" @click="counter++">Increment</button>
  </div>
</template>

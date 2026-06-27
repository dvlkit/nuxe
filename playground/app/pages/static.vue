<script setup>
import { useHead } from '@dvlkit/nuxe'

definePage({
  routeRules: { prerender: true },
})

useHead({
  title: 'Static | nuxe',
})
</script>

<template>
  <div>
    <h1>Static Page</h1>
    <p>This page is prerendered at build time.</p>
  </div>
</template>

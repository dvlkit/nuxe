<script setup lang="ts">
import { definePage } from 'vue-router/experimental'

definePage({
  meta: {
    layout: 'admin'
  }
})
</script>

<template>
  <h1>Admin Page</h1>
  <p>This is rendered inside the Admin Layout</p>
</template>
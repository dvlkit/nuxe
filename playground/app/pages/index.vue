<script setup lang="ts">
const now = ref(new Date())
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
  setInterval(() => { now.value = new Date() }, 1000)
})
</script>

<template>
  <h1>Hello from pages/index.vue</h1>
  <p v-if="mounted">Current time: {{ now.toLocaleString() }}</p>
  <p v-else>Current time: --</p>
  <Hello name="nuxe" />
  <FormsInput label="Test" />
</template>
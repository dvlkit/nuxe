<script setup lang="ts">
import Hello from '../components/hello.vue'
import FormsInput from '../components/forms/input.vue'
import { onMounted, ref } from 'vue'

const now = ref(new Date())
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
  setInterval(() => { now.value = new Date() }, 1000)
})
</script>

<template>
  <h1>Hello from pages/index.vue</h1>
  <p>Current time: {{ now.toLocaleString() }}</p>
  <Hello name="nuxe" />
  <FormsInput label="Test" />
</template>
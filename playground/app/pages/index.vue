<script setup lang="ts">
import { useNow } from '../composables/use-now'
import Hello from '../components/hello.vue'
import FormsInput from '../components/forms/input.vue'

const now = useNow()
</script>

<template>
  <h1>Hello from pages/index.vue</h1>
  <p>Current time: {{ now.toLocaleString() }}</p>
  <Hello name="nuxe" />
  <FormsInput label="Test" />
</template>
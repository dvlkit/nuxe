<script setup lang="ts">
import { useAsyncData } from '@dvlkit/nuxe'

definePage({ meta: { layout: 'default' } })

const { data, pending, error, status } = useAsyncData('whoami', async () => {
  return await $fetch<{ session: string | null; hasCookie: boolean; ts: number }>('/api/whoami')
})
</script>

<template>
  <div>
    <h1>SSR Cookie Test</h1>
    <div data-testid="status"><strong>Status:</strong> {{ status }}</div>
    <div data-testid="data">
      <strong>Data:</strong>
      <template v-if="data && 'hasCookie' in data">
        <pre>{{ JSON.stringify(data) }}</pre>
      </template>
      <template v-else-if="error">
        <span class="err">{{ error.message }}</span>
      </template>
    </div>
  </div>
</template>

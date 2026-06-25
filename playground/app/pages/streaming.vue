<script setup lang="ts">
import { useHead, useAsyncData } from '@dvlkit/nuxe'

definePage({
  meta: {layout: 'default'},
})

useHead({
  title: 'Streaming Demo | nuxe',
  meta: [
    {name: 'description', content: 'Demonstrates HTML streaming with Vue + @unhead/vue + nuxe'},
  ],
})

const {data, pending, error, status, refresh} = useAsyncData('slow-data', () => new Promise<{
  message: string
}>((resolve) => {
  setTimeout(() => resolve({message: 'Loaded after 1s (async data fetch)'}), 10000)
}), {
  default: () => ({message: 'Loading...'}),
})
</script>

<template>
  <div>
    <h1>Streaming SSR Demo</h1>
    <p style="padding: 0.75rem; background: #fff3e0; border-radius: 4px;">
      <strong>Open DevTools → Network → Response</strong> on this page. You'll see chunks of HTML arriving
      progressively (not all at once). The shell (this text) reaches the browser first, then the async
      content streams in ~1s later.
    </p>

    <div style="margin-top: 1rem; padding: 1rem; border: 2px solid #4caf50; border-radius: 8px; background: #f1f8e9;">
      <h2>Status: {{ status }}</h2>
      <p v-if="error" style="color: #c62828;"><strong>Error:</strong> {{ error.message }}</p>
      <p v-else><strong>Message:</strong> {{ data?.message }}</p>
      <button
          type="button"
          :disabled="pending"
          @click="refresh()"
          style="margin-top: 0.5rem; padding: 0.5rem 1rem;"
      >
        {{ pending ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFetch, useHead } from '@dvlkit/nuxe'

definePage({
  meta: { layout: 'default' },
})

useHead({
  title: 'Fetch Demo | nuxe',
  meta: [
    { name: 'description', content: 'Demonstrates useFetch with $fetch (built on ofetch) for reactive data fetching' },
  ],
})

interface PingResponse {
  message: string
  timestamp: number
  query: string | null
}

const {
  data: basicData,
  status: basicStatus,
  statusCode: basicStatusCode,
  pending: basicPending,
  refresh: refreshBasic,
} = useFetch<PingResponse>('/api/ping')

const queryInput = ref('')
const {
  data: reactiveData,
  pending: reactivePending,
} = useFetch<PingResponse>('/api/ping', {
  key: 'fetch-demo-query',
  query: { q: queryInput },
  watch: [queryInput],
})

const {
  data: errorData,
  error: errorError,
  statusCode: errorStatusCode,
  pending: errorPending,
  refresh: refreshError,
} = useFetch<PingResponse>('/api/ping', {
  key: 'fetch-demo-error',
  query: { status: 500 },
})

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>

<template>
  <div>
    <h1>Fetch Demo</h1>
    <p style="padding: 0.75rem; background: #e3f2fd; border-radius: 4px;">
      Demonstrates <code>useFetch</code> + <code>$fetch</code> (built on
      <a href="https://github.com/unjs/ofetch" target="_blank" rel="noopener">ofetch</a>)
      for reactive data fetching with full SSR streaming support.
      Open DevTools → Network to see the requests and the streamed payload.
    </p>

    <section class="fetch-card" style="border-color: #4caf50;">
      <h2>1. Basic fetch with refresh</h2>
      <p>
        <strong>Status:</strong> {{ basicStatus }} |
        <strong>HTTP:</strong> {{ basicStatusCode }} |
        <strong>Pending:</strong> {{ basicPending }}
      </p>
      <p v-if="basicData"><strong>Message:</strong> <code>{{ basicData.message }}</code></p>
      <p v-if="basicData"><strong>Timestamp:</strong> {{ formatTime(basicData.timestamp) }}</p>
      <p v-if="basicData"><strong>Echoed query:</strong> {{ basicData.query ?? '(none)' }}</p>
      <button
        type="button"
        :disabled="basicPending"
        @click="refreshBasic()"
      >
        {{ basicPending ? 'Refreshing...' : 'Refresh' }}
      </button>
    </section>

    <section class="fetch-card" style="border-color: #2196f3;">
      <h2>2. Reactive query (watch option)</h2>
      <p>
        Type in the input — the fetch refetches automatically because
        <code>watch: [queryInput]</code> is passed to <code>useFetch</code>.
      </p>
      <input
        v-model="queryInput"
        type="text"
        placeholder="Type to refetch..."
        style="padding: 0.5rem; width: 300px; font-size: 1rem;"
      />
      <p><strong>Pending:</strong> {{ reactivePending }}</p>
      <p v-if="reactiveData"><strong>Echoed query:</strong> {{ reactiveData.query ?? '(empty)' }}</p>
      <p v-if="reactiveData"><strong>Timestamp:</strong> {{ formatTime(reactiveData.timestamp) }}</p>
    </section>

    <section class="fetch-card" style="border-color: #f44336;">
      <h2>3. Error handling</h2>
      <p>
        This call hits <code>/api/ping?status=500</code> to demo the error state.
        <code>useFetch</code> captures the status code in <code>statusCode</code>
        and surfaces the underlying <code>FetchError</code> in <code>error</code>.
      </p>
      <p>
        <strong>HTTP:</strong> {{ errorStatusCode }} |
        <strong>Pending:</strong> {{ errorPending }}
      </p>
      <p v-if="errorError" style="color: #c62828;">
        <strong>Error:</strong> {{ errorError.message }}
      </p>
      <p v-else-if="errorData"><strong>Message:</strong> <code>{{ errorData.message }}</code></p>
      <button
        type="button"
        :disabled="errorPending"
        @click="refreshError()"
      >
        {{ errorPending ? 'Retrying...' : 'Retry' }}
      </button>
    </section>
  </div>
</template>
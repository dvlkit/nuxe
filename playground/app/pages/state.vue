<script setup lang="ts">
import { onMounted, ref } from 'vue'

const counter = useState('counter', () => 1)
const session = useCookie('session')

const isClient = ref(false)
const userAgent = ref('unknown')

onMounted(() => {
  isClient.value = true
  userAgent.value = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
})

function increment() {
  counter.value++
}

function setSession() {
  session.value = `sess-${Math.random().toString(36).slice(2, 8)}`
}

function clearSession() {
  session.value = undefined
}
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold">State & Cookie Demo</h1>
    <p class="mt-4">Counter: {{ counter }}</p>
    <button
      class="mt-2 rounded-md bg-indigo-500 px-4 py-2 text-white"
      @click="increment"
    >
      Increment
    </button>

    <p class="mt-4">Session cookie: {{ session ?? 'not set' }}</p>
    <div class="mt-2 flex gap-2">
      <button
        class="rounded-md bg-emerald-500 px-4 py-2 text-white"
        @click="setSession"
      >
        Set session cookie
      </button>
      <button
        class="rounded-md bg-rose-500 px-4 py-2 text-white"
        @click="clearSession"
      >
        Clear session cookie
      </button>
    </div>

    <p v-if="isClient" class="mt-4">User-Agent: {{ userAgent }}</p>
  </div>
</template>

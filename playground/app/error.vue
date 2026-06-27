<script setup lang="ts">
import { useHead } from '@dvlkit/nuxe'
import type { NuxtError } from '@dvlkit/nuxe'

const props = defineProps<{
  error: NuxtError
}>()

useHead({
  title: `${props.error.statusCode} — ${props.error.statusMessage}`,
})
</script>

<template>
  <div class="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
    <h1 class="text-6xl font-bold text-slate-900 dark:text-slate-100">{{ error.statusCode }}</h1>
    <p class="mt-4 text-xl text-slate-600 dark:text-slate-300">{{ error.statusMessage }}</p>
    <RouterLink
      to="/"
      class="mt-8 rounded-md bg-indigo-500 px-6 py-2 text-white transition hover:bg-indigo-600"
    >
      Go home
    </RouterLink>
  </div>
</template>

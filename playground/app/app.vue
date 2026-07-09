<script setup lang="ts">
import { useHead } from '@dvlkit/nuxe'
import { NuxeLoadingIndicator } from '@dvlkit/nuxe'
import './assets/main.css'
import { NuxePage } from '@dvlkit/nuxe'

useHead({
  title: 'nuxe playground',
})

const links = [
  {to: '/', label: 'Home'},
  {to: '/about', label: 'About'},
  {to: '/admin', label: 'Admin'},
  {to: '/streaming', label: 'Streaming Demo'},
  {to: '/fetch-demo', label: 'Fetch Demo'},
  {to: '/state', label: 'State'},
]
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <NuxeLoadingIndicator/>
    <nav class="flex flex-wrap gap-2 bg-slate-100 p-4 dark:bg-slate-900">
      <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-500 hover:text-white dark:text-slate-200"
          active-class="bg-indigo-500 text-white"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
    <NuxeLayout>
      <NuxePage/>
    </NuxeLayout>
  </div>
</template>

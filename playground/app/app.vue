<script setup lang="ts">
import {NuxeLayout} from '@dvlkit/nuxe/components/nuxe-layout'
</script>

<template>
  <div>
    <nav style="background: #f5f5f5; padding: 1rem; display: flex; gap: 1rem;">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/admin">Admin</RouterLink>
      <RouterLink to="/streaming">Streaming Demo</RouterLink>
      <RouterLink to="/fetch-demo">Fetch Demo</RouterLink>
    </nav>
    <NuxeLayout>
      <RouterView/>
    </NuxeLayout>
  </div>
</template>

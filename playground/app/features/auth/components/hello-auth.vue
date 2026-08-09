<script setup lang="ts">
const {user, login, logout} = useAuth()
</script>

<template>
  <div class="rounded border p-4">
    <p v-if="user">Hola, {{ user.name }}</p>
    <p v-else>No hay sesión</p>
    <button
        v-if="!user"
        type="button"
        class="rounded bg-indigo-500 px-3 py-1 text-white"
        @click="login('invitado')"
    >
      Iniciar sesión
    </button>
    <button
        v-else
        type="button"
        class="rounded bg-rose-500 px-3 py-1 text-white"
        @click="logout"
    >
      Cerrar sesión
    </button>
  </div>
</template>
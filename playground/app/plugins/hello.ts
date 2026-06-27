export default defineNuxtPlugin((nuxtApp) => {
  console.log('[plugin:hello] app:created', nuxtApp.config.public.apiBase)

  nuxtApp.hook('app:mounted', () => {
    console.log('[plugin:hello] app:mounted')
  })
})

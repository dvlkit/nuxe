export default defineNuxePlugin((nuxeApp) => {
  console.log('[plugin:hello] app:created', nuxeApp.config.public.apiBase)

  nuxeApp.hook('app:mounted', () => {
    console.log('[plugin:hello] app:mounted')
  })
})

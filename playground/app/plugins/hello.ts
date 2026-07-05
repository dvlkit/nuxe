export default defineNuxePlugin((nuxeApp) => {
  console.log('[plugin:hello] app:created', nuxeApp.config.public.apiBase)

  nuxeApp.hook('app:mounted', () => {
    console.log('[plugin:hello] app:mounted')
  })

  nuxeApp.hook('page:loading:start', () => console.log('[plugin:hello] page:loading:start'))
  nuxeApp.hook('page:loading:end', () => console.log('[plugin:hello] page:loading:end'))
})

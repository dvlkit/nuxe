export default defineNuxeRouteMiddleware((to, from) => {
  console.log('[admin]', from.path, '->', to.path)
})
export default defineNuxeRouteMiddleware((to, from) => {
  console.log('[auth.global]', from.path, '->', to.path)
})
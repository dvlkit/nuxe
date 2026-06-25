export default defineNuxeRouteMiddleware((to, from) => {
  console.log('[auth.server.global]', from.path, '->', to.path)
})
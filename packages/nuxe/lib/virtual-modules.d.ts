declare module '#nuxe/layouts.mjs' {
  const layouts: Record<string, import('vue').Component>
  export default layouts
}

declare module 'virtual:nuxe/error' {
  import type { Component } from 'vue'
  export const ErrorComponent: Component
}
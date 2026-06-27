import { describe, expect, it } from 'vitest'
import { transformDefinePage } from '../../lib/pages/page-meta-plugin'

describe('transformDefinePage', () => {
  it('returns undefined for files without definePage', () => {
    const code = `<script setup>
const x = 1
</script>`
    expect(transformDefinePage(code, '/app/pages/index.vue')).toBeUndefined()
  })

  it('replaces definePage with a const declaration', () => {
    const code = `<script setup>
definePage({ meta: { layout: 'default' } })
</script>`
    const result = transformDefinePage(code, '/app/pages/index.vue')
    expect(result).toBeDefined()
    expect(result).toContain('const __nuxe_page_meta = { meta: { layout: \'default\' } }')
    expect(result).not.toContain('definePage(')
  })

  it('preserves surrounding code', () => {
    const code = `<script setup>
import { ref } from 'vue'
const count = ref(0)
definePage({ meta: { middleware: 'auth' } })
useHead({ title: 'Admin' })
</script>`
    const result = transformDefinePage(code, '/app/pages/admin.vue')
    expect(result).toBeDefined()
    expect(result).toContain('const count = ref(0)')
    expect(result).toContain('useHead({ title: \'Admin\' })')
  })
})

---
"@dvlkit/nuxe": patch
---

widen `RouteMiddleware` type to accept async functions, fixing TS2345 on async middlewares. The runtime already handles promises (via `await mw(to, from)`); the type signature is now aligned with the runtime behavior.

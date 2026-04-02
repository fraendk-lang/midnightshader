import { createApp } from './app.js'
import { env } from './services/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`midnightshader-server listening on http://localhost:${env.PORT}`)
})


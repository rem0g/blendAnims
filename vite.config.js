import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    watch: {
      // Ignore signs.json changes to prevent page reloads
      ignored: ['**/src/signs.json']
    }
  }
})

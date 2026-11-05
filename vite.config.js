import { defineConfig } from 'vite'

export default defineConfig({
  base: '/notifications/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        form: 'form.html',
      },
    },
  },
})

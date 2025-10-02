import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build mode - for consumption by other packages
    return {
      plugins: [
        vue(),
        dts({
          insertTypesEntry: true,
        })
      ],
      build: {
        outDir: 'dist',
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'AnalyzeChat',
          formats: ['es'],
          fileName: (format) => `index.${format}.js`
        },
        rollupOptions: {
          external: ['vue'],
          output: {
            globals: {
              vue: 'Vue'
            }
          }
        }
      }
    }
  }

  // Development mode - standalone app with hot reload
  return {
    plugins: [vue()],
    server: { 
      port: 5102,
      open: true 
    },
    root: '.',
    build: {
      rollupOptions: {
        input: './index.html'
      }
    }
  }
})

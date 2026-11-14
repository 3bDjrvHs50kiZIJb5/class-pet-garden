import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const apiHost = process.env.API_HOST || '127.0.0.1'
const apiPort = Number(process.env.API_PORT || 3002)
const apiTarget = `http://${apiHost}:${apiPort}`

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/pet-garden/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pet-garden/, ''),
      },
      // 兼容少数直接请求 /api 的场景（开发环境）
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
    // 静态资源缓存配置
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  // 构建配置 - 静态资源添加 hash
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    }
  }
})
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './fonts-critical.css'
import './style.css'

const app = createApp(App)
app.config.errorHandler = (err) => {
  console.error(err)
  const root = document.getElementById('app')
  if (root && root.childElementCount === 0) {
    const message = err instanceof Error ? err.message : String(err)
    root.textContent = `页面启动失败：${message}`
  }
}
app.use(createPinia())
app.use(router)
app.mount('#app')

function loadExtendedFonts() {
  void import('./fonts-extended.css')
}

if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => loadExtendedFonts(), { timeout: 3000 })
} else if (typeof window !== 'undefined') {
  setTimeout(loadExtendedFonts, 1)
}
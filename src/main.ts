import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './fonts-critical.css'
import './style.css'

const app = createApp(App)
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
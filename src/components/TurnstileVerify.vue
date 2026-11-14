<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  success: [turnstileToken: string]
  close: []
}>()

const siteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref('')
const widgetId = ref<string | null>(null)

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${TURNSTILE_SCRIPT.split('?')[0]}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('script error')), { once: true })
      if (window.turnstile) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('无法加载人机验证'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

function destroyWidget() {
  if (widgetId.value && window.turnstile) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch {
      /* ignore */
    }
  }
  widgetId.value = null
  if (containerRef.value) containerRef.value.innerHTML = ''
}

async function mountWidget() {
  error.value = ''
  loading.value = true
  destroyWidget()
  try {
    await loadTurnstileScript()
    await nextTick()
    if (!props.show || !containerRef.value || !window.turnstile) return
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey,
      action: 'register',
      theme: 'light',
      callback: (token: string) => {
        emit('success', token)
      },
      'expired-callback': () => {
        error.value = '验证已过期，请重试'
        if (widgetId.value && window.turnstile) {
          window.turnstile.reset(widgetId.value)
        }
      },
      'error-callback': () => {
        error.value = '验证加载失败，请关闭后重试'
      },
    })
  } catch {
    error.value = '人机验证加载失败'
  } finally {
    loading.value = false
  }
}

function refresh() {
  if (widgetId.value && window.turnstile) {
    error.value = ''
    window.turnstile.reset(widgetId.value)
    return
  }
  void mountWidget()
}

watch(
  () => props.show,
  (visible) => {
    if (visible) void mountWidget()
    else destroyWidget()
  },
)

onBeforeUnmount(() => {
  destroyWidget()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="turnstile-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-md rounded-3xl border border-[#f0e7dd] bg-white p-6 shadow-xl sm:p-7"
          role="dialog"
          aria-modal="true"
          aria-labelledby="turnstile-title"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 id="turnstile-title" class="font-serif text-xl font-bold text-[#1a1a1a]">
                安全验证
              </h3>
              <p class="mt-1 text-sm text-[#666]">完成下方验证后即可继续注册</p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-[#999] transition hover:bg-[#f5f5f5] hover:text-[#666]"
              aria-label="关闭"
              @click="emit('close')"
            >
              <span class="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>

          <div
            v-if="error"
            class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ error }}
          </div>

          <div class="relative mt-5 flex min-h-[72px] items-center justify-center rounded-2xl border border-[#edeff2] bg-[#faf9f7] px-4 py-5">
            <div ref="containerRef" class="flex justify-center" />
            <div
              v-if="loading"
              class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 text-sm text-[#666]"
            >
              加载中…
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between text-xs text-[#999]">
            <span>由 Cloudflare Turnstile 提供保护</span>
            <button
              type="button"
              class="font-semibold text-[#ff5c00] hover:underline"
              :disabled="loading"
              @click="refresh"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.turnstile-fade-enter-active,
.turnstile-fade-leave-active {
  transition: opacity 0.2s ease;
}
.turnstile-fade-enter-from,
.turnstile-fade-leave-to {
  opacity: 0;
}
</style>
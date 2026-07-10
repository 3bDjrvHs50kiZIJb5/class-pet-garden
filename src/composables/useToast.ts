import { h, render } from 'vue'
import Toast from '@/components/Toast.vue'

interface ToastOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export function useToast() {
  const show = (options: ToastOptions) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    
    const vnode = h(Toast, {
      message: options.message,
      type: options.type || 'info',
      duration: options.duration || 3000
    })
    
    render(vnode, container)
    
    // 动画结束后移除容器
    setTimeout(() => {
      render(null, container)
      document.body.removeChild(container)
    }, (options.duration || 3000) + 500)
  }
  
  return {
    success: (message: string, duration?: number) => show({ message, type: 'success', duration }),
    error: (message: string, duration?: number) => show({ message, type: 'error', duration }),
    warning: (message: string, duration?: number) => show({ message, type: 'warning', duration }),
    info: (message: string, duration?: number) => show({ message, type: 'info', duration }),
    show
  }
}

// 导出全局 toast 实例
export const toast = {
  success: (message: string, duration?: number) => {
    const { success } = useToast()
    success(message, duration)
  },
  error: (message: string, duration?: number) => {
    const { error } = useToast()
    error(message, duration)
  },
  warning: (message: string, duration?: number) => {
    const { warning } = useToast()
    warning(message, duration)
  },
  info: (message: string, duration?: number) => {
    const { info } = useToast()
    info(message, duration)
  }
}

import axios from 'axios'

const demoApi = axios.create({
  baseURL: '/pet-garden/api',
})

export interface DemoGardenClass {
  id: string
  name: string
  created_at: number
  updated_at?: number
}

export interface DemoGardenPayload {
  class: DemoGardenClass
  students: unknown[]
  records?: unknown[]
  total?: number
}

let demoGardenPrefetch: Promise<{ data: DemoGardenPayload }> | null = null

export function prefetchDemoGarden() {
  if (demoGardenPrefetch) return
  demoGardenPrefetch = demoApi.get<DemoGardenPayload>('/classes/demo', {
    headers: { Authorization: 'Bearer guest' },
  })
}

export function takeDemoGardenPrefetch() {
  const pending = demoGardenPrefetch
  demoGardenPrefetch = null
  return pending
}

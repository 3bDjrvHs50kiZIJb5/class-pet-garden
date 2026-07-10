<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { ClassVipItem, VipOverview, VipPlan } from '@/types'

const { api } = useAuth()
const toast = useToast()

const DEFAULT_VIP_PLAN_ID = 'semester'

const loading = ref(true)
const overview = ref<VipOverview | null>(null)
const selectedPlan = ref<string>(DEFAULT_VIP_PLAN_ID)
const selectedClassId = ref<string | null>(null)
const pendingClass = ref<ClassVipItem | null>(null)
const showSubscribeConfirm = ref(false)
const showPaymentModal = ref(false)

const ADMIN_WECHAT_PHONE = '13604023002'
const WECHAT_PAY_QR_URL = '/wechat-pay-qrcode.png'

const plans = computed(() => overview.value?.plans || [])
const benefits = computed(() => overview.value?.benefits || [])
const classes = computed(() => overview.value?.classes || [])
const selectedClass = computed(() => classes.value.find(item => item.id === selectedClassId.value) || null)
const selectedPlanInfo = computed(() => plans.value.find(item => item.id === selectedPlan.value) || null)
const summary = computed(() => overview.value?.summary || { totalClasses: 0, activeVipCount: 0, inactiveCount: 0 })

const subscribeActionLabel = computed(() => {
  if (!selectedClass.value) return '开通会员'
  return getActionLabel(selectedClass.value)
})

const canSubscribeSelectedClass = computed(() => !!selectedClass.value && !selectedClass.value.isDemo)

const optionSelectedClass = 'border-2 border-[#ea580c] bg-gradient-to-br from-[#fff8ef] via-[#fff4e6] to-[#ffedd5] shadow-[0_12px_32px_rgba(234,88,12,0.18)] ring-2 ring-[#fbbf24]/45'
const optionDefaultClass = 'border border-[#f0e5da] bg-[#fffdfb] hover:border-[#f5d7b8] hover:bg-[#fffaf5] hover:shadow-sm'
const subscribeBtnActiveClass = 'bg-gradient-to-r from-[#ea580c] to-[#f59e0b] text-white shadow-[0_10px_28px_rgba(234,88,12,0.32)] ring-2 ring-[#fbbf24]/40 hover:from-[#c2410c] hover:to-[#ea580c] hover:shadow-[0_12px_32px_rgba(234,88,12,0.4)] active:scale-[0.98]'
const subscribeBtnDisabledClass = 'cursor-not-allowed bg-[#f3f4f6] text-[#9ca3af] ring-0 shadow-none'

const subscribeConfirmMessage = computed(() => {
  if (!pendingClass.value) return ''
  const plan = plans.value.find(item => item.id === selectedPlan.value)
  const action = pendingClass.value.vip?.isActive ? '续费' : '开通'
  return `确认为「${pendingClass.value.name}」${action}「${plan?.label || ''}」？应付金额 ¥${plan?.price || 0}/${plan?.unit || ''}。确认后将展示微信收款码，请完成支付后联系管理员开通。`
})

const pendingOrder = computed(() => {
  if (!pendingClass.value) return null
  const plan = plans.value.find(item => item.id === selectedPlan.value)
  if (!plan) return null
  const action = pendingClass.value.vip?.isActive ? '续费' : '开通'
  return {
    className: pendingClass.value.name,
    planLabel: plan.label,
    price: plan.price,
    unit: plan.unit,
    action,
  }
})

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getStatusMeta(item: ClassVipItem) {
  if (item.isDemo) {
    return { label: '演示班级', className: 'bg-[#f3f4f6] text-[#6b7280]' }
  }
  if (item.vip?.isActive) {
    return { label: '会员生效中', className: 'bg-[#ecfdf5] text-[#059669]' }
  }
  if (item.vip?.status === 'expired') {
    return { label: '已过期', className: 'bg-[#fff1f2] text-[#e11d48]' }
  }
  return { label: '未开通', className: 'bg-[#fff7ed] text-[#c2410c]' }
}

function getActionLabel(item: ClassVipItem) {
  if (item.isDemo) return '不可开通'
  if (item.vip?.isActive) return '续费会员'
  if (item.vip?.status === 'expired') return '重新开通'
  return '开通会员'
}

async function loadOverview() {
  loading.value = true
  try {
    const res = await api.get('/vip')
    overview.value = res.data
    const availablePlans: VipPlan[] = res.data.plans || []
    if (availablePlans.some(plan => plan.id === DEFAULT_VIP_PLAN_ID)) {
      selectedPlan.value = DEFAULT_VIP_PLAN_ID
    } else if (availablePlans.length) {
      selectedPlan.value = availablePlans[0].id
    }
    const list: ClassVipItem[] = res.data.classes || []
    const currentStillExists = list.some(item => item.id === selectedClassId.value)
    if (!currentStillExists) {
      const firstSelectable = list.find(item => !item.isDemo) || list[0] || null
      selectedClassId.value = firstSelectable?.id || null
    }
  } catch (error) {
    console.error('加载会员信息失败:', error)
    toast.error('加载会员信息失败')
  } finally {
    loading.value = false
  }
}

function selectClass(item: ClassVipItem) {
  selectedClassId.value = item.id
}

function openSubscribe() {
  if (!selectedClass.value) {
    toast.info('请先选择一个班级')
    return
  }
  if (selectedClass.value.isDemo) {
    toast.info('演示班级仅供体验，请在工作台创建自己的班级后开通')
    return
  }
  pendingClass.value = selectedClass.value
  showSubscribeConfirm.value = true
}

function cancelSubscribe() {
  showSubscribeConfirm.value = false
  pendingClass.value = null
}

function confirmSubscribe() {
  if (!pendingClass.value) return
  showSubscribeConfirm.value = false
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  pendingClass.value = null
}

async function copyAdminWechat() {
  try {
    await navigator.clipboard.writeText(ADMIN_WECHAT_PHONE)
    toast.success('微信号已复制')
  } catch {
    toast.info(`请手动添加微信：${ADMIN_WECHAT_PHONE}`)
  }
}

onMounted(loadOverview)
</script>

<template>
  <AppShell active-page="vip" title="灵犀计划" eyebrow="LINGXI PLAN">
    <div class="w-full">
      <section class="grid overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)] lg:grid-cols-[1.2fr_0.8fr]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">LINGXI PLAN</p>
          <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">灵犀计划</h1>
          <p class="mt-4 max-w-xl text-sm leading-7 text-[#806b5b] sm:text-base">
            灵犀计划按班级独立开通。若您管理多个班级，可为每个班级分别订阅，互不影响。开通后该班级即可使用全部高级功能。
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
              <p class="text-xl font-bold text-[#b76129]">{{ summary.totalClasses }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#9e704f]">我的班级</p>
            </div>
            <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
              <p class="text-xl font-bold text-[#059669]">{{ summary.activeVipCount }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">已开通</p>
            </div>
            <div class="rounded-2xl bg-[#fff7ed] px-4 py-3">
              <p class="text-xl font-bold text-[#ea580c]">{{ summary.inactiveCount }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#b07a4f]">待开通</p>
            </div>
          </div>
        </div>
        <div class="relative hidden min-h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-[#fff8ef] via-[#fff3e3] to-[#ffe8cc] px-8 py-10 lg:flex">
          <div class="absolute right-8 top-7 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ae6a3e]">按班订阅</div>
          <div class="absolute bottom-0 h-20 w-[120%] rounded-t-[100%] bg-[#f8e6d4]/80"></div>
          <div class="relative z-10 flex flex-col items-center text-center">
            <span class="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-[0_12px_30px_rgba(180,110,50,0.15)]">
              <span class="material-symbols-rounded text-[42px] text-[#f59e0b]">workspace_premium</span>
            </span>
            <p class="mt-4 font-serif text-2xl font-bold text-[#422d20]">一班一计划</p>
            <p class="mt-2 max-w-xs text-sm leading-6 text-[#8b6d57]">按班级独立开通灵犀计划，多班并行，互不影响</p>
          </div>
        </div>
      </section>

      <main class="mt-6 space-y-6">
        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <div>
            <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">SUBSCRIBE</p>
            <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">开通灵犀计划</h2>
            <p class="mt-1 text-sm text-[#9a735d]">选择方案与班级，确认后即可扫码支付</p>
          </div>

          <div class="mt-6">
            <h3 class="text-sm font-bold text-[#b85e25]">1. 选择方案</h3>
            <div class="mt-3 grid gap-3 md:grid-cols-3">
              <button
                v-for="plan in plans"
                :key="plan.id"
                type="button"
                class="relative rounded-2xl p-5 text-left transition-all duration-200"
                :class="selectedPlan === plan.id ? optionSelectedClass : optionDefaultClass"
                @click="selectedPlan = plan.id"
              >
                <span
                  v-if="selectedPlan === plan.id"
                  class="absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#ea580c] text-white shadow-[0_4px_12px_rgba(234,88,12,0.35)]"
                >
                  <span class="material-symbols-rounded text-[16px] leading-none">check</span>
                </span>
                <span
                  v-if="plan.recommended"
                  class="absolute right-4 top-4 rounded-full bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-white shadow-sm"
                >
                  推荐
                </span>
                <p class="text-sm font-bold text-[#b85e25]" :class="selectedPlan === plan.id ? 'pl-8' : ''">{{ plan.label }}</p>
                <p class="mt-2 flex items-end gap-1">
                  <span class="font-serif text-3xl font-bold text-[#422d20]">¥{{ plan.price }}</span>
                  <span class="pb-1 text-sm text-[#9a735d]">/ {{ plan.unit }}</span>
                </p>
                <p class="mt-2 text-sm leading-6 text-[#8b6d57]">{{ plan.description }}</p>
              </button>
            </div>
          </div>

          <div class="mt-6 border-t border-[#f3ece4] pt-6">
            <h3 class="text-sm font-bold text-[#b85e25]">2. 选择班级</h3>
            <p class="mt-1 text-sm text-[#9a735d]">灵犀计划按班级独立开通，请选中要订阅的班级</p>

            <div v-if="loading" class="mt-4 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

            <div v-else-if="!classes.length" class="mt-4 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
              <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">school</span>
              <p class="mt-3 text-sm font-medium text-[#75533d]">还没有班级，无法开通会员</p>
              <router-link to="/" class="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">前往工作台创建班级</router-link>
            </div>

            <div v-else class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                v-for="item in classes"
                :key="item.id"
                type="button"
                class="relative flex flex-col rounded-2xl p-4 text-left transition-all duration-200"
                :class="selectedClassId === item.id ? optionSelectedClass : optionDefaultClass"
                @click="selectClass(item)"
              >
                <span
                  v-if="selectedClassId === item.id"
                  class="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#ea580c] text-white shadow-[0_4px_12px_rgba(234,88,12,0.35)]"
                >
                  <span class="material-symbols-rounded text-[16px] leading-none">check</span>
                </span>
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0" :class="selectedClassId === item.id ? 'pl-7' : ''">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <h3 class="truncate font-serif text-lg font-bold text-[#422d20]">{{ item.name }}</h3>
                      <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="getStatusMeta(item).className">
                        {{ getStatusMeta(item).label }}
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-[#9a735d]">{{ item.studentCount }} 名学生</p>
                  </div>
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
                    :class="selectedClassId === item.id
                      ? 'bg-[#ea580c] text-white shadow-[0_4px_12px_rgba(234,88,12,0.28)]'
                      : 'bg-[#fff8f2] text-[#c4a484]'"
                  >
                    <span class="material-symbols-rounded text-[20px]">school</span>
                  </span>
                </div>

                <div v-if="item.vip" class="mt-3 rounded-xl bg-[#fff8f2] px-3 py-2 text-sm text-[#8b6d57]">
                  <p v-if="item.vip.isActive">
                    当前方案：<span class="font-semibold text-[#422d20]">{{ item.vip.planLabel }}</span>
                  </p>
                  <p class="mt-0.5">
                    <template v-if="item.vip.neverExpires">有效期：<span class="font-semibold text-[#422d20]">永久有效</span></template>
                    <template v-else>有效期至：<span class="font-semibold text-[#422d20]">{{ formatDate(item.vip.expiresAt) }}</span></template>
                  </p>
                </div>
                <p v-else-if="!item.isDemo" class="mt-3 rounded-xl bg-[#fff8f2] px-3 py-2 text-sm leading-6 text-[#9a735d]">
                  开通后可解锁专属皮肤、高级排行榜与数据导出
                </p>
                <p v-else class="mt-3 rounded-xl bg-[#f9fafb] px-3 py-2 text-sm text-[#6b7280]">
                  演示班级，不支持开通
                </p>
              </button>
            </div>

            <div
              v-if="!loading && classes.length"
              class="mt-4 flex flex-col gap-3 rounded-2xl border border-[#f0e5da] bg-gradient-to-r from-[#fffaf5] to-[#fff8ef] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0 space-y-1 text-sm text-[#806b5b]">
                <p v-if="selectedPlanInfo">
                  已选方案：<span class="font-semibold text-[#422d20]">{{ selectedPlanInfo.label }}</span>
                  <span class="text-[#9a735d]">（¥{{ selectedPlanInfo.price }}/{{ selectedPlanInfo.unit }}）</span>
                </p>
                <p v-if="selectedClass">
                  已选班级：<span class="font-semibold text-[#422d20]">{{ selectedClass.name }}</span>
                  <span v-if="selectedClass.isDemo" class="text-[#9ca3af]">（不可开通）</span>
                </p>
                <p v-else>请先从上方选择一个班级</p>
              </div>
              <button
                type="button"
                class="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-6 text-sm font-bold transition-all duration-200"
                :class="canSubscribeSelectedClass ? subscribeBtnActiveClass : subscribeBtnDisabledClass"
                :disabled="!canSubscribeSelectedClass"
                @click="openSubscribe"
              >
                <span class="material-symbols-rounded text-[20px] leading-none">workspace_premium</span>
                {{ subscribeActionLabel }}
              </button>
            </div>
          </div>
        </section>

        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">VIP BENEFITS</p>
          <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">会员权益</h2>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div
              v-for="benefit in benefits"
              :key="benefit.title"
              class="flex gap-3 rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3e7] text-[#ea580c]">
                <span class="material-symbols-rounded text-[20px]">{{ benefit.icon }}</span>
              </span>
              <div class="min-w-0">
                <p class="text-sm font-bold text-[#4d3527]">{{ benefit.title }}</p>
                <p class="mt-1 text-sm leading-6 text-[#9a735d]">{{ benefit.desc }}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <ConfirmDialog
      :show="showSubscribeConfirm"
      title="确认订单"
      :message="subscribeConfirmMessage"
      confirm-text="去支付"
      cancel-text="再想想"
      type="info"
      @confirm="confirmSubscribe"
      @cancel="cancelSubscribe"
    />

    <Transition>
      <div
        v-if="showPaymentModal && pendingOrder"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
        @click.self="closePaymentModal"
      >
        <div class="max-h-[92vh] w-full max-w-lg overflow-auto rounded-3xl bg-white shadow-2xl">
          <div class="border-b border-[#f0e5da] px-6 pb-5 pt-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold tracking-[0.16em] text-[#16a34a]">WECHAT PAY</p>
                <h3 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">微信扫码支付</h3>
                <p class="mt-2 text-sm leading-6 text-[#806b5b]">请使用微信扫描下方收款码，完成对应方案的费用支付。</p>
              </div>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#9a735d] transition hover:bg-[#fff7f1]"
                aria-label="关闭"
                @click="closePaymentModal"
              >
                <span class="material-symbols-rounded text-[22px]">close</span>
              </button>
            </div>
          </div>

          <div class="px-6 py-5">
            <div class="rounded-2xl border border-[#f0e5da] bg-[#fffaf5] p-4">
              <p class="text-sm font-semibold text-[#9a735d]">订单信息</p>
              <div class="mt-3 space-y-2 text-sm text-[#5c463a]">
                <div class="flex items-center justify-between gap-3">
                  <span>班级</span>
                  <span class="font-semibold text-[#422d20]">{{ pendingOrder.className }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span>{{ pendingOrder.action }}方案</span>
                  <span class="font-semibold text-[#422d20]">{{ pendingOrder.planLabel }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 border-t border-[#f0e5da] pt-2">
                  <span>应付金额</span>
                  <span class="font-serif text-xl font-bold text-[#ea580c]">¥{{ pendingOrder.price }} / {{ pendingOrder.unit }}</span>
                </div>
              </div>
            </div>

            <div class="mt-5 overflow-hidden rounded-2xl border border-[#e8f5e9] bg-[#f6fff8] p-4">
              <p class="text-center text-sm font-semibold text-[#166534]">微信收款码</p>
              <img
                :src="WECHAT_PAY_QR_URL"
                alt="微信收款码"
                class="mx-auto mt-3 w-full max-w-[280px] rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(22,101,52,0.08)]"
              />
              <p class="mt-3 text-center text-xs leading-5 text-[#6b8f7d]">推荐使用微信扫一扫完成支付</p>
            </div>

            <div class="mt-5 space-y-3 text-sm leading-7 text-[#806b5b]">
              <div class="rounded-2xl border border-[#ffedd5] bg-[#fff7ed] px-4 py-3 text-[#9a5a2b]">
                <p class="font-semibold text-[#c2410c]">支付完成后，请联系管理员开通</p>
                <p class="mt-1">
                  请添加微信
                  <button
                    type="button"
                    class="mx-1 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 font-mono font-bold text-[#ea580c] transition hover:bg-[#fff1e6]"
                    @click="copyAdminWechat"
                  >
                    {{ ADMIN_WECHAT_PHONE }}
                    <span class="material-symbols-rounded text-[16px]">content_copy</span>
                  </button>
                  ，并注明<strong class="font-semibold text-[#422d20]">班级名称</strong>与<strong class="font-semibold text-[#422d20]">所选方案</strong>。我们将在核实到账后，为您手动开通灵犀计划。
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-[#f0e5da] px-6 py-4">
            <button
              type="button"
              class="rounded-xl px-4 py-2.5 text-sm font-medium text-[#9a735d] transition hover:bg-[#fff7f1]"
              @click="closePaymentModal"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </AppShell>
</template>

import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
const DEMO_CLASS_ID = 'demo-class-2026'

export const VIP_PLANS = {
  month: {
    id: 'month',
    label: '月度会员',
    price: 18,
    unit: '月',
    days: 30,
    description: '按月灵活订阅，适合短期试用或先体验再续费',
  },
  semester: {
    id: 'semester',
    label: '学期会员',
    price: 68,
    unit: '学期',
    days: 180,
    description: '适合单个学期使用，覆盖一学年上下学期',
  },
  year: {
    id: 'year',
    label: '年度会员',
    price: 128,
    unit: '年',
    days: 365,
    description: '全年无忧，性价比更高',
    recommended: true,
  },
  manual: {
    id: 'manual',
    label: '手动授权',
    price: 0,
    unit: '次',
    days: 0,
    description: '管理员手动授权',
  },
  demo: {
    id: 'demo',
    label: '演示永久会员',
    price: 0,
    unit: '永久',
    days: 0,
    description: '演示班级专属，永不过期',
  },
  welcome: {
    id: 'welcome',
    label: '新用户礼遇',
    price: 0,
    unit: '月',
    days: 30,
    description: '注册赠送 1 个月会员',
  },
}

export const PUBLIC_VIP_PLAN_IDS = ['month', 'semester', 'year']

const VIP_BENEFITS = [
  { icon: 'palette', title: '专属宠物皮肤', desc: '解锁班级限定宠物外观与成长特效' },
  { icon: 'leaderboard', title: '高级排行榜', desc: '多维度榜单与学期成长报告' },
  { icon: 'assignment_turned_in', title: '班级任务增强', desc: '任务模板库与批量完成统计' },
  { icon: 'download', title: '数据导出', desc: '评价记录、积分报表一键导出' },
  { icon: 'support_agent', title: '优先支持', desc: '会员专属客服通道，问题优先响应' },
]

export function normalizeVipRow(row) {
  if (!row) return null
  const now = Date.now()
  const isDemoVip = row.class_id === DEMO_CLASS_ID && row.plan === 'demo'
  const isExpired = isDemoVip ? false : row.expires_at <= now
  return {
    plan: row.plan,
    planLabel: VIP_PLANS[row.plan]?.label || row.plan,
    status: isExpired ? 'expired' : row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    isActive: isDemoVip || (!isExpired && row.status === 'active'),
    neverExpires: isDemoVip,
  }
}

// 获取当前老师所有班级的会员状态
router.get('/', authMiddleware, async (req, res) => {
  const classes = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
    FROM classes c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.userId)

  const vipRows = await db.prepare(`
    SELECT v.*
    FROM class_vip_subscriptions v
    JOIN classes c ON c.id = v.class_id
    WHERE c.user_id = ?
  `).all(req.userId)

  const vipMap = Object.fromEntries(vipRows.map(row => [row.class_id, normalizeVipRow(row)]))

  const enrichedClasses = classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    studentCount: cls.student_count || 0,
    createdAt: cls.created_at,
    isDemo: cls.id === DEMO_CLASS_ID,
    vip: vipMap[cls.id] || null,
  }))

  const activeCount = enrichedClasses.filter(cls => cls.vip?.isActive).length

  res.json({
    classes: enrichedClasses,
    plans: PUBLIC_VIP_PLAN_IDS.map(id => VIP_PLANS[id]),
    benefits: VIP_BENEFITS,
    summary: {
      totalClasses: enrichedClasses.length,
      activeVipCount: activeCount,
      inactiveCount: enrichedClasses.length - activeCount,
    },
  })
})

export default router

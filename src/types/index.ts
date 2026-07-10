// 班级
export interface Class {
  id: string
  name: string
  created_at: number
  updated_at?: number
  user_id?: string
}

// 学生
export interface Student {
  id: string
  class_id: string
  name: string
  student_no: string | null
  total_points: number
  pet_type: string | null
  pet_level: number
  pet_exp: number
  created_at?: number
}

// 评价规则
export interface Rule {
  id: string
  name: string
  points: number
  category: string
  is_custom?: boolean
  user_id?: string | null
  created_at?: number
}

// 评价记录
export interface EvaluationRecord {
  id: string
  class_id: string
  student_id: string
  points: number
  reason: string
  category: string
  timestamp: number
  student_name?: string
  task_id?: string | null
  task_title?: string | null
}

// 徽章
export interface Badge {
  id: string
  student_id: string
  pet_type: string
  earned_at: number
}

// 用户
export interface User {
  id: string
  username: string
  isGuest: boolean
  createdAt?: number
  accountType?: string
}

export interface TeacherClassSummary {
  id: string
  name: string
  studentCount: number
  createdAt: number
  updatedAt: number
}

export interface TeacherProfile {
  user: User
  stats: {
    classCount: number
    studentCount: number
    evaluationCount: number
    taskCount: number
    badgeCount: number
  }
  classes: TeacherClassSummary[]
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success?: boolean
  error?: string
  data?: T
}

// 分页响应
export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 班级任务
export interface ClassTask {
  id: string
  class_id: string
  title: string
  description: string | null
  rule_id: string
  deadline: number | null
  target_type: 'all' | 'selected'
  target_student_ids: string[] | null
  status: 'active' | 'closed' | 'archived'
  created_at: number
  updated_at: number
  rule?: Pick<Rule, 'id' | 'name' | 'points' | 'category'> | null
  completedCount?: number
  totalCount?: number
}

export interface TaskStudentItem extends Pick<Student, 'id' | 'name' | 'student_no' | 'total_points' | 'pet_type' | 'pet_level'> {
  completed: boolean
  completedAt: number | null
  completionId: string | null
}

export interface ClassTaskDetail extends ClassTask {
  students: TaskStudentItem[]
}

export interface TaskCompleteResult {
  studentId: string
  skipped: boolean
  reason?: string
  completionId?: string
  evaluation?: {
    id: string
    petLevel?: number
    petExp?: number
    levelUp?: boolean
    graduated?: boolean
  }
}

// 班级会员
export interface VipPlan {
  id: string
  label: string
  price: number
  unit: string
  days: number
  description: string
  recommended?: boolean
}

export interface VipBenefit {
  icon: string
  title: string
  desc: string
}

export interface ClassVipStatus {
  plan: string
  planLabel: string
  status: 'active' | 'expired' | 'cancelled'
  startedAt: number
  expiresAt: number
  isActive: boolean
  neverExpires?: boolean
}

export interface ClassVipItem {
  id: string
  name: string
  studentCount: number
  createdAt: number
  isDemo: boolean
  ownerUsername?: string
  ownerIsGuest?: boolean
  vip: ClassVipStatus | null
}

export interface AdminClassOverview {
  classes: ClassVipItem[]
  summary: {
    totalClasses: number
    activeVipCount: number
    inactiveCount: number
  }
}

export interface AdminMemberItem {
  id: string
  username: string
  createdAt: number
  classCount: number
  studentCount: number
}

export interface AdminMemberOverview {
  members: AdminMemberItem[]
  summary: {
    totalMembers: number
    totalClasses: number
    totalStudents: number
  }
}

export interface VipOverview {
  classes: ClassVipItem[]
  plans: VipPlan[]
  benefits: VipBenefit[]
  summary: {
    totalClasses: number
    activeVipCount: number
    inactiveCount: number
  }
}
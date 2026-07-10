import { createRouter, createWebHistory } from 'vue-router'
import { ADMIN_USERNAME } from '@/composables/useAuth'
import Home from '@/pages/Home.vue'
import PetPreview from '@/pages/PetPreview.vue'
import EvaluationRules from '@/pages/EvaluationRules.vue'
import FeedingRecords from '@/pages/FeedingRecords.vue'
import ClassRanking from '@/pages/ClassRanking.vue'
import ClassVip from '@/pages/ClassVip.vue'
import ClassManage from '@/pages/ClassManage.vue'
import ClassTasks from '@/pages/ClassTasks.vue'
import Login from '@/pages/Login.vue'
import Register from '@/pages/Register.vue'
import StudentShare from '@/pages/StudentShare.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', alias: '/pet-garden/', name: 'home', component: Home },
    { path: '/preview', alias: '/pet-garden/preview', name: 'preview', component: PetPreview },
    { path: '/rules', alias: '/pet-garden/rules', name: 'rules', component: EvaluationRules },
    { path: '/records', alias: '/pet-garden/records', name: 'records', component: FeedingRecords },
    { path: '/tasks', alias: '/pet-garden/tasks', name: 'tasks', component: ClassTasks },
    { path: '/ranking', alias: '/pet-garden/ranking', name: 'ranking', component: ClassRanking },
    { path: '/manage', alias: '/pet-garden/manage', name: 'manage', component: ClassManage },
    { path: '/vip', alias: '/pet-garden/vip', name: 'vip', component: ClassVip },
    { path: '/login', alias: '/pet-garden/login', name: 'login', component: Login },
    { path: '/register', alias: '/pet-garden/register', name: 'register', component: Register },
    { path: '/share/:studentId', alias: '/pet-garden/share/:studentId', name: 'student-share', component: StudentShare }
  ]
})

function isAdminUser() {
  const savedUser = localStorage.getItem('user')
  if (!savedUser) return false
  try {
    const user = JSON.parse(savedUser) as { username?: string; isGuest?: boolean }
    return user.username === ADMIN_USERNAME && !user.isGuest
  } catch {
    return false
  }
}

router.beforeEach((to) => {
  if (to.name === 'home' && typeof to.query.studentId === 'string' && to.query.studentId) {
    return { name: 'student-share', params: { studentId: to.query.studentId } }
  }
  if (to.name === 'manage' && !isAdminUser()) {
    return { name: 'home' }
  }
})

export default router
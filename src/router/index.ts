import { createRouter, createWebHistory } from 'vue-router'
import { isAdminSessionActive } from '@/composables/useAdminSession'
import { prefetchDemoGarden } from '@/utils/demoPrefetch'
import PetPreview from '@/pages/PetPreview.vue'
import EvaluationRules from '@/pages/EvaluationRules.vue'
import FeedingRecords from '@/pages/FeedingRecords.vue'
import ClassRanking from '@/pages/ClassRanking.vue'
import ClassVip from '@/pages/ClassVip.vue'
import ClassManage from '@/pages/ClassManage.vue'
import ManageUnlock from '@/pages/ManageUnlock.vue'
import ClassTasks from '@/pages/ClassTasks.vue'
import Login from '@/pages/Login.vue'
import Register from '@/pages/Register.vue'
import StudentShare from '@/pages/StudentShare.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', alias: '/pet-garden/', name: 'home', component: () => import('@/pages/LandingPage.vue') },
    { path: '/dashboard', alias: '/pet-garden/dashboard', name: 'dashboard', component: () => import('@/pages/Home.vue') },
    { path: '/preview', alias: '/pet-garden/preview', name: 'preview', component: PetPreview },
    { path: '/rules', alias: '/pet-garden/rules', name: 'rules', component: EvaluationRules },
    { path: '/records', alias: '/pet-garden/records', name: 'records', component: FeedingRecords },
    { path: '/tasks', alias: '/pet-garden/tasks', name: 'tasks', component: ClassTasks },
    { path: '/ranking', alias: '/pet-garden/ranking', name: 'ranking', component: ClassRanking },
    { path: '/manage/unlock', alias: '/pet-garden/manage/unlock', name: 'manage-unlock', component: ManageUnlock },
    { path: '/manage', alias: '/pet-garden/manage', name: 'manage', component: ClassManage },
    { path: '/vip', alias: '/pet-garden/vip', name: 'vip', component: ClassVip },
    { path: '/login', alias: '/pet-garden/login', name: 'login', component: Login },
    { path: '/register', alias: '/pet-garden/register', name: 'register', component: Register },
    { path: '/share/:studentId', alias: '/pet-garden/share/:studentId', name: 'student-share', component: StudentShare }
  ]
})

router.beforeEach((to) => {
  if (to.name === 'dashboard') {
    prefetchDemoGarden()
  }
  if ((to.name === 'home' || to.name === 'dashboard') && typeof to.query.studentId === 'string' && to.query.studentId) {
    return { name: 'student-share', params: { studentId: to.query.studentId } }
  }
  if (to.name === 'manage' && !isAdminSessionActive()) {
    return { name: 'manage-unlock', query: { redirect: to.fullPath } }
  }
})

export default router
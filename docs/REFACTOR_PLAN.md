# 宠物乐园 - 重构计划

## 当前状态

### 代码规模
| 文件 | 行数 | 问题 |
|------|------|------|
| `src/pages/Home.vue` | 2070 | 职责过多，难以维护 |
| `server/index.js` | 900+ | 所有 API 混在一起 |
| `src/composables/useAuth.ts` | 95 | OK |
| `src/data/pets.ts` | 120 | OK |

### 测试覆盖
- ✅ 前端 `pets.ts` - 22 个测试
- ✅ 后端等级计算 - 5 个测试
- ❌ API 端点 - 未覆盖
- ❌ Vue 组件 - 未覆盖

---

## 重构阶段

### 阶段 1: 类型统一和工具函数提取 ✅
**目标**: 建立共享类型和可测试的核心逻辑

**已完成**:
- [x] 创建 `src/types/index.ts` 集中定义类型
- [x] 添加 `vitest` 测试框架
- [x] 为 `pets.ts` 添加单元测试
- [x] 为后端等级计算添加测试

**下一步**:
- [ ] 将后端等级计算逻辑提取到 `server/utils/level.js`
- [ ] 前后端共享等级配置（通过 API 或配置文件）

---

### 阶段 2: Home.vue 拆分
**目标**: 将 2070 行拆分为多个可维护的组件

#### 2.1 抽取 composables（状态逻辑）
```
src/composables/
├── useClassManagement.ts    # 班级 CRUD
├── useStudentManagement.ts  # 学生 CRUD  
├── useEvaluation.ts         # 评价逻辑
├── useAnimation.ts          # 动画状态（升级、评分动效）
└── useModal.ts              # 模态框状态管理
```

#### 2.2 抽取组件
```
src/components/
├── StudentCard.vue          # 学生卡片
├── BatchActionBar.vue       # 批量操作栏
├── modals/
│   ├── ClassModal.vue       # 班级创建/编辑
│   ├── StudentModal.vue     # 添加学生
│   ├── ImportModal.vue      # 批量导入
│   ├── EvalModal.vue        # 评价面板
│   ├── PetSelectModal.vue   # 宠物选择
│   ├── DetailPanel.vue      # 学生详情面板
│   ├── RecordsModal.vue     # 评价记录
│   ├── RulesModal.vue       # 规则管理
│   ├── RankModal.vue        # 排行榜
│   └── ConfirmDialog.vue    # 确认对话框（已存在）
└── layout/
    └── Header.vue           # 顶部导航
```

#### 2.3 Home.vue 重构后
```vue
<script setup>
// 只保留协调逻辑
import { useClassManagement } from '@/composables/useClassManagement'
import { useStudentManagement } from '@/composables/useStudentManagement'
// ...
</script>

<template>
  <Header />
  <main>
    <StudentGrid :students="filteredStudents" />
  </main>
  <BatchActionBar v-if="batchMode" />
  <!-- 模态框 -->
  <ClassModal v-model="showClassModal" />
  <!-- ... -->
</template>
```

**预计行数**: ~300 行

---

### 阶段 3: 后端拆分
**目标**: 将 900+ 行的 `index.js` 拆分为模块化结构

```
server/
├── index.js              # 入口，只负责启动服务器
├── db.js                 # 数据库连接和初始化
├── routes/
│   ├── auth.js           # 认证相关 API
│   ├── classes.js        # 班级 API
│   ├── students.js       # 学生 API
│   ├── evaluations.js    # 评价 API
│   ├── backup.js         # 备份/恢复
│   └── rules.js          # 规则 API
├── middleware/
│   └── auth.js           # 认证中间件
└── utils/
    ├── level.js          # 等级计算
    ├── password.js       # 密码哈希
    └── token.js          # Token 生成/验证
```

#### 示例: routes/students.js
```javascript
import { Router } from 'express'
import { authMiddleware, verifyClassOwnership } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()

router.get('/classes/:classId/students', authMiddleware, verifyClassOwnership, (req, res) => {
  // ...
})

export default router
```

#### index.js 重构后
```javascript
import express from 'express'
import { initDb } from './db.js'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
// ...

const app = express()
app.use('/api/auth', authRoutes)
app.use('/api', studentRoutes)
// ...
```

---

### 阶段 4: 测试完善
**目标**: 核心业务逻辑测试覆盖率 > 80%

#### 4.1 前端组件测试
```
src/components/__tests__/
├── StudentCard.test.ts
├── ConfirmDialog.test.ts
└── modals/
    └── ClassModal.test.ts
```

#### 4.2 后端 API 测试
```
server/__tests__/
├── auth.test.js      # 登录/注册/游客模式
├── classes.test.js   # 班级 CRUD
├── students.test.js  # 学生 CRUD
└── evaluations.test.js # 评价逻辑
```

#### 4.3 E2E 测试（可选）
- 使用 Playwright 测试完整用户流程
- 登录 → 创建班级 → 添加学生 → 评价

---

### 阶段 5: 其他优化
- [ ] 添加请求参数验证（zod）
- [ ] 统一错误处理
- [ ] 添加日志系统（替代 console.log）
- [ ] API 文档（Swagger/OpenAPI）
- [ ] 性能优化：虚拟滚动（学生列表）
- [ ] 国际化支持（i18n）

---

## 执行顺序

1. **阶段 1** - 基础设施（已大部分完成）
2. **阶段 3** - 后端拆分（影响面小，风险低）
3. **阶段 2** - 前端拆分（需要先有后端测试保障）
4. **阶段 4** - 测试完善（与阶段 2-3 同步进行）
5. **阶段 5** - 锦上添花

---

## 风险和注意事项

1. **重构期间功能冻结** - 大规模重构时避免新增功能
2. **小步提交** - 每个子任务完成后立即提交
3. **测试先行** - 修改前确保有测试覆盖
4. **保持向后兼容** - API 接口不变
5. **数据库迁移** - 如果涉及表结构变更，需要迁移脚本

---

## 时间估算

| 阶段 | 预计时间 | 优先级 |
|------|----------|--------|
| 阶段 1 | 已完成 | P0 |
| 阶段 3 | 2-3 小时 | P1 |
| 阶段 2 | 4-6 小时 | P1 |
| 阶段 4 | 2-3 小时 | P2 |
| 阶段 5 | 按需 | P3 |

**总计**: 约 8-12 小时
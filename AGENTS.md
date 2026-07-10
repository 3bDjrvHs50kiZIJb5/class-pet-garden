# AGENTS.md - 班级宠物园 (ClassPetGarden)

> 本仓库 AI 编程助手指南

## 项目概述

游戏化班级管理系统，将积分追踪与虚拟宠物养成相结合。专为教师设计，通过正向激励管理学生行为。

**技术栈：**
- 前端：Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia + Vue Router
- 后端：Node.js + Express + SQLite (better-sqlite3)
- 语言：TypeScript（前端），JavaScript ES Modules（后端）

---

## 构建/开发/测试命令

```bash
# 开发
npm run dev          # 启动前端开发服务器（端口 3001）
npm run server       # 启动后端 API 服务器（端口 3002）
npm run start        # 同时启动前后端

# 生产
npm run build        # 类型检查 + 构建前端（vue-tsc && vite build）
npm run preview      # 预览生产构建

# 仅后端（在 server/ 目录下）
cd server && npm start
```

**未配置测试框架。**如需添加测试，推荐使用 Vitest（与 Vite 生态一致）。

**未配置代码检查工具。**如需添加，推荐使用 ESLint + @typescript-eslint + Vue 插件。

---

## 项目结构

```
class-pet-garden/
├── src/                      # 前端源码
│   ├── main.ts              # 应用入口
│   ├── App.vue              # 根组件
│   ├── style.css            # 全局样式（Tailwind 导入）
│   ├── router/index.ts      # Vue Router 配置
│   ├── data/pets.ts         # 宠物类型 & 等级计算
│   ├── pages/Home.vue       # 主页面（所有 UI 逻辑）
│   ├── components/          # 可复用组件（layout/, modals/, pet/, student/）
│   ├── stores/              # Pinia 状态（当前为空）
│   └── utils/               # 工具函数（当前为空）
├── server/
│   ├── index.js             # Express API + SQLite 结构
│   └── pet-garden.db        # SQLite 数据库文件
├── public/images/pets/      # 宠物图片（normal/ & mythical/）
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置（严格模式）
└── tailwind.config.js       # Tailwind 主题（自定义颜色）
```

---

## 代码风格指南

### TypeScript / Vue

**Vue SFC 结构：**
```vue
<script setup lang="ts">
// 1. 导入（Vue、外部库、内部模块）
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { helperFunction } from '@/utils/helpers'

// 2. 类型/接口
interface Student {
  id: string
  name: string
  // ...
}

// 3. 状态（refs、reactives）
const students = ref<Student[]>([])
const showModal = ref(false)

// 4. 计算属性
const filteredStudents = computed(() => ...)

// 5. 函数（异步 API 调用、处理函数）
async function loadStudents() { ... }

// 6. 生命周期钩子
onMounted(() => { ... })
</script>

<template>
  <!-- 模板使用 Tailwind 类 -->
</template>
```

**导入顺序：**
1. Vue API（`vue`、`vue-router`、`pinia`）
2. 外部库（`axios`）
3. 内部模块使用 `@/` 别名
4. 类型（如果分开）

**路径别名：**
- 使用 `@/` 导入 src 下的模块：`import { PET_TYPES } from '@/data/pets'`

**TypeScript 设置：**
- 启用严格模式（`strict: true`）
- `noUnusedLocals: true`, `noUnusedParameters: true`
- 目标：ES2020

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `StudentCard.vue` |
| TypeScript 文件 | camelCase | `pets.ts`, `storage.ts` |
| 变量/refs | camelCase | `const students = ref([])` |
| 函数 | camelCase | `async function loadStudents()` |
| 接口 | PascalCase | `interface Student { ... }` |
| 常量 | SCREAMING_SNAKE_CASE | `export const PET_TYPES` |

### 样式

- **Tailwind CSS** 用于所有样式
- 在 `tailwind.config.js` 中定义自定义颜色：
  - `primary`: `#FF9F43`（橙色）
  - `secondary`: `#26DE81`（绿色）
  - `danger`: `#EF4444`（红色）
  - `warning`: `#F59E0B`（琥珀色）
- 在模板中内联使用 Tailwind 工具类
- 响应式前缀：`md:`、`lg:`、`xl:`
- 悬停状态：`hover:bg-orange-500`

### API 层

**前端 API 调用（axios）：**
```typescript
// 创建 axios 实例并设置 baseURL
const api = axios.create({
  baseURL: '/pet-garden/api'
})

// 异步/等待模式
async function loadData() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

**后端路由（Express）：**
```javascript
// ES Modules 语法
import express from 'express'

// 路由处理器
app.get('/api/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes').all()
  res.json({ classes })
})
```

### 错误处理

**前端：**
- 异步 API 调用始终使用 try/catch
- 使用 `console.error()` 记录错误
- 显示用户友好的提示：`alert('操作失败，请重试')`

**后端：**
- 失败时返回 `{ error: 'message' }`
- 使用适当的 HTTP 状态码（400、404、500）
- 记录服务器错误：`console.error('Error:', error)`

---

## 后端 API 参考

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/classes` | GET, POST | 列出/创建班级 |
| `/api/classes/:id` | PUT, DELETE | 更新/删除班级 |
| `/api/classes/:id/students` | GET | 获取班级学生 |
| `/api/students` | POST | 添加学生 |
| `/api/students/:id` | PUT, DELETE | 更新/删除学生 |
| `/api/students/import` | POST | 批量导入学生 |
| `/api/students/:id/pet` | PUT | 选择/更换宠物 |
| `/api/rules` | GET, POST | 获取/添加评价规则 |
| `/api/evaluations` | GET, POST | 评价记录 |
| `/api/evaluations/latest` | DELETE | 撤销最近评价 |
| `/api/backup` | GET | 导出 JSON 备份 |
| `/api/restore` | POST | 从备份恢复 |

---

## 核心领域概念

**宠物系统：**
- 25 种宠物：18 种普通 + 7 种神兽
- 共 8 个等级（Lv.1 开始，Lv.8 = 毕业）
- 升级阈值：每级 `[40, 60, 80, 100, 120, 140, 160]` 经验
- 毕业宠物获得徽章

**积分系统：**
- 分类：学习、行为、健康、其他
- 正数 = 加分，负数 = 扣分
- 积分贡献给宠物经验值

**数据持久化：**
- SQLite 数据库位于 `server/pet-garden.db`
- 所有数据在单个 `.db` 文件中（易于备份/恢复）

---

## 开发注意事项

1. **注释使用中文** - 保持风格一致
2. **当前无测试** - 使用 `npm run dev` + `npm run server` 手动验证
3. **同时运行两个服务器** 以获得完整功能：`npm run start`
4. **代理配置** 在 Vite 中：`/pet-garden/api` → `http://localhost:3002`
5. **构建前类型检查**：`vue-tsc` 随 `npm run build` 自动运行

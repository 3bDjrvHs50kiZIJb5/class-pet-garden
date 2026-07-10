# 班级宠物园 (ClassPetGarden) 🐾

> 游戏化班级管理工具，让积分评价变得有趣高效

![版本](https://img.shields.io/badge/version-1.0.0-blue)
![技术栈](https://img.shields.io/badge/技术栈-Vue3%20+%20Node.js%20+%20SQLite-green)

## ✨ 项目简介

班级宠物园是一个面向中小学教师的班级管理工具，将传统的积分评价系统与电子宠物养成玩法相结合。学生通过良好表现获得积分，让宠物成长升级，最终获得毕业徽章。游戏化的设计让班级管理变得更有趣，激励学生积极向上。

### 核心特点

- 🎓 **多班级管理** - 支持创建和管理多个班级，一键切换
- 👨‍🎓 **学生管理** - 添加、编辑、删除、搜索、批量导入学生
- 🐾 **宠物养成** - 24种可爱宠物，8级成长体系，每级形态变化
- ⭐ **积分评价** - 83条默认规则，支持自定义，覆盖学习/行为/健康/其他
- 📊 **数据可视化** - 排行榜、成长进度、评价统计
- 💾 **数据安全** - SQLite数据库，支持备份/恢复/导出
- 📱 **响应式设计** - 适配电脑、平板、手机

---

## 🚀 快速开始

### 在线演示
访问：https://8.147.56.12/pet-garden/

### 本地开发

```bash
# 克隆项目
git clone https://github.com/gaotong132/class-pet-garden.git
cd class-pet-garden

# 安装依赖
npm install

# 启动开发服务器（同时启动前端和后端）
npm start

# 或分别启动
npm run dev      # 前端
npm run server   # 后端
```

### 生产部署

```bash
# 构建前端
npm run build

# 启动后端服务
npm run server

# 或使用启动脚本
bash start-server.sh
```

---

## 📸 功能截图

### 主界面
- 学生卡片网格展示
- 宠物等级和进度显示
- 快速评价入口

### 宠物图鉴
- 24种宠物预览
- 1-8级形态对比
- 分类筛选（普通动物/神兽）

### 评价系统
- 分类标签切换
- 快速加分/扣分
- 评价记录查询

---

## 🎯 功能详解

### 一、班级管理

| 功能 | 说明 |
|------|------|
| 创建班级 | 输入班级名称即可创建 |
| 切换班级 | 顶部下拉菜单快速切换 |
| 删除班级 | 支持删除班级及所有数据 |
| 数据备份 | 导出JSON备份文件 |
| 数据恢复 | 导入JSON恢复数据 |

### 二、学生管理

| 功能 | 说明 |
|------|------|
| 添加学生 | 单个添加或批量导入 |
| 编辑信息 | 修改姓名、学号 |
| 删除学生 | 单个删除或批量删除 |
| 搜索筛选 | 按姓名搜索 |
| 排序显示 | 按姓名/学号/进度排序 |

### 三、宠物系统

#### 宠物类型（24种）

**普通动物（16种）**：
- 🐕 犬类：西高地、比熊、边牧、柴犬、金毛、萨摩耶、哈士奇
- 🐈 猫类：虎斑猫、加菲猫、布偶猫、橘猫
- 🐇 兔类：垂耳兔、安哥拉兔
- 🦆 其他：柯尔鸭、羊驼、小熊猫

**神兽（8种）**：
- 白虎、独角兽、貔貅、青龙、朱雀、狻猊、多肉精灵

#### 成长体系

| 等级 | 所需积分 | 阶段 |
|------|----------|------|
| Lv.1 | 0 | 初生 |
| Lv.2 | 40 | 成长 |
| Lv.3 | 100 | 优秀 |
| Lv.4 | 180 | 进阶 |
| Lv.5 | 280 | 稀有 |
| Lv.6 | 400 | 精英 |
| Lv.7 | 540 | 史诗 |
| Lv.8 | 700 | 传说（毕业）|

**毕业奖励**：宠物达到Lv.8获得专属徽章，可领养新宠物

### 四、评价系统

#### 评价分类
- 📚 学习：作业、测验、考试相关
- 🎯 行为：纪律、礼仪、互助相关
- 💪 健康：运动、卫生、作息相关
- 📝 其他：其他自定义项目

#### 默认规则（83条）

| 分类 | 加分 | 扣分 | 合计 |
|------|------|------|------|
| 学习 | 9 | 7 | 16 |
| 行为 | 13 | 19 | 32 |
| 健康 | 7 | 7 | 14 |
| 其他 | 16 | 5 | 21 |
| **合计** | **45** | **38** | **83** |

#### 评价示例

**加分项**：
- 作业完成优秀 +1
- 测验满分 +3
- 主动帮助同学 +2
- 拾金不昧 +2~+5

**扣分项**：
- 不交作业 -1
- 抄袭作业 -5
- 欺负同学 -10
- 说脏话 -2

#### 自定义规则
- 添加自定义评价项
- 编辑规则名称和分值
- 删除不需要的规则

### 五、排行榜

- 按总积分排名
- 显示宠物等级和徽章数
- 激励学生积极表现

### 六、数据管理

- 💾 导出备份：导出完整班级数据为JSON
- 📥 导入恢复：从JSON文件恢复数据
- 🔄 自动保存：所有操作实时保存到数据库

---

## 🏗️ 技术架构

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      班级宠物园                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────┐         ┌─────────────────┐      │
│   │   Vue 3 前端     │   API   │  Node.js 后端   │      │
│   │                 │ ←─────→ │                 │      │
│   │  • Composition  │   REST  │  • Express.js   │      │
│   │  • TypeScript   │   JSON  │  • better-sqlite│      │
│   │  • Tailwind CSS │         │  • CORS         │      │
│   │  • Vue Router   │         │                 │      │
│   └─────────────────┘         └────────┬────────┘      │
│                                        │                │
│                                        ▼                │
│                                ┌─────────────────┐      │
│                                │     SQLite      │      │
│                                │  pet-garden.db  │      │
│                                └─────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + TypeScript | 渐进式框架，类型安全 |
| 构建 | Vite | 快速构建工具 |
| 样式 | Tailwind CSS | 原子化CSS框架 |
| 后端 | Node.js + Express | 轻量级Web框架 |
| 数据库 | SQLite | 嵌入式关系数据库 |
| 驱动 | better-sqlite3 | 同步SQLite驱动 |

### API 列表

```
# 班级
GET    /api/classes                 # 获取班级列表
POST   /api/classes                 # 创建班级
PUT    /api/classes/:id             # 更新班级
DELETE /api/classes/:id             # 删除班级

# 学生
GET    /api/classes/:id/students    # 获取学生列表
POST   /api/students                # 添加学生
PUT    /api/students/:id            # 更新学生
DELETE /api/students/:id            # 删除学生
POST   /api/students/import         # 批量导入
PUT    /api/students/:id/pet        # 更换宠物

# 评价规则
GET    /api/rules                   # 获取规则列表
POST   /api/rules                   # 添加规则
DELETE /api/rules/:id               # 删除规则

# 评价记录
POST   /api/evaluations             # 添加评价
GET    /api/evaluations             # 获取记录
DELETE /api/evaluations/:id         # 删除记录
DELETE /api/evaluations/latest      # 撤回最近

# 排行榜
GET    /api/classes/:id/ranking     # 获取排行榜

# 数据管理
GET    /api/backup                  # 导出备份
POST   /api/restore                 # 导入恢复
GET    /api/health                  # 健康检查
```

### 数据库表结构

```sql
-- 班级表
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- 学生表
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  student_no TEXT,
  total_points INTEGER DEFAULT 0,
  pet_type TEXT,
  pet_level INTEGER DEFAULT 1,
  pet_exp INTEGER DEFAULT 0,
  created_at INTEGER
);

-- 徽章表（毕业记录）
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  earned_at INTEGER
);

-- 评价规则表
CREATE TABLE evaluation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0,
  created_at INTEGER
);

-- 评价记录表
CREATE TABLE evaluation_records (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  timestamp INTEGER
);
```

---

## 📁 项目结构

```
class-pet-garden/
├── src/                          # 前端源码
│   ├── components/               # 组件
│   │   ├── PetImage.vue         # 宠物图片组件
│   │   ├── PetLoading.vue       # 加载动画组件
│   │   └── ...
│   ├── pages/                    # 页面
│   │   ├── Home.vue             # 主页面
│   │   └── PetPreview.vue       # 宠物图鉴
│   ├── data/                     # 数据配置
│   │   ├── pets.ts              # 宠物配置
│   │   └── evaluation-rules.ts  # 默认评价规则
│   ├── composables/              # 组合式函数
│   │   └── useImageLoader.ts    # 图片加载管理
│   ├── router/                   # 路由
│   ├── stores/                   # Pinia状态
│   ├── utils/                    # 工具函数
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 入口
├── server/                       # 后端
│   ├── index.js                  # Express服务
│   └── pet-garden.db             # SQLite数据库
├── public/                       # 静态资源
│   └── pets/                     # 宠物图片
├── dist/                         # 构建输出
├── start-server.sh               # 启动脚本
├── health-check.sh               # 健康检查
└── README.md                     # 说明文档
```

---

## 🔮 可优化功能

### 高优先级

1. **商店系统完善**
   - [ ] 商品管理（添加、编辑、删除）
   - [ ] 学生积分兑换商品
   - [ ] 兑换记录查询
   - [ ] 库存管理

2. **数据统计分析**
   - [ ] 班级评价趋势图（日/周/月）
   - [ ] 学生个人成长曲线
   - [ ] 评价分类占比饼图
   - [ ] 导出统计报表

3. **批量操作优化**
   - [ ] 批量评价支持不同分值
   - [ ] 批量更换宠物
   - [ ] 批量导出学生数据

### 中优先级

4. **用户系统**
   - [ ] 教师账号登录
   - [ ] 权限管理（班主任/科任老师）
   - [ ] 操作日志记录

5. **家长端**
   - [ ] 学生表现推送
   - [ ] 家长查看孩子积分
   - [ ] 家长确认评价

6. **移动端适配**
   - [ ] 手机端优化布局
   - [ ] 触摸操作优化
   - [ ] 微信小程序版本

### 低优先级

7. **社交功能**
   - [ ] 班级动态墙
   - [ ] 学生互评（有限制）
   - [ ] 点赞系统

8. **游戏化增强**
   - [ ] 宠物互动（喂食、玩耍）
   - [ ] 宠物技能系统
   - [ ] 班级挑战赛

9. **AI功能**
   - [ ] 智能评价建议
   - [ ] 学生行为分析
   - [ ] 自动生成评语

---

## 🆕 可新增功能

### 实用功能

1. **请假系统**
   - 学生请假申请
   - 病假/事假区分
   - 请假期间积分保护

2. **值日管理**
   - 自动排班
   - 值日评价
   - 值日记录

3. **作业管理**
   - 作业发布
   - 提交状态追踪
   - 作业评价关联

4. **通知公告**
   - 班级通知
   - 系统公告
   - 已读未读状态

### 扩展功能

5. **多班级对比**
   - 跨班级排行榜
   - 班级间挑战赛
   - 年级排名

6. **学期管理**
   - 学期切换
   - 历史数据查看
   - 学期总结报告

7. **自定义主题**
   - 多套UI主题
   - 班级自定义背景
   - 节日主题

---

## 🛠️ 开发计划

### 已完成 ✅
- [x] 班级管理
- [x] 学生管理
- [x] 宠物系统（24种，8级）
- [x] 评价系统（83条规则）
- [x] 排行榜
- [x] 数据备份/恢复
- [x] 宠物图鉴
- [x] 批量评价

### 进行中 🔄
- [ ] 商店系统
- [ ] 数据统计

### 计划中 📋
- [ ] 用户系统
- [ ] 移动端适配
- [ ] 家长端

---

## 📄 许可证

MIT License © 2024

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📞 联系

如有问题或建议，请通过 GitHub Issue 联系。

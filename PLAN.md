# 澳洁618抽奖网页 - 开发执行计划

> 创建时间：2026-06-13  
> 项目路径：`C:\Users\Administrator\.hermes\Important_project\aj_project\618活动\lottery-app`

---

## 📋 项目概述

为澳洁洗衣618活动开发一个完整的抽奖网页系统，包含：
- 前端抽奖页面（618主KV视觉风格）
- 后端抽奖API（概率控制 + 数据记录）
- 管理后台（数据统计 + 记录查询 + Excel导出）

---

## 🎯 核心需求

### 1. 视觉设计
- **主KV风格**：红金撞色、3D金属质感、放射状光线、波浪光带
- **背景图**：使用gpt-image-2-vip生成，input_fidelity=high精修
- **UI组件**：按钮、奖品框、弹窗与KV风格统一

### 2. 抽奖概率（后端控制）
| 奖项 | 概率 | 奖品内容 |
|------|------|----------|
| 一等奖 | 5% | 免费洗衣卡（价值200元） |
| 二等奖 | 10% | 10元洗衣优惠券 |
| 三等奖 | 85% | 5元洗衣优惠券 |
| **总计** | **100%** | - |

### 3. 功能要求
- ✅ 用户点击抽奖 → 调用后端API → 返回中奖结果
- ✅ 前端显示礼花动画弹窗
- ✅ 后端记录：用户ID（IP+临时UUID）、奖项、奖品、时间戳、IP
- ✅ 管理后台（密码保护）：
  - 实时统计（总次数、各奖项次数及实际概率）
  - 详细记录列表（分页 + Excel导出）

### 4. 部署目标
- 公网可访问的URL
- 前端正常抽奖 + 后台正常管理

---

## 🏗️ 技术架构

### 技术栈
```
前端：HTML5 + CSS3 + Vanilla JavaScript
后端：Node.js + Express
数据库：SQLite (better-sqlite3)
部署：Vercel / Railway / 自建VPS
```

### 项目结构
```
lottery-app/
├── server.js              # Express服务器主文件
├── package.json           # 依赖配置
├── data/
│   └── lottery.db         # SQLite数据库（运行时生成）
└── public/
    ├── index.html         # 抽奖主页面
    ├── admin.html         # 管理后台页面
    ├── css/
    │   └── style.css      # 样式文件
    ├── js/
    │   ├── lottery.js     # 抽奖逻辑
    │   └── admin.js       # 后台逻辑
    └── images/
        └── kv_bg.png      # 主KV背景图（已生成）
```

---

## 📝 开发任务清单

### Phase 1: 项目初始化 ✅ 已完成
- [x] 创建项目目录结构
- [x] 生成618主KV背景图（kv_bg.png）
- [x] 初始化package.json
- [x] 创建server.js基础框架

### Phase 2: 后端开发 ⏳ 进行中
- [x] 数据库初始化（SQLite + 表结构）
- [x] 抽奖概率算法实现（权重随机）
- [x] API接口开发：
  - [x] POST /api/draw - 抽奖接口
  - [x] GET /api/stats - 统计数据接口
  - [x] GET /api/records - 记录列表接口（分页）
  - [x] GET /api/export - Excel导出接口
- [x] 管理后台认证：
  - [x] POST /api/admin/login - 登录
  - [x] POST /api/admin/logout - 登出
  - [x] 受保护的admin API路由

### Phase 3: 前端开发 ⏸️ 待开始
- [ ] 抽奖主页面（index.html）
  - [ ] 页面布局（618主题）
  - [ ] 抽奖按钮组件
  - [ ] 礼花动画效果
  - [ ] 中奖弹窗
  - [ ] 响应式设计（移动端适配）
  
- [ ] 管理后台页面（admin.html）
  - [ ] 登录界面
  - [ ] 统计仪表盘
  - [ ] 记录列表表格（分页）
  - [ ] 导出Excel按钮

- [ ] 样式文件（css/style.css）
  - [ ] 红金配色方案
  - [ ] 3D金属质感按钮
  - [ ] 弹窗动画
  - [ ] 礼花粒子效果

- [ ] 前端逻辑（js/lottery.js + js/admin.js）
  - [ ] 抽奖API调用
  - [ ] 动画触发逻辑
  - [ ] 后台数据加载
  - [ ] 分页功能

### Phase 4: 本地测试 ⏸️ 待开始
- [ ] 安装依赖（npm install）
- [ ] 启动服务器测试
- [ ] 验证抽奖概率（抽样测试100次）
- [ ] 验证数据记录
- [ ] 验证管理后台功能
- [ ] 验证Excel导出

### Phase 5: 部署上线 ⏸️ 待开始
- [ ] 选择部署平台（Vercel/Railway/VPS）
- [ ] 配置环境变量
- [ ] 部署后端服务
- [ ] 测试公网访问
- [ ] 输出最终URL和管理员凭据

### Phase 6: 文档交付 ⏸️ 待开始
- [ ] 编写README.md（使用说明）
- [ ] 编写维护手册（数据库备份、日志查看）
- [ ] 输出项目交付清单

---

## 🎨 视觉设计规范

### 配色方案
```css
/* 主色调 - 红金撞色 */
--primary-red: #C41E3A;        /* 中国红 */
--primary-gold: #FFD700;       /* 金色 */
--accent-orange: #FF8C00;      /* 橙色强调 */
--dark-red: #8B0000;           /* 深红（阴影） */
--light-gold: #FFF8DC;         /* 浅金（高光） */

/* 背景渐变 */
--bg-gradient: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%);
--gold-gradient: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%);
```

### 视觉元素
- **放射状光线**：从中心向外发散的金白色光线
- **波浪光带**：流动的金色光带，增加动感
- **3D金属质感**：按钮和文字使用阴影和高光模拟金属质感
- **礼花粒子**：中奖时从中心爆发的彩色粒子

---

## 🔐 安全考虑

### 管理后台
- 密码：`aojie618admin`（可通过环境变量ADMIN_PASSWORD修改）
- Session认证，24小时过期
- 所有admin API需要认证中间件

### 抽奖防刷
- 基于Session的用户标识
- IP地址记录（用于后续分析）
- 可扩展：添加IP限频（如每IP每小时最多10次）

---

## 📊 数据库设计

### lottery_records 表
```sql
CREATE TABLE lottery_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,           -- 用户唯一标识（UUID）
  ip_address TEXT NOT NULL,        -- 客户端IP
  prize_level INTEGER NOT NULL,    -- 奖项等级（1/2/3）
  prize_name TEXT NOT NULL,        -- 奖品名称
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 抽奖时间
);
```

### 索引优化（可选）
```sql
CREATE INDEX idx_prize_level ON lottery_records(prize_level);
CREATE INDEX idx_created_at ON lottery_records(created_at);
CREATE INDEX idx_ip_address ON lottery_records(ip_address);
```

---

## 🚀 部署方案

### 方案A：Vercel + SQLite（推荐）
- **优点**：免费、自动部署、全球CDN
- **缺点**：SQLite在serverless环境下有限制（只读文件系统）
- **解决**：使用Vercel Blob或Supabase存储数据库文件

### 方案B：Railway（推荐）
- **优点**：支持持久化存储、自动部署、价格实惠
- **缺点**：需要绑定信用卡（有免费额度）
- **适合**：SQLite + Node.js完美兼容

### 方案C：自建VPS
- **优点**：完全控制、无限制
- **缺点**：需要自己配置环境、域名、SSL
- **适合**：有运维经验的团队

**推荐选择**：Railway（简单、稳定、支持持久化）

---

## 📦 依赖清单

```json
{
  "express": "^4.18.2",           // Web框架
  "better-sqlite3": "^9.4.3",     // SQLite驱动
  "express-session": "^1.17.3",   // Session管理
  "uuid": "^9.0.0",               // 生成用户ID
  "exceljs": "^4.4.0"             // Excel导出
}
```

---

## ✅ 验收标准

### 功能验收
- [ ] 前端页面可正常加载，视觉符合618主题
- [ ] 点击抽奖按钮可调用后端API
- [ ] 中奖概率符合设定（5% / 10% / 85%）
- [ ] 中奖弹窗显示正确，有礼花动画
- [ ] 管理后台可正常登录
- [ ] 统计数据实时更新
- [ ] 记录列表可分页查看
- [ ] Excel导出功能正常

### 性能验收
- [ ] 页面加载时间 < 3秒
- [ ] 抽奖API响应时间 < 500ms
- [ ] 支持至少100并发抽奖

### 部署验收
- [ ] 公网URL可访问
- [ ] HTTPS证书有效
- [ ] 移动端适配良好
- [ ] 数据库持久化正常

---

## 📞 维护说明（待补充）

### 数据库备份
```bash
# 备份数据库
cp data/lottery.db data/lottery_backup_$(date +%Y%m%d).db

# 恢复数据库
cp data/lottery_backup_YYYYMMDD.db data/lottery.db
```

### 日志查看
```bash
# 查看服务器日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

### 重置数据（谨慎使用）
```bash
# 清空抽奖记录
sqlite3 data/lottery.db "DELETE FROM lottery_records;"
```

---

## 📅 时间估算

| 阶段 | 预计时间 | 状态 |
|------|----------|------|
| Phase 1: 项目初始化 | 10分钟 | ✅ 已完成 |
| Phase 2: 后端开发 | 30分钟 | ⏳ 进行中 |
| Phase 3: 前端开发 | 60分钟 | ⏸️ 待开始 |
| Phase 4: 本地测试 | 20分钟 | ⏸️ 待开始 |
| Phase 5: 部署上线 | 30分钟 | ⏸️ 待开始 |
| Phase 6: 文档交付 | 10分钟 | ⏸️ 待开始 |
| **总计** | **约2.5小时** | - |

---

## 🔧 下一步行动

1. **立即执行**：完成Phase 2后端开发（已完成）
2. **接下来**：开发前端页面（Phase 3）
3. **然后**：本地测试验证（Phase 4）
4. **最后**：部署上线并交付（Phase 5-6）

---

*计划由 Hermes Agent 生成 · 2026-06-13*

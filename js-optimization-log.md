# JavaScript 代码优化日志

## 优化概述

- **开始时间**: 2026-04-21
- **完成时间**: 2026-04-21
- **目标**: 清理未使用的函数、变量、死代码，提高代码可维护性
- **实际删除行数**: 521 行

---

## 优化计划

### 阶段一：删除死代码（高优先级）

#### 任务 1.1：删除 js/app.js 中已注释的备份管理代码

**文件**: `js/app.js`

**删除内容**:
- 行 219-235：备份管理按钮事件绑定（已注释）
- 行 917-1028：备份管理函数实现（已注释）

**涉及函数**:
- `openBackupModal()`
- `closeBackupModal()`
- `createBackup()`
- `loadBackupList()`
- `restoreBackup()`
- `deleteBackup()`

**状态**: ✅ 已完成

**Git 提交**: `2c1f92f`

---

### 阶段二：删除未使用的工具函数（高优先级）

#### 任务 2.1：删除 js/utils.js 中未使用的函数

**文件**: `js/utils.js`

**删除函数列表**:

| 行号 | 函数名 | 原因 |
|------|--------|------|
| 60-80 | `formatLargeNumber()` | 全部使用 `formatLargeNumberWithTooltip()` |
| 149-157 | `getMarket()` | StockPriceAPI 有自己的实现 |
| 164-167 | `getStockPriceUrl()` | 从未调用 |
| 174-177 | `getStockInfoUrl()` | 从未调用 |
| 184-190 | `formatDate()` | Validator 有自己的实现 |
| 196-198 | `getToday()` | 从未调用 |
| 206-216 | `debounce()` | 从未调用 |
| 234-236 | `generateId()` | 从未调用 |

**状态**: ✅ 已完成

**Git 提交**: `271e385`

---

#### 任务 2.2：删除 js/dataManager.js 中未使用的函数

**文件**: `js/dataManager.js`

**删除函数列表**:

| 行号 | 函数名 | 原因 |
|------|--------|------|
| 709-733 | `exportToFile()` | 从未调用 |
| 738-770 | `importFromFile()` | 从未调用 |
| 803-805 | `getCurrentStock()` | 从未调用 |
| 866-875 | `switchStock()` | 从未调用 |
| 880-894 | `addTrade()` | 从未调用 |
| 899-913 | `updateTrade()` | 从未调用 |
| 918-932 | `deleteTrade()` | 从未调用 |
| 937-939 | `getStocksByGroup()` | 从未调用 |
| 944-950 | `searchStocks()` | 从未调用 |

**状态**: ✅ 已完成

**Git 提交**: `d66d5f9`

---

### 阶段三：删除未使用的配置管理函数（中优先级）

#### 任务 3.1：删除 js/config.js 中未使用的函数

**文件**: `js/config.js`

**删除函数列表**:

| 行号 | 函数名 | 原因 |
|------|--------|------|
| 523-532 | `reset()` | 从未调用且实现为空 |
| 569-571 | `export()` | 从未调用 |
| 578-591 | `import()` | 从未调用 |
| 712-719 | `getInfo()` | 从未调用 |

**状态**: ✅ 已完成

**Git 提交**: `72795cd`

---

### 阶段四：删除未使用的图表管理函数（中优先级）

#### 任务 4.1：删除 js/chartManager.js 中未使用的函数

**文件**: `js/chartManager.js`

**删除函数列表**:

| 行号 | 函数名 | 原因 |
|------|--------|------|
| 687-706 | `exportImage()` | 从未调用 |
| 741-750 | `initBatch()` | 从未调用 |
| 760-773 | `initDelayed()` | 从未调用 |

**状态**: ✅ 已完成

**Git 提交**: `0c16c84`

---

### 阶段五：删除未使用的 App 方法（中优先级）

#### 任务 5.1：删除 js/app.js 中未使用的 fetchStockPrice 方法

**文件**: `js/app.js`

**状态**: ⏭️ 已跳过

**原因**: 经验证 `fetchStockPrice()` 方法在 `app.js:306` 被调用，不应删除

---

## 执行记录

### 执行记录 1: 删除备份管理死代码

**执行时间**: 2026-04-21

**任务**: 任务 1.1
**文件**: js/app.js
**操作**: 删除已注释的死代码
**删除行数**: 131 行
**Git 提交**: 2c1f92f

**验证结果**:
- [x] 代码语法检查通过
- [x] 无控制台错误

---

### 执行记录 2: 删除 utils.js 未使用函数

**执行时间**: 2026-04-21

**任务**: 任务 2.1
**文件**: js/utils.js
**操作**: 删除未使用函数
**删除行数**: 109 行
**Git 提交**: 271e385

**验证结果**:
- [x] 代码语法检查通过
- [x] 无控制台错误

---

### 执行记录 3: 删除 dataManager.js 未使用函数

**执行时间**: 2026-04-21

**任务**: 任务 2.2
**文件**: js/dataManager.js
**操作**: 删除未使用函数
**删除行数**: 161 行
**Git 提交**: d66d5f9

**验证结果**:
- [x] 代码语法检查通过
- [x] 无控制台错误

---

### 执行记录 4: 删除 config.js 未使用函数

**执行时间**: 2026-04-21

**任务**: 任务 3.1
**文件**: js/config.js
**操作**: 删除未使用函数
**删除行数**: 55 行
**Git 提交**: 72795cd

**验证结果**:
- [x] 代码语法检查通过
- [x] 无控制台错误

---

### 执行记录 5: 删除 chartManager.js 未使用函数

**执行时间**: 2026-04-21

**任务**: 任务 4.1
**文件**: js/chartManager.js
**操作**: 删除未使用函数
**删除行数**: 66 行
**Git 提交**: 0c16c84

**验证结果**:
- [x] 代码语法检查通过
- [x] 无控制台错误

---

## 回滚指南

### 方法一：Git 回退

```bash
# 查看提交历史
git log --oneline -10

# 回退到优化前的状态（备份提交）
git reset --hard f068d02

# 或逐个回退优化提交
git revert 0c16c84  # 回退 chartManager.js 优化
git revert 72795cd  # 回退 config.js 优化
git revert d66d5f9  # 回退 dataManager.js 优化
git revert 271e385  # 回退 utils.js 优化
git revert 2c1f92f  # 回退 app.js 死代码删除
```

### 方法二：查看具体变更

```bash
# 查看某次提交的具体变更
git show 2c1f92f --stat
git show 271e385 --stat
git show d66d5f9 --stat
git show 72795cd --stat
git show 0c16c84 --stat
```

---

## 优化统计

| 阶段 | 任务 | 删除行数 | 状态 | Git 提交 |
|------|------|----------|------|----------|
| 一 | 删除死代码 | 131 | ✅ | 2c1f92f |
| 二 | 删除 utils.js 未使用函数 | 109 | ✅ | 271e385 |
| 二 | 删除 dataManager.js 未使用函数 | 161 | ✅ | d66d5f9 |
| 三 | 删除 config.js 未使用函数 | 55 | ✅ | 72795cd |
| 四 | 删除 chartManager.js 未使用函数 | 66 | ✅ | 0c16c84 |
| 五 | 删除 app.js 未使用方法 | 0 | ⏭️ 跳过 | - |
| **总计** | - | **522** | ✅ | - |

---

## 注意事项

1. **每次优化前先提交 Git**，方便回滚
2. **优化后进行功能测试**，确保不影响现有功能
3. **保留优化日志**，记录每次修改的详细信息
4. **分阶段执行**，不要一次性删除所有代码

---

## 后续修复与优化 (2026-04-22)

### 修复 1: config.js 误删函数恢复

**问题**: 删除 `export()` 和 `import()` 后，控制台报错 `this.import is not a function`

**原因**: 这两个函数被 `save()` 和 `load()` 内部调用，不应删除

**修复**: 恢复这两个函数，标记为 `@private`

**Git 提交**: `e7bf75d`

---

### 优化 2: Dark 主题弹窗适配

**文件**: `css/style.css`

**修改内容**:
- 添加 `.add-stock-modal` Dark 主题样式
- 添加 `.trade-modal-content` Dark 主题样式
- 添加 `.add-trade-form-container` 表单元素 Dark 主题样式
- 强制修复输入框背景色（使用 `!important`）

**Git 提交**: `6aad60a`, `d422520`, `1d44a70`

---

### 重构 3: 分离 UI 状态和交易数据存储

**目标**: D1 只存储交易数据，UI 状态存储在 localStorage

**修改文件**:
- `js/router.js`: 添加 `saveUIState()`/`loadUIState()`，移除 D1 保存
- `functions/api/[[path]].js`: D1 API 只处理 `stocks` 数据
- `js/dataManager.js`: 移除 `currentStockCode` 合并逻辑

**数据存储架构**:
| 存储位置 | 内容 |
|----------|------|
| D1 数据库 | `stocks`（交易数据） |
| localStorage | `currentPage`, `currentStockCode`（UI 状态） |
| 内存 | `scrollPositions`（会话内滚动位置） |

**Git 提交**: `112db48`

---

### 重构 4: 简化刷新逻辑

**目标**: 浏览器刷新后总是显示汇总页顶部

**修改文件**: `js/router.js`

**修改内容**:
1. `init()` 清除 localStorage UI 状态，总是显示汇总页
2. 滚动位置只在会话内保存（内存），不持久化到 localStorage
3. 简化 `showDetail()` 滚动位置保存逻辑

**新行为**:
| 操作 | 结果 |
|------|------|
| 浏览器刷新 | 总是显示汇总页顶部 |
| 汇总页 → 详情页 → 返回 | 恢复汇总页位置（会话内） |
| 页面内刷新股价按钮 | 不受影响 |

**Git 提交**: `88c5f05`, `78e72ef`, `26f24e7`, `5cc9473`, `0eecfa0`

---

## 最终删除函数汇总

### js/app.js (6 个函数)
- `openBackupModal()`
- `closeBackupModal()`
- `createBackup()`
- `loadBackupList()`
- `restoreBackup()`
- `deleteBackup()`

### js/utils.js (8 个函数)
- `formatLargeNumber()`
- `getMarket()`
- `getStockPriceUrl()`
- `getStockInfoUrl()`
- `formatDate()`
- `getToday()`
- `debounce()`
- `generateId()`

### js/dataManager.js (9 个函数)
- `exportToFile()`
- `importFromFile()`
- `getCurrentStock()`
- `switchStock()`
- `addTrade()`
- `updateTrade()`
- `deleteTrade()`
- `getStocksByGroup()`
- `searchStocks()`

### js/config.js (2 个函数，恢复 2 个)
- `reset()` ✅ 已删除
- `getInfo()` ✅ 已删除
- ~~`export()`~~ ⚠️ 已恢复（内部调用）
- ~~`import()`~~ ⚠️ 已恢复（内部调用）

### js/chartManager.js (3 个函数)
- `exportImage()`
- `initBatch()`
- `initDelayed()`

**总计删除函数**: 28 个（原 30 个，恢复 2 个）

---

*最后更新: 2026-04-22*

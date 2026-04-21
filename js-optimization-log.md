# JavaScript 代码优化日志

## 优化概述

- **开始时间**: 2026-04-21
- **目标**: 清理未使用的函数、变量、死代码，提高代码可维护性
- **预计删除行数**: ~527 行

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

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

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
| 196-198 | `getToday()` | 从未调用 |
| 206-216 | `debounce()` | 从未调用 |
| 234-236 | `generateId()` | 从未调用 |

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

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

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

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

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

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

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

---

### 阶段五：删除未使用的 App 方法（中优先级）

#### 任务 5.1：删除 js/app.js 中未使用的 fetchStockPrice 方法

**文件**: `js/app.js`

**删除内容**:
- 行 593-597：`fetchStockPrice()` 方法

**原因**: Detail 模块有自己的实现，App 中的此方法从未被调用

**状态**: ⏳ 待执行

**回滚方案**: Git 回退到优化前的提交

---

## 执行记录

### 执行记录模板

```markdown
#### 执行时间: YYYY-MM-DD HH:mm:ss

**任务**: 任务编号
**文件**: 文件路径
**操作**: 删除/修改
**删除行数**: X 行
**Git 提交**: commit hash

**验证结果**:
- [ ] 代码语法检查通过
- [ ] 功能测试通过
- [ ] 无控制台错误

**备注**: 
```

---

## 回滚指南

### 方法一：Git 回退

```bash
# 查看提交历史
git log --oneline -10

# 回退到指定提交
git reset --hard <commit-hash>

# 或使用 git revert 创建新提交
git revert <commit-hash>
```

### 方法二：从备份恢复

每次优化前，建议创建备份分支：

```bash
# 创建备份分支
git checkout -b backup/before-optimization

# 切回主分支执行优化
git checkout main
```

---

## 优化统计

| 阶段 | 任务 | 删除行数 | 状态 |
|------|------|----------|------|
| 一 | 删除死代码 | ~120 | ⏳ |
| 二 | 删除 utils.js 未使用函数 | ~50 | ⏳ |
| 二 | 删除 dataManager.js 未使用函数 | ~150 | ⏳ |
| 三 | 删除 config.js 未使用函数 | ~40 | ⏳ |
| 四 | 删除 chartManager.js 未使用函数 | ~50 | ⏳ |
| 五 | 删除 app.js 未使用方法 | ~5 | ⏳ |
| **总计** | - | **~415** | ⏳ |

---

## 注意事项

1. **每次优化前先提交 Git**，方便回滚
2. **优化后进行功能测试**，确保不影响现有功能
3. **保留优化日志**，记录每次修改的详细信息
4. **分阶段执行**，不要一次性删除所有代码

---

## 附录：完整函数调用关系分析

### Utils 模块使用情况

| 函数名 | 调用次数 | 调用位置 |
|--------|----------|----------|
| `formatPrice()` | 多次 | detail.js, tradeManager.js |
| `formatNullableNumber()` | 多次 | detail.js |
| `formatNullableCurrency()` | 多次 | detail.js |
| `formatLargeNumberWithTooltip()` | 多次 | detail.js, overview.js, tradeRecords.js |
| `formatNullablePercent()` | 多次 | detail.js |
| `formatDate()` | 0 | - |
| `formatLargeNumber()` | 0 | - |
| `getMarket()` | 0 | - |
| `getStockPriceUrl()` | 0 | - |
| `getStockInfoUrl()` | 0 | - |
| `getToday()` | 0 | - |
| `debounce()` | 0 | - |
| `deepClone()` | 多次 | dataManager.js |
| `generateId()` | 0 | - |

---

*最后更新: 2026-04-21*

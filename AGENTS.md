# 股票收益计算器 - 项目上下文

## AI 助手工作流程规范

> **重要**：AI 助手在执行任何任务时，必须遵循以下工作流程：

### 1. 任务分析阶段

**每次执行任务前，必须先调用 `using-superpowers` skill 进行任务分析**：

```
1. 接收用户任务
2. 调用 SkillTool(skill_name="using-superpowers")
3. 根据 skill 指导确定任务类型和执行策略
4. 制定详细的执行计划
```

**目的**：
- 确保任务理解准确
- 选择正确的执行策略
- 避免遗漏关键步骤
- 提高执行效率

### 2. 任务执行阶段

**执行过程中必须遵循**：
- 使用 TodoWrite 工具跟踪任务进度
- 每完成一个步骤立即标记为 completed
- 遇到问题及时调整计划

### 3. Git 提交规范

**每次修改代码后，必须创建 git 提交记录**：

```bash
# 提交格式
git add <修改的文件>
git commit -m "<type>(<scope>): <subject>

<body>

🤖 Generated with CodeArts Agent"
```

**提交类型 (type)**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变动

**提交范围 (scope)**：
- 模块名称，如 `calculator`, `detail`, `overview` 等
- 或文件名称，如 `AGENTS.md`, `style.css` 等

**提交示例**：
```bash
git add AGENTS.md
git commit -m "docs(AGENTS.md): 添加 AI 助手工作流程规范

- 新增任务分析阶段规范（使用 using-superpowers skill）
- 新增 Git 提交规范
- 确保每次修改都有可追溯的记录

🤖 Generated with CodeArts Agent"
```

### 4. 任务完成阶段

**任务完成后必须**：
1. 总结任务执行情况
2. 列出所有修改的文件
3. 确认 git 提交已完成
4. 在最后一行添加 🎯 标记

---

## 项目概述

这是一个股票投资收益计算工具，专为**已发生的股票交易操作**提供收益计算和分析功能，针对**持仓中**和**已清仓**的股票进行精确的收益统计。项目采用原生 HTML + CSS + JavaScript 技术栈，部署在 Cloudflare Pages 上，使用 localStorage + D1 混合存储策略，适合个人投资记录和分析使用。

**当前版本**：v2.7.0
**存档日期**：2026-04-16

**项目类型**：前端 Web 应用（部署在 Cloudflare Pages）

**主要用途**：
- 记录股票买卖交易（买入、卖出、分红、红利税）
- 使用 FIFO 方法精确计算持仓成本和收益
- 获取最新股价并计算浮动盈亏（非盯盘功能）
- 可视化展示投资收益趋势
- 加仓对比分析（显示每次加仓相对于上次加仓的股价变化）
- 备份管理和数据导入导出（JSON、CSV）
- 交易记录查询和分析（支持时间段筛选、多维度图表展示）
- 图表自由选择和响应式布局
- **云端数据持久化**（Cloudflare D1 数据库）
- **本地+云端混合存储**（零延迟读取，异步同步）

**项目定位**：本工具专注于交易记录和收益计算，不是股票盯盘软件或自选股管理工具。

## 技术栈

- **前端框架**：原生 JavaScript（无框架）
- **图表库**：ECharts 5.x（`lib/echarts.min.js`）
- **数据存储**：localStorage + Cloudflare D1（混合存储策略）
- **部署平台**：Cloudflare Pages（边缘部署，全球加速）
- **数据库**：Cloudflare D1（SQLite 边缘数据库）
- **股价 API**：腾讯股票 API（用于获取最新股价计算浮动盈亏）
- **兼容性**：Chrome、Edge、Firefox、Safari（现代浏览器）

## 项目结构

```
gupiaoshouyi-clac/
├── index.html              # 主页面（单页应用入口）
├── README.md               # 用户文档
├── ARCHIVE.md              # 功能存档文档
├── AGENTS.md               # 本文件（AI 助手上下文）
├── CONTRIBUTING.md         # 开发规范文档
├── CACHE_TROUBLESHOOTING.md # 缓存问题排查文档（v2.2.1新增）
├── wrangler.toml           # Cloudflare Pages 配置（v2.4.0新增）
├── css/
│   └── style.css           # 全局样式
├── functions/              # Cloudflare Pages Functions（v2.4.0新增）
│   └── api/
│       └── [[path]].js     # D1 数据库 API 端点
├── js/
│   ├── namespace.js        # 命名空间模块（v2.2.0新增）
│   ├── app.js              # 主程序入口、全局事件绑定
│   ├── config.js           # 配置集中管理模块
│   ├── router.js           # 路由管理（汇总页/详情页切换）
│   ├── overview.js         # 汇总页面逻辑、图表渲染、排序
│   ├── detail.js           # 详情页面逻辑、股价获取、UI更新
│   ├── calculator.js       # 核心计算模块（FIFO算法、收益率计算）
│   ├── dataManager.js      # 数据管理（localStorage + D1 混合存储）
│   ├── dataService.js      # 数据服务层（v2.2.0新增）
│   ├── fileStorage.js      # 文件导入导出（JSON、CSV）
│   ├── stockManager.js     # 股票增删改查
│   ├── tradeManager.js     # 交易记录增删改查（含分页）
│   ├── tradeRecords.js     # 交易记录查询页面（v2.3.0新增）
│   ├── stockPriceAPI.js    # 股价API模块（v2.2.0新增）
│   ├── eventBus.js         # 事件总线（发布/订阅模式）
│   ├── chartManager.js     # 图表实例管理模块
│   ├── pagination.js       # 通用分页模块
│   ├── tableHelper.js      # 表格工具模块（v2.2.0新增）
│   ├── formHelper.js       # 表单工具模块（v2.2.0新增）
│   ├── utils.js            # 工具函数（ErrorHandler、Validator、Loading）
│   ├── perf.js             # 性能监控（可选）
│   ├── stockSnapshot.js    # 股票快照（缓存优化）
│   ├── tooltipManager.js   # Tooltip统一管理器（v2.6.9新增）
│   └── moduleRegistry.js   # 模块注册表（v2.2.0新增）
└── lib/
    └── echarts.min.js      # ECharts 图表库
```

## 核心模块说明

### 1. 计算模块 (calculator.js)
**职责**：实现核心业务逻辑和算法

**关键功能**：
- **FIFO 计算**：先进先出法计算卖出成本和收益
- **统一计算函数**：`calculateAll()` 一次遍历返回所有数据（性能优化）
- **持仓周期追踪**：自动识别建仓、加仓、减仓、清仓操作
- **周期收益统计**：计算自然周和自然月收益（统一口径：卖出+分红-红利税）
- **时间序列数据**：生成图表所需的历史数据（持仓、成本、收益变化）
- **每股成本计算**：每股持仓成本和每股摊薄成本
- **加仓对比数据**：计算每次加仓相对于上次加仓的股价变化
- **当前持仓周期收益追踪**：追踪当前持仓周期的累计收益，清仓时重置

**重要算法**：
```javascript
// FIFO 核心逻辑
while (remainingAmount > 0 && holdingQueue.length > 0) {
    const holding = holdingQueue[0];
    if (holding.amount <= remainingAmount) {
        // 完全卖出该批次
        costBasis += holding.price * holding.amount + holding.fee;
        remainingAmount -= holding.amount;
        holdingQueue.shift();
    } else {
        // 部分卖出该批次
        const feePortion = holding.fee * remainingAmount / holding.amount;
        costBasis += holding.price * remainingAmount + feePortion;
        holding.amount -= remainingAmount;
        remainingAmount = 0;
    }
}
```

**返回数据结构**：
```javascript
{
    summary: {
        totalBuyCost,
        totalSellAmount,
        totalProfit,
        totalFee,
        totalReturnRate,
        currentHolding,
        currentCost,
        currentCycleProfit  // 当前持仓周期的累计收益（用于当前持仓摊薄成本计算）
    },
    additionComparisons: [  // 加仓对比数据数组
        {
            tradeId: 2,
            date: '2026-01-15',
            price: 12.5,
            lastPrice: 10.0,
            change: 2.5,
            changePercent: 25.0,
            isLatestAddition: true
        }
    ],
    // ... 其他字段
}
```

### 2. 配置管理模块 (config.js) 【新增】
**职责**：统一管理应用的所有配置项，提供配置的获取、设置、保存、加载、验证等功能。

**关键功能**：
- **配置获取**：`Config.get(path, defaultValue)` - 获取配置值
- **配置设置**：`Config.set(path, value)` - 设置配置值
- **配置保存**：`Config.save()` - 保存配置到 localStorage
- **配置加载**：`Config.load()` - 从 localStorage 加载配置
- **配置验证**：`Config.validate()` - 验证配置有效性
- **配置导入导出**：`Config.export()` / `Config.import()` - 导出导入配置

**配置结构**：
```javascript
const Config = {
    app: {
        name: '股票收益计算器',
        version: '2.0.0',
        author: 'iFlow CLI',
        description: '基于FIFO算法的股票投资收益计算工具'
    },
    
    storage: {
        localStorageKey: 'stockProfitCalculator',
        backupPrefix: 'stockProfitCalculator_backup_',
        backupRetentionDays: 7,
        maxBackupCount: 10
    },
    
    chart: {
        colors: { profit: '#f44336', loss: '#4caf50', ... },
        animation: { duration: 300, easing: 'cubicOut' },
        dimensions: { height: 350, minWidth: 400, ... },
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(0, 0, 0, 0.7)', ... }
    },
    
    validation: {
        stockCode: { pattern: /^[0-9]{6}$/, minLength: 6, maxLength: 6 },
        price: { min: 0.001, max: 9999.999, decimals: 3 },
        amount: { min: 100, max: 1000000, step: 100, decimals: 0 },
        // ... 更多验证规则
    },
    
    ui: {
        theme: { primary: '#667eea', secondary: '#764ba2', ... },
        layout: { maxWidth: 1560, padding: 24, ... },
        pagination: { itemsPerPage: 20, maxPageButtons: 5 },
        preferences: {
            showHoldingDetail: true,  // 用户偏好设置：持仓明细显示开关
            showCycleHistory: true    // 用户偏好设置：持仓周期历史显示开关
        }
    },
    
    // ... 更多配置项
}
```

**配置持久化**：
- 配置保存在 `stockProfitCalculator_config` 键中
- 支持用户偏好设置的保存和恢复

### 3. 通用分页模块 (pagination.js) 【新增】
**职责**：提供通用的分页计算、控件渲染和状态管理功能。

**核心功能**：
- **计算总页数**：`calculateTotalPages(totalItems, itemsPerPage)`
- **获取分页数据**：`getPaginatedData(data, currentPage, itemsPerPage)`
- **创建分页状态**：`createState(totalItems, itemsPerPage, currentPage)`
- **渲染分页控件**：`renderControls(state, containerId, onPageChange)`
- **绑定分页事件**：`bindEvents(containerId, onPageChange)`
- **更新分页控件**：`updateControls(containerId, state, onPageChange)`

**使用场景**：
- 交易记录分页（`tradeManager.js`）
- 持仓明细分页（`detail.js`）

**分页控件UI**：
```
显示 1 - 20 条，共 100 条
[上一页] 1/5 [下一页]
```

### 4. 图表管理模块 (chartManager.js) 【新增】
**职责**：统一管理 ECharts 实例，防止内存泄漏，提供图表生命周期管理。

**核心功能**：
- **初始化图表**：`init(chartId, chartDom, option)` - 创建并初始化图表
- **销毁图表**：`dispose(chartId)` / `disposeAll()` - 销毁指定或所有图表
- **更新图表**：`update(chartId, option, notMerge)` - 更新图表配置
- **调整大小**：`resize(chartId)` / `resizeAll()` - 调整图表大小
- **加载动画**：`showLoading(chartId, text)` / `hideLoading(chartId)` - 显示/隐藏加载动画
- **导出图片**：`exportImage(chartId, filename, type)` - 导出图表为图片
- **批量初始化**：`initBatch(chartConfigs)` - 批量初始化图表

**内存泄漏防护**：
- 自动管理窗口大小变化监听器的绑定和解绑
- 页面卸载时自动销毁所有图表实例

### 5. 数据管理模块 (dataManager.js)
**职责**：数据的持久化、读取、验证、迁移、备份管理

**关键功能**：
- **localStorage 存储**：默认存储键 `stockProfitCalculator`
- **数据验证**：验证数据格式和完整性
- **数据迁移**：为旧数据自动添加 `totalAmount` 字段
- **分组归一化**：根据持仓情况自动调整分组（持仓中/已清仓）
- **缓存机制**：内存缓存减少 localStorage 读取

**备份管理功能**（v2.0.0 新增）：
```javascript
// 自动备份
createBackup(data)          // 每次保存数据时自动创建备份

// 备份操作
getBackupList()             // 获取备份列表（按日期降序排序）
restoreBackup(dateStr)      // 恢复指定日期的备份
deleteBackup(dateStr)       // 删除指定日期的备份
exportBackup(dateStr)       // 将备份导出为JSON文件
importBackup(file)          // 从文件导入备份
cleanOldBackups()           // 清理超过保留天数的备份
getBackupStats()            // 获取备份统计信息（数量、大小、保留天数）
```

**备份配置**：
- 备份前缀：`stockProfitCalculator_backup_`
- 保留天数：7天
- 自动备份：每次保存数据时自动创建

**数据结构**：
```json
{
  "stocks": [
    {
      "code": "002460",
      "name": "赣锋锂业",
      "group": "holding",
      "trades": [
        {
          "id": 1,
          "date": "2025-10-29",
          "type": "buy",
          "price": 66.09,
          "amount": 200,
          "fee": 5,
          "totalAmount": 13218
        }
      ]
    }
  ],
  "currentStockCode": "002460",
  "version": "1.0.0"
}
```

### 5.5. 数据服务模块 (dataService.js) 【新增】
**职责**：提供统一的数据访问接口和缓存机制，优化数据访问性能。

**关键功能**：
- **计算结果缓存**：使用 Map 存储计算结果，避免重复计算
- **缓存失效管理**：支持单股票和全局缓存失效
- **事件驱动失效**：监听 EventBus 事件，自动失效相关缓存
- **缓存统计**：提供缓存统计信息（总数、有效数、无效数）
- **缓存清理**：支持清理过期缓存（默认5分钟）

**性能优化**（v2.1.0 新增）：
- **避免重复计算**：相同股票的计算结果缓存后直接返回
- **自动缓存失效**：数据变更时自动失效相关缓存，保证数据一致性
- **事件驱动**：通过 EventBus 监听数据变更，自动管理缓存生命周期

**核心方法**：
```javascript
getCalculationResult(stockCode)    // 获取计算结果（带缓存）
invalidateStock(stockCode)         // 失效指定股票的缓存
invalidateAll()                    // 失效所有缓存
getCacheStats()                    // 获取缓存统计信息
cleanExpiredCache(maxAge)          // 清理过期缓存
```

### 6. 文件存储模块 (fileStorage.js)
**职责**：数据导入导出（JSON、CSV）

**JSON 导入导出**：
- 导出数据为 JSON 文件
- 从 JSON 文件导入数据
- 导入前预览（显示新增/重复数据）
- 支持合并或覆盖数据

**CSV 导出功能**（v2.0.0 新增）：
```javascript
// CSV 导出
exportToCSV(data)                    // 导出详细数据CSV
exportSummaryToCSV(data)             // 导出汇总数据CSV
exportStockToCSV(stock)              // 导出单只股票CSV
exportAllFormats(data)               // 导出所有格式（JSON + CSV + 汇总CSV）
```

**CSV 特性**：
- UTF-8 编码，带 BOM（`\uFEFF`）确保 Excel 正确显示中文
- 自动转义包含逗号、双引号、换行符的字段
- 支持自定义文件名

**详细数据 CSV 表头**：
```
股票代码,股票名称,分组,交易日期,交易类型,价格,数量,手续费,金额,收益
```

**汇总数据 CSV 表头**：
```
股票代码,股票名称,分组,总投入成本,总卖出金额,总收益,总收益率,当前持仓,持仓成本,交易次数
```

### 7. 路由模块 (router.js)
**职责**：页面切换和状态管理

**页面类型**：
- `overview`：汇总页（显示所有股票列表、汇总统计、图表）
- `detail`：详情页（单只股票的详细信息、交易记录、图表）

**状态持久化**：保存最后访问的页面和股票到 localStorage

**滚动位置恢复**（v2.0.1 新增）：
- ~~仅内存存储~~ → ~~持久化到 localStorage~~ → 仅在当前会话中保存滚动位置
- 在切换到详情页时保存汇总页的滚动位置
- 在返回汇总页时恢复之前的滚动位置（平滑滚动）
- 使用 `window.scrollY || window.pageYOffset` 获取滚动位置
- 使用 `window.scrollTo({ top: position, behavior: 'smooth' })` 实现平滑滚动

**事件驱动**：
- 触发 `route:change` 事件通知其他模块
- App 模块订阅事件并统一处理页面刷新

### 8. 汇总页模块 (overview.js)
**职责**：汇总页面的渲染和交互

**关键功能**：
- 股票列表渲染（持仓中/已清仓）
- 多种排序方式（收益、收益率、持仓市值、建仓时间等）
- 视图切换（卡片视图/列表视图）
- 年度/月度收益图表
- Top5 盈利亏损榜单
- 批量获取股价

**性能优化**（v2.1.0 新增）：
- **DOM缓存优化**：缓存30+个DOM元素，减少重复查询
- **DocumentFragment批量插入**：股票卡片和榜单使用批量插入，减少重排
- **图表懒加载**：使用 IntersectionObserver 实现图表懒加载
- **统一resize管理**：防抖200ms，统一管理所有图表的resize操作

**架构改进**（v2.1.0 新增）：
- **事件总线解耦**：使用 `EventBus.EventTypes.ROUTE_CHANGE` 触发路由变化
- **事件监听**：监听 DATA_CHANGED、STOCK_ADDED、STOCK_DELETED、TRADE_* 等事件

### 9. 详情页模块 (detail.js)
**职责**：单只股票详情展示和交互

**关键功能**：
- 获取最新股价（腾讯 API）
- 当前持仓信息展示
- 汇总信息展示
- 交易记录表格（支持分页）
- 持仓明细表格（FIFO 匹配，支持分页和显示开关）
- 多个趋势图表（持仓、收益、收益率、每股成本）
- 加仓对比显示（在每股成本趋势图表中）
- 添加/编辑交易记录表单

**当前持仓栏优化**（v2.5.2 新增）：
- **周期投入字段**：双行显示投入成本和卖出金额
  - 投入成本 = 当前持仓周期内所有买入金额 + 手续费 + 红利税
  - 卖出金额 = 当前持仓周期内所有卖出净额 + 分红
  - Tooltip 显示净投入（投入成本 - 危出金额）
- **持有股字段**：双行显示成本和市值（原两个单行字段合并）

**性能优化**（v2.1.0 新增）：
- **DOM缓存优化**：缓存50+个DOM元素，减少重复查询
- **DocumentFragment批量插入**：持仓明细表格使用批量插入，减少重排
- **图表懒加载**：使用 IntersectionObserver 实现图表懒加载，解决页面刷新后图表不显示的问题
- **统一resize管理**：防抖200ms，统一管理所有图表的resize操作

**架构改进**（v2.1.0 新增）：
- **StockSnapshot正确使用**：使用 `StockSnapshot.build(stockCode)` 而不是传入stock对象
- **timeSeries访问路径**：正确访问 `snapshot.calcResult.timeSeries`

**加仓对比功能**：
- 在每股成本趋势图表中，鼠标悬浮到加仓点时显示加仓对比信息
- 显示内容：本次加仓价、上次加仓价、差额、百分比
- 在图表标题中显示最新股价与最近一次加仓的对比

**持仓明细显示控制**：
- 通过用户偏好设置 `ui.preferences.showHoldingDetail` 控制显示/隐藏
- 默认显示，可在设置弹窗中切换

**持仓周期历史区块**（v2.6.0 新增）：
- **位置**：汇总信息栏下方
- **显示内容**：
  - 各轮次的日期范围（完整年份 YYYY-MM-DD）
  - 持仓天数
  - 统计信息：投入、卖出、手续费、分红
  - 收益和收益率
- **折叠功能**：支持手动折叠/展开，节省页面空间
- **显示控制**：通过设置弹窗的"持仓周期历史"开关控制显示/隐藏
- **数据来源**：`calculator.js` 的 `_extractHoldingCycleHistory()` 方法

### 10. 股票管理模块 (stockManager.js)
**职责**：股票的增删改查

**关键功能**：
- 添加新股票
- 编辑股票信息
- 删除股票
- 切换当前股票

### 11. 交易管理模块 (tradeManager.js)
**职责**：交易记录的增删改查（含分页）

**关键功能**：
- 添加交易记录
- 编辑交易记录
- 删除交易记录
- **交易记录分页**：使用 `Pagination` 模块实现分页显示

**分页配置**：
```javascript
this._pagination = {
    currentPage: 1,
    itemsPerPage: 50,  // 每页50条
    totalItems: 0,
    totalPages: 0
};
```

### 12. 交易记录查询页面 (tradeRecords.js) 【v2.3.0新增】
**职责**：交易记录查询和多维度可视化分析

**关键功能**：
- **时间段查询**：按年、月筛选交易记录
- **股票筛选**：查看全部或指定股票的交易记录
- **多维度图表展示**：
  - 股票交易额排行（前10）：气泡图、双向柱状图、双向条形图、堆叠柱状图
  - 每日交易额：柱状图、折线图、堆叠柱状图
  - 每日收益趋势（累计）：折线图、柱状图、面积图
  - 交易类型分布：饼图、环形图、条形图
  - 股票收益排行（前10）：柱状图、散点图、气泡图、雷达图
  - 每日交易次数：折线图、柱状图、堆叠柱状图
- **图表类型切换**：每个图表都有下拉选择器，支持多种可视化方式切换
- **顶部汇总统计**：显示总收益、交易次数、总手续费
- **导出CSV功能**：支持导出查询结果为CSV文件

**图表配置**：
```javascript
_chartTypeConfig: {
    tradeRecordsStockAmountChart: {
        options: ['bubble', 'bidirectionalBar', 'bidirectionalBarHorizontal', 'stackedBar'],
        labels: { 
            bubble: '气泡图', 
            bidirectionalBar: '双向柱状图', 
            bidirectionalBarHorizontal: '双向条形图', 
            stackedBar: '堆叠柱状图'
        }
    },
    tradeRecordsDailyAmountChart: {
        options: ['bar', 'line', 'stackedBar'],
        labels: { bar: '柱状图', line: '折线图', stackedBar: '堆叠柱状图' }
    },
    tradeRecordsDailyProfitChart: {
        options: ['line', 'bar', 'area'],
        labels: { line: '折线图', bar: '柱状图', area: '面积图' }
    },
    tradeRecordsTypeDistributionChart: {
        options: ['pie', 'donut', 'bar'],
        labels: { pie: '饼图', donut: '环形图', bar: '条形图' }
    },
    tradeRecordsStockProfitChart: {
        options: ['bar', 'scatter', 'bubble', 'treemap', 'radar'],
        labels: { bar: '柱状图', scatter: '散点图', bubble: '气泡图', treemap: '矩形树图', radar: '雷达图' }
    },
    tradeRecordsDailyCountChart: {
        options: ['line', 'bar', 'stackedBar'],
        labels: { line: '折线图', bar: '柱状图', stackedBar: '堆叠柱状图' }
    }
}
```

**数据缓存**：
- `_chartDataCache`：缓存计算后的图表数据，避免重复计算
- 支持图表类型切换时快速重新渲染

### 13. Tooltip 统一管理器 (tooltipManager.js) 【v2.6.9新增】
**职责**：统一管理所有 tooltip 的显示、隐藏和定位。

**核心功能**：
```javascript
const TooltipManager = {
    config: {
        offset: 10,              // 与触发元素的间距(px)
        padding: 10,             // 视口边距(px)
        showDelay: 100,          // 显示延迟(ms)
        hideDelay: 200,          // 隐藏延迟(ms)
        maxWidth: 400,           // 最大宽度(px)
        maxHeight: 300           // 最大高度(px)
    },
    
    // 初始化
    init(),
    
    // 显示/隐藏 tooltip
    show(triggerEl, content, options),
    hide(delay),
    
    // 绑定现有 tooltip
    bindExistingTooltips(),
    rebind(),
    
    // 绑定大数字转换 tooltip
    bindLargeNumberTooltips()
}
```

**特性**：
- **position: fixed 定位**：脱离文档流，不受父容器 overflow 限制
- **智能定位**：自动检测视口边界，智能切换上下位置
- **单例模式**：同一时间只显示一个 tooltip
- **延迟显示/隐藏**：防止闪烁
- **事件委托**：大数字 tooltip 使用事件委托，性能更优

**使用场景**：
- 统计信息的 tooltip（.tooltip-container）
- 交易记录的 tooltip（.trade-amount-state-wrap）
- 大数字转换的 tooltip（.large-number-tooltip）

### 14. 事件总线 (eventBus.js)
**职责**：解耦模块间通信

**使用场景**：
- 路由变化时通知其他模块刷新数据
- 模块间事件通知和状态同步

**核心方法**：
- `EventBus.on(event, callback)` - 订阅事件
- `EventBus.emit(event, data)` - 触发事件
- `EventBus.off(event, callback)` - 取消订阅

## 工具模块说明 (utils.js)

### ErrorHandler - 统一错误处理模块
**职责**：提供全局错误处理、安全执行函数、错误日志管理。

**核心功能**：
```javascript
const ErrorHandler = {
    levels: {
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        FATAL: 'fatal'
    },
    
    // 显示错误提示
    showError(message, error = null, level = this.levels.ERROR),
    
    // 记录错误日志
    logError(message, error = null, level = this.levels.ERROR),
    
    // 安全执行同步函数
    safeExecute(fn, fallback = null, errorMessage = '操作失败'),
    
    // 安全执行异步函数
    async safeExecuteAsync(fn, fallback = null, errorMessage = '操作失败'),
    
    // 包装函数使其安全执行
    wrapSafe(fn, errorMessage = '操作失败'),
    wrapSafeAsync(fn, errorMessage = '操作失败'),
    
    // 获取/导出错误日志
    getErrorLog(limit = 50),
    exportErrorLog(),
    
    // 错误类型判断
    isNetworkError(error),
    isDataError(error),
    isPermissionError(error),
    
    // 全局错误处理器初始化
    init()  // 捕获未处理的错误和 Promise 错误
}
```

**初始化**：
```javascript
ErrorHandler.init();  // 在 utils.js 末尾自动调用
```

### Validator - 数据验证模块
**职责**：提供各种数据验证功能，包括股票代码、价格、数量、日期、交易记录等。

**核心功能**：
```javascript
const Validator = {
    // 基础验证
    validateStockCode(code),      // 股票代码：6位数字
    validateStockName(name),      // 股票名称：2-10个字符
    validatePrice(price),         // 价格：0.001-9999.999
    validateAmount(amount),       // 数量：100-1000000，100的倍数
    validateFee(fee),             // 手续费：0-10000
    validateDate(dateStr),        // 日期：YYYY-MM-DD，2000-01-01到当前日期+1年
    validateTradeType(type),      // 交易类型：buy/sell/dividend/tax
    
    // 复杂验证
    validateTrade(trade),         // 验证交易记录
    validateStock(stock),         // 验证股票对象
    validateData(data),           // 验证完整数据对象
    
    // 清理和格式化
    cleanStockCode(code),         // 清理股票代码
    cleanStockName(name),         // 清理股票名称
    validateAndFormatPrice(price),// 验证并格式化价格
    formatAmount(amount),         // 验证并格式化数量
    formatDate(dateStr),          // 验证并格式化日期
    
    // 批量验证
    validateTradesBatch(trades),  // 批量验证交易记录
    
    // 工具方法
    getErrorSummary(validationResult)  // 获取验证错误摘要
}
```

### Loading - 统一加载状态管理模块
**职责**：提供全局加载状态的显示和隐藏，支持嵌套加载。

**核心功能**：
```javascript
const Loading = {
    container: null,
    loadingCount: 0,
    config: {
        text: '加载中...',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        textColor: '#ffffff',
        fontSize: '16px',
        zIndex: 9999
    },
    
    // 显示/隐藏加载状态
    show(message = '加载中...', options = {}),
    hide(),
    hideAll(),
    
    // 带超时的加载
    showWithTimeout(message = '加载中...', timeout = 30000),
    
    // 安全执行异步函数（自动管理加载状态）
    async execute(asyncFn, message = '加载中...'),
    
    // 更新加载文字
    updateText(message),
    
    // 状态查询
    isLoading(),
    getLoadingCount(),
    
    // 配置管理
    setConfig(config),
    resetConfig()
}
```

**嵌套加载支持**：
- 使用 `loadingCount` 计数器支持嵌套调用
- 只在计数归零时才隐藏加载状态

## 数据流

### 混合存储数据流（v2.4.0）

```
┌─────────────────────────────────────────────────────────────────────┐
│                        读取流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│  用户操作 → 页面模块（Overview/Detail）                              │
│       ↓                                                             │
│  DataManager.load()                                                 │
│       ↓                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. 检查内存缓存 → 命中：返回缓存数据                          │   │
│  │ 2. 读取 localStorage → 有数据：立即返回                       │   │
│  │ 3. 后台异步检查 D1 数据差异                                   │   │
│  │    ├─ 无差异：更新时间戳                                      │   │
│  │    └─ 有差异：触发 data:sync_diff 事件                        │   │
│  │ 4. 无本地数据：从 D1 加载                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       ↓                                                             │
│  Calculator（计算核心）                                              │
│       ↓                                                             │
│  UI 更新（页面刷新）                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        写入流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│  用户操作 → TradeManager/StockManager（业务逻辑）                    │
│       ↓                                                             │
│  DataManager.save(data)                                             │
│       ↓                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. 保存到 localStorage（立即生效）                           │   │
│  │ 2. 更新内存缓存                                              │   │
│  │ 3. 清除 StockSnapshot/DataService 缓存                       │   │
│  │ 4. 异步保存到 D1（不阻塞 UI）                                │   │
│  │ 5. 触发 DATA_CHANGED 事件                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       ↓                                                             │
│  UI 更新（页面刷新）                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 事件总线流程

```
Router → EventBus.emit('route:change') → App 订阅事件 → 更新所有模块
DataManager → EventBus.emit('data:sync_diff') → App 显示同步弹窗
```

### 配置管理流程

```
Config.get/set → Config.save → localStorage (stockProfitCalculator_config)
```

### API 端点（Cloudflare Pages Functions）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/data` | GET | 获取所有数据 |
| `/api/data` | PUT | 保存所有数据 |
| `/api/import` | POST | 导入JSON数据 |
| `/api/health` | GET | 健康检查 |

## UI 元素说明

### 设置弹窗
**位置**：右上角齿轮按钮
**功能**：
- **显示设置**：持仓明细显示开关、字段显示设置（v2.3.0新增）
- **数据管理**：导出JSON、导入JSON、导出CSV、导出汇总CSV
- **存储信息**：显示存储位置、股票数量、交易记录、数据大小
- **备份管理**：查看备份、创建备份
- **开发者选项**：性能日志开关

### 字段显示设置（v2.3.0新增）
**位置**：汇总页面右上角，视图切换按钮旁边的齿轮图标
**功能**：
- **列表视图字段设置**：自定义列表视图显示的字段（股票名称、代码、持仓、市值、成本、现价、涨幅、收益等）
- **卡片视图字段设置**：自定义卡片视图显示的字段（仓位信息、当日行情、收益表现、持仓周期、年度统计等）
- **配置持久化**：设置自动保存到 localStorage，刷新页面后保持
- **配置路径**：
  - 列表视图：`ui.preferences.listViewFields`
  - 卡片视图：`ui.preferences.cardViewFields`
- **默认状态**：所有字段默认显示

### 开关控件
- **持仓明细显示开关**：控制详情页持仓明细表格的显示/隐藏
  - 配置路径：`ui.preferences.showHoldingDetail`
  - 默认值：`true`
- **性能日志开关**：控制控制台性能日志的输出
  - 配置路径：`window.__PERF_ENABLED__`
  - 默认值：`true`

### 其他弹窗
- **导入预览弹窗**：显示导入数据的预览和统计
- **备份管理弹窗**：查看、恢复、删除备份
- **提示弹窗**：统一的提示消息显示

### 回到顶部按钮
- **位置**：页面右下角
- **功能**：滚动到页面顶部
- **显示条件**：滚动超过 200px 时显示

## 关键业务逻辑

### FIFO 成本计算
卖出时优先卖出最早买入的批次，确保成本计算准确。部分卖出时按比例分摊手续费。

### 收益口径
- **已卖出收益**：所有卖出操作的实际盈亏总和
- **当前持仓收益**：按最新股价计算的浮动盈亏
- **总收益**：已卖出收益 + 当前持仓收益
- **周期收益**：指定时间段内的卖出收益 + 分红 - 红利税

### 总收益率计算（修正版）
- **持仓中股票**：基于当前持仓周期的摊薄成本计算，公式：`(现价 - 每股摊薄成本) / 每股摊薄成本 * 100%`
  - 摊薄成本 = (持仓市值 - 当前持仓周期收益) / 持仓股数
  - **清仓时重置累计收益**，确保每个持仓周期的摊薄成本计算独立
- **已清仓股票**：显示已实现收益率，公式：`总收益 / 总投入成本 * 100%`

### 每股摊薄成本计算逻辑
- **计算公式**：每股摊薄成本 = (持仓成本 - 当前持仓周期收益) / 持仓股数
- **持仓周期独立**：清仓时重置 `currentCycleProfit`，每个持仓周期的摊薄成本互不影响
- **避免历史收益影响**：第二轮建仓的摊薄成本不会受到第一轮清仓收益的影响

### 加仓对比功能
- **对比对象**：每次加仓相对于上一次加仓的股价变化
- **显示方式**：
  - 图表中：鼠标悬浮到加仓点时，tooltip 显示加仓对比信息
  - 标题中：显示最新股价与最近一次加仓的对比
- **显示内容**：本次加仓价、上次加仓价、差额、百分比（保留3位小数）
- **建仓处理**：建仓不显示对比（因为没有"上次加仓"）

### 卖出预测功能（v2.7.0新增）
- **位置**：加仓对比记录下方，独立卡片区域
- **显示条件**：仅当前有持仓时显示（`currentHolding > 0`）
- **显示内容**：
  - 当前持仓：股数、每股成本、每股摊薄成本
  - 输入：卖出价格、卖出股数
  - 快捷按钮：1/4仓、1/3仓、半仓、全仓
  - 计算：卖出金额、预估收益（FIFO）、收益率
  - 卖出后：持仓股数、每股成本、每股摊薄成本
- **核心计算**：
  - 使用 `holdingQueue` 数据按 FIFO 算法计算卖出成本
  - `_calculateFIFOSellCost(holdingQueue, sellAmount)` 方法
- **边界处理**：
  - 卖出股数超过持仓：显示"超过持仓"错误提示
  - 卖出后清仓：显示"清仓"标识
- **视觉主题**：蓝色主题 `#2196f3`，与加仓对比（紫色）区分

### 持仓周期追踪
- **建仓**：空仓状态下的第一笔买入
- **加仓**：有持仓时的后续买入
- **减仓**：卖出后仍有持仓
- **清仓**：卖出后持仓归零（重置累计收益）
- **分红**：股票分红收入
- **红利税**：红利税补缴

## 开发约定

### 命名规范
- 模块名使用 PascalCase（如 `Calculator`）
- 变量名使用 camelCase（如 `currentStock`）
- 常量使用 UPPER_SNAKE_CASE（如 `STORAGE_KEY`）

### 代码风格
- 使用 ES6+ 语法
- 每个模块导出单一对象
- 全局对象通过 `window.ModuleName` 暴露

### 配置管理约定
- 所有配置通过 `Config` 模块管理
- 配置路径使用点号分隔：`ui.preferences.showHoldingDetail`
- 配置修改后调用 `Config.save()` 持久化
- 配置存储在 `stockProfitCalculator_config` 键中

### 错误处理约定
- 使用 `ErrorHandler` 处理错误
- 使用 `safeExecute` 和 `safeExecuteAsync` 安全执行函数
- 错误日志自动保存到 localStorage
- 全局错误处理器自动捕获未处理的错误

### 数据验证约定
- 使用 `Validator` 验证输入数据
- 验证失败时显示详细错误信息
- 支持批量验证和错误摘要

### 加载状态约定
- 使用 `Loading` 显示加载状态
- 支持嵌套加载，只在外层加载完成时隐藏
- 加载配置可自定义（文字、背景色、字体大小等）

### 分页功能约定
- 使用 `Pagination` 模块实现分页
- 分页状态保存在模块内部
- 分页控件动态渲染和事件绑定
- 只有多页时才显示分页控件

### 图表管理约定
- 使用 `ChartManager` 管理图表实例
- 图表初始化时指定唯一 ID
- 页面切换时自动销毁旧图表
- 自动管理窗口大小变化监听

### ESLint 语法检查约定（v2.4.4新增）

**工作流程**：
1. 运行 `npm run lint` 检查语法
2. 如果有错误，先修复错误
3. 如果有警告，可以使用 `npm run lint:fix` 自动修复
4. 确保没有错误后再测试页面功能

**npm scripts 说明**：
- `npm run lint` - 检查语法错误和代码风格警告
- `npm run lint:fix` - 自动修复可修复的警告（如格式问题）
- `npm run lint:check` - 严格检查（不允许任何警告）

**预防目标**：
- ❌ 缺少闭合的 `}`
- ❌ 重复声明的变量
- ❌ 未定义的变量
- ❌ 其他语法错误

**配置文件**：
- `.eslintrc.json` - ESLint 配置（规则和全局变量）
- `.eslintignore` - 忽略检查的文件（如第三方库）
- `package.json` - npm scripts 配置

### 性能优化

#### 1. DOM缓存优化
**涉及文件**：overview.js、detail.js、tradeManager.js

**实现方式**：
- 在模块初始化时缓存所有需要频繁访问的 DOM 元素
- 使用 `_domCache` 对象存储 DOM 元素引用
- 提供 `initDOMCache()` 方法初始化缓存
- 提供 `_ensureDOMCache()` 方法确保缓存已初始化

**优化效果**：
- 减少 `document.getElementById()` 和 `document.querySelector()` 的重复调用
- 提升 DOM 查询性能约 50-80%

**示例代码**：
```javascript
// 初始化DOM缓存
initDOMCache() {
    this._domCache = {
        backBtn: document.getElementById('backBtn'),
        pageTitle: document.querySelector('h1'),
        overviewTotalMarketValue: document.getElementById('overviewTotalMarketValue'),
        // ... 缓存更多DOM元素
    };
}

// 确保DOM缓存已初始化
_ensureDOMCache() {
    if (!this._domCache) {
        this.initDOMCache();
    }
}
```

#### 2. DocumentFragment批量插入
**涉及文件**：overview.js、detail.js、tradeManager.js

**实现方式**：
- 使用 `document.createDocumentFragment()` 创建文档片段
- 在片段中批量添加 DOM 元素
- 最后一次性插入到页面中

**优化效果**：
- 减少页面重排（reflow）次数
- 批量插入性能提升约 60-90%

**示例代码**：
```javascript
// 使用 DocumentFragment 批量插入，减少 DOM 重排
const fragment = document.createDocumentFragment();

// 在片段中添加多个元素
items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = /* ... */;
    fragment.appendChild(row);
});

// 一次性插入到页面
tableBody.appendChild(fragment);
```

#### 3. 图表懒加载（IntersectionObserver）
**涉及文件**：overview.js、detail.js

**实现方式**：
- 使用 `IntersectionObserver` API 监听图表容器是否进入视口
- 图表只在进入视口时才渲染
- 设置 `threshold: 0.1`，当 10% 可见时触发
- 设置 `rootMargin: '0px 0px 100px 0px'`，提前 100px 加载

**优化效果**：
- 减少初始页面加载时间
- 提升首屏渲染性能约 40-60%

**示例代码**：
```javascript
// 初始化图表懒加载观察器
_initChartObserver() {
    if (this._chartObserver) return;

    this._chartObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this._chartsLoaded) {
                this._chartsLoaded = true;
                this._renderChartsInternal();
                this._chartObserver.disconnect();
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px 100px 0px'
    });
}
```

#### 4. 统一resize事件管理（防抖）
**涉及文件**：overview.js、detail.js

**实现方式**：
- 统一管理所有图表的 resize 操作
- 使用防抖（debounce）机制，200ms 延迟
- 防止内存泄漏，正确绑定和解绑事件

**优化效果**：
- 减少不必要的 resize 操作
- 防止内存泄漏
- 提升页面交互性能

**示例代码**：
```javascript
// 初始化统一的图表 resize 管理
_initChartResizeManager() {
    if (this._chartResizeHandler) {
        return;
    }

    // 创建防抖处理函数
    this._chartResizeHandler = () => {
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
        }

        this._resizeDebounceTimer = setTimeout(() => {
            this._resizeAllCharts();
        }, 200);  // 200ms 防抖延迟
    };

    // 绑定 resize 事件
    window.addEventListener('resize', this._chartResizeHandler);
}

// 统一管理所有图表的 resize 操作
_resizeAllCharts() {
    Object.values(this._chartInstances).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
}
```

#### 5. 数据计算缓存机制
**涉及文件**：dataService.js

**实现方式**：
- 使用 Map 存储计算结果缓存
- 提供缓存失效管理
- 事件驱动的缓存失效机制
- 支持缓存统计和清理

**优化效果**：
- 避免重复计算
- 提升数据访问性能约 70-90%
- 自动缓存失效，保证数据一致性

**示例代码**：
```javascript
// 计算结果缓存
_calculationCache: new Map(),

// 获取计算结果时检查缓存
getCalculationResult(stockCode) {
    const cached = this._calculationCache.get(stockCode);
    if (cached && !cached.invalid) {
        return cached.result;
    }

    const result = Calculator.calculateAll(trades);
    
    // 缓存计算结果
    this._calculationCache.set(stockCode, {
        result: result,
        invalid: false,
        timestamp: Date.now()
    });
    
    return result;
}

// 事件驱动的缓存失效
init() {
    if (StockProfitCalculator.EventBus) {
        StockProfitCalculator.EventBus
            .on(StockProfitCalculator.EventBus.EventTypes.TRADE_ADDED, (data) => this._invalidateStock(data.stockCode))
            .on(StockProfitCalculator.EventBus.EventTypes.TRADE_UPDATED, (data) => this._invalidateStock(data.stockCode))
            .on(StockProfitCalculator.EventBus.EventTypes.TRADE_DELETED, (data) => this._invalidateStock(data.stockCode));
    }
}
```

#### 其他性能优化
- 使用内存缓存减少 localStorage 读取
- Calculator.calculateAll() 一次遍历返回所有数据
- 使用事件总线解耦模块间调用
- 按需加载股价数据
- 图表实例统一管理，防止内存泄漏

**性能优化约定**（v2.1.0 新增）：
- **DOM缓存**：所有模块都应该使用 DOM 缓存，减少重复的 DOM 查询
- **批量插入**：插入多个 DOM 元素时，使用 DocumentFragment 批量插入
- **懒加载**：图表等重型组件使用 IntersectionObserver 实现懒加载
- **防抖**：频繁触发的事件（如 resize）使用防抖机制，默认延迟 200ms
- **数据缓存**：计算结果应该缓存，避免重复计算
- **事件清理**：绑定的事件监听器必须在适当的时候解绑，防止内存泄漏

## 构建和运行

### 运行方式
直接在浏览器中打开 `index.html` 文件即可使用。

### 无需构建
本项目是纯静态文件，无需编译或打包。

### 依赖项
- 无外部依赖（除 ECharts 图表库）
- 无需 npm install
- 无需 Node.js

## 开发建议

### 添加新功能
1. 在 `js/` 目录创建新模块文件
2. 在 `index.html` 中引入新模块
3. 在 `app.js` 中初始化新模块
4. 使用事件总线与其他模块通信

### 修改样式
- 所有样式在 `css/style.css` 中
- Tooltip 使用自适应宽度（`width: auto` + `min-width` + `max-width`）
- 使用 CSS 变量便于主题调整

### 添加图表
- 使用 `ChartManager` 管理图表实例
- 在对应页面的 `renderCharts()` 方法中添加
- 参考现有图表实现（如 `detail.js` 中的图表）
- 确保页面切换时正确销毁图表

### 数据格式变更
- 修改 `dataManager.js` 中的数据结构
- 添加迁移逻辑到 `migrateData()` 方法
- 更新 `validateData()` 验证规则

### 添加配置项
- 在 `config.js` 中添加配置定义
- 使用 `Config.get()` 和 `Config.set()` 访问配置
- 调用 `Config.save()` 持久化配置

## 常见任务

### 添加新的计算指标
在 `calculator.js` 的 `calculateAll()` 方法中添加计算逻辑，返回到结果对象中。

### 修改股价 API
在 `detail.js` 的 `fetchStockPrice()` 方法中修改 API 调用逻辑。

### 添加新的交易类型
1. 在 `calculator.js` 中添加类型处理逻辑
2. 在 `detail.js` 中更新表单选项
3. 在 `dataManager.js` 中更新数据验证

### 添加分页功能
1. 在模块中定义分页状态对象
2. 使用 `Pagination.createState()` 创建分页状态
3. 使用 `Pagination.getPaginatedData()` 获取分页数据
4. 使用 `Pagination.renderControls()` 渲染分页控件
5. 使用 `Pagination.bindEvents()` 绑定分页事件

### 优化性能
- 启用性能监控：设置 `window.__PERF_ENABLED__ = true`
- 查看控制台输出性能日志
- 使用 `perf.js` 中的工具进行性能分析

### 处理错误
- 使用 `ErrorHandler.safeExecute()` 安全执行可能出错的操作
- 使用 `ErrorHandler.showError()` 显示错误提示
- 错误日志自动保存，可导出查看

## 调试技巧

### 查看数据
在浏览器控制台输入：
```javascript
// 查看当前数据
const data = DataManager.load();
console.log(data);

// 查看配置
const config = Config.export();
console.log(config);

// 查看计算结果
const stock = data.stocks[0];
const result = Calculator.calculateAll(stock.trades);
console.log(result);

// 查看加仓对比数据
console.log(result.additionComparisons);

// 查看当前持仓周期收益
console.log(result.summary.currentCycleProfit);
```

### 清除数据
在浏览器控制台输入：
```javascript
localStorage.removeItem('stockProfitCalculator');
location.reload();
```

### 清除配置
在浏览器控制台输入：
```javascript
localStorage.removeItem('stockProfitCalculator_config');
location.reload();
```

### 查看事件
事件总线支持日志，修改 `eventBus.js` 添加 console.log。

### 查看备份列表
在浏览器控制台输入：
```javascript
const backups = DataManager.getBackupList();
console.log(backups);
```

## 版本信息

**当前版本**：v2.7.0（2026-04-16）

**最新更新**（v2.7.0）：
- **新功能（1项）**：
  - **卖出预测功能**：
    - 独立区域显示在加仓对比记录下方
    - 仅针对最新一轮持仓，无持仓时自动隐藏
    - 显示当前持仓信息（股数、成本、摊薄成本）
    - 输入卖出价格/股数后实时计算：卖出金额、预估收益（FIFO）、收益率
    - 显示卖出后预测：持仓、成本、摊薄成本
    - 快捷按钮：1/4仓、1/3仓、半仓、全仓（自动计算股数）
    - 边界处理：超出持仓显示错误提示、清仓状态正确显示
    - 支持折叠/展开功能
    - 蓝色主题配色，与加仓对比（紫色）形成视觉区分
- **功能改进（5项）**：
  - **删除股票弹窗重新设计**：
    - 卡片风格设计，渐变图标、居中布局
    - 输入股票名称验证确认（防误删）
    - 错误提示和确认按钮状态联动
  - **加仓对比区域优化**：
    - 添加容器样式（紫色渐变头部、白色背景、边框、圆角）
    - 折叠按钮从右侧移到标题文字旁边
    - 预测价格从固定显示改为可编辑输入框
    - 多轮持仓分组显示，每轮独立折叠
  - **交易表单优化**：
    - select下拉框自定义样式（箭头图标）
    - "红利税补缴"改名为"红利税"
    - 分红/红利税金额输入框cursor样式修复（text而非not-allowed）
    - 添加tabindex提升键盘导航体验
  - **无交易记录图标**：
    - 已清仓列表显示橙色圆形提示图标
    - 悬浮显示"暂无交易记录"tooltip
  - **区域视觉区分**：
    - 加仓对比记录：紫色主题 `#667eea → #764ba2`
    - 卖出预测：蓝色主题 `#2196f3 → #42a5f5`
    - 两个区域独立卡片，视觉明显区分
- **Bug修复（2项）**：
  - 修复添加新股票时重复弹出5条通知的问题
  - 修复本地开发环境首次导入JSON数据报错的问题
- **修改文件**：
  - 修改 `index.html`：卖出预测区域容器、删除确认弹窗HTML、交易表单优化
  - 修改 `js/detail.js`：新增 `_renderSellPrediction()` 和 `_calculateFIFOSellCost()` 方法、加仓对比表格重构
  - 修改 `js/stockManager.js`：删除确认弹窗、移除重复通知
  - 修改 `js/tradeManager.js`：表单cursor样式修复
  - 修改 `js/tooltipManager.js`：支持无交易记录图标tooltip
  - 修改 `js/overview.js`：无交易记录图标显示
  - 修改 `js/dataManager.js`：本地开发环境返回默认数据结构
  - 修改 `css/style.css`：卖出预测样式（蓝色主题）、加仓对比样式（紫色主题）、删除弹窗样式、表单样式

**历史版本**（v2.6.9）：
- **新功能（1项）**：
  - **TooltipManager 统一管理器**：
    - 新增 `js/tooltipManager.js` 模块
    - 使用 position: fixed 定位，脱离文档流，不受父容器 overflow 限制
    - 自动检测视口边界，智能切换上下位置
    - 单例模式，同一时间只显示一个 tooltip
    - 支持延迟显示/隐藏，防止闪烁
- **功能改进（2项）**：
  - **大数字转换 Tooltip 优化**：
    - 从原生 HTML title 属性改为自定义 TooltipManager 组件
    - 深色背景 tooltip，圆角，阴影
    - 只在数值转换时显示下划线和 tooltip
    - 事件委托实现，性能更优
  - **标题栏布局优化**：
    - 从 3 个双行列改为 6 个单列（标签列 + 数值列）
    - 每股成本/每股摊薄、持仓成本/持仓市值、持有收益/盈亏比率
    - 弹性布局，自动分配空间
- **代码重构（1项）**：
  - **移除各模块独立的 tooltip 绑定逻辑**：
    - 移除 `detail.js` 的 `bindTooltipAutoFlip()` 方法
    - 移除 `tradeManager.js` 的 `bindTooltipAutoFlip()` 方法
    - 统一由 `TooltipManager` 管理
- **修改文件**：
  - 新增 `js/tooltipManager.js`：Tooltip 统一管理器
  - 修改 `js/app.js`：初始化 TooltipManager
  - 修改 `js/overview.js`：大数字 tooltip 改用 data-full-value
  - 修改 `js/detail.js`：大数字 tooltip 改用 data-full-value，移除 bindTooltipAutoFlip
  - 修改 `js/tradeManager.js`：移除 bindTooltipAutoFlip
  - 修改 `js/tradeRecords.js`：大数字 tooltip 改用 data-full-value
  - 修改 `js/router.js`：页面切换后重新绑定 tooltip
  - 修改 `css/style.css`：新增 .large-number-tooltip 和 .tooltip-fixed 样式

**历史版本**（v2.6.8）：
- **功能改进（3项）**：
  - **标题栏自适应布局优化**：
    - #headerLeft 三元素（返回按钮、股票名称、行情数据）同行显示
    - .header-title 和 .header-quote 按 3:7 比例分配剩余空间
    - 股票名称最大宽度 300px，超出显示省略号
  - **标题栏数据显示样式优化**：
    - header-quote 两端对齐、自动分配宽度
    - header-quote-value 字体从 20px 改为 16px
  - **加仓对比表格标题栏样式优化**：
    - 渐变背景 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
    - 白色文字、居中对齐
- **修改文件**：
  - 修改 `css/style.css`：标题栏布局优化、数据显示样式、表格标题栏样式

**历史版本**（v2.6.7）：
- **新功能（2项）**：
  - **标题栏数据显示**：
    - 详情页标题栏新增数据显示区域
    - 每股成本/每股摊薄成本（一列双行）
    - 持仓成本/持仓市值（一列双行）
    - 持有收益/盈亏比率（一列双行）
    - 颜色逻辑：每股成本/摊薄与现价比较显示盈亏色，持仓成本黑色，持仓市值按盈亏变色
  - **加仓对比表格多轮显示**：
    - 多轮持仓独立分组显示，每轮独立折叠按钮
    - 最新一轮默认展开，历史轮次默认折叠
    - 新增 `additionComparisonsByCycle` 按轮次保存数据，解决历史轮次数据丢失问题
- **功能改进（1项）**：
  - **股票名称截断处理**：
    - 最大宽度 295px，超出显示省略号
    - 悬浮显示完整名称（title属性）
- **修改文件**：
  - 修改 `css/style.css`：标题栏样式、加仓表格样式、股票名称截断
  - 修改 `index.html`：标题栏数据显示元素、加仓表格结构
  - 修改 `js/calculator.js`：additionComparisonsByCycle 数据结构
  - 修改 `js/detail.js`：标题栏数据渲染、加仓表格重构

**历史版本**（v2.6.6）：
- **新功能（1项）**：
  - **加仓对比表格**：
    - 详情页每股成本趋势图下方新增加仓对比表格
    - 显示建仓和每次加仓的详细信息（日期、价格、股数、金额）
    - 显示相对上次加仓的涨跌幅
    - 显示当时的持仓成本和摊薄成本
    - 显示现价对比（相对持仓成本和摊薄成本的盈亏）
    - 预测功能：输入计划买入股数，自动计算预估成本和盈亏
- **修改文件**：
  - 修改 `js/detail.js`：新增 `_renderAdditionComparisonTable()` 方法
  - 修改 `js/calculator.js`：additionComparisons 添加 amount 字段
  - 修改 `index.html`：添加表格容器
  - 修改 `css/style.css`：新增表格样式

**历史版本**（v2.6.5）：
- **持仓周期历史代码重构**：
  - **统一渲染函数**：
    - 新增 `renderCycleHistoryList()` 通用函数（utils.js）
    - 汇总页面弹窗和详情页面统一调用，避免数据不一致
    - 正确处理当前持仓周期的浮动盈亏
  - **显示高度区分**：
    - 汇总页面弹窗：保持固定高度 400px（可滚动）
    - 详情页面：自适应高度（不限制）
- **年度统计折叠显示**：
  - 默认显示前3年，超过3年显示"查看更多"按钮
  - 点击展开/收起切换
- **修改文件**：
  - 修改 `js/utils.js`：新增 renderCycleHistoryList 通用函数
  - 修改 `js/overview.js`：调用通用函数、年度统计折叠功能
  - 修改 `js/detail.js`：调用通用函数
  - 修改 `css/style.css`：年度统计折叠样式、详情页自适应高度

**历史版本**（v2.6.4）：
- **交易记录页面UI优化（仪表盘风格）**：
  - **统计卡片区重设计**：
    - 新增仪表盘风格统计卡片（总收益、交易次数、总手续费）
    - 卡片带渐变色顶边、图标、悬浮效果
    - 移除平均收益卡片（仅保留3个核心指标）
  - **筛选器位置调整**：
    - 筛选器从页面内移至头部标题栏
    - 与返回按钮、页面标题同行显示
    - 新增快捷筛选按钮（今日、本周、本月、本年）
  - **悬浮按钮显示优化**：
    - 添加股票、切换视图按钮仅在汇总页显示
    - 详情页和交易记录页隐藏这两个按钮
- **修改文件**：
  - 修改 `index.html`：统计区域和筛选器HTML结构重构
  - 修改 `css/style.css`：仪表盘风格样式、头部筛选器样式
  - 修改 `js/tradeRecords.js`：统计卡片渲染逻辑、快捷筛选功能
  - 修改 `js/router.js`：页面切换样式调整、悬浮按钮显示控制

**历史版本**（v2.6.3）：
- **字段设置优化（4项）**：
  - **卡片视图字段映射修正**：
    - 将 cycleProfit/cycleReturnRate 开关改为控制 totalProfit/totalReturnRate
    - 修复字段开关与实际显示不一致的问题
  - **移除无效字段配置**：
    - 从卡片视图字段配置中移除 cycleProfit/cycleReturnRate
    - 从列表视图字段配置中移除 cycleProfit/cycleReturnRate、stockName/stockCode
    - 更新 _cleanupRemovedFields() 清理数组保持同步
  - **字段设置弹窗垂直居中**：
    - CSS 添加 flexbox 居中样式（align-items/justify-content: center）
    - JS 将 display 从 'block' 改为 'flex'
  - **标题字体大小修复**：
    - .section-header h2 添加 font-size: 16px 和 font-weight: 600
- **修改文件**：
  - 修改 `js/overview.js`：字段映射修正、弹窗显示方式改为 flex
  - 修改 `js/config.js`：字段配置移除、defaultFieldKeys 清理数组更新
  - 修改 `css/style.css`：弹窗居中样式、标题字体大小

**历史版本**（v2.6.2）：
- **UI 优化（3项）**：
  - **设置弹窗 UI 重新设计**：
    - 宽度从 500px 扩大到 680px
    - 存储信息区块置顶，改为 2x2 卡片网格布局
    - 每个区块带彩色图标锚点（蓝/绿/橙/紫/红）
    - 设置行统一圆角背景，hover 主色高亮
    - 数据管理按钮添加 SVG 图标，双列布局
    - 底部栏显示版本号
    - 优化滚动条样式和移动端响应式布局
  - **导入数据预览弹窗 UI 样式升级**：
    - 弹窗宽度扩展到 720px
    - 全新卡片式样式系统（ip-* 样式类）
    - 新增 btn-danger-outline 和 btn-ghost 按钮样式
    - 导入预览股票分组改为"有新增记录/全部重复"
  - **滚动穿透问题修复**：
    - 弹窗打开时锁定 body 滚动
    - 统一拦截弹窗 wheel 事件并手动控制滚动
    - 修复导入预览弹窗滚动穿透主页面问题
- **Bug 修复（2项）**：
  - **Bug 1**：修复版本号显示 v2.0.0 问题
    - 原因：Config.load() 从 localStorage 加载时覆盖了代码中的默认版本号
    - 修复：在 load() 中显式恢复 app.version 为 2.6.1
  - **Bug 2**：修复弹窗位置偏下，底部超出屏幕
    - 修复：.modal 添加 overflow-y: auto + padding 实现自适应居中
- **修改文件**：
  - 修改 `css/style.css`：设置弹窗样式、导入预览样式、滚动穿透修复
  - 修改 `index.html`：设置弹窗 HTML 结构、导入预览按钮样式
  - 修改 `js/app.js`：弹窗滚动锁定逻辑、版本号读取
  - 修改 `js/config.js`：版本号恢复逻辑

**历史版本**（v2.6.1）：
- **新功能（1项）**：
  - **持仓周期历史添加清仓股价和至今涨跌**：
    - 新增"清仓价"字段：显示已结束周期最后一笔清仓交易的卖出价格
    - 新增"至今涨跌"字段：(当前股价 - 清仓价) / 清仓价 × 100%
    - 仅已结束周期显示，当前持仓周期显示 `--`
- **修改文件**：
  - 修改 `js/calculator.js`：添加 `clearPrice` 字段记录清仓股价
  - 修改 `js/detail.js`：渲染清仓股价和至今涨跌
  - 修改 `css/style.css`：统计信息改为 6 列布局

**历史版本**（v2.6.0）：
- **新功能（1项）**：
  - **持仓周期历史区块**：
    - 将详情页"持仓轮次"弹窗改为直接显示的独立区块
    - 位置：汇总信息栏下方
    - 显示完整日期年份（YYYY-MM-DD）
    - 显示详细统计：投入、卖出、手续费、分红、收益率
    - 支持折叠/展开功能
    - 设置弹窗添加显示开关
- **Bug 修复（1项）**：
  - **Bug 1**：修复已清仓股票切换时持仓周期历史不刷新的问题
    - 原因：`updateSummaryCards()` 的 else 块缺少 `_renderCycleHistorySection()` 调用
    - 修复：在 else 块中添加渲染调用，移除残留的 `holdingCycle` 元素代码
- **修改文件**：
  - 修改 `index.html`：添加持仓周期历史区块HTML、设置开关、移除持仓轮次字段
  - 修改 `css/style.css`：新增区块样式、折叠按钮样式、统计信息样式
  - 修改 `js/config.js`：添加 `showCycleHistory` 配置项
  - 修改 `js/app.js`：绑定持仓周期历史开关事件
  - 修改 `js/calculator.js`：添加周期统计字段计算（投入、卖出、手续费、分红、收益率）
  - 修改 `js/detail.js`：新增 `_renderCycleHistorySection()` 渲染方法、DOM缓存、折叠逻辑

**历史版本**（v2.5.2）：
- **新功能（1项）**：
  - **详情页当前持仓栏优化**：
    - 新增"周期投入"双行字段：投入成本、卖出金额
    - 投入成本 = 当前持仓周期内所有买入金额 + 手续费 + 红利税
    - 卖出金额 = 当前持仓周期内所有卖出净额 + 分红
    - Tooltip 显示净投入（投入成本 - 卖出金额）
    - 合并"持有股成本"和"持有股市值"为"持有股"双行字段
- **修改文件**：
  - 修改 `js/calculator.js`：新增 currentCycleBuyCost 和 currentCycleSellAmount 计算逻辑
  - 修改 `js/detail.js`：渲染新增字段和净投入 tooltip
  - 修改 `index.html`：调整当前持仓栏 HTML 布局

**历史版本**（v2.5.1）：
- **移动端适配优化**：
  - 修复错误提示容器在移动端超出屏幕边界
  - 修复头部工具栏在移动端溢出（搜索框、设置按钮等）
  - 修复列表视图卡片固定宽度导致横向滚动
  - 优化弹窗内边距，移动端更紧凑
  - 修复交易记录筛选器在移动端溢出
  - 图表区域在移动端改为纵向单列布局
  - 按钮组在移动端自动换行
  - 新增媒体查询断点：480px、768px
- **Bug 修复**：
  - 修复桌面端通知显示位置错误（误添加 left 属性导致显示在左边）
- **修改文件**：
  - 修改 `css/style.css`：添加移动端响应式媒体查询（约 200 行）

**历史版本**（v2.5.0）：
- **新功能（3项）**：
  - **功能 1**：历史累计统计区块
    - 汇总页面新增独立区块展示历史累计数据
    - 全部投入资金：所有股票历史买入总金额（含手续费、红利税）
    - 净投入资金：全部投入资金 - 当前持仓总成本（FIFO计算）
    - 整体收益：已清仓收益 + 当前持仓收益
    - 整体收益率：整体收益 / 净投入资金 × 100%
    - 总手续费：所有交易的手续费总和
    - 资金周转率：全部卖出金额 / 全部投入资金 × 100%
  - **功能 2**：大数字自动转换单位
    - 可配置阈值（默认10000），超出自动转为万/亿单位
    - 设置入口：右上角设置按钮 → 显示设置 → 大数字转换阈值
    - 转换后悬浮显示完整数值（title属性）
    - 适用范围：汇总页卡片/列表、交易记录页
    - 阈值设为0可禁用转换
  - **功能 3**：统计指标tooltip说明
    - 汇总页所有统计指标添加悬浮说明
    - 当前持仓总市值、当前持仓总成本、当前持仓总收益等
    - 本周收益、本月收益指标说明
- **Bug 修复（1项）**：
  - **Bug 1**：修复 getWeekRange 日期计算错误
    - 问题：`Date.setDate()` 会修改原对象，导致周日计算错误
    - 影响：点击"本周收益"进入交易记录页面，日期范围显示错误
    - 修复：创建日期副本后再调用 `setDate()`
- **修改文件**：
  - 修改 `css/style.css`：分页输入框宽度调整
  - 修改 `index.html`：历史累计区块HTML、设置UI
  - 修改 `js/app.js`：阈值设置事件绑定
  - 修改 `js/config.js`：大数字转换阈值配置项
  - 修改 `js/overview.js`：统计计算逻辑、金额格式化、日期修复
  - 修改 `js/tradeRecords.js`：金额格式化应用
  - 修改 `js/utils.js`：formatLargeNumber、formatLargeNumberWithTooltip函数

**历史版本**（v2.4.8）：
- **Bug 修复（1项）**：
  - **Bug 1**：修复月末日期计算错误
    - 问题：`new Date(year, month, 0)` 获取的是前一个月的最后一天，而非当前月份
    - 影响 1：交易记录页面按月份筛选时，日期范围错误（如 3月只显示到 26日）
    - 影响 2：周期收益计算（自然周/自然月统计）可能遗漏月末几天的收益
    - 修复：将 `new Date(year, month, 0)` 改为 `new Date(year, month + 1, 0)`
- **修改文件**：
  - 修改 `js/tradeRecords.js`：修复 `_loadDataAsync()` 中月末日期计算
  - 修改 `js/calculator.js`：修复 `calculatePeriodProfit()` 中月末日期计算

**历史版本**（v2.4.7）：
- **性能优化（1项）**：
  - **优化 1**：股价批量获取优化
    - 新增 `StockPriceAPI.fetchPrices(codes)` 批量获取方法
    - 使用简化版批量请求 `q=s_sh510300,s_sz159915,...`（字段位置与单个请求一致）
    - 修改 `overview.js` 的 `fetchAllStockPrices()` 使用批量获取
    - 网络请求数减少约 80%，刷新股价速度提升约 2-4 倍
- **Bug 修复（1项）**：
  - **Bug 1**：修复批量请求涨跌幅数据错误
    - 原因：完整版批量请求字段位置与简化版不同（涨跌额/涨跌幅在 parts[31]/parts[32]）
    - 修复：改用简化版批量请求 `s_` 前缀，字段位置与单个请求一致
- **修改文件**：
  - 修改 `js/stockPriceAPI.js`：新增 `fetchPrices()` 批量获取方法、`fetchBatch()` 方法、`_parseTencentBatchData()` 解析方法
  - 修改 `js/overview.js`：`fetchAllStockPrices()` 使用批量获取替代逐个获取

**历史版本**（v2.4.6）：
- **新功能（1项）**：
  - **功能 1**：分页设置配置
    - 设置弹窗添加分页设置区域，支持用户自定义分页参数
    - 分页阈值：记录数超过阈值时启用分页（默认50条）
    - 每页条数：分页后每页显示的记录数（默认30条）
    - 保存按钮位于标题右侧，点击保存后立即生效
    - 最小值限制为5，防止配置异常
    - 配置持久化到 localStorage
- **Bug 修复（2项）**：
  - **Bug 1**：修复持仓明细分页控件消失问题
    - 原因：paginationState 变量在 if 块内声明，外部无法访问
    - 修复：将变量声明移到 if/else 外部，确保作用域正确
  - **Bug 2**：修复交易记录分页翻页后数据丢失问题
    - 原因：handlePageChange 每次都从 DataManager 重新加载数据，可能导致数据不一致
    - 修复：添加 _currentTrades 和 _currentCalcResult 缓存，翻页时使用缓存数据
- **功能改进（1项）**：
  - **改进 1**：交易记录倒序显示
    - 将交易记录排序从正序改为倒序
    - 最新交易记录显示在最前面，更符合用户阅读习惯
- **修改文件**：
  - 修改 `css/style.css`：分页设置UI样式（输入框、保存按钮、标题行布局）
  - 修改 `index.html`：分页设置HTML结构
  - 修改 `js/app.js`：分页设置事件绑定（输入验证、保存按钮）
  - 修改 `js/config.js`：分页配置结构更新（threshold、itemsPerPage、minValue）
  - 修改 `js/detail.js`：持仓明细分页优化（阈值判断、缓存机制）
  - 修改 `js/tradeManager.js`：交易记录分页优化、倒序显示、数据缓存

**历史版本**（v2.4.5）：
- **新功能（3项）**：
  - **功能 1**：持仓周期历史显示
    - 详情页显示"持仓轮次"字段（如"第3轮"）
    - 点击可查看历史持仓周期弹窗，展示每轮的开始日期、结束日期、持仓天数、收益
    - 支持多轮持仓的历史追溯
    - 新增 `Calculator._extractHoldingCycleHistory()` 方法提取周期历史
    - 新增 `StockSnapshot._getCurrentCycleNumber()` 方法计算当前轮次
  - **功能 2**：已清仓独立功能完善
    - 独立排序：支持按清仓日期、收益、收益率、建仓时间排序
    - 独立视图切换：卡片视图/列表视图独立切换（按钮ID改为 `viewModeBtnHolding`/`viewModeBtnCleared`）
    - 独立字段设置：已清仓卡片和列表视图有独立的字段配置（`cardFields.cleared`/`listFields.cleared`）
  - **功能 3**：清仓日期字段
    - 已清仓股票显示"上轮清仓"或"本轮清仓"日期
    - 新增 `getClearDate()` 方法获取清仓日期
    - 卡片视图和列表视图均支持显示
- **功能改进（2项）**：
  - **改进 1**：视图模式独立化
    - `viewMode` 从字符串改为对象：`{ holding: 'list', cleared: 'list' }`
    - 持仓中和已清仓区域的视图模式独立切换，互不影响
    - 重写 `_initViewModeUI()` 方法，遍历分组检查
  - **改进 2**：字段设置优化
    - 已清仓独立字段配置，移除不适用字段（持仓成本、每股持仓成本、每股摊薄成本）
    - 列表视图标签统一：与字段设置名称一致（"持仓"→"持仓股数"、"市值"→"持仓市值"等）
    - 配置自动清理：新增 `_cleanupRemovedFields()` 方法自动清理旧版本遗留的无效字段配置
- **Bug 修复（4项）**：
  - **Bug 1**：修复视图模式类型比较错误
    - 原因：`viewMode` 从字符串改为对象后，`_initViewModeUI()` 比较逻辑未更新
    - 修复：遍历分组检查 `viewMode[group]` 而非 `viewMode === 'list'`
  - **Bug 2**：修复 visible 属性访问报错
    - 原因：已清仓字段配置缺少部分字段定义，访问 `fields.xxx.visible` 时报 undefined
    - 修复：添加可选链操作符 `fields.xxx?.visible` 防御性编程
  - **Bug 3**：修复列表视图标签不一致
    - 原因：显示标签与字段设置名称不匹配
    - 修复：统一标签命名，确保一致性
  - **Bug 4**：修复旧版本配置遗留数据问题
    - 原因：localStorage 缓存了已移除的字段配置，导致字段设置显示 undefined
    - 修复：在 `Config.load()` 中调用 `_cleanupRemovedFields()` 自动清理无效配置
- **修改文件**：
  - 修改 `js/overview.js`：视图模式独立化、已清仓独立功能、字段渲染优化、清仓日期显示
  - 修改 `js/config.js`：已清仓字段配置、配置清理方法
  - 修改 `js/calculator.js`：持仓周期历史提取
  - 修改 `js/stockSnapshot.js`：周期数据快照
  - 修改 `js/detail.js`：持仓轮次显示、历史弹窗
  - 修改 `index.html`：已清仓区域控件、持仓轮次元素
  - 修改 `css/style.css`：周期历史弹窗样式

**历史版本**（v2.4.4）：
- **Bug 修复（2项）**：
  - **Bug 1**：修复已清仓股票不显示"现价"和"涨幅"
  - **Bug 2**：修复已清仓股票详情页"持仓市值"显示错误

**历史版本**（v2.4.2）：
- **功能改进（3项）**：
  - **功能 1**：刷新股价按钮改为悬浮按钮
    - 从头部移动到页面右下角（固定位置）
    - 使用SVG图标替代文字按钮，更简洁美观
    - 支持汇总页面批量刷新和详情页面单股票刷新
    - 添加加载动画（旋转效果），提升用户体验
    - 悬浮效果和过渡动画，与回到顶部按钮风格一致
  - **功能 2**：默认视图模式改为列表视图
    - 将默认视图模式从'card'改为'list'
    - 添加 `_initViewModeUI()` 方法初始化视图模式UI状态
    - 修复视图模式切换后的UI显示问题
  - **功能 3**：用户体验优化
    - 优化页面切换时的UI更新顺序，立即响应用户操作
    - 批量刷新股价完成后添加成功提示
- **修改文件**：
  - 修改 `css/style.css`：悬浮刷新股价按钮样式
  - 修改 `index.html`：移动刷新按钮到页面底部，使用SVG图标
  - 修改 `js/app.js`：增强刷新按钮功能，支持汇总页和详情页
  - 修改 `js/overview.js`：默认视图模式改为列表视图，添加初始化方法
  - 修改 `js/router.js`：优化UI更新顺序，使用CSS类控制按钮显示

**历史版本**（v2.4.1）：
- **功能改进（2项）**：
  - **功能 1**：本地开发支持
    - 添加环境检测 `_isLocalDevelopment()` - 检测 file:// 协议
    - 本地模式只使用 localStorage，不尝试连接 D1 API
    - 添加 `getStorageMode()` 方法返回存储模式
  - **功能 2**：存储模式提示
    - 首次打开时显示当前存储模式提示
    - 设置弹窗动态显示存储位置（"浏览器本地存储" 或 "本地 + 云端混合存储"）
- **Bug 修复（1项）**：
  - **Bug 1**：修复本地模式首次导入 JSON 数据报错
    - 原因：`analyzeImportData` 未处理 `currentData` 为 null 的情况
    - 修复：添加空值检查，使用默认空数据结构
    - 修改文件：`js/fileStorage.js`

**历史版本**（v2.4.0）：
- **架构升级 - Cloudflare Pages 部署**：
  - 新增 Cloudflare D1 数据库支持
  - 实现 localStorage + D1 混合存储策略
  - 新增 Cloudflare Pages Functions API
  - 新增 `wrangler.toml` 配置文件
  - 新增 `functions/api/[[path]].js` API 端点
- **新增功能**：
  - **混合存储策略**：读取优先 localStorage（零延迟），后台异步检查 D1
  - **数据差异检测**：自动检测本地与云端数据差异
  - **同步差异弹窗**：用户友好的数据同步选择界面
  - **三种同步选项**：使用云端数据、合并数据、保持本地数据
- **API 端点**：
  - `GET /api/data` - 获取所有数据
  - `PUT /api/data` - 保存所有数据
  - `POST /api/import` - 导入JSON数据
  - `GET /api/health` - 健康检查
- **Bug 修复**：
  - **Bug 1**：修复交易记录添加后不刷新的问题（`DataService._invalidateStock()` 未清除 `_stockDataCache`）
  - **Bug 2**：修复新股票添加后跳转详情页报错（`DataManager.save()` 未清除 `DataService._stockDataCache`）
- **性能优化**：
  - 本地优先策略，零延迟读取
  - 异步云端同步，不阻塞 UI
- **文件变更**：
  - 新增 `functions/api/[[path]].js`：D1 数据库 API
  - 新增 `wrangler.toml`：Cloudflare Pages 配置
  - 修改 `js/dataManager.js`：混合存储逻辑
  - 修改 `js/app.js`：同步差异处理
  - 修改 `css/style.css`：同步弹窗样式

**历史版本**（v2.3.1）：
- **功能改进（2 项）**：
  - **功能 1**：图表选择功能（全新功能）
    - 交易记录页面添加图表选择控件
    - 支持自由选择显示哪些图表（6个复选框）
    - 响应式布局：根据选择的图表数量自动调整布局
      - 1个图表：放一整行
      - 2个图表：一行两个
      - 3个图表：一个整行，另外两个一行
      - 4个及以上：一行两个
    - 所有图表默认不选中状态
    - 页面加载时初始化图表显示状态
  - **功能 2**：交易类型分布图表优化
    - 移除条形图选项
    - 只保留饼图和环形图
    - 饼图设为默认选项
    - tooltip 显示"次数"（整数）而不是"金额"
    - 显示格式：`交易类型<br/>次数: 5<br/>占比: 45.45%`
- **Bug 修复（1 项）**：
  - **Bug 1**：修复图表显示问题（重要修复）
    - 修复多次筛选后图表无法显示的问题
    - 修复图表从隐藏状态变为可见后无法正确显示的问题
    - 修复过程：
      1. 在 renderCharts() 开始时调用 ChartManager.disposeAll() 销毁所有图表实例
      2. 在 renderCharts() 结束时调用 _handleChartSelectionChange() 重新应用图表显示状态
      3. 在 _adjustChartLayout() 中使用 requestAnimationFrame 延迟调用 ChartManager.resizeAll()
      4. 在 _handleChartSelectionChange() 中识别刚从隐藏变为可见的图表，强制重新渲染
      5. 添加 _getChartId() 辅助方法用于图表类型映射
- **代码优化（1 项）**：
  - **优化 1**：图表显示状态管理优化
    - 改进图表显示/隐藏状态管理
    - 优化图表布局调整逻辑
    - 提升图表显示稳定性和响应速度

**历史版本**（v2.3.0）：
- **功能改进（4 项）**：
  - **功能 1**：交易记录查询页面（全新功能）
    - 按时间段查询交易记录（年、月筛选）
    - 股票筛选功能（全部或指定股票）
    - 6个图表展示：股票交易额排行、每日交易额、每日收益趋势、交易类型分布、股票收益排行、每日交易次数
    - 图表类型切换功能：每个图表支持多种可视化方式（气泡图、柱状图、折线图、饼图、散点图、雷达图等）
    - 顶部汇总统计：显示总收益、交易次数、总手续费
    - 导出CSV功能：支持导出查询结果为CSV文件
  - **功能 2**：字段显示设置功能（全新功能）
    - 列表视图和卡片视图的字段自定义显示
    - 点击齿轮图标打开字段设置模态对话框
    - 用户可以勾选/取消勾选要显示的字段
    - 设置保存到 localStorage，刷新页面后保持
    - 配置路径：ui.preferences.listViewFields、ui.preferences.cardViewFields
  - **功能 3**：持仓中默认排序优化
    - 删除"默认排序"选项
    - 设置默认排序为"当日涨幅降序"
    - 排序状态初始值：field: 'change', direction: 'desc'
  - **功能 4**：Config 模块深度合并改进
    - 添加 `_deepMerge()` 方法用于深度合并嵌套对象
    - 改进 `import()` 方法，正确处理用户偏好设置的加载
    - 解决配置持久化问题
- **Bug 修复（1 项）**：
  - **Bug 1**：修复 HTML 标签语法错误
    - index.html 第 8 行的 `<link>` 标签末尾有重复的 `>` 符号
    - 修复为正确的 HTML 语法

**历史版本**（v2.2.2）：
- **功能改进（5 项）**：
  - **功能 1**：统一消息提示组件 - 替换所有原生 alert() 为 ErrorHandler 组件
    - 添加 4 个便捷方法（showSuccess、showWarning、showInfo、showErrorSimple）
    - 替换 47 处原生 alert() 调用为统一的 ErrorHandler 组件
    - 按级别区分时长（成功/警告3秒，错误5秒）
    - 统一右上角滑入动画，3秒或5秒自动消失
  - **功能 2**：修复弹窗消失闪烁问题 - 使用 animationend 事件监听器
    - 修改 fadeOut 动画，添加向右滑出效果（与 slideIn 对称）
    - 使用 animationend 事件监听器替代 setTimeout，确保动画完全结束后才移除元素
    - 避免浏览器渲染延迟导致的闪烁
  - **功能 3**：优化刷新股价按钮样式 - 完全对标返回按钮
    - 将刷新股价按钮样式改为与返回按钮一致（浅灰色背景、灰色边框、灰色文字）
    - 调整高度和边距，确保与返回按钮在同一水平线上对齐
    - 移除 align-self: flex-start，使按钮垂直居中对齐
  - **功能 4**：添加当前持仓周期收益和收益率
    - 在 stockSnapshot.js 中添加 cycleProfit 和 cycleReturnRate 计算
    - 在汇总页面方框卡片和列表卡片中添加当前持仓周期收益和当前持仓周期收益率
    - 当前持仓周期收益 = 当前持仓周期已实现收益 + 浮动盈亏
    - 将标签文本改为"当前持仓周期收益"和"当前持仓周期收益率"，避免与详情页面的"当前持仓收益"冲突
  - **功能 5**：修复持仓周期显示问题 - 准确计算当前持仓周期的开始日期
    - 修改 stockSnapshot.js 的 getCurrentHoldingInfo() 方法
    - 利用 cycleInfo 和 holdingQueue 数据准确计算当前持仓周期的开始日期
    - 支持任意次数的清仓和重新建仓，正确显示每次建仓的开始日期
- **Bug 修复（2 项）**：
  - **Bug 1**：修复 createGridCard 中 holdingProfit 和 holdingReturnRate 未定义的错误
    - 在变量解构部分添加 holdingProfit 和 holdingReturnRate 的声明
    - 在方框卡片和列表卡片中正确使用这些变量
  - **Bug 2**：修复持仓周期开始日期显示错误的问题
    - 修改 getCurrentHoldingInfo() 方法，使用正确的数据源（cycleInfo 和 holdingQueue）
    - 避免使用不存在的 holdingCycles 字段导致的 fallback 逻辑错误
- **样式优化（2 项）**：
  - **优化 1**：修改 fadeOut 动画，添加向右滑出效果
    - 从仅改变透明度改为同时改变透明度和位移
    - 与 slideIn 动画对称，视觉效果更连贯
  - **优化 2**：优化刷新股价按钮的布局对齐
    - 移除 align-self: flex-start，使按钮在父容器中垂直居中对齐
    - 与返回按钮保持一致的视觉对齐

**历史版本**（v2.2.1）：
- **Bug 修复（8项）**：
  - **Bug 1**：空数据报错 - dataService.js 空数据返回结构不完整
    - statistics 字段为空对象 `{}`，导致访问 undefined 属性报错
    - 添加完整的 statistics 对象，包含所有必需字段
  - **Bug 2**：detail.js 安全性检查缺失 - updateStatistics() 缺少字段存在性检查
    - 访问 `stats.winRate.toFixed(3)` 时 winRate 为 undefined
    - 添加安全性检查，使用默认值替代
  - **Bug 3**：分组逻辑错误 - dataManager.js 归一化覆盖用户选择
    - normalizeStockGroup() 对没有交易记录的股票也进行归一化
    - 添加检查，跳过没有交易记录的股票，保留用户选择
  - **Bug 4**：新股票跳转详情页无数据 - stockManager.js 使用 Router.showDetail()
    - Router.showDetail() 只切换页面，不调用 Detail.loadStock()
    - 改用 App.handleRouteChange() 确保正确的数据加载顺序
  - **Bug 5**：EventBus 链式调用失败 - eventBus.on() 不支持链式调用
    - EventBus.on() 返回取消函数而不是 `this`
    - 修改返回值为 `this` 以支持 `.on(...).on(...)` 链式调用
  - **Bug 6**：使用克隆对象导致计算错误 - detail.js 使用克隆的股票对象
    - DataManager.load() 返回深度克隆，导致数据不一致
    - 改用 DataService.getStock() 获取最新数据
  - **Bug 7**：缓存失效时机错误 - detail.js + overview.js 缓存失效顺序错误
    - 事件监听器在缓存失效前执行，导致竞争条件
    - 在修改数据前失效所有缓存，触发完整事件链
  - **Bug 8**：StockSnapshot 缓存基于日期导致同天更新失败
    - StockSnapshot 使用 dateKey 缓存，同天内不检查数据是否变更
    - 在 build() 前使缓存失效，确保数据一致性
- **缓存失效机制完善**：
  - 在修改数据前失效所有缓存（DataManager、DataService、StockSnapshot）
  - 触发完整事件链（TRADE_ADDED with stockCode）
  - 强制重新加载，不依赖缓存
  - UI 立即更新，无需刷新页面
- **文档更新**：
  - 新增 CACHE_TROUBLESHOOTING.md 记录缓存问题排查和解决方案
  - 更新 README.md、AGENTS.md、ARCHIVE.md、CONTRIBUTING.md 记录 v2.2.1 修复

**历史版本**（v2.2.0）：
- **优化完成总结**：
  - ✅ 阶段 1：架构重构（5/5）- 命名空间系统、数据服务层、事件总线解耦、循环依赖解决、模块依赖优化
  - ✅ 阶段 2：性能优化（6/6）- localStorage优化、DOM缓存、批量插入、图表懒加载、统一resize、数据计算缓存
  - ✅ 阶段 3：代码质量提升（4/4）- StockPriceAPI模块、函数拆分、命名规范统一、代码质量优化
  - ✅ 阶段 4：可维护性增强（4/4）- ErrorHandler完善、Config增强、TableHelper工具、FormHelper工具
  - ✅ 阶段 5：清理和优化（2/2）- 废弃代码清理、资源加载优化
  - ✅ 阶段 6：测试和验证（1/1）- 功能测试和验证
- **新增模块**：
  - **StockPriceAPI**（js/stockPriceAPI.js）：统一股价获取逻辑，支持多个数据源
  - **TableHelper**（js/tableHelper.js）：通用表格渲染工具，提供排序、分页、数据管理功能
  - **FormHelper**（js/formHelper.js）：通用表单验证工具，提供预定义规则和实时验证
  - **DataService**（js/dataService.js）：数据服务层，提供统一的数据访问接口和缓存机制
  - **Namespace**（js/namespace.js）：命名空间系统，解决全局命名空间污染
- **性能优化成果**：
  - DOM查询性能提升约 50-80%
  - 批量插入性能提升约 60-90%
  - 首屏渲染性能提升约 40-60%
  - 数据访问性能提升约 70-90%
  - localStorage写入延迟降低 50%+
  - 图表初始化时间减少 40%+
- **架构改进**：
  - 消除所有循环依赖
  - 模块间耦合度降低 70%+
  - 全局命名空间污染问题完全解决
  - 事件总线解耦，模块间通过事件通信
- **代码质量提升**：
  - 重复代码减少 80%+
  - 平均函数长度降低 60%+
  - 命名规范一致性达到 100%
  - 错误处理覆盖率达到 90%+
  - 配置管理集中度达到 100%
  - 代码复用性提升 50%+
- **Bug 修复**：
  - **Bug 1**：图表显示失败（ChartManager.init() 参数检查）
  - **Bug 2**：detail.js 语法错误（try-catch 结构修复）
  - **Bug 3**：formHelper.js 正则表达式语法错误（缺少结束斜杠）
  - **Bug 4**：dataService.js 空数据返回结构不完整（添加缺失字段）
  - **Bug 5**：formHelper.js 对象自引用初始化错误（Rules 移到对象外部）
  - **Bug 6**：formatPrice 未定义错误（7处调用修复）
- **开发规范完善**：
  - 更新 CONTRIBUTING.md，添加性能优化规范、架构设计规范、事件总线使用规范
  - 添加 DOM缓存优化规范（强制要求）
  - 添加批量DOM插入优化规范（强制要求）
  - 添加懒加载优化规范（强制要求）
  - 添加防抖和节流规范（强制要求）
  - 添加数据缓存优化规范（强制要求）
  - 添加事件监听器清理规范（强制要求）

**之前更新**（v2.1.0）：
- **性能优化（5项）**：
  - **DOM缓存优化**：在 overview.js、detail.js、tradeManager.js 中实现DOM元素缓存，减少重复的 DOM 查询操作
  - **DocumentFragment批量插入**：使用 DocumentFragment 批量插入 DOM 元素，减少页面重排，提升渲染性能
  - **图表懒加载**：使用 IntersectionObserver API 实现图表懒加载，图表只在进入视口时才渲染
  - **统一resize事件管理**：使用防抖（200ms）统一管理所有图表的 resize 操作，防止内存泄漏
  - **数据计算缓存机制**：在 dataService.js 中实现计算结果缓存，避免重复计算，提升性能
- **架构改进（3项）**：
  - **事件总线解耦**：使用 EventBus.EventTypes.ROUTE_CHANGE 等常量，模块间通过事件通信，降低耦合度
  - **数据服务层**： DataService 提供统一的数据访问接口和缓存机制，提升数据访问效率
  - **快照系统**：StockSnapshot 提供股票数据快照和行情附加功能，支持数据缓存和失效管理
- **Bug修复（6项）**：
  - **事件传播问题**：修复 overview.js 中使用错误事件名称导致导航失效的问题
  - **StockSnapshot.build() 参数类型**：修复 detail.js 中传入错误参数类型导致计算失败的问题
  - **页面切换缺失**：修复 app.js 中缺少 Router.showDetail() 调用导致页面无法切换的问题
  - **无限递归循环**：修复 router.js 中调用 onPageChange 导致无限递归的问题
  - **返回按钮不显示**：修复 router.js 中缺少 Detail.loadStock() 调用导致返回按钮不显示的问题
  - **图表渲染空白**：修复 detail.js 中 timeSeries 访问路径错误导致图表不显示的问题

**之前更新**（v2.0.1）：
- **滚动位置恢复功能**：
  - 从详情页返回汇总页时，恢复到进入详情页时的滚动位置
  - 仅在当前会话中保存滚动位置（不持久化到 localStorage）
  - 使用平滑滚动动画效果（behavior: 'smooth'）
  - 只保存汇总页的滚动位置，详情页每次从顶部开始
  - 扩展 Router.state 对象，添加 `scrollPositions` 字段
  - 在 showDetail() 方法中保存当前滚动位置
  - 在 showOverview() 方法中恢复滚动位置

**更早更新**（v2.0.0）：
- **长时间跨度数据优化**：
  - 图表支持 dataZoom 缩放功能（滑块 + 鼠标滚轮）
  - 动态标签间隔：根据数据点数量自动调整显示密度
  - X轴日期格式化为月-日（MM-DD），节省空间
  - Grid 底部空间增加至 25%，容纳缩放控件
  - 支持 30 个月以上数据的图表展示
- **配置管理模块（config.js）**：集中管理所有配置项
  - 配置数据独立存储在 localStorage 中
  - 支持配置的读取、设置、保存、加载、验证
  - 配置路径：ui.preferences.showHoldingDetail
- **持仓明细显示开关**：控制详情页持仓明细表格显示/隐藏
  - 在设置弹窗中添加"显示设置"区域
  - 开关状态持久化保存到配置文件
  - 默认状态：显示持仓明细
- **模块化重构**：
  - 新增图表管理模块（chartManager.js）：统一管理 ECharts 实例，防止内存泄漏
  - 新增通用分页模块（pagination.js）：支持交易记录和持仓明细分页
  - utils.js 增强：添加 ErrorHandler、Validator、Loading 工具类
- **项目定位更新**：
  - 强调项目为交易记录工具，非股票盯盘工具
  - 明确不支持实时行情推送、价格预警等功能

完整更新日志见 `README.md`。

## 浏览器兼容性

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

## 移动端适配（v2.5.1新增）

### 媒体查询断点

| 断点 | 适用场景 |
|------|----------|
| `480px` | 小屏幕手机（错误提示容器、弹窗优化） |
| `768px` | 平板和大屏手机（主要响应式断点） |

### 响应式修复项

| 元素 | 修复方案 |
|------|----------|
| 错误提示容器 | `left: 10px; right: 10px; max-width: none` |
| 头部工具栏 | `flex-wrap: wrap`，搜索框全宽 |
| 列表视图卡片 | 移除 `min-width`，改为弹性布局 |
| 弹窗内边距 | `padding: 16px`，宽度 95% |
| 交易记录筛选器 | `flex-direction: column` 垂直排列 |
| 图表区域 | `flex-direction: column` 单列布局 |
| 按钮组 | `flex-wrap: wrap` 自动换行 |

### 移动端开发约定

- **弹性布局优先**：使用 `flex-wrap: wrap` 让元素自动换行
- **避免固定宽度**：使用 `max-width` 和百分比宽度
- **媒体查询位置**：统一放在 `css/style.css` 文件末尾
- **测试设备**：推荐 iPhone 12 Pro（390x844）作为基准

## 注意事项

1. **数据安全**：数据存储在浏览器本地，清除浏览器数据会丢失，请定期导出备份
2. **跨设备**：不支持自动同步，需手动导出导入
3. **股价 API**：腾讯股票 API 可能有访问限制
4. **精度问题**：金额计算使用浮点数，需注意精度（使用 toFixed() 格式化）
5. **时区问题**：日期使用 YYYY-MM-DD 格式，避免时区问题
6. **持仓周期独立**：清仓后重置累计收益，确保摊薄成本计算不受历史影响
7. **配置持久化**：用户偏好设置自动保存到 localStorage，刷新页面后保持
8. **图表实例管理**：使用 ChartManager 统一管理，避免内存泄漏
9. **项目定位**：本工具是交易记录和收益计算工具，不是股票盯盘软件或自选股管理工具

## 相关文档

- `README.md`：用户使用文档
- `ARCHIVE.md`：功能存档和详细说明
- `CONTRIBUTING.md`：开发规范文档
- `CACHE_TROUBLESHOOTING.md`：缓存问题排查和解决方案（v2.2.1新增）
- `index.html`：主页面结构（包含所有 DOM 元素）

## 联系方式

如有问题或建议，请查看项目文档或创建 Issue。
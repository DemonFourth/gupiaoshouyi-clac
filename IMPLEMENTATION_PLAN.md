# 功能优化执行计划

> **项目**: 股票收益计算器
> **版本**: v2.4.4 → v2.5.0
> **创建日期**: 2026-04-17
> **执行范围**: 深色/浅色主题切换、骨架屏加载、备注功能

---

## Cloudflare Pages 部署兼容性分析

### ✅ 兼容性结论
**所有功能完全兼容Cloudflare Pages部署，无冲突风险。**

### 详细分析

#### 1. 深色/浅色主题切换
**使用技术**: localStorage + CSS变量

**兼容性分析**:
- ✅ **localStorage**: Cloudflare Pages部署后，localStorage正常工作
- ✅ **CSS变量**: 纯前端技术，无服务端依赖
- ✅ **数据存储**: 主题偏好存储在localStorage，不占用D1数据库
- ✅ **跨设备同步**: 主题偏好是设备级设置，不需要跨设备同步

**潜在问题**: 无

**解决方案**: 无需特殊处理

---

#### 2. 骨架屏加载
**使用技术**: CSS动画 + DOM操作

**兼容性分析**:
- ✅ **CSS动画**: 纯前端技术，无服务端依赖
- ✅ **DOM操作**: 标准JavaScript API，兼容性良好
- ✅ **性能**: CSS动画性能优秀，不增加服务器负担
- ✅ **数据加载**: 不改变现有数据加载逻辑

**潜在问题**: 无

**解决方案**: 无需特殊处理

---

#### 3. 备注功能
**使用技术**: 数据结构扩展 + localStorage/D1混合存储

**兼容性分析**:
- ✅ **数据结构**: 扩展交易记录对象，添加`note`字段
- ✅ **向后兼容**: 旧数据无`note`字段时自动填充空字符串
- ✅ **混合存储**: 兼容现有的localStorage + D1混合存储策略
- ✅ **数据同步**: 备注数据随交易记录一起同步到D1

**潜在问题**: 
- ⚠️ **数据迁移**: 旧数据需要归一化处理

**解决方案**: 
- 已在执行计划中包含数据归一化方法`normalizeTrade()`
- 加载数据时自动处理缺失的`note`字段
- 不需要手动数据迁移

---

### 数据存储策略

#### 现有存储策略（保持不变）
```
本地开发 (file://):
  └─ 仅使用 localStorage

Cloudflare Pages部署:
  ├─ localStorage (即时响应)
  └─ Cloudflare D1 (云端持久化)
```

#### 新功能存储策略

| 功能 | 存储位置 | 是否同步到D1 | 说明 |
|------|---------|-------------|------|
| 主题偏好 | localStorage | ❌ 否 | 设备级设置，不需要同步 |
| 骨架屏 | 无存储 | ❌ 否 | 纯UI效果，无数据 |
| 备注数据 | localStorage + D1 | ✅ 是 | 随交易记录一起存储 |

---

### 部署注意事项

#### 1. 缓存策略
- ✅ CSS文件更新后，需要更新版本号（如`style.css?v=20260417`）
- ✅ JS文件更新后，浏览器会自动重新加载
- ✅ 无需修改Cloudflare Pages配置

#### 2. 数据兼容性
- ✅ 旧数据自动兼容，无需手动迁移
- ✅ 新字段有默认值处理
- ✅ 不影响现有数据结构

#### 3. 性能影响
- ✅ 主题切换：无性能影响
- ✅ 骨架屏：提升感知性能
- ✅ 备注功能：数据量增加极小（每条记录最多100字节）

#### 4. 浏览器兼容性
- ✅ CSS变量：所有现代浏览器支持
- ✅ localStorage：所有现代浏览器支持
- ✅ CSS动画：所有现代浏览器支持

---

### 测试建议

#### 本地测试
1. 使用`file://`协议打开，测试localStorage功能
2. 测试主题切换、骨架屏、备注功能
3. 验证数据保存和读取正确

#### Cloudflare Pages测试
1. 部署到Cloudflare Pages
2. 测试主题切换是否持久化
3. 测试备注数据是否同步到D1
4. 测试跨设备数据同步
5. 验证旧数据兼容性

---

### 回滚方案

如果部署后发现问题，可以快速回滚：

#### 主题切换回滚
- 删除主题切换按钮HTML
- 删除主题相关CSS变量
- 删除主题切换JS代码
- localStorage中的`theme`键不影响其他功能

#### 骨架屏回滚
- 删除骨架屏CSS样式
- 删除骨架屏生成函数
- 移除骨架屏显示逻辑
- 不影响数据

#### 备注功能回滚
- 删除备注输入框HTML
- 删除备注列显示
- 数据中的`note`字段不影响现有功能
- 旧数据读取时自动忽略`note`字段

---

## 执行概览

### 功能列表
1. ✨ 深色/浅色主题切换（优先级：高）
2. ✨ 骨架屏加载（优先级：中）
3. ✨ 备注功能（优先级：高）
4. ⏸️ 定投记录（暂不执行，等待全部优化完成后开发）

### 预计工作量
- **深色/浅色主题切换**: 2-3小时
- **骨架屏加载**: 4-5小时
- **备注功能**: 3-4小时
- **总计**: 9-12小时

### 执行顺序
```
阶段1: 深色/浅色主题切换 (立即提升视觉体验)
   ↓
阶段2: 备注功能 (增强数据记录能力)
   ↓
阶段3: 骨架屏加载 (提升加载体验)
   ↓
阶段4: 定投记录 (等待批准后执行)
```

---

## 功能1: 深色/浅色主题切换

### 1.1 功能描述
- 添加主题切换按钮，支持深色/浅色主题切换
- 使用localStorage持久化用户主题偏好
- 平滑过渡动画，提升用户体验

### 1.2 技术方案
**核心技术**: CSS变量 + localStorage + 过渡动画

**实现原理**:
1. 使用CSS变量定义两套主题配色
2. 通过`data-theme`属性切换主题
3. localStorage保存用户选择
4. 页面加载时自动应用保存的主题

### 1.3 详细执行步骤

#### 步骤1: 扩展CSS变量 (css/style.css)
**位置**: 文件开头的`:root`部分

**任务**:
```css
/* 现有深色主题变量保持不变 */

/* 新增浅色主题变量 */
[data-theme="light"] {
  /* 背景色 */
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f3f5;
  --bg-card: rgba(0, 0, 0, 0.04);
  --bg-card-hover: rgba(0, 0, 0, 0.08);
  
  /* 文字颜色 */
  --text-primary: #1a1a2e;
  --text-secondary: rgba(26, 26, 46, 0.7);
  --text-muted: rgba(26, 26, 46, 0.5);
  
  /* 盈亏颜色（保持不变） */
  --color-profit: #e94560;
  --color-profit-bg: rgba(233, 69, 96, 0.1);
  --color-profit-border: rgba(233, 69, 96, 0.2);
  --color-loss: #2ed573;
  --color-loss-bg: rgba(46, 213, 115, 0.1);
  --color-loss-border: rgba(46, 213, 115, 0.2);
  
  /* 边框 */
  --border-color: rgba(0, 0, 0, 0.1);
  --border-color-hover: rgba(0, 0, 0, 0.2);
  
  /* 阴影（浅色主题需要更明显的阴影） */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.16);
}

/* 添加主题过渡动画 */
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}
```

**验收标准**:
- [ ] 浅色主题变量定义完整
- [ ] 所有颜色变量都有对应浅色版本
- [ ] 过渡动画平滑自然

#### 步骤2: 添加主题切换按钮 (index.html)
**位置**: `.header-right-actions`容器内，设置按钮前

**任务**:
```html
<!-- 在设置按钮前添加主题切换按钮 -->
<div class="header-right-actions">
    <!-- 新增：主题切换按钮 -->
    <button type="button" id="themeToggleBtn" class="theme-toggle-btn" title="切换主题">
        <svg class="theme-icon-dark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg class="theme-icon-light" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
    </button>
    
    <!-- 现有的搜索框和设置按钮 -->
    <div class="search-container">...</div>
    <button type="button" id="settingsBtn">...</button>
</div>
```

**验收标准**:
- [ ] 主题切换按钮显示正确
- [ ] 图标切换正常（太阳/月亮）
- [ ] 按钮位置合理

#### 步骤3: 添加按钮样式 (css/style.css)
**位置**: 按钮样式区域

**任务**:
```css
/* 主题切换按钮样式 */
.theme-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.theme-toggle-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-color-hover);
}

/* 深色主题显示月亮图标，浅色主题显示太阳图标 */
[data-theme="dark"] .theme-icon-dark { display: block; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="light"] .theme-icon-dark { display: none; }
[data-theme="light"] .theme-icon-light { display: block; }
```

**验收标准**:
- [ ] 按钮样式与整体风格一致
- [ ] hover效果正常
- [ ] 图标切换正确

#### 步骤4: 实现主题切换逻辑 (js/app.js)
**位置**: App初始化部分

**任务**:
```javascript
// 在App对象中添加主题管理方法
const App = {
    // ... 现有代码 ...
    
    /**
     * 初始化主题
     */
    initTheme() {
        // 从localStorage读取保存的主题，默认为深色
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(savedTheme);
        
        // 绑定主题切换按钮事件
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.applyTheme(newTheme);
            });
        }
    },
    
    /**
     * 应用主题
     * @param {string} theme - 'dark' 或 'light'
     */
    applyTheme(theme) {
        // 设置data-theme属性
        document.documentElement.setAttribute('data-theme', theme);
        
        // 保存到localStorage
        localStorage.setItem('theme', theme);
        
        // 更新按钮图标（通过CSS自动处理）
        console.log(`主题已切换为: ${theme}`);
    },
    
    // 在init方法中调用
    init() {
        // ... 现有初始化代码 ...
        
        // 初始化主题
        this.initTheme();
        
        // ... 其他初始化代码 ...
    }
};
```

**验收标准**:
- [ ] 页面加载时自动应用保存的主题
- [ ] 点击按钮能正常切换主题
- [ ] 刷新页面后主题保持不变
- [ ] 控制台输出切换日志

### 1.4 测试计划
**测试场景**:
1. 首次访问 - 默认深色主题
2. 切换到浅色主题 - 所有元素颜色正确
3. 刷新页面 - 主题保持浅色
4. 切换回深色主题 - 所有元素颜色正确
5. 多次快速切换 - 无闪烁、无卡顿

**测试要点**:
- 所有文字颜色清晰可读
- 所有背景色协调统一
- 盈亏颜色对比明显
- 图表颜色适配正确
- 弹窗、按钮样式正常

### 1.5 验收标准
- [ ] 深色/浅色主题切换正常
- [ ] 所有页面元素颜色适配正确
- [ ] 主题偏好持久化保存
- [ ] 切换动画平滑自然
- [ ] 无控制台错误
- [ ] 不影响现有功能

---

## 功能2: 骨架屏加载

### 2.1 功能描述
- 数据加载时显示骨架屏，提升感知速度
- 应用场景：股票列表、交易记录表格、图表区域
- 使用CSS动画实现闪烁效果

### 2.2 技术方案
**核心技术**: CSS动画 + 状态管理

**实现原理**:
1. 设计骨架屏HTML结构，模拟真实内容布局
2. 使用CSS渐变动画实现闪烁效果
3. 数据加载前显示骨架屏，加载后替换为真实内容

### 2.3 详细执行步骤

#### 步骤1: 创建骨架屏样式 (css/style.css)
**位置**: 新增骨架屏样式区域

**任务**:
```css
/* ==================== 骨架屏样式 ==================== */

/* 骨架屏基础样式 */
.skeleton {
    position: relative;
    overflow: hidden;
    background: var(--bg-card);
    border-radius: var(--radius-sm);
}

/* 骨架屏闪烁动画 */
.skeleton::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
    );
    animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* 股票卡片骨架屏 */
.skeleton-stock-card {
    padding: var(--card-padding);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
}

.skeleton-stock-card .skeleton-line {
    height: 16px;
    margin-bottom: 8px;
    border-radius: 4px;
}

.skeleton-stock-card .skeleton-line.title {
    width: 60%;
    height: 20px;
}

.skeleton-stock-card .skeleton-line.value {
    width: 80%;
    height: 28px;
}

.skeleton-stock-card .skeleton-line.small {
    width: 40%;
    height: 14px;
}

/* 表格骨架屏 */
.skeleton-table {
    width: 100%;
}

.skeleton-table-row {
    display: flex;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
}

.skeleton-table-row .skeleton-cell {
    height: 16px;
    margin-right: 16px;
    border-radius: 4px;
}

.skeleton-table-row .skeleton-cell:nth-child(1) { width: 15%; }
.skeleton-table-row .skeleton-cell:nth-child(2) { width: 20%; }
.skeleton-table-row .skeleton-cell:nth-child(3) { width: 15%; }
.skeleton-table-row .skeleton-cell:nth-child(4) { width: 15%; }
.skeleton-table-row .skeleton-cell:nth-child(5) { width: 20%; }
.skeleton-table-row .skeleton-cell:nth-child(6) { width: 15%; }

/* 图表骨架屏 */
.skeleton-chart {
    width: 100%;
    height: 300px;
    background: var(--bg-card);
    border-radius: var(--radius-md);
}

/* 统计卡片骨架屏 */
.skeleton-stat-card {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
}

.skeleton-stat-card .skeleton-line {
    height: 14px;
    margin-bottom: 8px;
    border-radius: 4px;
}

.skeleton-stat-card .skeleton-line.value {
    width: 70%;
    height: 32px;
}
```

**验收标准**:
- [ ] 骨架屏样式定义完整
- [ ] 闪烁动画流畅自然
- [ ] 适配深色/浅色主题

#### 步骤2: 创建骨架屏生成函数 (js/utils.js)
**位置**: Utils对象中新增方法

**任务**:
```javascript
const Utils = {
    // ... 现有方法 ...
    
    /**
     * 生成股票卡片骨架屏
     * @param {number} count - 数量
     * @returns {string} HTML字符串
     */
    generateStockCardSkeleton(count = 6) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-stock-card skeleton">
                    <div class="skeleton-line title skeleton"></div>
                    <div class="skeleton-line value skeleton"></div>
                    <div class="skeleton-line small skeleton"></div>
                    <div class="skeleton-line small skeleton"></div>
                </div>
            `;
        }
        return html;
    },
    
    /**
     * 生成表格骨架屏
     * @param {number} rows - 行数
     * @returns {string} HTML字符串
     */
    generateTableSkeleton(rows = 10) {
        let html = '<div class="skeleton-table">';
        for (let i = 0; i < rows; i++) {
            html += `
                <div class="skeleton-table-row">
                    <div class="skeleton-cell skeleton"></div>
                    <div class="skeleton-cell skeleton"></div>
                    <div class="skeleton-cell skeleton"></div>
                    <div class="skeleton-cell skeleton"></div>
                    <div class="skeleton-cell skeleton"></div>
                    <div class="skeleton-cell skeleton"></div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    },
    
    /**
     * 生成图表骨架屏
     * @returns {string} HTML字符串
     */
    generateChartSkeleton() {
        return '<div class="skeleton-chart skeleton"></div>';
    },
    
    /**
     * 生成统计卡片骨架屏
     * @param {number} count - 数量
     * @returns {string} HTML字符串
     */
    generateStatCardSkeleton(count = 4) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-stat-card skeleton">
                    <div class="skeleton-line skeleton"></div>
                    <div class="skeleton-line value skeleton"></div>
                </div>
            `;
        }
        return html;
    }
};
```

**验收标准**:
- [ ] 骨架屏生成函数实现完整
- [ ] 返回的HTML结构正确
- [ ] 参数控制正常

#### 步骤3: 在汇总页应用骨架屏 (js/overview.js)
**位置**: Overview对象的数据加载部分

**任务**:
```javascript
const Overview = {
    // ... 现有代码 ...
    
    /**
     * 显示股票列表骨架屏
     */
    showStockListSkeleton() {
        const holdingList = document.getElementById('holdingStocksList');
        const clearedList = document.getElementById('clearedStocksList');
        
        if (holdingList) {
            holdingList.innerHTML = Utils.generateStockCardSkeleton(6);
        }
        if (clearedList) {
            clearedList.innerHTML = Utils.generateStockCardSkeleton(3);
        }
    },
    
    /**
     * 渲染股票列表（修改现有方法）
     */
    renderStockList() {
        // 显示骨架屏
        this.showStockListSkeleton();
        
        // 异步加载真实数据
        setTimeout(() => {
            // ... 原有的渲染逻辑 ...
        }, 100); // 模拟加载延迟，实际使用时可以移除setTimeout
    }
};
```

**验收标准**:
- [ ] 汇总页加载时显示骨架屏
- [ ] 数据加载后骨架屏消失
- [ ] 不影响现有渲染逻辑

#### 步骤4: 在详情页应用骨架屏 (js/detail.js)
**位置**: Detail对象的数据加载部分

**任务**:
```javascript
const Detail = {
    // ... 现有代码 ...
    
    /**
     * 显示详情页骨架屏
     */
    showDetailSkeleton() {
        // 显示统计卡片骨架屏
        const statsSection = document.querySelector('.realtime-info-v2');
        if (statsSection) {
            statsSection.innerHTML = Utils.generateStatCardSkeleton(4);
        }
        
        // 显示交易记录表格骨架屏
        const tradeTable = document.getElementById('tradeTableBody');
        if (tradeTable) {
            tradeTable.innerHTML = Utils.generateTableSkeleton(10);
        }
        
        // 显示图表骨架屏
        const chartContainers = document.querySelectorAll('.charts-container');
        chartContainers.forEach(container => {
            container.innerHTML = Utils.generateChartSkeleton();
        });
    },
    
    /**
     * 渲染详情页（修改现有方法）
     */
    render(stockCode) {
        // 显示骨架屏
        this.showDetailSkeleton();
        
        // 异步加载真实数据
        setTimeout(() => {
            // ... 原有的渲染逻辑 ...
        }, 100);
    }
};
```

**验收标准**:
- [ ] 详情页加载时显示骨架屏
- [ ] 各区域骨架屏显示正确
- [ ] 数据加载后正常显示

#### 步骤5: 在交易记录页应用骨架屏 (js/tradeRecords.js)
**位置**: TradeRecords对象的数据加载部分

**任务**:
```javascript
const TradeRecords = {
    // ... 现有代码 ...
    
    /**
     * 显示交易记录页骨架屏
     */
    showTradeRecordsSkeleton() {
        // 显示统计卡片骨架屏
        const statsSection = document.querySelector('.tr-stats-section');
        if (statsSection) {
            statsSection.innerHTML = Utils.generateStatCardSkeleton(3);
        }
        
        // 显示表格骨架屏
        const tableContainer = document.querySelector('.trade-records-table-container');
        if (tableContainer) {
            tableContainer.innerHTML = Utils.generateTableSkeleton(20);
        }
    },
    
    /**
     * 渲染交易记录页（修改现有方法）
     */
    render() {
        // 显示骨架屏
        this.showTradeRecordsSkeleton();
        
        // 异步加载真实数据
        setTimeout(() => {
            // ... 原有的渲染逻辑 ...
        }, 100);
    }
};
```

**验收标准**:
- [ ] 交易记录页加载时显示骨架屏
- [ ] 骨架屏布局与真实内容一致
- [ ] 数据加载后正常显示

### 2.4 测试计划
**测试场景**:
1. 汇总页首次加载 - 显示股票卡片骨架屏
2. 详情页首次加载 - 显示统计、表格、图表骨架屏
3. 交易记录页首次加载 - 显示统计、表格骨架屏
4. 数据加载完成 - 骨架屏平滑过渡到真实内容
5. 网络慢速模拟 - 骨架屏持续显示

**测试要点**:
- 骨架屏布局与真实内容一致
- 闪烁动画流畅不卡顿
- 过渡自然无跳跃
- 适配深色/浅色主题

### 2.5 验收标准
- [ ] 所有页面加载时显示骨架屏
- [ ] 骨架屏布局与真实内容匹配
- [ ] 闪烁动画流畅自然
- [ ] 数据加载后平滑过渡
- [ ] 不影响现有功能
- [ ] 无控制台错误

---

## 功能3: 备注功能

### 3.1 功能描述
- 支持给交易记录添加备注
- 备注可选填写，不影响现有数据
- 在交易记录表格中显示备注列

### 3.2 技术方案
**核心技术**: 数据结构扩展 + UI输入框

**实现原理**:
1. 在交易记录对象中添加`note`字段
2. 在交易表单中添加备注输入框
3. 在交易记录表格中显示备注列
4. 数据兼容性处理（旧数据无备注字段）

### 3.3 详细执行步骤

#### 步骤1: 扩展数据结构 (js/dataManager.js)
**位置**: 数据验证和保存部分

**任务**:
```javascript
const DataManager = {
    // ... 现有代码 ...
    
    /**
     * 归一化交易记录数据
     * 确保所有交易记录都有note字段（向后兼容）
     * @param {Object} trade - 交易记录
     */
    normalizeTrade(trade) {
        if (!trade) return trade;
        
        // 确保note字段存在，默认为空字符串
        if (trade.note === undefined || trade.note === null) {
            trade.note = '';
        }
        
        return trade;
    },
    
    /**
     * 归一化所有交易记录
     * @param {Object} data - 完整数据
     */
    normalizeAllTrades(data) {
        if (!data || !data.stocks) return;
        
        data.stocks.forEach(stock => {
            if (stock.trades && Array.isArray(stock.trades)) {
                stock.trades.forEach(trade => {
                    this.normalizeTrade(trade);
                });
            }
        });
    },
    
    /**
     * 保存数据（修改现有方法）
     */
    async save(data) {
        // 归一化所有交易记录
        this.normalizeAllTrades(data);
        
        // ... 原有的保存逻辑 ...
    }
};
```

**验收标准**:
- [ ] 数据归一化方法实现正确
- [ ] 旧数据兼容性处理正确
- [ ] 不影响现有数据结构

#### 步骤2: 添加备注输入框 (index.html)
**位置**: 交易表单中，手续费输入框后

**任务**:
```html
<!-- 在交易表单中添加备注输入框 -->
<div class="form-group">
    <label for="tradeNote">备注（可选）</label>
    <input type="text" id="tradeNote" class="form-input" 
           placeholder="如：定投买入、短线操作等" 
           maxlength="100">
</div>
```

**验收标准**:
- [ ] 备注输入框显示正确
- [ ] placeholder提示清晰
- [ ] 字数限制合理

#### 步骤3: 添加备注输入框样式 (css/style.css)
**位置**: 表单样式区域

**任务**:
```css
/* 备注输入框样式 */
#tradeNote {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 14px;
    transition: all var(--transition-fast);
}

#tradeNote:focus {
    outline: none;
    border-color: var(--border-color-hover);
    background: var(--bg-card-hover);
}

#tradeNote::placeholder {
    color: var(--text-muted);
}
```

**验收标准**:
- [ ] 输入框样式与整体风格一致
- [ ] focus效果正常
- [ ] placeholder颜色正确

#### 步骤4: 修改交易记录添加逻辑 (js/tradeManager.js)
**位置**: 添加交易记录的方法

**任务**:
```javascript
const TradeManager = {
    // ... 现有代码 ...
    
    /**
     * 添加交易记录（修改现有方法）
     */
    addTrade() {
        // ... 获取表单数据的现有代码 ...
        
        // 获取备注
        const noteInput = document.getElementById('tradeNote');
        const note = noteInput ? noteInput.value.trim() : '';
        
        // 构建交易记录对象
        const trade = {
            id: `trade_${Date.now()}`,
            date: tradeDate,
            type: tradeType,
            price: parseFloat(tradePrice),
            amount: parseInt(tradeAmount),
            fee: parseFloat(tradeFee),
            note: note  // 新增备注字段
        };
        
        // ... 保存交易记录的现有代码 ...
        
        // 清空备注输入框
        if (noteInput) {
            noteInput.value = '';
        }
    },
    
    /**
     * 编辑交易记录（修改现有方法）
     */
    editTrade(tradeId) {
        // ... 获取交易记录的现有代码 ...
        
        // 填充备注
        const noteInput = document.getElementById('editTradeNote');
        if (noteInput && trade.note !== undefined) {
            noteInput.value = trade.note || '';
        }
        
        // ... 其他编辑逻辑 ...
    },
    
    /**
     * 更新交易记录（修改现有方法）
     */
    updateTrade() {
        // ... 获取表单数据的现有代码 ...
        
        // 获取备注
        const noteInput = document.getElementById('editTradeNote');
        const note = noteInput ? noteInput.value.trim() : '';
        
        // 更新交易记录
        trade.note = note;
        
        // ... 保存更新的现有代码 ...
    }
};
```

**验收标准**:
- [ ] 添加交易时备注保存正确
- [ ] 编辑交易时备注显示正确
- [ ] 更新交易时备注更新正确
- [ ] 备注为空时正常处理

#### 步骤5: 在交易记录表格中显示备注 (js/tradeManager.js)
**位置**: 渲染交易记录表格的方法

**任务**:
```javascript
const TradeManager = {
    // ... 现有代码 ...
    
    /**
     * 渲染交易记录表格（修改现有方法）
     */
    renderTradeTable(trades) {
        // ... 现有的表格渲染逻辑 ...
        
        // 在表格行中添加备注列
        const row = `
            <tr>
                <td>${trade.date}</td>
                <td>${tradeTypeName}</td>
                <td>${trade.price.toFixed(2)}</td>
                <td>${trade.amount}</td>
                <td>${trade.fee.toFixed(2)}</td>
                <td class="trade-note">${trade.note || '-'}</td>
                <td>
                    <button onclick="TradeManager.editTrade('${trade.id}')">编辑</button>
                    <button onclick="TradeManager.deleteTrade('${trade.id}')">删除</button>
                </td>
            </tr>
        `;
        
        // ... 其他渲染逻辑 ...
    }
};
```

**验收标准**:
- [ ] 备注列显示正确
- [ ] 无备注时显示'-'
- [ ] 表格布局正常

#### 步骤6: 添加备注列样式 (css/style.css)
**位置**: 表格样式区域

**任务**:
```css
/* 交易记录备注列样式 */
.trade-note {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 13px;
}

/* 备注列悬停显示完整内容 */
.trade-note:hover {
    overflow: visible;
    white-space: normal;
    word-break: break-all;
}
```

**验收标准**:
- [ ] 备注过长时截断显示
- [ ] 悬停时显示完整内容
- [ ] 样式与表格协调

#### 步骤7: 在编辑弹窗中添加备注输入框 (index.html)
**位置**: 编辑交易弹窗中

**任务**:
```html
<!-- 在编辑交易弹窗中添加备注输入框 -->
<div class="modal" id="editModal">
    <div class="modal-content">
        <!-- ... 现有的表单字段 ... -->
        
        <div class="form-group">
            <label for="editTradeNote">备注</label>
            <input type="text" id="editTradeNote" class="form-input" 
                   maxlength="100">
        </div>
        
        <!-- ... 现有的按钮 ... -->
    </div>
</div>
```

**验收标准**:
- [ ] 编辑弹窗中备注输入框显示正确
- [ ] 与添加表单样式一致

### 3.4 测试计划
**测试场景**:
1. 添加交易记录 - 填写备注，保存成功
2. 添加交易记录 - 不填写备注，保存成功
3. 查看交易记录表格 - 备注显示正确
4. 编辑交易记录 - 备注显示和修改正确
5. 旧数据兼容 - 无备注字段的旧数据显示为'-'

**测试要点**:
- 备注字段可选，不影响必填项
- 备注长度限制生效
- 表格显示正常
- 数据保存和读取正确
- 向后兼容旧数据

### 3.5 验收标准
- [ ] 备注输入框显示正确
- [ ] 备注保存和读取正确
- [ ] 交易记录表格显示备注列
- [ ] 编辑功能支持备注修改
- [ ] 旧数据兼容性处理正确
- [ ] 不影响现有功能
- [ ] 无控制台错误

---

## 执行检查清单

### 阶段1: 深色/浅色主题切换
- [ ] 步骤1: 扩展CSS变量
- [ ] 步骤2: 添加主题切换按钮
- [ ] 步骤3: 添加按钮样式
- [ ] 步骤4: 实现主题切换逻辑
- [ ] 测试通过
- [ ] 验收通过

### 阶段2: 骨架屏加载
- [ ] 步骤1: 创建骨架屏样式
- [ ] 步骤2: 创建骨架屏生成函数
- [ ] 步骤3: 在汇总页应用骨架屏
- [ ] 步骤4: 在详情页应用骨架屏
- [ ] 步骤5: 在交易记录页应用骨架屏
- [ ] 测试通过
- [ ] 验收通过

### 阶段3: 备注功能
- [ ] 步骤1: 扩展数据结构
- [ ] 步骤2: 添加备注输入框
- [ ] 步骤3: 添加备注输入框样式
- [ ] 步骤4: 修改交易记录添加逻辑
- [ ] 步骤5: 在交易记录表格中显示备注
- [ ] 步骤6: 添加备注列样式
- [ ] 步骤7: 在编辑弹窗中添加备注输入框
- [ ] 测试通过
- [ ] 验收通过

---

## 风险评估

### 技术风险
- **低风险**: 所有功能都基于现有技术栈，无新技术引入
- **数据风险**: 备注功能有完善的向后兼容处理
- **性能风险**: 骨架屏使用CSS动画，性能优秀

### 兼容性风险
- **浏览器兼容**: 所有功能都使用标准CSS和JS，兼容性良好
- **数据兼容**: 备注功能有数据归一化处理，兼容旧数据
- **功能兼容**: 所有功能独立实现，不影响现有功能

### 回滚方案
- 每个功能都可以独立回滚
- 数据结构向后兼容，回滚不影响数据
- CSS变量回滚只需删除新增样式

---

## 后续规划

### 定投记录功能（等待批准）
**状态**: ⏸️ 暂不执行

**功能描述**:
- 支持设置定投计划
- 自动生成定投交易记录
- 定投计划管理（添加/编辑/删除/暂停）

**预计工作量**: 6-8小时

**执行条件**: 前3个功能全部优化完成并获得用户批准后执行

---

## 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-04-17 | v1.0 | 创建执行计划文档 |

---

**注意**: 执行过程中请严格按照步骤顺序进行，每完成一个步骤请勾选对应的检查项。如遇到问题请及时记录并调整方案。

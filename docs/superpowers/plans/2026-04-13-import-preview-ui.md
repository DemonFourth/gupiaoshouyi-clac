# 导入数据预览弹窗 UI 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"导入数据预览"弹窗从简陋的文字列表升级为卡片式统计 + 可展开股票明细的现代化 UI。

**Architecture:** 分三层改动：数据层（`fileStorage.js` 扩展 `analyzeTrades` 返回具体记录列表）、模板层（`app.js` 的 `showImportPreview` 重写 HTML + 展开交互）、样式层（`css/style.css` 替换旧 import-* 样式，新增卡片/展开/表格样式）。不修改合并/覆盖业务逻辑。

**Tech Stack:** 原生 HTML + CSS + JavaScript，无构建工具，无外部依赖

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `js/fileStorage.js` | 修改 | `analyzeTrades()` 新增返回 `newItems`/`duplicateItems`；`analyzeImportData()` 传递记录列表 |
| `js/app.js` | 修改 | `showImportPreview()` 完全重写 HTML 模板 + 展开/收起方法 |
| `css/style.css` | 修改 | 替换 `.import-modal-content` 到 `.import-warning` 的所有旧样式，新增新样式 |
| `index.html` | 修改 | 弹窗按钮：`btn-danger` 改为 `btn-danger-outline`；取消按钮改为 `btn-ghost` |

---

## Task 1: 扩展 `fileStorage.js` — `analyzeTrades()` 返回具体记录

**Files:**
- Modify: `js/fileStorage.js:170-188`

- [ ] **Step 1: 修改 `analyzeTrades()` 返回 `newItems` 和 `duplicateItems`**

将 `js/fileStorage.js` 中 `analyzeTrades` 方法的完整实现替换为：

```javascript
analyzeTrades(currentTrades, importTrades) {
    const currentKeys = new Set(
        currentTrades.map(t => `${t.date}-${t.type}-${t.price}-${t.amount}`)
    );

    const newItems = [];
    const duplicateItems = [];

    importTrades.forEach(trade => {
        const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
        if (currentKeys.has(key)) {
            duplicateItems.push(trade);
        } else {
            newItems.push(trade);
        }
    });

    return {
        newCount: newItems.length,
        duplicateCount: duplicateItems.length,
        newItems,
        duplicateItems
    };
},
```

- [ ] **Step 2: 修改 `analyzeImportData()` 传递记录列表**

在 `js/fileStorage.js` 中，`analyzeImportData` 方法里 `existingStocks.push(...)` 的调用处，把 `newItems`/`duplicateItems` 加入推入的对象；`newStocks.push(...)` 处加入 `tradeItems`。

将：
```javascript
result.existingStocks.push({
    code: stock.code,
    name: stock.name,
    currentTrades: currentStock.trades.length,
    importTrades: stock.trades.length,
    newTrades: analysis.newCount,
    duplicateTrades: analysis.duplicateCount
});
```
改为：
```javascript
result.existingStocks.push({
    code: stock.code,
    name: stock.name,
    currentTrades: currentStock.trades.length,
    importTrades: stock.trades.length,
    newTrades: analysis.newCount,
    duplicateTrades: analysis.duplicateCount,
    newItems: analysis.newItems,
    duplicateItems: analysis.duplicateItems
});
```

将：
```javascript
result.newStocks.push({
    code: stock.code,
    name: stock.name,
    trades: stock.trades.length
});
```
改为：
```javascript
result.newStocks.push({
    code: stock.code,
    name: stock.name,
    trades: stock.trades.length,
    tradeItems: stock.trades
});
```

- [ ] **Step 3: 验证改动不影响现有 `mergeData` 调用**

搜索 `analyzeImportData` 的所有调用方，确认只有 `js/app.js:549` 一处，且它只读取 `newStocks`/`existingStocks`/`newTrades`/`duplicateTrades`，新增字段不破坏现有调用。

---

## Task 2: 重写 `app.js` — `showImportPreview()` 模板与展开交互

**Files:**
- Modify: `js/app.js:558-614`

- [ ] **Step 1: 新增辅助函数 `_buildTradeTypeLabel` 和 `_buildTradeRows`**

在 `app.js` 的 `showImportPreview` 方法**之前**，插入两个辅助函数（作为 App 对象的方法）：

```javascript
_buildTradeTypeLabel(type) {
    const map = { buy: '买入', sell: '卖出', dividend: '分红', tax: '红利税' };
    const cls = { buy: 'ip-badge-buy', sell: 'ip-badge-sell', dividend: 'ip-badge-div', tax: 'ip-badge-tax' };
    const label = map[type] || type;
    const klass = cls[type] || '';
    return `<span class="ip-trade-badge ${klass}">${label}</span>`;
},

_buildTradeRows(items, isDuplicate) {
    if (!items || items.length === 0) return '';
    return items.map(t => {
        const rowClass = isDuplicate ? 'ip-row-dup' : '';
        const status = isDuplicate
            ? `<span class="ip-status-dup">⊘ 重复</span>`
            : `<span class="ip-status-new">✅ 新增</span>`;
        return `
            <tr class="${rowClass}">
                <td>${t.date}</td>
                <td>${this._buildTradeTypeLabel(t.type)}</td>
                <td>¥${Number(t.price).toFixed(3)}</td>
                <td>${t.amount} 股</td>
                <td>${status}</td>
            </tr>`;
    }).join('');
},
```

- [ ] **Step 2: 重写 `showImportPreview()` 方法**

将 `js/app.js` 中整个 `showImportPreview(analysis)` 方法替换为：

```javascript
showImportPreview(analysis) {
    const modal = document.getElementById('importPreviewModal');
    const content = document.getElementById('importPreviewContent');

    // ── 统计卡片区 ──
    const statsHtml = `
        <div class="ip-stat-cards">
            <div class="ip-stat-card ip-stat-highlight">
                <span class="ip-stat-icon">📦</span>
                <div class="ip-stat-number">${analysis.newStocks.length}</div>
                <div class="ip-stat-label">新增股票</div>
            </div>
            <div class="ip-stat-card ip-stat-muted">
                <span class="ip-stat-icon">📋</span>
                <div class="ip-stat-number ip-stat-number-neutral">${analysis.existingStocks.length}</div>
                <div class="ip-stat-label">已存在股票</div>
            </div>
            <div class="ip-stat-card ip-stat-highlight">
                <span class="ip-stat-icon">📝</span>
                <div class="ip-stat-number">${analysis.newTrades}</div>
                <div class="ip-stat-label">新增记录</div>
            </div>
            <div class="ip-stat-card ip-stat-muted">
                <span class="ip-stat-icon">⏭</span>
                <div class="ip-stat-number ip-stat-number-muted">${analysis.duplicateTrades}</div>
                <div class="ip-stat-label">重复跳过</div>
            </div>
        </div>`;

    // ── 新增股票列表 ──
    let newStocksSectionHtml = '';
    if (analysis.newStocks.length > 0) {
        const rows = analysis.newStocks.map((s, i) => {
            const allRows = this._buildTradeRows(s.tradeItems, false);
            const detailHtml = allRows ? `
                <div class="ip-stock-detail" id="ip-detail-new-${i}">
                    <table class="ip-detail-table">
                        <thead><tr><th>日期</th><th>类型</th><th>价格</th><th>数量</th><th>状态</th></tr></thead>
                        <tbody>${allRows}</tbody>
                    </table>
                </div>` : '';
            const hasDetail = !!allRows;
            return `
                <div class="ip-stock-row">
                    <div class="ip-stock-row-header" onclick="App._toggleImportRow(this)" data-has-detail="${hasDetail}">
                        <div class="ip-stock-bar ip-bar-new"></div>
                        <div class="ip-stock-name">${s.name} <span>(${s.code})</span></div>
                        <div class="ip-stock-meta">
                            <span class="ip-meta-badge ip-meta-new">${s.trades}条记录</span>
                        </div>
                        ${hasDetail ? `<div class="ip-expand-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>` : ''}
                    </div>
                    ${detailHtml}
                </div>`;
        }).join('');
        newStocksSectionHtml = `
            <div class="ip-stock-section">
                <div class="ip-section-label">新增股票 (${analysis.newStocks.length})</div>
                ${rows}
            </div>`;
    }

    // ── 已存在股票列表 ──
    let existingStocksSectionHtml = '';
    if (analysis.existingStocks.length > 0) {
        const rows = analysis.existingStocks.map((s, i) => {
            const newRows = this._buildTradeRows(s.newItems, false);
            const dupRows = this._buildTradeRows(s.duplicateItems, true);
            const allRows = newRows + dupRows;
            const detailHtml = allRows ? `
                <div class="ip-stock-detail" id="ip-detail-exist-${i}">
                    <table class="ip-detail-table">
                        <thead><tr><th>日期</th><th>类型</th><th>价格</th><th>数量</th><th>状态</th></tr></thead>
                        <tbody>${allRows}</tbody>
                    </table>
                </div>` : '';
            const hasDetail = !!allRows;
            const metaBadges = s.newTrades === 0
                ? `<span class="ip-meta-badge ip-meta-dup">全部重复</span>`
                : `<span class="ip-meta-badge ip-meta-new">新增 ${s.newTrades} 条</span>
                   <span class="ip-meta-badge ip-meta-dup">重复 ${s.duplicateTrades} 条</span>`;
            return `
                <div class="ip-stock-row">
                    <div class="ip-stock-row-header" onclick="App._toggleImportRow(this)" data-has-detail="${hasDetail}">
                        <div class="ip-stock-bar ip-bar-exists"></div>
                        <div class="ip-stock-name">${s.name} <span>(${s.code})</span></div>
                        <div class="ip-stock-meta">${metaBadges}</div>
                        ${hasDetail ? `<div class="ip-expand-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>` : ''}
                    </div>
                    ${detailHtml}
                </div>`;
        }).join('');
        existingStocksSectionHtml = `
            <div class="ip-stock-section">
                <div class="ip-section-label">已存在股票 (${analysis.existingStocks.length})</div>
                ${rows}
            </div>`;
    }

    // ── 警告区 ──
    const warningHtml = `
        <div class="ip-warning-box">
            <svg class="ip-warning-icon" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span><strong>注意：</strong>覆盖数据将删除当前所有数据，请谨慎操作！</span>
        </div>`;

    content.innerHTML = statsHtml + newStocksSectionHtml + existingStocksSectionHtml + warningHtml;
    modal.style.display = 'block';
    this.closeSettingsModal();
},
```

- [ ] **Step 3: 新增 `_toggleImportRow()` 展开/收起方法**

在 `app.js` 的 `closeImportPreviewModal` 方法**之前**，插入：

```javascript
_toggleImportRow(header) {
    if (header.dataset.hasDetail !== 'true') return;
    const icon = header.querySelector('.ip-expand-icon');
    const detail = header.nextElementSibling;
    if (!detail) return;
    const isOpen = detail.classList.contains('ip-open');
    if (isOpen) {
        detail.classList.remove('ip-open');
        if (icon) icon.classList.remove('ip-open');
    } else {
        detail.classList.add('ip-open');
        if (icon) icon.classList.add('ip-open');
    }
},
```

---

## Task 3: 更新 `index.html` — 弹窗按钮样式

**Files:**
- Modify: `index.html:937-939`

- [ ] **Step 1: 修改弹窗按钮 class**

将：
```html
<button type="button" class="btn btn-primary" id="confirmImportMergeBtn">合并数据</button>
<button type="button" class="btn btn-danger" id="confirmImportOverwriteBtn">覆盖数据</button>
<button type="button" class="btn" id="cancelImportPreviewBtn">取消</button>
```
改为：
```html
<button type="button" class="btn btn-primary" id="confirmImportMergeBtn">合并数据</button>
<button type="button" class="btn btn-danger-outline" id="confirmImportOverwriteBtn">覆盖数据</button>
<button type="button" class="btn btn-ghost" id="cancelImportPreviewBtn">取消</button>
```

---

## Task 4: 更新 `css/style.css` — 替换旧样式，新增新样式

**Files:**
- Modify: `css/style.css:1479-1555`

- [ ] **Step 1: 替换 `.import-modal-content` 的 max-width**

将：
```css
.import-modal-content {
    position: relative;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}
```
改为：
```css
.import-modal-content {
    position: relative;
    max-width: 720px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}
```

- [ ] **Step 2: 替换 `.import-preview-body` 至 `.import-warning` 旧样式块**

找到 `css/style.css` 中从 `.import-preview-body {` 开始、到 `.import-warning` 结尾 `}` 的整块旧样式（约 1488-1555 行），**全部替换**为以下新样式：

```css
        .import-preview-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .import-preview-body::-webkit-scrollbar { width: 6px; }
        .import-preview-body::-webkit-scrollbar-track { background: transparent; }
        .import-preview-body::-webkit-scrollbar-thumb { background: #dde0ee; border-radius: 3px; }

        /* ── 统计卡片 ── */
        .ip-stat-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }

        .ip-stat-card {
            background: #f8f9ff;
            border-radius: 10px;
            padding: 14px 14px 12px;
            position: relative;
            overflow: hidden;
            border: 1px solid transparent;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .ip-stat-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            border-radius: 10px 0 0 10px;
        }

        .ip-stat-highlight::before { background: #667eea; }
        .ip-stat-muted::before     { background: #d0d4e8; }

        .ip-stat-card:hover {
            border-color: #e8eaf0;
            box-shadow: 0 2px 10px rgba(102,126,234,0.08);
        }

        .ip-stat-icon {
            font-size: 18px;
            margin-bottom: 8px;
            display: block;
            line-height: 1;
        }

        .ip-stat-number {
            font-size: 26px;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 4px;
            color: #667eea;
        }

        .ip-stat-number-neutral { color: #333; }
        .ip-stat-number-muted   { color: #999; }

        .ip-stat-label {
            font-size: 12px;
            color: #666;
            font-weight: 500;
        }

        /* ── 股票分区 ── */
        .ip-stock-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .ip-section-label {
            font-size: 12px;
            font-weight: 600;
            color: #999;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            padding: 0 2px;
            margin-bottom: 2px;
        }

        /* ── 股票行 ── */
        .ip-stock-row {
            border-radius: 8px;
            border: 1px solid #e8eaf0;
            overflow: hidden;
            background: #fff;
            transition: box-shadow 0.15s;
        }

        .ip-stock-row:hover { box-shadow: 0 2px 10px rgba(102,126,234,0.1); }

        .ip-stock-row-header {
            display: flex;
            align-items: center;
            padding: 11px 14px;
            cursor: pointer;
            position: relative;
            gap: 10px;
            transition: background 0.15s;
        }

        .ip-stock-row-header:hover { background: rgba(102,126,234,0.04); }

        .ip-stock-bar {
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
        }

        .ip-bar-new    { background: #667eea; }
        .ip-bar-exists { background: #ff9800; }

        .ip-stock-name {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: #1a1a2e;
            padding-left: 4px;
        }

        .ip-stock-name span {
            font-weight: 400;
            color: #999;
            font-size: 12px;
            margin-left: 4px;
        }

        .ip-stock-meta {
            font-size: 12px;
            color: #666;
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .ip-meta-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 7px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }

        .ip-meta-new { background: rgba(102,126,234,0.1); color: #667eea; }
        .ip-meta-dup { background: #f5f5f5; color: #999; }

        .ip-expand-icon {
            color: #999;
            transition: transform 0.25s;
            flex-shrink: 0;
            width: 20px; height: 20px;
            display: flex; align-items: center; justify-content: center;
        }

        .ip-expand-icon.ip-open { transform: rotate(180deg); }

        /* ── 展开明细 ── */
        .ip-stock-detail {
            border-top: 1px solid #e8eaf0;
            background: #fafbff;
            overflow: hidden;
            max-height: 0;
            transition: max-height 0.3s ease;
        }

        .ip-stock-detail.ip-open {
            max-height: 240px;
            overflow-y: auto;
        }

        .ip-detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
        }

        .ip-detail-table thead tr { background: #f0f2ff; }

        .ip-detail-table th {
            padding: 8px 14px;
            font-weight: 600;
            color: #666;
            text-align: left;
            font-size: 11.5px;
            letter-spacing: 0.3px;
            white-space: nowrap;
        }

        .ip-detail-table td {
            padding: 8px 14px;
            color: #1a1a2e;
            border-top: 1px solid #eef0f8;
            white-space: nowrap;
        }

        .ip-row-dup td { color: #999; background: #fafafa; }
        .ip-row-dup .ip-trade-badge { opacity: 0.5; }

        .ip-detail-table tbody tr:hover { background: rgba(102,126,234,0.03); }

        /* ── 交易类型徽章（仅用于导入预览详情表格）── */
        .ip-trade-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
        }

        .ip-badge-buy  { background: #e3f2fd; color: #1565c0; }
        .ip-badge-sell { background: #fce4ec; color: #c62828; }
        .ip-badge-div  { background: #e8f5e9; color: #2e7d32; }
        .ip-badge-tax  { background: #fff3e0; color: #e65100; }

        /* ── 状态指示器 ── */
        .ip-status-new {
            display: inline-flex; align-items: center; gap: 3px;
            color: #2e7d32; font-weight: 600; font-size: 12px;
        }

        .ip-status-dup {
            display: inline-flex; align-items: center; gap: 3px;
            color: #999; font-weight: 500; font-size: 12px;
        }

        /* ── 警告区 ── */
        .ip-warning-box {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background: #fff8f0;
            border: 1px solid #ffd199;
            border-left: 4px solid #ff9800;
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 13px;
            color: #b84c00;
            line-height: 1.5;
        }

        .ip-warning-icon {
            flex-shrink: 0;
            width: 18px; height: 18px;
            margin-top: 1px;
        }
```

- [ ] **Step 3: 新增 `btn-danger-outline` 和 `btn-ghost` 样式**

在 `css/style.css` 中 `.btn-danger:hover { ... }` 块**之后**（约第 1015 行），插入：

```css
        .btn-danger-outline {
            background: transparent;
            color: #f44336;
            border: 2px solid #f44336;
        }

        .btn-danger-outline:hover {
            background: rgba(244, 67, 54, 0.06);
        }

        .btn-ghost {
            background: transparent;
            color: #666;
            border: none;
        }

        .btn-ghost:hover {
            color: #333;
            background: #f5f5f5;
        }
```

---

## Task 5: 运行 lint 验证语法

**Files:** 无文件改动

- [ ] **Step 1: 运行 lint**

```bash
cd D:\Code\iFlow\gupiaoshouyi-clac-D1 && npm run lint
```

预期输出：无 error，warnings 可忽略（格式类）。

- [ ] **Step 2: 如有 error，修复后重新运行直到通过**

常见问题：
- 模板字符串中未转义的特殊字符
- `_buildTradeTypeLabel`/`_buildTradeRows`/`_toggleImportRow` 是否正确放在 App 对象内（需要有逗号分隔）

- [ ] **Step 3: 浏览器打开 `index.html` 手动验证**

验证清单：
1. 设置 → 导入 JSON → 选择任意含数据的 JSON 文件
2. 弹窗显示4个统计卡片（新增股票/已存在/新增记录/重复跳过）
3. 股票行可点击展开，显示交易记录表格
4. 新增记录行绿色 ✅，重复记录行灰色 ⊘ 且整行弱化
5. 底部按钮：合并（主色填充）/ 覆盖（红色outline）/ 取消（文字）
6. 合并和覆盖功能仍正常工作

---

## 自检结果

**Spec coverage:**
- ✅ 弹窗扩大到 720px → Task 4 Step 1
- ✅ 统计卡片化 → Task 4 Step 2 + Task 2 Step 2
- ✅ 可展开股票行 → Task 2 Step 2 + Task 2 Step 3
- ✅ 展开后显示交易记录表格（日期/类型/价格/数量/状态）→ Task 2 Step 1 + 2
- ✅ 新增/重复跳过两种状态 → Task 2 Step 1
- ✅ 按钮权重优化 → Task 3 + Task 4 Step 3
- ✅ 警告区 SVG 图标 → Task 2 Step 2
- ✅ 数据层扩展 → Task 1

**Placeholder scan:** 无 TBD/TODO

**Type consistency:**
- `_buildTradeRows` 在 Task 2 Step 1 定义，在 Task 2 Step 2 调用 ✅
- `_toggleImportRow` 在 Task 2 Step 3 定义，在 Task 2 Step 2 的 `onclick` 中引用为 `App._toggleImportRow(this)` ✅
- `ip-open` class 在 CSS（Task 4 Step 2）和 JS（Task 2 Step 3）命名一致 ✅
- `ip-stock-detail` / `ip-expand-icon` 在 CSS 和 HTML 模板中一致 ✅

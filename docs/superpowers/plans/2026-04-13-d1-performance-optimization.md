# D1 性能优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 D1 数据保存性能，使添加交易后页面立即响应，消除 1-2 秒卡顿

**架构:** 采用异步保存 + 乐观更新策略，先更新本地存储和 UI，后台异步同步到 D1，同时添加保存状态指示器

**Tech Stack:** JavaScript (ES6+), Cloudflare D1, localStorage

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `js/dataManager.js` | 数据管理核心，保存逻辑 | 修改 |
| `js/app.js` | 应用入口，保存状态订阅 | 修改 |
| `index.html` | 页面结构，添加状态指示器 | 修改 |
| `css/style.css` | 状态指示器样式 | 修改 |
| `functions/api/[[path]].js` | D1 API 端点，初始化优化 | 修改 |

---

## Task 1: 添加保存状态管理到 DataManager

**Files:**
- Modify: `js/dataManager.js:16-30` (在现有属性后添加)

### Step 1: 添加保存状态相关属性

在 `js/dataManager.js` 中找到 `_storageMode: null,` 这一行，在其后添加：

```javascript
    // 存储模式缓存
    _storageMode: null,

    // 保存状态管理
    _saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
    _saveStatusCallbacks: [],
    _failedSaveQueue: [],
    _maxRetries: 3,
```

### Step 2: 添加保存状态管理方法

在 `getStorageMode()` 方法后（约第 61 行），添加以下方法：

```javascript
    /**
     * 获取当前保存状态
     * @returns {string} 'idle' | 'saving' | 'saved' | 'error'
     */
    getSaveStatus() {
        return this._saveStatus;
    },

    /**
     * 订阅保存状态变化
     * @param {Function} callback - 回调函数(status, error)
     */
    onSaveStatusChange(callback) {
        if (typeof callback === 'function') {
            this._saveStatusCallbacks.push(callback);
        }
    },

    /**
     * 取消订阅保存状态变化
     * @param {Function} callback - 回调函数
     */
    offSaveStatusChange(callback) {
        const index = this._saveStatusCallbacks.indexOf(callback);
        if (index > -1) {
            this._saveStatusCallbacks.splice(index, 1);
        }
    },

    /**
     * 触发保存状态事件
     * @param {string} status - 状态
     * @param {Error|null} error - 错误对象
     */
    _emitSaveStatus(status, error = null) {
        this._saveStatus = status;
        this._saveStatusCallbacks.forEach(cb => {
            try {
                cb(status, error);
            } catch (e) {
                console.error('保存状态回调执行失败:', e);
            }
        });
    },

    /**
     * 延迟函数
     * @param {number} ms - 毫秒
     * @returns {Promise}
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
```

### Step 3: 提交

```bash
git add js/dataManager.js
git commit -m "feat: add save status management to DataManager

- Add _saveStatus, _saveStatusCallbacks, _failedSaveQueue properties
- Add getSaveStatus(), onSaveStatusChange(), offSaveStatusChange()
- Add _emitSaveStatus() for status notifications
- Add _delay() helper for retry backoff"
```

---

## Task 2: 实现异步保存方法

**Files:**
- Modify: `js/dataManager.js:358-378` (_doSave 方法后)

### Step 1: 添加异步保存到 D1 的方法

在 `_doSave()` 方法后（约第 378 行），添加：

```javascript
    /**
     * 异步保存到 D1（带重试机制）
     * @param {Object} data - 要保存的数据
     */
    async _saveToD1Async(data) {
        this._emitSaveStatus('saving');

        try {
            await this._doSaveWithRetry(data);
            this._emitSaveStatus('saved');

            // 清空失败队列中相同的数据
            this._failedSaveQueue = this._failedSaveQueue.filter(
                item => item.lastModified !== data.lastModified
            );
        } catch (error) {
            console.error('D1 异步保存失败:', error);
            this._emitSaveStatus('error', error);
            this._queueFailedSave(data);
        }
    },

    /**
     * 带重试的保存
     * @param {Object} data - 要保存的数据
     */
    async _doSaveWithRetry(data) {
        let lastError;

        for (let attempt = 1; attempt <= this._maxRetries; attempt++) {
            try {
                return await this._doSave(data);
            } catch (error) {
                lastError = error;
                console.warn(`D1 保存尝试 ${attempt}/${this._maxRetries} 失败:`, error.message);

                if (attempt < this._maxRetries) {
                    // 指数退避: 1s, 2s, 4s
                    const delayMs = 1000 * Math.pow(2, attempt - 1);
                    await this._delay(delayMs);
                }
            }
        }

        throw lastError;
    },

    /**
     * 将失败的保存加入队列
     * @param {Object} data - 保存失败的数据
     */
    _queueFailedSave(data) {
        // 避免重复添加
        const exists = this._failedSaveQueue.some(
            item => item.lastModified === data.lastModified
        );

        if (!exists) {
            this._failedSaveQueue.push({
                data: data,
                lastModified: data.lastModified,
                failedAt: new Date().toISOString()
            });
        }
    },

    /**
     * 重试失败的保存
     * @returns {Promise<boolean>} 是否成功
     */
    async retryFailedSaves() {
        if (this._failedSaveQueue.length === 0) {
            return true;
        }

        console.log(`[DataManager] 重试 ${this._failedSaveQueue.length} 个失败的保存`);

        const queue = [...this._failedSaveQueue];
        this._failedSaveQueue = [];

        for (const item of queue) {
            try {
                await this._doSaveWithRetry(item.data);
            } catch (error) {
                // 再次失败，重新加入队列
                this._queueFailedSave(item.data);
            }
        }

        return this._failedSaveQueue.length === 0;
    },
```

### Step 2: 提交

```bash
git add js/dataManager.js
git commit -m "feat: implement async save with retry mechanism

- Add _saveToD1Async() for non-blocking D1 sync
- Add _doSaveWithRetry() with exponential backoff
- Add _queueFailedSave() for failed save tracking
- Add retryFailedSaves() for manual retry"
```

---

## Task 3: 修改 save() 方法为异步不等待模式

**Files:**
- Modify: `js/dataManager.js:544-589` (save 方法)

### Step 1: 重写 save() 方法

找到 `save()` 方法（约第 544 行），替换为：

```javascript
    /**
     * 保存数据（混合模式：先 localStorage，异步同步 D1）
     * 优化：不再等待 D1 保存完成，立即返回，后台异步同步
     */
    async save(data) {
        try {
            // 保存边界：确保分组与持仓一致
            this.normalizeAllGroups(data);

            // 1. 先保存到 localStorage（立即生效，零延迟）
            this.saveToLocalStorage(data);

            // 2. 更新内存缓存
            this._cache = data;
            this._cacheValid = true;

            // 3. 清除相关缓存
            if (StockProfitCalculator.StockSnapshot && StockProfitCalculator.StockSnapshot.clear) {
                StockProfitCalculator.StockSnapshot.clear();
            }
            if (StockProfitCalculator.DataService && StockProfitCalculator.DataService.invalidateAllCache) {
                StockProfitCalculator.DataService.invalidateAllCache();
            }

            // 4. 本地开发环境跳过 D1 同步
            if (!this._isLocalDevelopment()) {
                // 异步保存到 D1（不阻塞，不等待）
                this._saveToD1Async(data);
            }

            // 5. 触发数据变更事件（立即触发，不等待 D1）
            if (StockProfitCalculator.EventBus) {
                StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.DATA_CHANGED, data);
            }

            return true;
        } catch (error) {
            console.error('保存数据失败:', error);

            // 触发错误事件
            if (StockProfitCalculator.EventBus) {
                StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.ERROR_OCCURRED, {
                    source: 'DataManager.save',
                    error: error
                });
            }

            return false;
        }
    },
```

### Step 2: 提交

```bash
git add js/dataManager.js
git commit -m "perf: make save() non-blocking for instant UI response

- Remove await from _saveToD1Async() call
- UI updates immediately without waiting for D1
- D1 sync happens in background with status tracking
- Data consistency maintained via localStorage"
```

---

## Task 4: 添加页面关闭前保存检查

**Files:**
- Modify: `js/app.js` (在 init 方法中添加)

### Step 1: 在 App.init 中添加页面关闭检查

找到 `App.init()` 方法，在方法末尾（return 前）添加：

```javascript
        // 页面关闭前检查是否有未保存的数据
        window.addEventListener('beforeunload', (event) => {
            const DataManager = StockProfitCalculator.DataManager;
            if (DataManager && DataManager.getSaveStatus() === 'saving') {
                event.preventDefault();
                event.returnValue = '数据正在同步到云端，确定要离开吗？';
            }
        });

        return data;
```

### Step 2: 提交

```bash
git add js/app.js
git commit -m "feat: add beforeunload check for pending saves

- Warn user if data is still being synced when leaving page
- Prevents accidental data loss during D1 sync"
```

---

## Task 5: 添加保存状态指示器 UI

**Files:**
- Modify: `index.html` (在 header 区域添加)

### Step 1: 在页面头部添加状态指示器

找到 `<header class="app-header">` 区域，在 `</header>` 前添加：

```html
        <!-- 保存状态指示器 -->
        <div id="saveStatusIndicator" class="save-status-indicator" style="display: none;">
            <span class="save-status-icon"></span>
            <span class="save-status-text"></span>
        </div>
```

### Step 2: 提交

```bash
git add index.html
git commit -m "feat: add save status indicator to header

- Add saveStatusIndicator element with icon and text
- Hidden by default, shown via JavaScript"
```

---

## Task 6: 添加保存状态指示器样式

**Files:**
- Modify: `css/style.css` (在文件末尾添加)

### Step 1: 添加状态指示器样式

在 `css/style.css` 文件末尾添加：

```css
/* 保存状态指示器 */
.save-status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    margin-left: auto;
    margin-right: 16px;
}

.save-status-indicator.saving {
    background-color: #e3f2fd;
    color: #1976d2;
}

.save-status-indicator.saved {
    background-color: #e8f5e9;
    color: #388e3c;
}

.save-status-indicator.error {
    background-color: #ffebee;
    color: #d32f2f;
    cursor: pointer;
}

.save-status-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
}

/* 旋转动画 - 同步中 */
.save-status-indicator.saving .save-status-icon {
    border: 2px solid #1976d2;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

/* 对勾 - 已同步 */
.save-status-indicator.saved .save-status-icon::after {
    content: '✓';
    font-size: 14px;
    font-weight: bold;
}

/* 警告 - 失败 */
.save-status-indicator.error .save-status-icon::after {
    content: '!';
    font-size: 14px;
    font-weight: bold;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 移动端适配 */
@media (max-width: 768px) {
    .save-status-indicator {
        padding: 4px 8px;
        font-size: 12px;
        margin-right: 8px;
    }

    .save-status-icon {
        width: 14px;
        height: 14px;
    }
}
```

### Step 2: 提交

```bash
git add css/style.css
git commit -m "style: add save status indicator styles

- Add styles for saving, saved, and error states
- Include spinning animation for syncing state
- Responsive design for mobile"
```

---

## Task 7: 在 App 中添加状态指示器逻辑

**Files:**
- Modify: `js/app.js` (在 init 方法中添加订阅)

### Step 1: 添加状态指示器控制函数

在 `js/app.js` 中，找到 `App` 对象，添加以下方法：

```javascript
    /**
     * 显示保存状态指示器
     * @param {string} status - 'saving' | 'saved' | 'error'
     * @param {Error|null} error - 错误对象
     */
    showSaveStatus(status, error = null) {
        const indicator = document.getElementById('saveStatusIndicator');
        if (!indicator) return;

        const icon = indicator.querySelector('.save-status-icon');
        const text = indicator.querySelector('.save-status-text');

        // 移除所有状态类
        indicator.classList.remove('saving', 'saved', 'error');
        indicator.style.display = 'flex';

        switch (status) {
            case 'saving':
                indicator.classList.add('saving');
                text.textContent = '同步中...';
                break;
            case 'saved':
                indicator.classList.add('saved');
                text.textContent = '已同步';
                // 2秒后隐藏
                setTimeout(() => {
                    if (indicator.classList.contains('saved')) {
                        indicator.style.display = 'none';
                    }
                }, 2000);
                break;
            case 'error':
                indicator.classList.add('error');
                text.textContent = '同步失败，点击重试';
                indicator.onclick = () => {
                    this.retrySave();
                };
                break;
        }
    },

    /**
     * 重试保存
     */
    async retrySave() {
        const DataManager = StockProfitCalculator.DataManager;
        if (!DataManager) return;

        this.showSaveStatus('saving');
        const success = await DataManager.retryFailedSaves();

        if (success) {
            this.showSaveStatus('saved');
        } else {
            this.showSaveStatus('error', new Error('重试失败'));
        }
    },
```

### Step 2: 在 init 中订阅保存状态

在 `App.init()` 方法中，找到 `DataManager.init()` 调用后，添加：

```javascript
        // 订阅保存状态变化
        DataManager.onSaveStatusChange((status, error) => {
            this.showSaveStatus(status, error);
        });
```

### Step 3: 提交

```bash
git add js/app.js
git commit -m "feat: add save status indicator logic

- Add showSaveStatus() to display sync state
- Add retrySave() for manual retry on failure
- Subscribe to DataManager save status changes
- Auto-hide saved indicator after 2 seconds"
```

---

## Task 8: 优化 D1 初始化逻辑

**Files:**
- Modify: `functions/api/[[path]].js:22-56` (initializeDatabase 函数)

### Step 1: 优化初始化逻辑

替换 `initializeDatabase` 函数：

```javascript
/**
 * 自动初始化数据库表
 * 优化：使用 try-catch 直接查询，避免每次检查表是否存在
 */
async function initializeDatabase(env) {
    if (isInitialized) {
        return;
    }

    try {
        // 直接尝试查询，如果表不存在会抛出错误
        await env.D1.prepare('SELECT 1 FROM app_data LIMIT 1').first();
        isInitialized = true;
        console.log('Database already initialized');
    } catch (error) {
        // 表不存在，需要创建
        if (error.message && error.message.includes('no such table')) {
            try {
                // 创建表
                await env.D1.prepare(`
                    CREATE TABLE app_data (
                        key VARCHAR(50) PRIMARY KEY,
                        value TEXT NOT NULL,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `).run();

                // 创建索引
                await env.D1.prepare(`
                    CREATE INDEX IF NOT EXISTS idx_app_data_updated ON app_data(last_updated)
                `).run();

                console.log('Database initialized: app_data table created');
                isInitialized = true;
            } catch (createError) {
                console.error('Failed to create database table:', createError);
                throw createError;
            }
        } else {
            // 其他错误，抛出
            console.error('Database check failed:', error);
            throw error;
        }
    }
}
```

### Step 2: 提交

```bash
git add functions/api/[[path]].js
git commit -m "perf: optimize D1 initialization check

- Use direct query with try-catch instead of checking sqlite_master
- Faster initialization for warm starts (most common case)
- Only create tables on first access"
```

---

## Task 9: 测试验证

### Step 1: 本地测试

```bash
# 启动本地开发服务器
npx wrangler pages dev
```

打开浏览器测试：
1. 添加一条交易记录
2. 观察页面是否立即刷新（无卡顿）
3. 观察保存状态指示器是否显示"同步中..." -> "已同步"

### Step 2: 模拟网络失败

在浏览器 DevTools 中：
1. 打开 Network 面板
2. 设置为 Offline
3. 添加交易记录
4. 观察是否显示"同步失败，点击重试"
5. 恢复网络，点击重试，观察是否成功

### Step 3: 部署测试

```bash
# 部署到 Cloudflare
npx wrangler pages deploy
```

测试部署后的效果：
1. 首次打开网站，观察加载速度
2. 添加交易记录，观察响应速度
3. 检查保存状态指示器

### Step 4: 提交

```bash
git commit -m "test: verify D1 performance optimization

- Tested local development with instant UI response
- Tested offline mode with retry functionality
- Tested deployed version for cold start improvement"
```

---

## 总结

完成以上任务后，将获得以下改进：

1. **添加交易后立即响应** - 不再等待 D1，页面立即刷新
2. **保存状态可视化** - 用户知道数据同步状态
3. **失败可重试** - 网络失败时可以手动重试
4. **D1 初始化更快** - 优化后的初始化逻辑

**预期性能提升：**
- 添加交易后页面响应：从 1-2 秒降至 <100ms
- 用户感知延迟：从明显卡顿到无感知

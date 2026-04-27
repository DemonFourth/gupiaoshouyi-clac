# 股票收益计算器 - 开发规范文档

> 版本：v2.32.0
> 更新日期：2026-04-27

## 目录

- [概述](#概述)
- [命名规范](#命名规范)
- [代码风格](#代码风格)
- [模块开发规范](#模块开发规范)
- [性能优化规范](#性能优化规范)
- [架构设计规范](#架构设计规范)
- [事件总线使用规范](#事件总线使用规范)
- [错误处理规范](#错误处理规范)
- [数据验证规范](#数据验证规范)
- [配置管理规范](#配置管理规范)
- [图表开发规范](#图表开发规范)
- [主题适配规范](#主题适配规范)
- [辅助工具模块规范](#辅助工具模块规范)
- [日志管理规范](#日志管理规范)
- [代码检查规范](#代码检查规范)
- [测试规范](#测试规范)
- [Git提交规范](#git提交规范)
- [Cloudflare 部署规范](#cloudflare-部署规范)
- [常见问题和解决方案](#常见问题和解决方案)

---

## 概述

本文档定义了股票收益计算器项目的开发规范，旨在确保代码质量、性能优化和架构一致性。所有开发者在添加新功能或修改代码时，都应遵循本规范。

### 核心原则

1. **性能优先**：所有新功能必须考虑性能影响，遵循性能优化规范
2. **模块解耦**：使用事件总线实现模块间通信，避免直接依赖
3. **代码复用**：优先使用现有工具类和模块，避免重复造轮子
4. **用户体验**：确保功能易用、响应迅速、反馈及时
5. **可维护性**：代码清晰、注释完整、结构合理

---

## 命名规范

### 文件命名

- **JavaScript文件**：使用小驼峰命名法（camelCase）
  - ✅ `stockManager.js`
  - ✅ `tradeManager.js`
  - ✅ `dataService.js`
  - ❌ `StockManager.js`
  - ❌ `trade_manager.js`

- **CSS文件**：使用小写字母和连字符
  - ✅ `style.css`
  - ❌ `Style.css`

### 变量和函数命名

- **变量**：使用小驼峰命名法（camelCase）
  ```javascript
  // ✅ 正确
  const currentStock = '002460';
  const stockPrice = 66.09;
  const isHolding = true;

  // ❌ 错误
  const Current_Stock = '002460';
  const stock_price = 66.09;
  const isholding = true;
  ```

- **常量**：使用大写字母和下划线（UPPER_SNAKE_CASE）
  ```javascript
  // ✅ 正确
  const STORAGE_KEY = 'stockProfitCalculator';
  const MAX_CACHE_SIZE = 100;
  const DEBOUNCE_DELAY = 200;

  // ❌ 错误
  const storageKey = 'stockProfitCalculator';
  const max_cache_size = 100;
  ```

- **函数**：使用小驼峰命名法（camelCase），动词开头
  ```javascript
  // ✅ 正确
  function calculateProfit() { }
  function renderCharts() { }
  function initEventListeners() { }

  // ❌ 错误
  function CalculateProfit() { }
  function render_charts() { }
  ```

- **类/模块**：使用大驼峰命名法（PascalCase）
  ```javascript
  // ✅ 正确
  const Calculator = { };
  const Router = { };
  const DataManager = { };

  // ❌ 错误
  const calculator = { };
  const router = { };
  const data_manager = { };
  ```

- **私有成员**：使用下划线前缀（_）
  ```javascript
  // ✅ 正确
  const Calculator = {
      _domCache: null,
      _chartInstances: {},
      _ensureDOMCache() { }
  };

  // ❌ 错误
  const Calculator = {
      domCache: null,
      chartInstances: {}
  };
  ```

### HTML/CSS命名

- **HTML ID**：使用小驼峰命名法（camelCase）
  ```html
  <!-- ✅ 正确 -->
  <div id="stockInfo"></div>
  <button id="addRecordBtn">添加记录</button>

  <!-- ❌ 错误 -->
  <div id="stock_info"></div>
  <button id="add_record_btn">添加记录</button>
  ```

- **HTML Class**：使用连字符（kebab-case）
  ```html
  <!-- ✅ 正确 -->
  <div class="profit-loss-item"></div>
  <div class="list-mode"></div>

  <!-- ❌ 错误 -->
  <div class="profitLossItem"></div>
  <div class="list_mode"></div>
  ```

- **CSS变量**：使用连字符前缀（--）
  ```css
  /* ✅ 正确 */
  :root {
      --primary-color: #667eea;
      --border-radius: 8px;
  }

  /* ❌ 错误 */
  :root {
      --primaryColor: #667eea;
      --borderRadius: 8px;
  }
  ```

---

## 代码风格

### 基本规范

- 使用 **ES6+** 语法
- 使用 **2空格** 缩进
- 使用 **单引号** 或 **双引号**（保持一致）
- 使用 **分号** 结尾
- 每行代码不超过 **120字符**

### 函数定义

```javascript
// ✅ 正确：使用箭头函数
const calculateProfit = (trades) => {
    let totalProfit = 0;
    trades.forEach(trade => {
        if (trade.type === 'sell') {
            totalProfit += trade.profit;
        }
    });
    return totalProfit;
};

// ✅ 正确：对象方法
const Calculator = {
    calculate(trades) {
        // ...
    }
};
```

### 条件语句

```javascript
// ✅ 正确：简洁的条件判断
if (stockCode && stockCode.length === 6) {
    return true;
}

// ❌ 错误：冗余的条件判断
if (stockCode !== null && stockCode !== undefined && stockCode.length === 6) {
    return true;
}
```

### 对象和数组

```javascript
// ✅ 正确：使用解构赋值
const { currentPage, currentStockCode } = Router.state;
const [first, second] = trades;

// ✅ 正确：使用展开运算符
const newTrades = [...existingTrades, newTrade];
const merged = { ...defaultConfig, ...userConfig };
```

### 注释规范

```javascript
/**
 * 计算股票总收益
 * @param {Array} trades - 交易记录数组
 * @returns {number} 总收益金额
 */
const calculateTotalProfit = (trades) => {
    // 单行注释：说明复杂的计算逻辑
    let totalProfit = 0;
    
    trades.forEach(trade => {
        // 累加每笔交易的收益
        if (trade.type === 'sell') {
            totalProfit += trade.profit || 0;
        }
    });
    
    return totalProfit;
};
```

---

## 模块开发规范

### 模块结构

每个模块应包含以下部分：

```javascript
/**
 * 模块名称
 * 模块描述
 */

const ModuleName = {
    // 1. 私有变量
    _privateVar: null,

    // 2. 公共属性
    publicProp: '',

    // 3. 初始化方法
    init() {
        // 初始化逻辑
    },

    // 4. 私有方法
    _privateMethod() {
        // 私有逻辑
    },

    // 5. 公共方法
    publicMethod() {
        // 公共逻辑
    },

    // 6. 清理方法
    destroy() {
        // 清理资源
    }
};

// 挂载到命名空间
StockProfitCalculator.ModuleName = ModuleName;
```

### DOM缓存规范

所有模块都必须实现 DOM 缓存：

```javascript
const ModuleName = {
    // DOM缓存对象
    _domCache: null,

    /**
     * 初始化DOM缓存
     */
    initDOMCache() {
        this._domCache = {
            // 缓存所有需要频繁访问的DOM元素
            container: document.getElementById('container'),
            button: document.getElementById('button'),
            // ... 更多DOM元素
        };
    },

    /**
     * 确保DOM缓存已初始化
     */
    _ensureDOMCache() {
        if (!this._domCache) {
            this.initDOMCache();
        }
    },

    /**
     * 使用缓存的DOM元素
     */
    render() {
        this._ensureDOMCache();
        const container = this._domCache.container;
        // 使用 container 而不是重复查询
    }
};
```

### 批量DOM操作规范

插入多个DOM元素时，必须使用 DocumentFragment：

```javascript
const ModuleName = {
    renderList(items) {
        this._ensureDOMCache();
        const container = this._domCache.listContainer;

        // ✅ 正确：使用 DocumentFragment 批量插入
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = /* ... */;
            fragment.appendChild(row);
        });
        container.appendChild(fragment);

        // ❌ 错误：逐个插入，导致多次重排
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = /* ... */;
            container.appendChild(row);  // 每次插入都会触发重排
        });
    }
};
```

---

## 性能优化规范

### 1. DOM缓存优化

**必须遵循**：
- 所有模块都必须实现 DOM 缓存
- 提供 `initDOMCache()` 方法初始化缓存
- 提供 `_ensureDOMCache()` 方法确保缓存已初始化
- 在模块初始化时调用 `initDOMCache()`

**示例**：
```javascript
const ModuleName = {
    _domCache: null,

    init() {
        this.initDOMCache();
        // ... 其他初始化逻辑
    },

    initDOMCache() {
        this._domCache = {
            // 缓存所有DOM元素
        };
    }
};
```

### 2. 批量DOM插入优化

**必须遵循**：
- 插入多个DOM元素时，必须使用 DocumentFragment
- 禁止逐个插入DOM元素（除非有特殊原因）

**示例**：
```javascript
// ✅ 正确
const fragment = document.createDocumentFragment();
items.forEach(item => {
    const element = createElement(item);
    fragment.appendChild(element);
});
container.appendChild(fragment);

// ❌ 错误
items.forEach(item => {
    const element = createElement(item);
    container.appendChild(element);  // 每次插入都会触发重排
});
```

### 3. 懒加载优化

**必须遵循**：
- 图表等重型组件必须使用 IntersectionObserver 实现懒加载
- 设置合理的 threshold（推荐 0.1）
- 设置合理的 rootMargin（推荐 100px）

**示例**：
```javascript
const ModuleName = {
    _chartObserver: null,
    _chartsLoaded: false,

    initChartObserver() {
        if (this._chartObserver) return;

        this._chartObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this._chartsLoaded) {
                    this._chartsLoaded = true;
                    this._renderCharts();
                    this._chartObserver.disconnect();
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px 100px 0px'
        });
    }
};
```

### 4. 防抖和节流

**必须遵循**：
- 频繁触发的事件（如 resize、scroll）必须使用防抖或节流
- 推荐使用防抖，默认延迟 200ms
- 必须在模块销毁时清理定时器

**示例**：
```javascript
const ModuleName = {
    _resizeHandler: null,
    _debounceTimer: null,

    initResizeManager() {
        if (this._resizeHandler) return;

        this._resizeHandler = () => {
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }

            this._debounceTimer = setTimeout(() => {
                this._handleResize();
            }, 200);  // 200ms 防抖延迟
        };

        window.addEventListener('resize', this._resizeHandler);
    },

    destroyResizeManager() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }
};
```

### 5. 数据缓存优化

**必须遵循**：
- 计算结果必须缓存，避免重复计算
- 提供缓存失效机制
- 数据变更时自动失效相关缓存

**示例**：
```javascript
const ModuleName = {
    _cache: new Map(),

    getData(key) {
        // 检查缓存
        const cached = this._cache.get(key);
        if (cached && !cached.invalid) {
            return cached.data;
        }

        // 未命中缓存，执行计算
        const data = this._calculateData(key);

        // 缓存结果
        this._cache.set(key, {
            data: data,
            invalid: false,
            timestamp: Date.now()
        });

        return data;
    },

    invalidate(key) {
        const cached = this._cache.get(key);
        if (cached) {
            cached.invalid = true;
        }
    }
};
```

### 6. 缓存失效规范（v2.2.1新增）

**必须遵循**：
- 在修改数据前失效所有相关缓存
- 触发完整事件链，确保所有监听器收到通知
- 强制重新加载，不依赖缓存
- 确保缓存失效顺序正确

**核心原则**：
```
失效缓存 → 修改数据 → 保存数据 → 触发事件 → 重新加载 → UI更新
```

**正确示例**：
```javascript
const TradeManager = {
    addTrade(stockCode, newTrade) {
        const DataManager = StockProfitCalculator.DataManager;
        const DataService = StockProfitCalculator.DataService;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;
        const EventBus = StockProfitCalculator.EventBus;

        const data = DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);
        if (!stock) return;

        // 【关键】在修改数据前，先使所有缓存失效
        StockSnapshot.invalidate(stockCode);
        DataManager.invalidateCache();
        DataService.invalidateCache(stockCode);

        // 修改数据
        stock.trades.push(newTrade);
        DataManager.save(data);

        // 【关键】触发事件，通知所有监听器
        EventBus.emit(EventBus.EventTypes.TRADE_ADDED, {
            stockCode: stockCode,
            trade: newTrade
        });

        // 【关键】获取最新数据（强制重新加载）
        const updatedStock = DataService.getStock(stockCode);
        if (!updatedStock) return;

        // 【关键】确保缓存已失效（再次调用）
        StockSnapshot.invalidate(stockCode);
        DataService.invalidateCache(stockCode);

        // 重新计算
        const snapshot = StockSnapshot.build(updatedStock.code, ...);
        const calcResult = snapshot.calcResult;

        // 更新 UI
        this.updateUI(calcResult);
    }
};
```

**错误示例**：
```javascript
// ❌ 错误：在修改数据后失效缓存
const TradeManager = {
    addTrade(stockCode, newTrade) {
        const data = DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);
        
        // 修改数据
        stock.trades.push(newTrade);
        DataManager.save(data);
        
        // 失效缓存（太晚！）
        StockSnapshot.invalidate(stockCode);
        
        // 问题：事件监听器可能已经读取了旧数据
        EventBus.emit(EventBus.EventTypes.TRADE_ADDED, { stockCode });
    }
};
```

**常见陷阱**：
1. **缓存失效时机错误**：在修改数据后失效缓存，导致竞争条件
2. **事件未触发**：数据变更后没有触发事件，监听器不知道数据已更新
3. **使用缓存的数据**：使用缓存的数据而不是强制重新加载
4. **只失效部分缓存**：只失效一个缓存层级，其他缓存仍然返回旧数据
5. **依赖缓存失效时机**：依赖事件监听器失效缓存，但执行顺序不确定

**检查清单**：
- [ ] 在修改数据前失效所有缓存
- [ ] 触发完整事件链
- [ ] 强制重新加载最新数据
- [ ] 确保缓存失效顺序正确
- [ ] 验证 UI 立即更新

**相关文档**：
- [CACHE_TROUBLESHOOTING.md](CACHE_TROUBLESHOOTING.md) - 缓存问题排查与解决方案

### 7. 事件监听器清理

**必须遵循**：
- 所有事件监听器必须在适当的时候解绑
- 提供清理方法，在模块销毁时调用
- 防止内存泄漏

**示例**：
```javascript
const ModuleName = {
    _eventHandlers: [],

    init() {
        const handler = () => this._handleEvent();
        window.addEventListener('click', handler);
        this._eventHandlers.push({ target: window, event: 'click', handler });
    },

    destroy() {
        // 清理所有事件监听器
        this._eventHandlers.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this._eventHandlers = [];
    }
};
```

---

## 架构设计规范

### 1. 模块解耦

**必须遵循**：
- 模块间通过事件总线通信，禁止直接调用
- 使用 EventBus.EventTypes.* 常量定义事件类型
- 一个模块只负责一个功能领域

**示例**：
```javascript
// ✅ 正确：使用事件总线
const Overview = {
    navigateToDetail(stockCode) {
        EventBus.emit(EventBus.EventTypes.ROUTE_CHANGE, {
            page: 'detail',
            stockCode: stockCode
        });
    }
};

// ❌ 错误：直接调用
const Overview = {
    navigateToDetail(stockCode) {
        Router.showDetail(stockCode);  // 直接依赖 Router
        Detail.loadStock(stockCode);  // 直接依赖 Detail
    }
};
```

### 2. 数据服务层

**必须遵循**：
- 所有数据访问必须通过 DataService
- 禁止直接访问 localStorage
- 使用缓存机制优化性能

**示例**：
```javascript
// ✅ 正确：使用 DataService
const data = DataService.getCalculationResult(stockCode);

// ❌ 错误：直接访问 localStorage
const data = JSON.parse(localStorage.getItem('stockProfitCalculator'));
```

### 3. 快照系统

**必须遵循**：
- 使用 StockSnapshot 获取股票数据
- 正确使用 StockSnapshot.build(stockCode) 方法
- 数据变更时失效相关快照

**示例**：
```javascript
// ✅ 正确：使用 StockSnapshot
const snapshot = StockSnapshot.build(stockCode);
const result = snapshot.calcResult;

// ❌ 错误：直接计算
const trades = DataService.getTradeData(stockCode);
const result = Calculator.calculateAll(trades);
```

### 4. 分层架构

**必须遵循**：
- 按照层次组织代码：UI层 → 业务层 → 数据层
- 上层可以依赖下层，下层不能依赖上层
- 通过接口或事件进行跨层通信

**架构层次**：
```
┌─────────────────────────────┐
│       UI 层                 │
│  (overview.js, detail.js)   │
└──────────┬──────────────────┘
           │ 事件总线
┌──────────▼──────────────────┐
│      业务层                 │
│  (calculator.js, etc.)      │
└──────────┬──────────────────┘
           │ 数据访问
┌──────────▼──────────────────┐
│      数据层                 │
│  (dataService.js, etc.)     │
└──────────┬──────────────────┘
           │ 持久化
┌──────────▼──────────────────┐
│   持久化层                  │
│  (localStorage)             │
└─────────────────────────────┘
```

---

## 事件总线使用规范

### 事件类型定义

**必须遵循**：
- 所有事件类型必须在 EventBus.EventTypes 中定义
- 使用常量，禁止使用字符串字面量

**示例**：
```javascript
const EventBus = {
    EventTypes: {
        ROUTE_CHANGE: 'route:change',
        DATA_CHANGED: 'data:changed',
        STOCK_ADDED: 'stock:added',
        STOCK_DELETED: 'stock:deleted',
        TRADE_ADDED: 'trade:added',
        TRADE_UPDATED: 'trade:updated',
        TRADE_DELETED: 'trade:deleted'
    }
};

// ✅ 正确：使用常量
EventBus.emit(EventBus.EventTypes.ROUTE_CHANGE, { page: 'detail' });

// ❌ 错误：使用字符串字面量
EventBus.emit('route:change', { page: 'detail' });
```

### 事件发布

**必须遵循**：
- 使用 EventBus.emit() 发布事件
- 事件数据必须包含完整信息
- 事件名称必须使用常量

**示例**：
```javascript
// ✅ 正确
EventBus.emit(EventBus.EventTypes.TRADE_ADDED, {
    stockCode: '002460',
    tradeId: 123,
    trade: tradeData
});

// ❌ 错误：数据不完整
EventBus.emit(EventBus.EventTypes.TRADE_ADDED, {
    tradeId: 123
});
```

### 事件订阅

**必须遵循**：
- 使用 EventBus.on() 订阅事件
- 订阅时保存事件处理函数引用，以便取消订阅
- 模块销毁时必须取消订阅

**示例**：
```javascript
const ModuleName = {
    _eventHandlers: [],

    init() {
        // 订阅事件
        const handler = (data) => this._handleTradeAdded(data);
        EventBus.on(EventBus.EventTypes.TRADE_ADDED, handler);

        // 保存引用，以便取消订阅
        this._eventHandlers.push({
            event: EventBus.EventTypes.TRADE_ADDED,
            handler: handler
        });
    },

    destroy() {
        // 取消所有订阅
        this._eventHandlers.forEach(({ event, handler }) => {
            EventBus.off(event, handler);
        });
        this._eventHandlers = [];
    }
};
```

---

## 错误处理规范

### 1. 使用 ErrorHandler

**必须遵循**：
- 使用 ErrorHandler 处理错误
- 使用 safeExecute() 和 safeExecuteAsync() 安全执行可能出错的操作
- 错误信息必须清晰明确

**示例**：
```javascript
const ErrorHandler = StockProfitCalculator.ErrorHandler;

// ✅ 正确：使用 safeExecute
const result = ErrorHandler.safeExecute(
    () => Calculator.calculateAll(trades),
    null,
    '计算收益失败'
);

// ✅ 正确：使用 safeExecuteAsync
const data = await ErrorHandler.safeExecuteAsync(
    () => fetchStockPrice(stockCode),
    null,
    '获取股价失败'
);

// ✅ 正确：显示错误
ErrorHandler.showError('保存数据失败', error);
```

### 2. 错误日志

**必须遵循**：
- 使用 ErrorHandler.logError() 记录错误日志
- 错误日志包含足够的信息用于调试

**示例**：
```javascript
try {
    const result = Calculator.calculateAll(trades);
} catch (error) {
    ErrorHandler.logError('计算收益失败', error, ErrorHandler.levels.ERROR);
}
```

### 3. 避免静默失败

**必须遵循**：
- 禁止静默捕获错误而不处理
- 必须记录错误或向用户反馈

**示例**：
```javascript
// ❌ 错误：静默失败
try {
    const result = calculate();
} catch (error) {
    // 什么都不做
}

// ✅ 正确：记录错误
try {
    const result = calculate();
} catch (error) {
    ErrorHandler.logError('计算失败', error);
    ErrorHandler.showError('计算失败，请重试');
}
```

### 4. 代码修改注意事项

**必须遵循**：
- 修改代码时必须确保所有括号正确闭合
- 修改 try-catch 结构时，必须确保 catch 块存在
- 修改 async 函数时，必须保持 try-catch-finally 结构完整
- 修改后必须检查语法错误

**常见错误示例**：
```javascript
// ❌ 错误：修改后括号不闭合
async function fetchStockPrice() {
    try {
        const quote = await API.fetchPrice(code);
        // ... 处理逻辑
        // 缺少 catch 块
    } catch (error) {  // catch 块存在但括号不闭合
        console.error(error);
    // 缺少 }
}
```

**正确示例**：
```javascript
// ✅ 正确：完整的 try-catch 结构
async function fetchStockPrice() {
    try {
        const quote = await API.fetchPrice(code);
        // ... 处理逻辑
    } catch (error) {
        console.error(error);
    }
}
```

**修改建议**：
1. 修改前先备份或使用版本控制
2. 修改后立即测试，确保没有语法错误
3. 使用 IDE 的语法检查功能
4. 确保所有代码块都有正确的缩进和闭合

---

## 数据验证规范

### 1. 使用 Validator

**必须遵循**：
- 使用 Validator 验证输入数据
- 验证失败时显示详细错误信息
- 支持批量验证和错误摘要

**示例**：
```javascript
const Validator = StockProfitCalculator.Validator;

// ✅ 正确：验证股票代码
const isValid = Validator.validateStockCode(stockCode);
if (!isValid) {
    ErrorHandler.showError('股票代码格式错误，应为6位数字');
    return;
}

// ✅ 正确：验证价格
const isValidPrice = Validator.validatePrice(price);
if (!isValidPrice) {
    ErrorHandler.showError('价格必须在 0.001 到 9999.999 之间');
    return;
}

// ✅ 正确：验证交易记录
const validation = Validator.validateTrade(trade);
if (!validation.valid) {
    ErrorHandler.showError(validation.message);
    return;
}
```

### 2. 验证时机

**必须遵循**：
- 用户输入时立即验证
- 保存数据前验证
- 导入数据前批量验证

**示例**：
```javascript
// 表单输入时验证
priceInput.addEventListener('input', () => {
    const price = parseFloat(priceInput.value);
    if (!Validator.validatePrice(price)) {
        showError('价格格式错误');
    }
});

// 保存前验证
function saveTrade(trade) {
    const validation = Validator.validateTrade(trade);
    if (!validation.valid) {
        ErrorHandler.showError(validation.message);
        return false;
    }
    // 保存数据
}
```

---

## 配置管理规范

### 1. 使用 Config

**必须遵循**：
- 所有配置通过 Config 模块管理
- 使用 Config.get() 和 Config.set() 访问配置
- 配置修改后调用 Config.save() 持久化

**示例**：
```javascript
const Config = StockProfitCalculator.Config;

// ✅ 正确：获取配置
const showHoldingDetail = Config.get('ui.preferences.showHoldingDetail', true);

// ✅ 正确：设置配置
Config.set('ui.preferences.showHoldingDetail', false);
Config.save();

// ❌ 错误：直接使用 localStorage
localStorage.setItem('showHoldingDetail', 'false');
```

### 2. 配置路径

**必须遵循**：
- 使用点号分隔的路径访问配置
- 配置路径必须清晰明确

**示例**：
```javascript
// ✅ 正确
Config.set('ui.theme.primary', '#667eea');
Config.set('chart.animation.duration', 300);

// ❌ 错误
Config.set('primaryColor', '#667eea');
```

---

## 图表开发规范

### 1. 使用 ChartManager（v2.25.0 重构）

**必须遵循**：
- 使用 ChartManager 管理图表实例和主题
- 图表初始化时指定唯一 ID
- 页面切换时正确销毁图表
- **主题自动管理**：ChartManager 自动注入主题配置，无需手动处理

**示例**：
```javascript
const ChartManager = StockProfitCalculator.ChartManager;

// ✅ 正确：初始化图表（主题自动注入）
ChartManager.init('profitChart', chartDom, option);

// ✅ 正确：更新图表（主题自动注入）
ChartManager.update('profitChart', newOption);

// ✅ 正确：销毁图表
ChartManager.dispose('profitChart');

// ✅ 正确：主题切换时自动刷新所有图表
ChartManager.switchTheme('light');  // 自动调用 refreshAllCharts()
```

### 2. 图表主题管理（v2.25.0 新增）

**核心机制**：
- **自动注入**：`init()` 和 `setOption()` 自动注入主题配置
- **自动更新**：主题切换时自动调用 `refreshAllCharts()` 更新所有图表
- **深度合并**：使用 `mergeDeep()` 合并用户配置和主题配置

**主题配置结构**：
```javascript
const themeConfig = {
    backgroundColor: 'transparent',
    textStyle: { color: '#333' },
    title: { textStyle: { color: '#333' } },
    legend: { textStyle: { color: '#333' } },
    xAxis: { 
        axisLine: { lineStyle: { color: '#999' } },
        axisLabel: { color: '#666' }
    },
    yAxis: { 
        axisLine: { lineStyle: { color: '#999' } },
        axisLabel: { color: '#666' }
    }
};
```

**注意事项**：
- ❌ 不要在图表渲染函数中手动设置主题颜色
- ❌ 不要在主题切换时手动调用每个图表的 `setOption()`
- ✅ 让 ChartManager 自动管理主题
- ✅ 图表渲染函数只关注数据和业务逻辑

### 3. 图表配置

**必须遵循**：
- 图表配置必须支持响应式
- 使用统一的主题配置
- Tooltip 使用自适应宽度

**示例**：
```javascript
const option = {
    // 统一主题配置
    color: Config.get('chart.colors'),
    
    // 响应式配置
    grid: {
        left: '10%',
        right: '10%',
        bottom: '25%',
        containLabel: true
    },
    
    // 自适应 Tooltip
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textStyle: { color: '#fff' },
        formatter: (params) => {
            // 格式化 tooltip 内容
        }
    }
};
```

### 3. 图表性能优化

**必须遵循**：
- 大数据量图表使用 dataZoom
- 动态调整标签间隔
- 使用懒加载

**示例**：
```javascript
const option = {
    // 数据缩放
    dataZoom: [
        {
            type: 'slider',
            show: true,
            start: 0,
            end: 100
        },
        {
            type: 'inside',
            start: 0,
            end: 100
        }
    ],
    
    // 动态标签间隔
    xAxis: {
        axisLabel: {
            interval: calculateLabelInterval(data.length)
        }
    }
};
```

---

## 滚动位置管理规范（v2.26.0 新增）

### 1. Router 滚动位置记忆

**必须遵循**：
- 使用 `Router.state.scrollPositions` 存储滚动位置
- 进入详情页时保存汇总页滚动位置
- 返回汇总页时恢复滚动位置
- 使用同步滚动（`window.scrollTo(0, pos)`）而非 smooth 滚动

**示例**：
```javascript
const Router = {
    state: {
        currentPage: 'overview',
        currentStockCode: null,
        scrollPositions: {
            overview: 0
        }
    },

    // 进入详情页
    showDetail(stockCode) {
        // 保存汇总页滚动位置（仅当从汇总页进入且不是同一股票）
        if (this.state.currentPage === 'overview' && 
            this.state.currentStockCode !== stockCode) {
            const scrollPosition = window.scrollY || window.pageYOffset || 0;
            this.state.scrollPositions.overview = scrollPosition;
        }

        // 使用同步滚动到顶部
        window.scrollTo(0, 0);
    },

    // 返回汇总页
    showOverview() {
        // 恢复滚动位置
        const savedScrollPosition = this.state.scrollPositions?.overview || 0;
        if (savedScrollPosition > 0) {
            window.scrollTo(0, savedScrollPosition);
            this._scrollPositionRestored = true;
        }
    }
};
```

### 2. 重复进入检测

**必须遵循**：
- 使用 `currentStockCode` 判断是否重复进入同一股票
- 重复进入时不保存滚动位置
- 刷新页面时清除 `currentStockCode`

**示例**：
```javascript
// 初始化时清除
async init() {
    await this.loadState();
    this.state.scrollPositions = { overview: 0 };
    this.state.currentStockCode = null;  // 清除，避免影响判断
}

// 判断重复进入
if (this.state.currentStockCode === stockCode) {
    // 同一只股票，跳过保存滚动位置
    return;
}
```

### 3. 同步滚动 vs 异步滚动

**必须遵循**：
- 进入详情页：使用同步滚动 `window.scrollTo(0, 0)`
- 返回汇总页：使用同步滚动 `window.scrollTo(0, pos)`
- ❌ 不要使用 `window.scrollTo({ top: 0, behavior: 'smooth' })`

**原因**：
- smooth 滚动是异步的，不会立即生效
- `Detail.refresh()` 执行时，滚动位置可能还未改变
- 导致保存错误的滚动位置

---

## 提示信息管理规范（v2.9.0 新增）

### 1. TooltipManager 统一管理

**必须遵循**：
- 使用 TooltipManager 创建和管理所有 tooltip
- tooltip 内容应包含计算公式和说明
- 使用智能定位避免超出视口

**示例**：
```javascript
const TooltipManager = StockProfitCalculator.TooltipManager;

// ✅ 正确：创建 tooltip
TooltipManager.create(element, {
    content: '计算公式：总收益 ÷ 总投入 × 100%',
    position: 'top'
});

// ✅ 正确：创建带公式的 tooltip
TooltipManager.create(profitElement, {
    content: `
        <div class="tooltip-formula">
            <div class="formula">总收益 = 卖出金额 - 买入金额 - 手续费</div>
            <div class="result">= ¥${profit.toFixed(2)}</div>
        </div>
    `,
    allowHTML: true
});
```

### 2. 数据项 Tooltip 规范

**必须遵循**：
- 所有数值型数据项都应添加 tooltip
- tooltip 应包含：字段名称、计算公式、当前值
- 使用统一的样式类

**示例**：
```html
<!-- ✅ 正确：数据项带 tooltip -->
<span class="data-value" 
      data-tooltip="计算公式：持仓成本 ÷ 持仓数量"
      data-formula="总投入 ÷ 总数量">
    ¥${avgCost.toFixed(2)}
</span>
```

### 3. 大数字转换 Tooltip

**必须遵循**：
- 使用 `Utils.formatLargeNumberWithTooltip()` 转换大数字
- 自动添加 tooltip 显示完整数值
- 阈值：> 10000 转换为"万"单位

**示例**：
```javascript
// ✅ 正确：大数字转换
const result = Utils.formatLargeNumberWithTooltip(123456.78);
// result.display = "¥12.35万"
// result.tooltip = "¥123,456.78"

element.textContent = result.display;
element.setAttribute('data-tooltip', result.tooltip);
```

---

## 响应式布局规范（v2.26.0 新增）

### 1. CSS Grid 自动换行

**必须遵循**：
- 使用 `repeat(auto-fit, minmax(min-width, 1fr))` 实现自动换行
- 设置合理的最小宽度
- 避免使用固定列数

**示例**：
```css
/* ✅ 正确：自动换行 */
.container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

/* ❌ 错误：固定列数 */
.container {
    display: grid;
    grid-template-columns: 1fr 1fr;  /* 不会自动换行 */
}
```

### 2. 响应式断点

**推荐断点**：
- 移动端：< 768px
- 平板：768px - 1024px
- 桌面：> 1024px

**示例**：
```css
/* 移动端 */
@media (max-width: 767px) {
    .container {
        grid-template-columns: 1fr;
    }
}

/* 平板和桌面 */
@media (min-width: 768px) {
    .container {
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }
}
```

---

## 主题适配规范（v2.28.0 新增）

### 1. 核心原则

**必须遵循**：
- 所有新增 UI 元素必须同时适配 dark 和 light 主题
- 使用 CSS 变量而非硬编码颜色值
- 图表元素必须通过 ChartManager 统一管理主题
- 主题切换后 UI 必须正确更新

### 2. CSS 变量使用规范

**必须遵循**：
- 背景色使用 `var(--bg-primary)`、`var(--bg-secondary)`、`var(--bg-card)`
- 文字颜色使用 `var(--text-primary)`、`var(--text-secondary)`、`var(--text-muted)`
- 边框颜色使用 `var(--border-color)`
- 状态颜色使用 `var(--color-profit)`、`var(--color-loss)`

**示例**：
```css
/* ✅ 正确：使用 CSS 变量 */
.my-component {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.my-component:hover {
    background: var(--bg-card-hover);
}

/* ❌ 错误：硬编码颜色 */
.my-component {
    background: #ffffff;
    color: #333333;
}
```

### 3. 图表主题适配规范

**必须遵循**：
- 图表标题、副标题、坐标轴文字由 ChartManager 自动注入主题
- Tooltip 必须根据主题设置背景色和文字颜色
- 图表配置中不要硬编码颜色值

**Tooltip 适配示例**：
```javascript
// ✅ 正确：根据主题设置 tooltip 样式
const isDark = StockProfitCalculator.ChartManager.currentTheme === 'dark';
const tooltipBg = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
const tooltipText = isDark ? '#e8eaf6' : '#1e293b';
const tooltipMuted = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';

const option = {
    tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText },
        formatter: function(params) {
            return `...<span style="color:${tooltipMuted};">...</span>`;
        }
    }
};

// ❌ 错误：硬编码 tooltip 样式
const option = {
    tooltip: {
        backgroundColor: '#fff',  // light 主题下正常，dark 主题下刺眼
        textStyle: { color: '#333' }
    }
};
```

### 4. 图表副标题适配规范

**必须遵循**：
- 副标题颜色由 ChartManager 自动注入（通过 `subtextStyle`）
- ChartManager.themeColors 必须包含 `textMuted` 颜色配置

**ChartManager 配置**：
```javascript
// chartManager.js
themeColors: {
    dark: {
        text: '#e8eaf6',
        textMuted: 'rgba(255, 255, 255, 0.6)',  // 副标题用淡色
        axisLine: 'rgba(255, 255, 255, 0.1)',
        splitLine: 'rgba(255, 255, 255, 0.05)'
    },
    light: {
        text: '#1e293b',
        textMuted: 'rgba(0, 0, 0, 0.5)',  // 副标题用淡色
        axisLine: 'rgba(0, 0, 0, 0.1)',
        splitLine: 'rgba(0, 0, 0, 0.05)'
    }
}
```

### 5. 主题切换时图表更新规范（统一接口方案）

**核心原则**：
- 所有图表模块必须实现 `onThemeChange(theme)` 方法
- `app.js` 统一调用所有图表模块的 `onThemeChange()` 方法
- 新增图表模块只需实现接口，自动被主题切换调用，无需修改 `app.js`

**统一接口定义**：

所有图表模块必须实现以下方法：

```javascript
const ChartModule = {
    // ... 现有代码

    /**
     * 主题切换时的图表重新渲染
     * @param {string} theme - 'dark' 或 'light'
     */
    onThemeChange(theme) {
        if (this.chartData && this.renderChart) {
            this.renderChart();
        }
        // ... 其他需要重新渲染的图表
    }
};
```

**app.js 统一调用机制**：

```javascript
applyTheme(theme) {
    // ... 现有逻辑（设置 data-theme、通知 ChartManager）

    // 统一调用所有图表模块的 onThemeChange 方法
    const chartModules = ['Overview', 'Detail', 'TradeRecords'];
    chartModules.forEach(moduleName => {
        const module = StockProfitCalculator[moduleName];
        if (module && typeof module.onThemeChange === 'function') {
            module.onThemeChange(theme);
        }
    });
}
```

**注意事项**：

- ✅ 新增图表模块时，只需实现 `onThemeChange()` 方法
- ✅ 无需修改 `app.js`，自动被调用
- ✅ 所有包含 tooltip 的图表都应在 `onThemeChange()` 中重新渲染
- ✅ 使用 `_rerenderChart()` 方法重新渲染缓存的图表数据

**图表 tooltip 主题适配规范**：

在图表渲染函数中，必须根据主题设置 tooltip 样式：

```javascript
// 根据主题设置 tooltip 样式
const isDark = ChartManager.currentTheme === 'dark';
const tooltipBg = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
const tooltipText = isDark ? '#e8eaf6' : '#1e293b';

const option = {
    tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText },
        // ... formatter
    }
};
```

### 6. 表格主题适配规范

**必须遵循**：
- 表格标题行背景使用 `var(--bg-secondary)`
- 表格行 hover 效果使用 `var(--bg-card-hover)`
- 边框颜色使用 `var(--border-color)`

**示例**：
```css
/* ✅ 正确：表格主题适配 */
.my-table thead th {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-color);
}

.my-table tbody tr:hover {
    background: var(--bg-card-hover);
}

/* ❌ 错误：硬编码表格样式 */
.my-table thead th {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* 固定渐变 */
    color: #fff;
}
```

### 7. 主题适配检查清单

开发新功能时，必须检查以下项目：

- [ ] CSS 样式使用 CSS 变量而非硬编码颜色
- [ ] 图表 tooltip 根据主题设置背景色和文字颜色
- [ ] 图表副标题颜色由 ChartManager 自动注入
- [ ] 表格标题行和 hover 效果适配主题
- [ ] 主题切换后 UI 正确更新
- [ ] 在 dark 和 light 主题下分别测试

### 8. 常见主题适配问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| tooltip 背景色不随主题变化 | 硬编码了背景色 | 根据主题动态设置 `backgroundColor` |
| 副标题颜色不更新 | ChartManager 未注入 `subtextStyle` | 在 `injectThemeConfig` 中添加 `subtextStyle` |
| 表格标题行颜色固定 | 使用了固定渐变色 | 改用 CSS 变量 |
| 主题切换后图表不更新 | 未调用图表重新渲染 | 在 `applyTheme` 中调用渲染方法 |

---

## 辅助工具模块规范（v2.28.0 新增）

### 1. Perf 性能计时工具

**用途**：轻量级性能计时，用于测量代码执行时间

**使用场景**：
- 测量关键计算耗时
- 分析性能瓶颈
- 调试慢操作

**示例**：
```javascript
const Perf = StockProfitCalculator.Perf;

// ✅ 正确：使用 Perf 计时
Perf.start('calculateProfit');
const result = Calculator.calculateAll(trades);
Perf.end('calculateProfit');
// 控制台输出: [Perf] calculateProfit: 12.5ms

// ✅ 正确：使用标记点
Perf.mark('dataLoad');
// ... 加载数据
Perf.mark('dataProcess');
// ... 处理数据
Perf.measure('dataLoad', 'dataProcess', '数据处理耗时');
```

### 2. Pagination 分页组件

**用途**：统一分页逻辑和 UI

**使用场景**：
- 交易记录列表分页
- 大数据量列表展示

**示例**：
```javascript
const Pagination = StockProfitCalculator.Pagination;

// ✅ 正确：初始化分页
const pagination = Pagination.create({
    container: document.getElementById('pagination'),
    pageSize: 20,
    total: 100,
    onChange: (page) => {
        this._renderPage(page);
    }
});

// ✅ 正确：更新总数
pagination.updateTotal(200);

// ✅ 正确：销毁分页
pagination.destroy();
```

### 3. Skeleton 骨架屏

**用途**：加载时显示占位骨架，提升用户体验

**使用场景**：
- 页面初始加载
- 数据刷新时
- 异步操作等待

**示例**：
```javascript
const Skeleton = StockProfitCalculator.Skeleton;

// ✅ 正确：显示骨架屏
Skeleton.show('overview');

// ✅ 正确：隐藏骨架屏
Skeleton.hide('overview');

// ✅ 正确：根据主题自动适配颜色
// Skeleton 会自动读取当前主题并显示对应颜色
```

### 4. FileStorage 文件存储

**用途**：文件导入导出、本地存储管理

**使用场景**：
- 数据导出为 JSON 文件
- 从文件导入数据
- 备份恢复

**示例**：
```javascript
const FileStorage = StockProfitCalculator.FileStorage;

// ✅ 正确：导出数据
FileStorage.exportToFile(data, 'stock-data.json');

// ✅ 正确：导入数据
const data = await FileStorage.importFromFile(file);
```

### 5. StockPriceAPI 股价接口

**用途**：获取实时股价数据

**使用场景**：
- 刷新股票当前价格
- 获取实时行情

**示例**：
```javascript
const StockPriceAPI = StockProfitCalculator.StockPriceAPI;

// ✅ 正确：获取股价
const price = await StockPriceAPI.getPrice('002460');

// ✅ 正确：批量获取股价
const prices = await StockPriceAPI.getPrices(['002460', '000001']);
```

### 6. ModuleRegistry 模块注册

**用途**：统一注册模块到命名空间

**使用场景**：
- 应用启动时注册所有模块
- 确保模块挂载顺序正确

**示例**：
```javascript
// ✅ 正确：注册模块
ModuleRegistry.register('Calculator', Calculator);
ModuleRegistry.register('DataService', DataService);

// ✅ 正确：批量注册
ModuleRegistry.registerAll({
    Calculator,
    DataService,
    Router
});
```

---

## 日志管理规范（v2.28.0 新增）

### 1. 核心原则

**必须遵循**：
- 所有调试日志必须使用 Logger 模块，禁止直接使用 `console.log`
- 日志消息必须以 `[ModuleName]` 开头，便于模块识别
- 日志默认关闭，通过设置界面或 URL 参数开启
- 支持按模块控制日志输出，避免干扰调试

### 2. Logger 模块使用

**基本用法**：
```javascript
const Logger = StockProfitCalculator.Logger;

// ✅ 正确：使用 Logger 输出调试日志
Logger.debug('[ModuleName] 操作开始');
Logger.debug('[ModuleName] 处理数据:', data);
Logger.info('[ModuleName] 操作完成');
Logger.warn('[ModuleName] 警告信息');
Logger.error('[ModuleName] 错误信息', error);

// ❌ 错误：直接使用 console.log
console.log('操作开始');
console.log('处理数据:', data);
```

**推荐用法（安全调用）**：
```javascript
// ✅ 正确：使用可选链安全调用
StockProfitCalculator.Logger?.debug?.('[ModuleName] 操作开始');
StockProfitCalculator.Logger?.info?.('[ModuleName] 操作完成');
```

### 3. 模块命名规范

**必须遵循**：
- 日志消息必须以 `[ModuleName]` 开头
- 模块名使用 PascalCase 格式
- 子模块使用 `ModuleName.subModule` 格式

**模块名映射表**：

| 日志前缀 | 映射到模块 | 说明 |
|----------|-----------|------|
| `[App]` | app | 应用初始化 |
| `[Router]` | router | 路由导航 |
| `[showOverview]` | router | 显示汇总页 |
| `[showDetail]` | router | 显示详情页 |
| `[handleRouteChange]` | router | 路由变化处理 |
| `[DataManager]` | dataManager | 数据管理 |
| `[loadFromLocalStorage]` | dataManager | 本地存储加载 |
| `[saveToLocalStorage]` | dataManager | 本地存储保存 |
| `[Detail]` | detail | 详情页 |
| `[loadStock]` | detail | 加载股票 |
| `[Overview]` | overview | 汇总页 |
| `[Overview.refresh]` | overview | 汇总页刷新 |
| `[StockManager]` | stockManager | 股票管理 |
| `[saveStock]` | stockManager | 保存股票 |
| `[TradeRecords]` | tradeRecords | 交易记录 |
| `[EventBus]` | eventBus | 事件总线 |
| `[Calculator]` | calculator | 计算器 |
| `[Chart]` | chart | 图表渲染 |

### 4. 日志格式规范

**必须遵循**：
- 日志消息格式：`[ModuleName] 描述信息`
- 多行日志使用缩进对齐
- 复杂数据使用 JSON 格式或对象展开

**正确示例**：
```javascript
// ✅ 正确：单行日志
Logger.debug('[TradeRecords] load 开始');
Logger.debug('[TradeRecords] 查询参数：year =', year, ', month =', month);

// ✅ 正确：多行日志（使用缩进）
Logger.debug('[TradeRecords] 查询结果：');
Logger.debug('[TradeRecords]   总收益:', totalProfit);
Logger.debug('[TradeRecords]   总手续费:', totalFee);
Logger.debug('[TradeRecords]   交易次数:', tradeCount);

// ✅ 正确：复杂数据
Logger.debug('[DataManager] 股票数据:', { code, name, trades: trades.length });
```

**错误示例**：
```javascript
// ❌ 错误：没有模块前缀
Logger.debug('查询参数：year =', year);

// ❌ 错误：使用 console.log
console.log('[TradeRecords] 查询结果：');

// ❌ 错误：前缀格式不正确
Logger.debug('TradeRecords: 查询结果');
Logger.debug('[traderecords] 查询结果');  // 应该是 PascalCase
```

### 5. 日志级别使用

**级别说明**：

| 级别 | 用途 | 示例 |
|------|------|------|
| `debug` | 调试信息，开发时使用 | 流程跟踪、变量值 |
| `info` | 一般信息 | 操作完成、状态变化 |
| `warn` | 警告信息 | 可恢复的异常、降级处理 |
| `error` | 错误信息 | 异常、失败操作 |

**使用示例**：
```javascript
// debug - 调试信息
Logger.debug('[Calculator] 开始计算，交易数:', trades.length);

// info - 一般信息
Logger.info('[App] 初始化完成');

// warn - 警告信息
Logger.warn('[DataManager] 本地数据过期，使用缓存');

// error - 错误信息
Logger.error('[API] 请求失败:', error);
```

### 6. 开启日志的方式

**方式一：设置界面**
1. 打开设置弹窗
2. 在「开发者选项」中开启「调试日志」开关
3. 选择需要查看日志的模块
4. 设置会持久化，刷新后保持

**方式二：URL 参数**
```bash
# 启用所有模块日志
https://example.com/?debug=1

# 只启用指定模块日志
https://example.com/?debug=router,overview,calculator
```

**方式三：控制台命令**
```javascript
// 开启日志
StockProfitCalculator.Logger.setEnabled(true);

// 启用指定模块
StockProfitCalculator.Logger.setModuleEnabled('router', true);
StockProfitCalculator.Logger.setModuleEnabled('overview', true);

// 启用所有模块
StockProfitCalculator.Logger.enableAllModules();

// 禁用所有模块
StockProfitCalculator.Logger.disableAllModules();

// 查看当前状态
StockProfitCalculator.Logger.getStatus();
```

### 7. 新增模块日志指南

**步骤**：

1. **确定模块名**：选择一个唯一的模块名（如 `NewModule`）

2. **注册模块**：在 `js/logger.js` 的 `modules` 对象中添加：
```javascript
modules: {
    // ... 现有模块
    newModule: { name: '新模块', enabled: false, icon: '🔧' }
}
```

3. **添加映射**：在 `_extractModule` 的 `moduleMap` 中添加：
```javascript
const moduleMap = {
    // ... 现有映射
    'newmodule': 'newModule',
    'newmodule.sub': 'newModule'
};
```

4. **使用日志**：在代码中使用：
```javascript
StockProfitCalculator.Logger?.debug?.('[NewModule] 操作开始');
StockProfitCalculator.Logger?.debug?.('[NewModule] 处理数据:', data);
```

### 8. 日志性能考虑

**必须遵循**：
- 生产环境默认关闭日志
- 避免在循环中输出大量日志
- 复杂对象使用懒计算

**正确示例**：
```javascript
// ✅ 正确：条件日志
if (Logger.enabled && Logger.modules.myModule?.enabled) {
    Logger.debug('[MyModule] 复杂数据:', expensiveCalculation());
}

// ✅ 正确：限制日志数量
items.slice(0, 5).forEach((item, index) => {
    Logger.debug(`[MyModule] 项目 ${index}:`, item);
});
```

### 9. 日志检查清单

开发新功能时，必须检查以下项目：

- [ ] 所有调试日志使用 Logger 而非 console.log
- [ ] 日志消息以 `[ModuleName]` 开头
- [ ] 模块名已在 Logger.modules 中注册
- [ ] 模块名已在 _extractModule.moduleMap 中映射
- [ ] 日志格式符合规范
- [ ] 避免在循环中输出大量日志
- [ ] 测试日志开关功能正常

### 10. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 日志不输出 | 模块未启用 | 在设置中启用对应模块 |
| 日志不输出 | 日志级别不匹配 | 开启日志时自动设置为 DEBUG 级别 |
| 所有模块日志都输出 | URL 参数 `?debug=1` | 使用 `?debug=module1,module2` 指定模块 |
| 日志没有模块标识 | 没有使用 `[ModuleName]` 前缀 | 添加正确的前缀格式 |
| 刷新后设置丢失 | 配置未持久化 | 检查 Config.save() 是否被调用 |

---

## 代码检查规范（v2.28.0 新增）

### 1. 核心原则

**必须遵循**：
- 所有代码修改后必须运行对应的检查工具
- CSS 修改后必须运行 `npm run lint:css`
- JS 修改后必须运行 `npm run lint`
- 提交前确保所有检查通过

### 2. CSS 检查规范

**工具**：stylelint

**检查命令**：
```bash
# 检查 CSS 文件
npm run lint:css

# 自动修复可修复的问题
npm run lint:css:fix
```

**检查内容**：
- 无效的 hex 颜色值
- 重复的字体名称
- calc 运算符空格
- 0 值单位
- 未知属性
- 重复属性
- CSS 语法错误

**常见问题及解决方案**：

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `Unexpected }` | 多余的闭合括号 | 检查并删除多余的 `}` |
| `--color-xxx 变量不存在` | 使用了未定义的 CSS 变量 | 在 `:root` 中定义变量或使用已存在的变量 |
| `color-no-invalid-hex` | 无效的十六进制颜色 | 修正颜色值格式 |

### 3. CSS 变量使用规范

**必须遵循**：
- 使用 CSS 变量前必须确认变量已定义
- 新增 CSS 变量必须在 `:root` 中定义
- CSS 变量必须同时适配 dark 和 light 主题

**已定义的 CSS 变量**：

| 变量名 | 用途 | Dark 主题值 | Light 主题值 |
|--------|------|-------------|--------------|
| `--bg-primary` | 主背景色 | `#0a0e27` | `#f8fafc` |
| `--bg-secondary` | 次背景色 | `#141b3d` | `#f1f5f9` |
| `--bg-card` | 卡片背景 | `#1a1f3a` | `#ffffff` |
| `--text-primary` | 主文字色 | `#e8eaf6` | `#1e293b` |
| `--text-secondary` | 次文字色 | `rgba(232, 234, 246, 0.75)` | `#475569` |
| `--border-color` | 边框色 | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` |
| `--color-profit` | 盈利色 | `#ef4444` | `#ef4444` |
| `--color-loss` | 亏损色 | `#10b981` | `#0d9488` |
| `--color-current-price` | 当日股价色 | `#60a5fa` | `#3b82f6` |

**错误示例**：
```css
/* ❌ 错误：使用未定义的变量 */
.my-component {
    color: var(--color-primary);  /* 变量不存在！ */
}

/* ❌ 错误：硬编码颜色，不适配主题 */
.my-component {
    background: #ffffff;  /* light 主题正常，dark 主题刺眼 */
}
```

**正确示例**：
```css
/* ✅ 正确：使用已定义的变量 */
.my-component {
    color: var(--text-primary);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
}

/* ✅ 正确：新增变量时在 :root 中定义 */
:root {
    --my-new-color: #60a5fa;
}
```

### 4. JS 检查规范

**工具**：ESLint

**检查命令**：
```bash
# 检查 JS 文件
npm run lint

# 自动修复可修复的问题
npm run lint:fix

# 严格检查（不允许警告）
npm run lint:check
```

### 5. 统一检查命令

**同时检查 JS 和 CSS**：
```bash
# 检查所有文件
npm run lint:all

# 自动修复所有问题
npm run lint:all:fix
```

### 6. 提交前检查清单

**每次提交前必须检查**：

- [ ] 运行 `npm run lint:css` 检查 CSS
- [ ] 运行 `npm run lint` 检查 JS
- [ ] 所有检查通过，无错误
- [ ] 新增 CSS 变量已在 `:root` 中定义
- [ ] 新增 CSS 变量已适配 dark/light 主题

### 7. 常见问题排查

**问题：stylelint 报错 `Unexpected }`**

原因：CSS 文件中有多余的闭合括号

排查步骤：
1. 查看报错行号
2. 检查该行附近的代码块闭合情况
3. 删除多余的 `}`

**问题：CSS 变量不生效**

原因：变量未定义或拼写错误

排查步骤：
1. 在 `css/style.css` 中搜索变量名
2. 确认变量在 `:root` 中定义
3. 确认变量名拼写正确

**问题：主题切换后样式不更新**

原因：使用了硬编码颜色而非 CSS 变量

排查步骤：
1. 搜索硬编码的颜色值（如 `#ffffff`、`#333`）
2. 替换为对应的 CSS 变量
3. 测试主题切换功能

---

## 测试规范

### 1. 手动测试

**必须遵循**：
- 新功能必须进行手动测试
- 测试正常流程和异常流程
- 测试边界情况

**测试清单**：
- [ ] 功能正常工作
- [ ] 边界情况处理正确
- [ ] 错误提示清晰
- [ ] 性能可接受
- [ ] 无控制台错误

### 2. 性能测试

**必须遵循**：
- 大数据量场景下测试性能
- 使用浏览器开发者工具分析性能
- 优化性能瓶颈

**性能指标**：
- 首屏渲染时间 < 2s
- 页面切换时间 < 500ms
- 计算响应时间 < 100ms

---

## Git提交规范

### 1. 提交信息格式

**必须遵循**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: Bug修复
- `perf`: 性能优化
- `refactor`: 重构（不是新功能，也不是修复bug）
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例**：
```
feat(overview): 添加股票列表排序功能

- 支持按收益、收益率、建仓时间排序
- 支持升序和降序切换
- 添加排序状态持久化

Closes #123
```

### 2. 提交频率

**建议**：
- 每完成一个小功能就提交一次
- 提交前确保代码可运行
- 提交信息清晰描述改动内容

---

## 常见问题和解决方案

### 1. DOM查询性能问题

**问题**：频繁的 DOM 查询导致性能下降

**解决方案**：
```javascript
// ❌ 错误
function render() {
    const container = document.getElementById('container');
    // ... 使用 container
}

function update() {
    const container = document.getElementById('container');
    // ... 再次查询 container
}

// ✅ 正确
const Module = {
    _domCache: null,
    
    init() {
        this._domCache = {
            container: document.getElementById('container')
        };
    },
    
    render() {
        const container = this._domCache.container;
        // ... 使用缓存
    }
};
```

### 2. 内存泄漏问题

**问题**：事件监听器未解绑导致内存泄漏

**解决方案**：
```javascript
// ❌ 错误
const Module = {
    init() {
        window.addEventListener('resize', () => this.handleResize());
    }
};

// ✅ 正确
const Module = {
    _resizeHandler: null,
    
    init() {
        this._resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this._resizeHandler);
    },
    
    destroy() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
    }
};
```

### 3. 模块耦合问题

**问题**：模块间直接调用导致耦合度高

**解决方案**：
```javascript
// ❌ 错误
const Overview = {
    navigateToDetail(stockCode) {
        Router.showDetail(stockCode);
        Detail.loadStock(stockCode);
    }
};

// ✅ 正确
const Overview = {
    navigateToDetail(stockCode) {
        EventBus.emit(EventBus.EventTypes.ROUTE_CHANGE, {
            page: 'detail',
            stockCode: stockCode
        });
    }
};
```

### 4. 图表渲染问题

**问题**：页面刷新后图表不显示

**解决方案**：
```javascript
// ✅ 正确：使用 setTimeout 确保DOM已渲染
_initChartObserver() {
    this._chartObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this._chartsLoaded) {
                this._chartsLoaded = true;
                this._renderCharts();
                this._chartObserver.disconnect();
            }
        });
    }, { threshold: 0.1 });
    
    // 延迟检查，确保DOM已渲染
    setTimeout(() => {
        if (!this._chartsLoaded && this._domCache.chartContainer) {
            this._chartsLoaded = true;
            this._renderCharts();
        }
    }, 300);
}
```

---

## Cloudflare 部署规范

### 1. 混合存储策略

**必须遵循**：
- 读取时优先使用 localStorage（零延迟）
- 后台异步检查 D1 数据差异
- 写入时先保存 localStorage，再异步同步到 D1
- 数据变更时正确失效所有缓存

**数据流**：
```
读取：localStorage → 后台检查 D1 → 差异时弹窗提示
写入：localStorage → 异步同步 D1 → 触发事件
```

### 2. API 端点规范

**必须遵循**：
- 所有 API 端点必须返回 JSON 格式
- 必须设置正确的 CORS 头
- 必须处理 OPTIONS 预检请求
- 错误响应必须包含 `error` 字段

**端点列表**：
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/data` | GET | 获取所有数据 |
| `/api/data` | PUT | 保存所有数据 |
| `/api/import` | POST | 导入JSON数据 |
| `/api/health` | GET | 健康检查 |

### 3. 缓存失效规范（v2.4.0 新增）

**必须遵循**：
- 在修改数据前失效所有缓存（StockSnapshot、DataService、DataManager）
- 触发完整事件链，确保所有监听器收到通知
- 强制重新加载，不依赖缓存
- 确保缓存失效顺序正确

**正确示例**：
```javascript
// 在修改数据前失效所有缓存
StockProfitCalculator.StockSnapshot?.clear();
StockProfitCalculator.DataService?.invalidateAllCache();
DataManager.invalidateCache();

// 修改数据
stock.trades.push(newTrade);
await DataManager.save(data);

// 触发事件
EventBus.emit(EventBus.EventTypes.TRADE_ADDED, { stockCode, trade });
```

### 4. 同步差异处理规范

**必须遵循**：
- 检测到数据差异时触发 `data:sync_diff` 事件
- 提供三种同步选项：使用云端数据、合并数据、保持本地数据
- 用户选择后正确更新 UI

**事件数据结构**：
```javascript
EventBus.emit('data:sync_diff', {
    localData,  // 本地数据
    d1Data,     // D1 数据
    diff: {     // 差异信息
        hasDiff: true,
        newStocksInLocal: [],
        newStocksInD1: [],
        newTradesInLocal: 0,
        newTradesInD1: 0,
        details: []
    }
});
```

### 5. 本地开发规范

**本地开发**：
- 本地开发时无需配置 D1 数据库
- 应用会自动降级使用 localStorage 存储
- 使用 `live-server` 或其他静态服务器运行

**部署前检查**：
- [ ] D1 数据库已创建并绑定
- [ ] `wrangler.toml` 配置正确
- [ ] API 端点测试通过
- [ ] 健康检查返回正常

---

## 附录

### A. 性能优化检查清单

- [ ] 所有模块都实现了 DOM 缓存
- [ ] 批量 DOM 操作使用 DocumentFragment
- [ ] 图表使用懒加载
- [ ] 频繁触发的事件使用防抖
- [ ] 计算结果使用缓存
- [ ] 事件监听器正确解绑
- [ ] 使用事件总线解耦模块
- [ ] 使用数据服务层访问数据
- [ ] 混合存储策略正确实现（v2.4.0 新增）
- [ ] 缓存失效顺序正确（v2.4.0 新增）

### B. 代码审查检查清单

- [ ] 代码风格符合规范
- [ ] 命名清晰明确
- [ ] 注释完整准确
- [ ] 性能优化到位
- [ ] 错误处理完善
- [ ] 数据验证充分
- [ ] 模块解耦良好
- [ ] 测试覆盖充分

### C. 相关文档

- [README.md](README.md) - 用户文档
- [ARCHIVE.md](ARCHIVE.md) - 功能存档
- [AGENTS.md](AGENTS.md) - AI助手上下文

---

## 代码优化记录

### 2026-04-21 代码清理优化

**目标**: 清理未使用的函数、变量、死代码，提高代码可维护性

**删除统计**: 521 行代码，28 个函数

#### 删除的函数列表

| 文件 | 删除函数 | 数量 |
|------|----------|------|
| js/app.js | `openBackupModal`, `closeBackupModal`, `createBackup`, `loadBackupList`, `restoreBackup`, `deleteBackup` | 6 |
| js/utils.js | `formatLargeNumber`, `getMarket`, `getStockPriceUrl`, `getStockInfoUrl`, `formatDate`, `getToday`, `debounce`, `generateId` | 8 |
| js/dataManager.js | `exportToFile`, `importFromFile`, `getCurrentStock`, `switchStock`, `addTrade`, `updateTrade`, `deleteTrade`, `getStocksByGroup`, `searchStocks` | 9 |
| js/config.js | `reset`, `getInfo` | 2 |
| js/chartManager.js | `exportImage`, `initBatch`, `initDelayed` | 3 |

**注意**: `config.js` 的 `export()` 和 `import()` 已恢复，因为被内部调用

#### Git 提交记录

```
2c1f92f refactor(app): 删除已注释的备份管理死代码
271e385 refactor(utils): 删除未使用的工具函数
d66d5f9 refactor(dataManager): 删除未使用的辅助函数
72795cd refactor(config): 删除未使用的配置函数
0c16c84 refactor(chartManager): 删除未使用的图表函数
e7bf75d fix(config): 恢复 export/import 函数，它们被内部调用
```

---

### 2026-04-22 后续修复与重构

#### 修复 1: Dark 主题弹窗适配

**文件**: `css/style.css`

**修改内容**:
- 添加 `.add-stock-modal` Dark 主题样式
- 添加 `.trade-modal-content` Dark 主题样式
- 添加 `.add-trade-form-container` 表单元素 Dark 主题样式
- 强制修复输入框背景色（使用 `!important`）

**Git 提交**: `6aad60a`, `d422520`, `1d44a70`

---

#### 重构 2: 分离 UI 状态和交易数据存储

**目标**: D1 只存储交易数据，UI 状态存储在 localStorage

**修改文件**:
- `js/router.js`: 添加 `saveUIState()`/`loadUIState()`，移除 D1 保存
- `functions/api/[[path]].js`: D1 API 只处理 `stocks` 数据
- `js/dataManager.js`: 移除 `currentStockCode` 合并逻辑

**数据存储架构**:

| 存储位置 | 内容 | 说明 |
|----------|------|------|
| D1 数据库 | `stocks` | 交易数据（持久化） |
| localStorage | `currentPage`, `currentStockCode` | UI 状态（刷新时清除） |
| 内存 | `scrollPositions` | 滚动位置（会话内） |

**Git 提交**: `112db48`

---

#### 重构 3: 简化刷新逻辑

**目标**: 浏览器刷新后总是显示汇总页顶部

**修改文件**: `js/router.js`

**新行为**:

| 操作 | 结果 |
|------|------|
| 浏览器刷新 | 总是显示汇总页顶部 |
| 汇总页 → 详情页 → 返回 | 恢复汇总页位置（会话内） |
| 页面内刷新股价按钮 | 不受影响 |

**Git 提交**: `88c5f05`, `78e72ef`, `26f24e7`, `5cc9473`, `0eecfa0`

---

### 回滚指南

如需回滚优化，可使用以下命令：

```bash
# 查看提交历史
git log --oneline -20

# 回退到优化前的状态
git reset --hard f068d02

# 或逐个回退
git revert 0eecfa0  # 回退刷新逻辑简化
git revert 112db48  # 回退 UI 状态分离
git revert 1d44a70  # 回退 Dark 主题修复
```

---

**维护者**：iFlow CLI
**最后更新**：2026-04-23
**版本**：v2.28.0
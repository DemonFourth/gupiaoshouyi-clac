# 股票收益计算器 - 开发规范文档

> 版本：v2.3.1
> 更新日期：2026-03-16

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
- [测试规范](#测试规范)
- [Git提交规范](#git提交规范)
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

### 1. 使用 ChartManager

**必须遵循**：
- 使用 ChartManager 管理图表实例
- 图表初始化时指定唯一 ID
- 页面切换时正确销毁图表

**示例**：
```javascript
const ChartManager = StockProfitCalculator.ChartManager;

// ✅ 正确：初始化图表
ChartManager.init('profitChart', chartDom, option);

// ✅ 正确：更新图表
ChartManager.update('profitChart', newOption);

// ✅ 正确：销毁图表
ChartManager.dispose('profitChart');
```

### 2. 图表配置

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

**维护者**：iFlow CLI
**最后更新**：2026-03-13
**版本**：v2.2.2
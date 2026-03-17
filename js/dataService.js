/**
 * 数据服务层
 * 统一数据访问接口，解耦模块间依赖
 * 提供缓存机制，提高数据访问效率
 *
 * 版本: 1.0.0
 * 创建日期: 2026-03-12
 */

const DataService = {
    // 计算结果缓存
    _calculationCache: new Map(),
    // 股票数据缓存
    _stockDataCache: null,
    // 缓存失效标记
    _cacheInvalid: true,

    /**
     * 初始化服务层
     */
    init() {
        // 监听数据变更事件，自动失效缓存
        if (StockProfitCalculator.EventBus) {
            StockProfitCalculator.EventBus
                .on(StockProfitCalculator.EventBus.EventTypes.STOCK_ADDED, () => this._invalidateAll())
                .on(StockProfitCalculator.EventBus.EventTypes.STOCK_DELETED, () => this._invalidateAll())
                .on(StockProfitCalculator.EventBus.EventTypes.TRADE_ADDED, (data) => this._invalidateStock(data.stockCode))
                .on(StockProfitCalculator.EventBus.EventTypes.TRADE_UPDATED, (data) => this._invalidateStock(data.stockCode))
                .on(StockProfitCalculator.EventBus.EventTypes.TRADE_DELETED, (data) => this._invalidateStock(data.stockCode))
                .on(StockProfitCalculator.EventBus.EventTypes.DATA_CHANGED, () => this._invalidateAll());
        }
    },

    /**
     * 获取股票数据
     * @param {string} stockCode - 股票代码
     * @returns {Promise<Object|null>} 股票数据
     */
    async getStock(stockCode) {
        if (!stockCode) return null;

        const data = await StockProfitCalculator.DataManager.load();
        if (!data || !data.stocks) return null;

        return data.stocks.find(s => s.code === stockCode) || null;
    },

    /**
     * 获取所有股票数据
     * @returns {Promise<Array>} 股票数据数组
     */
    async getAllStocks() {
        const data = await StockProfitCalculator.DataManager.load();
        if (!data || !data.stocks) return [];

        return data.stocks;
    },

    /**
     * 获取指定分组的股票数据
     * @param {string} group - 分组名称 ('holding' | 'cleared')
     * @returns {Array} 股票数据数组
     */
    getStocksByGroup(group) {
        const stocks = this.getAllStocks();
        return stocks.filter(s => s.group === group);
    },

    /**
     * 获取交易数据
     * @param {string} stockCode - 股票代码
     * @returns {Promise<Array>} 交易记录数组
     */
    async getTradeData(stockCode) {
        const stock = await this.getStock(stockCode);
        return stock ? (stock.trades || []) : [];
    },

    /**
     * 获取计算结果
     * @param {string} stockCode - 股票代码
     * @returns {Promise<Object|null>} 计算结果
     */
    async getCalculationResult(stockCode) {
        if (!stockCode) return null;

        // 检查缓存
        const cached = this._calculationCache.get(stockCode);
        if (cached && !cached.invalid) {
            return cached.result;
        }

        // 重新计算
        const trades = await this.getTradeData(stockCode);
        if (!trades || trades.length === 0) {
            return null;
        }

        const result = StockProfitCalculator.Calculator.calculateAll(trades);

        // 缓存结果
        this._calculationCache.set(stockCode, {
            result: result,
            invalid: false,
            timestamp: Date.now()
        });

        return result;
    },

    /**
     * 获取当前股票代码
     * @returns {string|null} 当前股票代码
     */
    getCurrentStockCode() {
        const data = StockProfitCalculator.DataManager.load();
        return data ? data.currentStockCode : null;
    },

    /**
     * 设置当前股票代码
     * @param {string} stockCode - 股票代码
     */
    setCurrentStockCode(stockCode) {
        const data = StockProfitCalculator.DataManager.load();
        if (data) {
            data.currentStockCode = stockCode;
            StockProfitCalculator.DataManager.save(data);
        }
    },

    /**
     * 获取股票快照
     * @param {string} stockCode - 股票代码
     * @returns {Object|null} 快照数据
     */
    getSnapshot(stockCode) {
        if (StockProfitCalculator.StockSnapshot) {
            return StockProfitCalculator.StockSnapshot.getBaseSnapshot(stockCode);
        }
        return null;
    },

    /**
     * 使缓存失效
     * @param {string} stockCode - 股票代码
     */
    invalidateCache(stockCode) {
        this._invalidateStock(stockCode);
    },

    /**
     * 使所有缓存失效
     */
    invalidateAllCache() {
        this._invalidateAll();
    },

    /**
     * 内部方法：使指定股票的缓存失效
     * @param {string} stockCode - 股票代码
     */
    _invalidateStock(stockCode) {
        // 使计算结果缓存失效
        const cached = this._calculationCache.get(stockCode);
        if (cached) {
            cached.invalid = true;
        }

        // 使快照缓存失效
        if (StockProfitCalculator.StockSnapshot) {
            StockProfitCalculator.StockSnapshot.invalidate(stockCode);
        }
    },

    /**
     * 内部方法：使所有缓存失效
     */
    _invalidateAll() {
        // 使所有计算结果缓存失效
        this._calculationCache.forEach(cached => {
            cached.invalid = true;
        });

        // 使股票数据缓存失效
        this._stockDataCache = null;

        // 使所有快照缓存失效
        if (StockProfitCalculator.StockSnapshot && StockProfitCalculator.StockSnapshot.clear) {
            StockProfitCalculator.StockSnapshot.clear();
        }
    },

    /**
     * 清理失效的缓存
     * @param {number} maxAge - 最大缓存年龄（毫秒），默认 5 分钟
     */
    cleanupInvalidCache(maxAge = 5 * 60 * 1000) {
        const now = Date.now();
        const keysToDelete = [];

        // 查找需要清理的缓存
        this._calculationCache.forEach((cached, key) => {
            // 删除失效且超过最大年龄的缓存
            if (cached.invalid && (now - cached.timestamp) > maxAge) {
                keysToDelete.push(key);
            }
        });

        // 删除缓存
        keysToDelete.forEach(key => {
            this._calculationCache.delete(key);
        });

        return keysToDelete.length;
    },

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        let validCount = 0;
        let invalidCount = 0;
        const now = Date.now();

        this._calculationCache.forEach(cached => {
            if (cached.invalid) {
                invalidCount++;
            } else {
                validCount++;
            }
        });

        return {
            total: this._calculationCache.size,
            valid: validCount,
            invalid: invalidCount,
            invalidKeys: Array.from(this._calculationCache.entries())
                .filter(([_, cached]) => cached.invalid)
                .map(([key, _]) => key)
        };
    },

    /**
     * 清理过期缓存
     * @param {number} maxAge - 最大缓存时间（毫秒）
     */
    cleanExpiredCache(maxAge = 5 * 60 * 1000) {
        const now = Date.now();
        const keysToDelete = [];

        this._calculationCache.forEach((cached, key) => {
            if (now - cached.timestamp > maxAge) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => {
            this._calculationCache.delete(key);
        });
    }
};

// 挂载到命名空间
StockProfitCalculator.DataService = DataService;
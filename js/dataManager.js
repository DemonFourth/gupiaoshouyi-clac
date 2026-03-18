/**
 * 数据管理模块
 * 负责数据的存储、读取
 * - 本地开发（file://）：仅使用 localStorage
 * - 部署环境：localStorage + Cloudflare D1 混合存储
 */

const DataManager = {
    // API 基础路径
    API_BASE: '/api',

    // localStorage 键名
    LOCAL_STORAGE_KEY: 'stockProfitCalculator_local',

    // 数据缓存
    _cache: null,
    _cacheValid: false,

    // 防抖保存
    _debouncedSave: null,
    _saveTimeout: null,
    _saveDebounceDelay: null, // 从 Config 加载

    // 同步状态
    _syncChecked: false,

    // 存储模式缓存
    _storageMode: null,

    /**
     * 检测是否是本地开发环境
     * file:// 协议表示本地打开
     * @returns {boolean}
     */
    _isLocalDevelopment() {
        return window.location.protocol === 'file:';
    },

    /**
     * 获取当前存储模式
     * @returns {Object} { mode: 'local'|'hybrid', label: string }
     */
    getStorageMode() {
        if (this._storageMode) {
            return this._storageMode;
        }

        if (this._isLocalDevelopment()) {
            this._storageMode = {
                mode: 'local',
                label: '浏览器本地存储'
            };
        } else {
            this._storageMode = {
                mode: 'hybrid',
                label: '本地 + 云端混合存储'
            };
        }

        return this._storageMode;
    },

    // 默认数据结构
    getDefaultData() {
        return {
            stocks: [],
            currentStockCode: null,
            version: '1.0.0'
        };
    },

    /**
     * 根据交易记录归一化股票分组
     * 规则：currentHolding > 0 => holding，否则 => cleared
     * @param {Object} stock
     */
    normalizeStockGroup(stock) {
        if (!stock || !Array.isArray(stock.trades)) {
            return;
        }

        // 如果没有交易记录，保留用户选择的分组
        if (!stock.trades || stock.trades.length === 0) {
            return;
        }

        const Calculator = StockProfitCalculator.Calculator;
        if (!Calculator) {
            return;
        }

        const calcResult = Calculator.calculateAll(stock.trades);
        const currentHolding = calcResult?.summary?.currentHolding || 0;
        stock.group = currentHolding > 0 ? 'holding' : 'cleared';
    },

    /**
     * 归一化所有股票分组，避免数据状态漂移
     * @param {Object} data
     */
    normalizeAllGroups(data) {
        if (!data || !Array.isArray(data.stocks)) return;
        data.stocks.forEach(stock => {
            this.normalizeStockGroup(stock);
        });
    },

    // ==================== localStorage 操作 ====================

    /**
     * 从 localStorage 读取数据
     * @returns {Object|null} 本地数据
     */
    loadFromLocalStorage() {
        try {
            const json = localStorage.getItem(this.LOCAL_STORAGE_KEY);
            if (!json) return null;
            const data = JSON.parse(json);
            console.log('[loadFromLocalStorage] 读取成功，股票数量:', data?.stocks?.length || 0);
            return data;
        } catch (error) {
            console.error('[loadFromLocalStorage] 读取失败:', error);
            return null;
        }
    },

    /**
     * 保存数据到 localStorage
     * @param {Object} data - 要保存的数据
     */
    saveToLocalStorage(data) {
        try {
            // 添加/更新时间戳
            data.lastModified = new Date().toISOString();
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
            console.log('[saveToLocalStorage] 保存成功');
        } catch (error) {
            console.error('[saveToLocalStorage] 保存失败:', error);
        }
    },

    /**
     * 清除 localStorage 数据
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem(this.LOCAL_STORAGE_KEY);
            console.log('[clearLocalStorage] 清除成功');
        } catch (error) {
            console.error('[clearLocalStorage] 清除失败:', error);
        }
    },

    /**
     * 比较本地数据和 D1 数据的差异
     * @param {Object} localData - 本地数据
     * @param {Object} d1Data - D1 数据
     * @returns {Object} 差异分析结果
     */
    compareData(localData, d1Data) {
        const result = {
            hasDiff: false,
            newStocksInLocal: [],
            newStocksInD1: [],
            newTradesInLocal: 0,
            newTradesInD1: 0,
            details: []
        };

        if (!localData || !localData.stocks) {
            if (d1Data && d1Data.stocks && d1Data.stocks.length > 0) {
                result.hasDiff = true;
                result.newStocksInD1 = [...d1Data.stocks];
            }
            return result;
        }

        if (!d1Data || !d1Data.stocks) {
            if (localData.stocks.length > 0) {
                result.hasDiff = true;
                result.newStocksInLocal = [...localData.stocks];
            }
            return result;
        }

        const localStockMap = new Map(localData.stocks.map(s => [s.code, s]));
        const d1StockMap = new Map(d1Data.stocks.map(s => [s.code, s]));

        // 检查本地新增股票
        for (const stock of localData.stocks) {
            if (!d1StockMap.has(stock.code)) {
                result.newStocksInLocal.push(stock);
                result.hasDiff = true;
            }
        }

        // 检查 D1 新增股票
        for (const stock of d1Data.stocks) {
            if (!localStockMap.has(stock.code)) {
                result.newStocksInD1.push(stock);
                result.hasDiff = true;
            }
        }

        // 检查交易记录差异
        for (const localStock of localData.stocks) {
            const d1Stock = d1StockMap.get(localStock.code);
            if (d1Stock) {
                const diff = this._compareTrades(localStock.trades || [], d1Stock.trades || []);
                if (diff.localNew > 0 || diff.d1New > 0) {
                    result.newTradesInLocal += diff.localNew;
                    result.newTradesInD1 += diff.d1New;
                    result.details.push({
                        code: localStock.code,
                        name: localStock.name,
                        localNew: diff.localNew,
                        d1New: diff.d1New
                    });
                    result.hasDiff = true;
                }
            }
        }

        return result;
    },

    /**
     * 比较交易记录差异
     * @param {Array} localTrades - 本地交易记录
     * @param {Array} d1Trades - D1 交易记录
     * @returns {Object} 差异结果
     */
    _compareTrades(localTrades, d1Trades) {
        const localSet = new Set(localTrades.map(t => `${t.date}-${t.type}-${t.price}-${t.amount}`));
        const d1Set = new Set(d1Trades.map(t => `${t.date}-${t.type}-${t.price}-${t.amount}`));

        let localNew = 0;
        let d1New = 0;

        for (const key of localSet) {
            if (!d1Set.has(key)) localNew++;
        }
        for (const key of d1Set) {
            if (!localSet.has(key)) d1New++;
        }

        return { localNew, d1New };
    },

    /**
     * 合并本地和 D1 数据（以 D1 为准，补充本地新增）
     * @param {Object} localData - 本地数据
     * @param {Object} d1Data - D1 数据
     * @returns {Object} 合并后的数据
     */
    mergeDataFromLocal(localData, d1Data) {
        if (!d1Data) return localData;
        if (!localData) return d1Data;

        const result = {
            stocks: [...(d1Data.stocks || [])],
            currentStockCode: d1Data.currentStockCode,
            lastModified: new Date().toISOString(),
            version: d1Data.version || '1.0.0'
        };

        const stockMap = new Map(result.stocks.map((s, i) => [s.code, i]));

        // 添加本地新增的股票和交易记录
        for (const localStock of (localData.stocks || [])) {
            if (stockMap.has(localStock.code)) {
                // 合并交易记录
                const idx = stockMap.get(localStock.code);
                const existing = result.stocks[idx];
                const mergedTrades = this._mergeTrades(existing.trades || [], localStock.trades || []);
                existing.trades = mergedTrades;
            } else {
                // 添加新股票
                result.stocks.push({ ...localStock });
            }
        }

        return result;
    },

    /**
     * 合并交易记录（去重）
     * @param {Array} d1Trades - D1 交易记录
     * @param {Array} localTrades - 本地交易记录
     * @returns {Array} 合并后的交易记录
     */
    _mergeTrades(d1Trades, localTrades) {
        const tradeMap = new Map();

        // 先添加 D1 记录
        d1Trades.forEach(trade => {
            const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
            tradeMap.set(key, { ...trade });
        });

        // 再添加本地记录（不覆盖 D1 已有的）
        localTrades.forEach(trade => {
            const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
            if (!tradeMap.has(key)) {
                tradeMap.set(key, { ...trade });
            }
        });

        return Array.from(tradeMap.values()).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
    },

    // ==================== 初始化 ====================

    // 初始化数据
    async init() {
        console.log('[DataManager.init] 开始初始化数据');

        // 从 Config 加载防抖延迟配置
        const Config = StockProfitCalculator.Config;
        this._saveDebounceDelay = Config.get('performance.debounce.save', 1000);

        // 初始化防抖保存
        this._initDebounce();

        let data = await this.load();
        if (!data || data.stocks.length === 0) {
            // 数据库为空，返回空数据结构
            data = this.getDefaultData();
        }

        // 初始化边界：确保分组与持仓一致
        this.normalizeAllGroups(data);
        
        console.log('[DataManager.init] 初始化完成，股票数量:', data.stocks.length);
        return data;
    },

    /**
     * 初始化防抖功能
     */
    _initDebounce() {
        this._debouncedSave = (data) => {
            if (this._saveTimeout) {
                clearTimeout(this._saveTimeout);
            }

            this._saveTimeout = setTimeout(() => {
                this._doSave(data);
            }, this._saveDebounceDelay);
        };
    },

    /**
     * 实际执行保存操作（调用 D1 API）
     */
    async _doSave(data) {
        try {
            const response = await fetch(`${this.API_BASE}/data`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('保存数据失败:', error);
            throw error;
        }
    },

    /**
     * 使用防抖保存（推荐用于频繁保存的场景）
     */
    saveDebounced(data) {
        this._debouncedSave(data);
    },

    /**
     * 加载数据（混合模式：优先 localStorage，后台同步 D1）
     */
    async load() {
        // 如果缓存有效，直接返回缓存
        if (this._cacheValid && this._cache) {
            return Utils.deepClone(this._cache);
        }

        // 尝试从 localStorage 读取（零延迟）
        const localData = this.loadFromLocalStorage();
        
        // 如果有本地数据，先返回本地数据，后台异步检查 D1
        if (localData && localData.stocks && localData.stocks.length > 0) {
            console.log('[DataManager.load] 使用 localStorage 数据，股票数量:', localData.stocks.length);
            
            // 数据迁移和验证
            this.migrateData(localData);
            this.normalizeAllGroups(localData);
            
            // 更新缓存
            this._cache = localData;
            this._cacheValid = true;

            // 后台异步检查 D1 数据差异（不阻塞）
            this._asyncCheckD1Sync(localData);

            return Utils.deepClone(localData);
        }

        // 没有本地数据，从 D1 加载
        console.log('[DataManager.load] localStorage 无数据，从 API 加载');
        return await this._loadFromD1();
    },

    /**
     * 后台异步检查 D1 数据差异
     * @param {Object} localData - 本地数据
     */
    async _asyncCheckD1Sync(localData) {
        // 本地开发环境，不检查 D1 同步
        if (this._isLocalDevelopment()) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/data`);
            if (!response.ok) return;

            const d1Data = await response.json();
            if (!d1Data || !d1Data.stocks) return;

            const diff = this.compareData(localData, d1Data);
            
            if (diff.hasDiff) {
                // 有差异，触发事件通知 UI
                console.log('[DataManager] 检测到数据差异:', diff);
                if (StockProfitCalculator.EventBus) {
                    StockProfitCalculator.EventBus.emit('data:sync_diff', {
                        localData,
                        d1Data,
                        diff
                    });
                }
            } else {
                // 无差异，更新 localStorage 时间戳
                this.saveToLocalStorage(d1Data);
            }
        } catch (error) {
            console.error('[_asyncCheckD1Sync] 检查失败:', error);
        }
    },

    /**
     * 从 D1 加载数据
     */
    async _loadFromD1() {
        // 本地开发环境，不尝试连接 D1 API
        if (this._isLocalDevelopment()) {
            console.log('[DataManager._loadFromD1] 本地开发环境，跳过 D1 加载');
            return null;
        }

        console.log('[DataManager._loadFromD1] 开始从 API 加载数据');

        try {
            const response = await fetch(`${this.API_BASE}/data`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 检查响应类型是否为 JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('[DataManager._loadFromD1] API 返回非 JSON 响应:', responseText.substring(0, 200));
                throw new Error('API 返回的数据格式不正确，请检查 Worker Functions 是否正确部署');
            }

            const data = await response.json();
            console.log('[DataManager._loadFromD1] 从 API 加载数据成功，股票数量:', data.stocks?.length || 0);

            // 数据验证
            if (this.validateData(data)) {
                // 数据迁移
                this.migrateData(data);
                this.normalizeAllGroups(data);

                // 更新缓存
                this._cache = data;
                this._cacheValid = true;

                // 保存到 localStorage
                this.saveToLocalStorage(data);

                return Utils.deepClone(data);
            }

            return null;
        } catch (error) {
            console.error('[DataManager._loadFromD1] 加载数据失败:', error);

            // 显示用户友好的错误提示
            if (window.StockProfitCalculator && window.StockProfitCalculator.ErrorHandler) {
                if (error.message.includes('Worker Functions')) {
                    window.StockProfitCalculator.ErrorHandler.showError(
                        '无法连接到数据库，请确保 Worker Functions 已正确部署并绑定了 D1 数据库'
                    );
                } else {
                    window.StockProfitCalculator.ErrorHandler.showError(
                        '加载数据失败: ' + error.message
                    );
                }
            }

            return null;
        }
    },

    /**
     * 保存数据（混合模式：先 localStorage，异步同步 D1）
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
                // 异步保存到 D1（不阻塞，但等待完成以确保返回值正确）
                await this._doSave(data);
            }

            // 触发数据变更事件
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

    /**
     * 使用 D1 数据覆盖本地数据
     * @param {Object} d1Data - D1 数据
     */
    async useD1Data(d1Data) {
        if (!d1Data) return false;
        
        // 数据验证和迁移
        if (this.validateData(d1Data)) {
            this.migrateData(d1Data);
            this.normalizeAllGroups(d1Data);
        }

        // 更新缓存和 localStorage
        this._cache = d1Data;
        this._cacheValid = true;
        this.saveToLocalStorage(d1Data);

        // 触发数据变更事件
        if (StockProfitCalculator.EventBus) {
            StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.DATA_CHANGED, d1Data);
        }

        return true;
    },

    /**
     * 合并本地和 D1 数据后使用
     * @param {Object} localData - 本地数据
     * @param {Object} d1Data - D1 数据
     */
    async mergeAndUse(localData, d1Data) {
        const mergedData = this.mergeDataFromLocal(localData, d1Data);
        return await this.useD1Data(mergedData);
    },

    /**
     * 使缓存失效
     */
    invalidateCache() {
        this._cacheValid = false;
    },

    /**
     * 清除缓存
     */
    clearCache() {
        this._cache = null;
        this._cacheValid = false;
    },

    /**
     * 数据验证
     */
    validateData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.stocks)) return false;
        if (data.currentStockCode !== null && typeof data.currentStockCode !== 'string') return false;

        // 验证每只股票的数据
        for (const stock of data.stocks) {
            if (!stock.code || !stock.name || !Array.isArray(stock.trades)) {
                return false;
            }
        }

        return true;
    },

    /**
     * 导出数据为JSON文件
     */
    async exportToFile() {
        const data = await this.load();
        if (!data || data.stocks.length === 0) {
            if (window.StockProfitCalculator && window.StockProfitCalculator.ErrorHandler) {
                window.StockProfitCalculator.ErrorHandler.showWarning('没有数据可导出');
            }
            return;
        }

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `股票收益数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.StockProfitCalculator && window.StockProfitCalculator.ErrorHandler) {
            window.StockProfitCalculator.ErrorHandler.showSuccess('数据导出成功！');
        }
    },

    /**
     * 从JSON文件导入数据
     */
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (this.validateData(data)) {
                        // 迁移数据：为旧数据添加 totalAmount 字段
                        this.migrateData(data);

                        // 保存新数据
                        if (await this.save(data)) {
                            resolve({ success: true, message: '数据导入成功！' });
                        } else {
                            reject(new Error('保存数据失败'));
                        }
                    } else {
                        reject(new Error('数据格式不正确'));
                    }
                } catch (error) {
                    reject(new Error('解析文件失败: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };

            reader.readAsText(file);
        });
    },

    /**
     * 数据迁移：为旧数据添加 totalAmount 字段
     */
    migrateData(data) {
        if (!data.stocks) return;

        data.stocks.forEach(stock => {
            if (!stock.trades) return;

            stock.trades.forEach(trade => {
                // 如果没有 totalAmount 字段，根据类型计算
                if (trade.totalAmount === undefined) {
                    if (trade.type === 'dividend' || trade.type === 'tax') {
                        // 旧数据中分红/红利税的 amount 字段存储的是金额
                        trade.totalAmount = Math.round((trade.amount || 0) * 100) / 100;
                        trade.amount = 0;
                        trade.price = 0;
                        trade.fee = 0;
                    } else {
                        // 买入/卖出：totalAmount = price * amount，保留2位小数
                        const total = (trade.price || 0) * (trade.amount || 0);
                        trade.totalAmount = Math.round(total * 100) / 100;
                    }
                }
            });
        });
    },

    /**
     * 获取当前股票
     */
    getCurrentStock(data) {
        return data.stocks.find(s => s.code === data.currentStockCode);
    },

    /**
     * 添加新股票
     */
    async addStock(data, stockInfo) {
        // 检查股票代码是否已存在
        if (data.stocks.some(s => s.code === stockInfo.code)) {
            return { success: false, message: '该股票已存在' };
        }

        const newStock = {
            code: stockInfo.code,
            name: stockInfo.name,
            group: stockInfo.group || 'holding',
            trades: []
        };

        data.stocks.push(newStock);
        await this.save(data);

        return { success: true, message: '添加成功', stock: newStock };
    },

    /**
     * 删除股票
     */
    async deleteStock(data, stockCode) {
        const index = data.stocks.findIndex(s => s.code === stockCode);
        if (index === -1) {
            return { success: false, message: '股票不存在' };
        }

        data.stocks.splice(index, 1);

        // 如果删除的是当前股票，切换到第一只股票
        if (data.currentStockCode === stockCode) {
            data.currentStockCode = data.stocks.length > 0 ? data.stocks[0].code : null;
        }

        await this.save(data);
        return { success: true, message: '删除成功' };
    },

    /**
     * 更新股票信息
     */
    async updateStock(data, stockCode, updates) {
        const stock = data.stocks.find(s => s.code === stockCode);
        if (!stock) {
            return { success: false, message: '股票不存在' };
        }

        Object.assign(stock, updates);
        await this.save(data);
        return { success: true, message: '更新成功' };
    },

    /**
     * 切换当前股票
     */
    async switchStock(data, stockCode) {
        const stock = data.stocks.find(s => s.code === stockCode);
        if (!stock) {
            return { success: false, message: '股票不存在' };
        }

        data.currentStockCode = stockCode;
        await this.save(data);
        return { success: true, message: '切换成功' };
    },

    /**
     * 添加交易记录
     */
    async addTrade(data, trade) {
        const stock = this.getCurrentStock(data);
        if (!stock) {
            return { success: false, message: '未找到当前股票' };
        }

        // 生成新ID
        const maxId = stock.trades.reduce((max, t) => Math.max(max, t.id), 0);
        trade.id = maxId + 1;

        stock.trades.push(trade);
        await this.save(data);

        return { success: true, message: '添加成功', trade };
    },

    /**
     * 更新交易记录
     */
    async updateTrade(data, tradeId, updates) {
        const stock = this.getCurrentStock(data);
        if (!stock) {
            return { success: false, message: '未找到当前股票' };
        }

        const trade = stock.trades.find(t => t.id === tradeId);
        if (!trade) {
            return { success: false, message: '交易记录不存在' };
        }

        Object.assign(trade, updates);
        await this.save(data);
        return { success: true, message: '更新成功' };
    },

    /**
     * 删除交易记录
     */
    async deleteTrade(data, tradeId) {
        const stock = this.getCurrentStock(data);
        if (!stock) {
            return { success: false, message: '未找到当前股票' };
        }

        const index = stock.trades.findIndex(t => t.id === tradeId);
        if (index === -1) {
            return { success: false, message: '交易记录不存在' };
        }

        stock.trades.splice(index, 1);
        await this.save(data);
        return { success: true, message: '删除成功' };
    },

    /**
     * 按分组获取股票列表
     */
    getStocksByGroup(data, group) {
        return data.stocks.filter(s => s.group === group);
    },

    /**
     * 搜索股票
     */
    searchStocks(data, keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return data.stocks.filter(s =>
            s.code.toLowerCase().includes(lowerKeyword) ||
            s.name.toLowerCase().includes(lowerKeyword)
        );
    }
};

// 挂载到命名空间
StockProfitCalculator.DataManager = DataManager;
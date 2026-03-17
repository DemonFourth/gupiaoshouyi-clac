/**
 * 数据管理模块
 * 负责数据的存储、读取（使用 Cloudflare D1 数据库）
 */

const DataManager = {
    // API 基础路径
    API_BASE: '/api',

    // 数据缓存
    _cache: null,
    _cacheValid: false,

    // 防抖保存
    _debouncedSave: null,
    _saveTimeout: null,
    _saveDebounceDelay: null, // 从 Config 加载

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

    // 初始化数据
    async init() {
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
     * 加载数据（带缓存）
     */
    async load() {
        // 如果缓存有效，直接返回缓存
        if (this._cacheValid && this._cache) {
            return Utils.deepClone(this._cache);
        }

        try {
            const response = await fetch(`${this.API_BASE}/data`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 检查响应类型是否为 JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // 读取响应文本以提供更好的错误信息
                const responseText = await response.text();
                console.error('API 返回非 JSON 响应:', responseText.substring(0, 200));
                throw new Error('API 返回的数据格式不正确，请检查 Worker Functions 是否正确部署');
            }

            const data = await response.json();

            // 数据验证
            if (this.validateData(data)) {
                // 数据迁移：确保旧数据有 totalAmount 字段
                this.migrateData(data);

                // 读取边界：确保分组与持仓一致（也会影响缓存与后续 load）
                this.normalizeAllGroups(data);

                // 更新缓存
                this._cache = data;
                this._cacheValid = true;
                return Utils.deepClone(data);
            }

            return null;
        } catch (error) {
            console.error('加载数据失败:', error);

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
     * 保存数据（更新缓存）
     */
    async save(data) {
        try {
            // 保存边界：确保分组与持仓一致
            this.normalizeAllGroups(data);

            // 更新缓存
            this._cache = data;
            this._cacheValid = true;

            // 清除快照缓存
            if (StockProfitCalculator.StockSnapshot && StockProfitCalculator.StockSnapshot.clear) {
                StockProfitCalculator.StockSnapshot.clear();
            }

            // 保存到 D1 数据库
            await this._doSave(data);

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
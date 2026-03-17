/**
 * 配置集中管理模块
 * 负责管理应用的所有配置项
 */

const Config = {
    /**
     * 应用基础配置
     */
    app: {
        name: '股票收益计算器',
        version: '2.0.0',
        author: 'iFlow CLI',
        description: '基于FIFO算法的股票投资收益计算工具'
    },

    /**
     * 数据存储配置
     */
    storage: {
        localStorageKey: 'stockProfitCalculator',
        backupPrefix: 'stockProfitCalculator_backup_',
        backupRetentionDays: 7,
        maxBackupCount: 10
    },

    /**
     * 图表配置
     */
    chart: {
        colors: {
            profit: '#f44336',
            loss: '#4caf50',
            primary: '#667eea',
            secondary: '#764ba2',
            neutral: '#9e9e9e',
            background: '#ffffff',
            grid: '#e0e0e0',
            text: '#333333'
        },
        animation: {
            duration: 300,
            easing: 'cubicOut'
        },
        dimensions: {
            height: 350,
            minWidth: 400,
            gridPadding: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '15%'
            }
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderColor: '#666',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 12
            },
            padding: [10, 15]
        }
    },

    /**
     * 数据验证配置
     */
    validation: {
        stockCode: {
            pattern: /^[0-9]{6}$/,
            minLength: 6,
            maxLength: 6
        },
        stockName: {
            minLength: 2,
            maxLength: 10
        },
        price: {
            min: 0.001,
            max: 9999.999,
            decimals: 3
        },
        amount: {
            min: 100,
            max: 1000000,
            step: 100,
            decimals: 0
        },
        fee: {
            min: 0,
            max: 10000,
            decimals: 2
        },
        date: {
            format: 'YYYY-MM-DD',
            minYear: 2000,
            maxYear: new Date().getFullYear() + 1
        }
    },

    /**
     * 股价API配置
     */
    api: {
        stockPrice: {
            timeout: 10000,
            retryTimes: 3,
            retryDelay: 1000,
            providers: ['tencent', 'eastmoney']
        },
        tencent: {
            baseUrl: 'https://qt.gtimg.cn/q=s_',
            encoding: 'gbk'
        },
        eastmoney: {
            baseUrl: 'https://push2.eastmoney.com/api/qt/stock/get',
            fields: 'f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f55,f57,f58,f60,f170,f171'
        }
    },

    /**
     * UI配置
     */
    ui: {
        theme: {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#4caf50',
            warning: '#ff9800',
            danger: '#f44336',
            info: '#2196f3'
        },
        layout: {
            maxWidth: 1560,
            padding: 24,
            borderRadius: 15,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        },
        loading: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#ffffff',
            fontSize: '16px',
            zIndex: 9999
        },
        modal: {
            zIndex: 1000,
            animationDuration: 300,
            maxWidth: 500,
            maxHeight: '75vh'
        },
        table: {
            hoverBackground: '#f5f5f5',
            headerBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            headerTextColor: '#ffffff',
            borderColor: '#e0e0e0'
        },
        pagination: {
            itemsPerPage: 20,
            maxPageButtons: 5
        },
        preferences: {
            showHoldingDetail: true
        },
        
        // 列表视图显示字段配置
        listFields: {
            holding: {
                stockName: { label: '股票名称', default: true },
                stockCode: { label: '股票代码', default: true },
                holding: { label: '持仓股数', default: true },
                marketValue: { label: '持仓市值', default: true },
                cost: { label: '持仓成本', default: true },
                startDate: { label: '建仓日', default: false },
                holdingDays: { label: '持仓天数', default: false },
                currentPrice: { label: '现价', default: true },
                dailyChange: { label: '当日涨幅', default: true },
                costPerShare: { label: '每股持仓成本', default: false },
                dilutedCostPerShare: { label: '每股摊薄成本', default: false },
                cycleProfit: { label: '当前持仓周期收益', default: false },
                cycleReturnRate: { label: '当前持仓周期收益率', default: false },
                totalProfit: { label: '总收益', default: true }
            },
            cleared: { label: '已清仓', default: true }
        },
        
        // 卡片视图显示字段配置
        cardFields: {
            holding: {
                stockName: { label: '股票名称', default: true },
                stockCode: { label: '股票代码', default: true },
                holding: { label: '持仓股数', default: true },
                marketValue: { label: '持仓市值', default: true },
                cost: { label: '持仓成本', default: true },
                costPerShare: { label: '每股持仓成本', default: true },
                dilutedCostPerShare: { label: '每股摊薄成本', default: true },
                currentPrice: { label: '当日股价', default: true },
                dailyChange: { label: '当日涨幅', default: true },
                cycleProfit: { label: '当前持仓周期收益', default: true },
                cycleReturnRate: { label: '当前持仓周期收益率', default: true },
                totalProfit: { label: '总收益', default: true },
                totalReturnRate: { label: '总收益率', default: true },
                holdingStartDate: { label: '持仓开始', default: true },
                holdingDays: { label: '持仓天数', default: true },
                yearlyStats: { label: '年度统计', default: true }
            },
            cleared: { label: '已清仓', default: true }
        }
    },

    /**
     * 性能配置
     */
    performance: {
        cache: {
            enabled: true,
            ttl: 300000, // 5分钟
            maxSize: 100
        },
        debounce: {
            default: 300,
            search: 500,
            resize: 100,
            save: 1000
        },
        throttle: {
            scroll: 100,
            resize: 50
        },
        batch: {
            enabled: true,
            batchSize: 50
        },
        loading: {
            timeout: 30000, // 30秒
            autoHide: true,
            hideDelay: 3000
        }
    },

    /**
     * 错误处理配置
     */
    errorHandling: {
        enabled: true,
        logLevel: 'error', // 'debug', 'info', 'warn', 'error'
        maxLogSize: 100,
        autoExport: false,
        notifyUser: true
    },

    /**
     * 导出配置
     */
    export: {
        json: {
            indent: 2,
            includeMeta: true
        },
        csv: {
            encoding: 'utf-8',
            includeBOM: true,
            delimiter: ','
        },
        filename: {
            dateFormat: 'YYYY-MM-DD',
            prefix: '股票收益数据'
        }
    },

    /**
     * 分组配置
     */
    groups: {
        holding: {
            name: '持仓中',
            value: 'holding',
            color: '#4caf50'
        },
        cleared: {
            name: '已清仓',
            value: 'cleared',
            color: '#9e9e9e'
        }
    },

    /**
     * 交易类型配置
     */
    tradeTypes: {
        buy: {
            name: '买入',
            value: 'buy',
            icon: '↑',
            color: '#4caf50'
        },
        sell: {
            name: '卖出',
            value: 'sell',
            icon: '↓',
            color: '#f44336'
        },
        dividend: {
            name: '分红',
            value: 'dividend',
            icon: '¥',
            color: '#2196f3'
        },
        tax: {
            name: '红利税',
            value: 'tax',
            icon: '⚠',
            color: '#ff9800'
        }
    },

    /**
     * 持仓周期配置
     */
    holdingCycles: {
        types: {
            firstBuy: {
                name: '建仓',
                color: '#4caf50',
                badge: 'badge-holding'
            },
            addBuy: {
                name: '加仓',
                color: '#2196f3',
                badge: 'badge-add'
            },
            reduceSell: {
                name: '减仓',
                color: '#ff9800',
                badge: 'badge-reduce'
            },
            clearSell: {
                name: '清仓',
                color: '#f44336',
                badge: 'badge-cleared'
            },
            dividend: {
                name: '分红',
                color: '#4caf50',
                badge: 'badge-dividend'
            },
            tax: {
                name: '红利税',
                color: '#ff9800',
                badge: 'badge-tax'
            }
        }
    },

    /**
     * 排序配置
     */
    sorting: {
        default: 'default',
        options: [
            { value: 'default', label: '默认排序' },
            { value: 'profit-desc', label: '收益降序' },
            { value: 'profit-asc', label: '收益升序' },
            { value: 'return-desc', label: '收益率降序' },
            { value: 'return-asc', label: '收益率升序' },
            { value: 'market-value-desc', label: '市值降序' },
            { value: 'market-value-asc', label: '市值升序' },
            { value: 'holding-days-desc', label: '持仓天数降序' },
            { value: 'holding-days-asc', label: '持仓天数升序' },
            { value: 'change-desc', label: '涨幅降序' },
            { value: 'change-asc', label: '涨幅升序' },
            { value: 'first-buy', label: '建仓时间' },
            { value: 'cost-desc', label: '成本降序' },
            { value: 'cost-asc', label: '成本升序' }
        ]
    },

    /**
     * 视图模式配置
     */
    viewModes: {
        card: {
            name: '卡片视图',
            value: 'card',
            icon: 'grid'
        },
        list: {
            name: '列表视图',
            value: 'list',
            icon: 'list'
        }
    },

    /**
     * 市场配置
     */
    markets: {
        sh: {
            name: '上海',
            code: 'sh',
            prefixes: ['6', '5']
        },
        sz: {
            name: '深圳',
            code: 'sz',
            prefixes: ['0', '3', '15', '16']
        }
    },

    /**
     * 格式化配置
     */
    format: {
        currency: {
            symbol: '¥',
            decimals: 2,
            thousandsSeparator: ','
        },
        percent: {
            symbol: '%',
            decimals: 3
        },
        date: {
            format: 'YYYY-MM-DD',
            separator: '-'
        },
        number: {
            decimals: 2,
            thousandsSeparator: ','
        }
    },

    /**
     * 安全配置
     */
    security: {
        enableEncryption: false,
        encryptionKey: null,
        dataValidation: true,
        inputSanitization: true
    },

    /**
     * 开发配置
     */
    development: {
        enabled: false,
        debug: false,
        consoleLog: false,
        performanceMonitoring: false
    },

    /**
     * 获取配置值
     * @param {string} path - 配置路径，如 'app.version'
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    },

    /**
     * 设置配置值
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     * @returns {boolean} 是否设置成功
     */
    set(path, value) {
        const keys = path.split('.');
        let obj = this;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in obj) || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }

        obj[keys[keys.length - 1]] = value;
        return true;
    },

    /**
     * 重置配置为默认值
     * @param {string} path - 配置路径（可选）
     */
    reset(path = null) {
        if (path) {
            // 重置指定路径的配置
            // 注意：这需要实现默认配置的深拷贝和恢复
            console.warn('重置指定配置路径的功能待实现');
        } else {
            // 重置所有配置（需要重新加载默认配置）
            console.warn('重置所有配置的功能待实现');
        }
    },

    /**
     * 验证配置
     * @returns {Object} 验证结果 {valid: boolean, errors: Array}
     */
    validate() {
        const errors = [];

        // 验证必需配置
        if (!this.app || !this.app.name) {
            errors.push('缺少应用名称配置');
        }

        if (!this.storage || !this.storage.localStorageKey) {
            errors.push('缺少存储键配置');
        }

        // 验证数值范围
        if (this.validation.price && this.validation.price.min <= 0) {
            errors.push('价格最小值必须大于0');
        }

        if (this.performance.cache && this.performance.cache.ttl <= 0) {
            errors.push('缓存TTL必须大于0');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 导出配置
     * @returns {Object} 配置对象的深拷贝
     */
    export() {
        return JSON.parse(JSON.stringify(this));
    },

    /**
     * 导入配置
     * @param {Object} config - 配置对象
     * @returns {boolean} 是否导入成功
     */
    import(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        try {
            // 使用深度合并来正确处理嵌套对象
            this._deepMerge(this, config);
            return true;
        } catch (error) {
            console.error('导入配置失败:', error);
            return false;
        }
    },

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @private
     */
    _deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    // 如果源属性是对象且不是数组，则递归合并
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    this._deepMerge(target[key], source[key]);
                } else {
                    // 否则直接赋值
                    target[key] = source[key];
                }
            }
        }
    },

    /**
     * 保存配置到 localStorage
     * @returns {boolean} 是否保存成功
     */
    save() {
        try {
            const config = this.export();
            localStorage.setItem(this.storage.localStorageKey + '_config', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    },

    /**
     * 从 localStorage 加载配置
     * @returns {boolean} 是否加载成功
     */
    load() {
        try {
            const configStr = localStorage.getItem(this.storage.localStorageKey + '_config');
            if (configStr) {
                const config = JSON.parse(configStr);
                this.import(config);
                return true;
            }
            return false;
        } catch (error) {
            console.error('加载配置失败:', error);
            return false;
        }
    },

    /**
     * 获取配置信息
     * @returns {Object} 配置信息
     */
    getInfo() {
        return {
            version: this.app.version,
            name: this.app.name,
            storageKey: this.storage.localStorageKey,
            lastModified: new Date().toISOString()
        };
    }
};

// 挂载到命名空间
StockProfitCalculator.Config = Config;
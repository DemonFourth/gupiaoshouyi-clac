/**
 * 统一日志管理模块
 * 提供可控的日志输出，支持按模块/功能控制
 * 
 * 版本: 2.0.0
 * 创建日期: 2026-04-23
 */

const Logger = {
    /**
     * 日志级别
     */
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4  // 禁用所有日志
    },

    /**
     * 当前日志级别（默认为 INFO）
     */
    currentLevel: 1,

    /**
     * 是否启用日志（从 Config 读取）
     */
    enabled: false,

    /**
     * 日志前缀
     */
    prefix: '',

    /**
     * 模块定义（可控制的模块列表）
     */
    modules: {
        app: { name: '应用初始化', enabled: false, icon: '🚀' },
        router: { name: '路由导航', enabled: false, icon: '🔀' },
        dataManager: { name: '数据管理', enabled: false, icon: '💾' },
        detail: { name: '详情页', enabled: false, icon: '📄' },
        overview: { name: '汇总页', enabled: false, icon: '📊' },
        stockManager: { name: '股票管理', enabled: false, icon: '📈' },
        tradeRecords: { name: '交易记录', enabled: false, icon: '📝' },
        eventBus: { name: '事件总线', enabled: false, icon: '📡' },
        calculator: { name: '计算器', enabled: false, icon: '🧮' },
        chart: { name: '图表渲染', enabled: false, icon: '📉' },
        perf: { name: '性能日志', enabled: false, icon: '⏱️' }
    },

    /**
     * 初始化日志模块
     */
    init() {
        // 从 Config 读取日志配置
        const Config = StockProfitCalculator.Config;
        this.enabled = Config.get('development.consoleLog', false);
        // 启用日志时，默认使用 DEBUG 级别以显示所有日志
        this.currentLevel = this.enabled ? this.levels.DEBUG : this._parseLogLevel(Config.get('errorHandling.logLevel', 'info'));
        
        // 从 Config 读取各模块的日志开关
        const savedModules = Config.get('development.logModules', {});
        for (const [key, value] of Object.entries(savedModules)) {
            if (this.modules[key]) {
                this.modules[key].enabled = value;
            }
        }
        
        // 如果 URL 中包含 debug=1 参数，强制启用所有日志
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('debug') === '1') {
                this.enabled = true;
                this.currentLevel = this.levels.DEBUG;
                // 启用所有模块
                for (const key in this.modules) {
                    this.modules[key].enabled = true;
                }
            }
            // 支持 debug=module1,module2 格式，只启用指定模块
            const debugParam = urlParams.get('debug');
            if (debugParam && debugParam !== '1') {
                this.enabled = true;
                this.currentLevel = this.levels.DEBUG;
                const enabledModules = debugParam.split(',');
                for (const key in this.modules) {
                    this.modules[key].enabled = enabledModules.includes(key);
                }
            }
        }
    },

    /**
     * 解析日志级别字符串
     * @param {string} level - 日志级别字符串
     * @returns {number} 日志级别数值
     */
    _parseLogLevel(level) {
        const levelMap = {
            'debug': this.levels.DEBUG,
            'info': this.levels.INFO,
            'warn': this.levels.WARN,
            'error': this.levels.ERROR,
            'none': this.levels.NONE
        };
        return levelMap[level.toLowerCase()] ?? this.levels.INFO;
    },

    /**
     * 从消息中提取模块名
     * @param {string} message - 日志消息
     * @returns {string|null} 模块名
     */
    _extractModule(message) {
        if (typeof message !== 'string') return null;
        
        // 匹配 [ModuleName] 格式
        const match = message.match(/^\[([^\]]+)\]/i);
        if (!match) return null;
        
        const name = match[1].toLowerCase();
        
        // 映射到模块名
        const moduleMap = {
            'app': 'app',
            'router': 'router',
            'showoverview': 'router',
            'showdetail': 'router',
            'handleroutechange': 'router',
            'datamanager': 'dataManager',
            'loadfromlocalstorage': 'dataManager',
            'savetolocalstorage': 'dataManager',
            'clearlocalstorage': 'dataManager',
            'detail': 'detail',
            'loadstock': 'detail',
            'overview': 'overview',
            'stockmanager': 'stockManager',
            'savestock': 'stockManager',
            'traderecords': 'tradeRecords',
            'eventbus': 'eventBus',
            'calculator': 'calculator',
            'chart': 'chart',
            'perf': 'perf'
        };
        
        // 直接匹配
        if (moduleMap[name]) {
            return moduleMap[name];
        }
        
        // 部分匹配（处理 overview.refresh 这种子模块格式）
        for (const [key, module] of Object.entries(moduleMap)) {
            if (name.startsWith(key + '.') || name.includes(key)) {
                return module;
            }
        }
        
        return null;
    },

    /**
     * 检查模块是否启用
     * @param {string|null} moduleName - 模块名
     * @returns {boolean} 是否启用
     */
    _isModuleEnabled(moduleName) {
        if (!this.enabled) return false;
        // 没有匹配到模块的日志，不输出（避免干扰）
        if (!moduleName) return false;
        return this.modules[moduleName]?.enabled ?? false;
    },

    /**
     * 设置全局日志开关
     * @param {boolean} enabled - 是否启用日志
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        // 启用日志时，自动设置为 DEBUG 级别
        if (enabled) {
            this.currentLevel = this.levels.DEBUG;
        }
        this._saveConfig();
    },

    /**
     * 设置模块日志开关
     * @param {string} moduleName - 模块名
     * @param {boolean} enabled - 是否启用
     */
    setModuleEnabled(moduleName, enabled) {
        if (this.modules[moduleName]) {
            this.modules[moduleName].enabled = enabled;
            this._saveConfig();
        }
    },

    /**
     * 批量设置模块日志开关
     * @param {Object} modules - 模块开关对象 { moduleName: boolean }
     */
    setModulesEnabled(modules) {
        for (const [name, enabled] of Object.entries(modules)) {
            if (this.modules[name]) {
                this.modules[name].enabled = enabled;
            }
        }
        this._saveConfig();
    },

    /**
     * 启用所有模块
     */
    enableAllModules() {
        for (const key in this.modules) {
            this.modules[key].enabled = true;
        }
        this._saveConfig();
    },

    /**
     * 禁用所有模块
     */
    disableAllModules() {
        for (const key in this.modules) {
            this.modules[key].enabled = false;
        }
        this._saveConfig();
    },

    /**
     * 保存配置到 Config
     */
    _saveConfig() {
        const Config = StockProfitCalculator.Config;
        Config.set('development.consoleLog', this.enabled);
        
        const levelNames = ['debug', 'info', 'warn', 'error', 'none'];
        Config.set('errorHandling.logLevel', levelNames[this.currentLevel] || 'info');
        
        // 保存各模块的开关状态
        const moduleStates = {};
        for (const [key, value] of Object.entries(this.modules)) {
            moduleStates[key] = value.enabled;
        }
        Config.set('development.logModules', moduleStates);
        
        Config.save();
    },

    /**
     * 设置日志级别
     * @param {string|number} level - 日志级别
     */
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this._parseLogLevel(level);
        } else {
            this.currentLevel = level;
        }
        this._saveConfig();
    },

    /**
     * 设置日志前缀
     * @param {string} prefix - 日志前缀
     */
    setPrefix(prefix) {
        this.prefix = prefix;
    },

    /**
     * 格式化日志消息
     * @param {string} message - 日志消息
     * @returns {string} 格式化后的消息
     */
    _formatMessage(message) {
        if (this.prefix) {
            return `[${this.prefix}] ${message}`;
        }
        return message;
    },

    /**
     * 输出调试日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    debug(message, ...args) {
        const moduleName = this._extractModule(message);
        if (this._isModuleEnabled(moduleName) && this.currentLevel <= this.levels.DEBUG) {
            console.log(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出信息日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    info(message, ...args) {
        const moduleName = this._extractModule(message);
        if (this._isModuleEnabled(moduleName) && this.currentLevel <= this.levels.INFO) {
            console.info(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出警告日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    warn(message, ...args) {
        const moduleName = this._extractModule(message);
        if (this._isModuleEnabled(moduleName) && this.currentLevel <= this.levels.WARN) {
            console.warn(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出错误日志（错误日志始终输出，不受模块开关限制）
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    error(message, ...args) {
        if (this.enabled && this.currentLevel <= this.levels.ERROR) {
            console.error(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出日志（等同于 info）
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    log(message, ...args) {
        this.info(message, ...args);
    },

    /**
     * 创建带前缀的子日志器
     * @param {string} prefix - 日志前缀
     * @returns {Object} 子日志器
     */
    create(prefix) {
        const self = this;
        return {
            debug(message, ...args) {
                self.debug(`[${prefix}] ${message}`, ...args);
            },
            info(message, ...args) {
                self.info(`[${prefix}] ${message}`, ...args);
            },
            warn(message, ...args) {
                self.warn(`[${prefix}] ${message}`, ...args);
            },
            error(message, ...args) {
                self.error(`[${prefix}] ${message}`, ...args);
            },
            log(message, ...args) {
                self.log(`[${prefix}] ${message}`, ...args);
            }
        };
    },

    /**
     * 分组日志开始
     * @param {string} label - 分组标签
     */
    group(label) {
        if (this.enabled && this.currentLevel <= this.levels.INFO) {
            console.group(label);
        }
    },

    /**
     * 分组日志结束
     */
    groupEnd() {
        if (this.enabled && this.currentLevel <= this.levels.INFO) {
            console.groupEnd();
        }
    },

    /**
     * 输出表格
     * @param {Array|Object} data - 表格数据
     */
    table(data) {
        if (this.enabled && this.currentLevel <= this.levels.INFO) {
            console.table(data);
        }
    },

    /**
     * 输出时间戳
     * @param {string} label - 时间戳标签
     */
    time(label) {
        if (this.enabled && this.currentLevel <= this.levels.DEBUG) {
            console.time(label);
        }
    },

    /**
     * 结束时间戳
     * @param {string} label - 时间戳标签
     */
    timeEnd(label) {
        if (this.enabled && this.currentLevel <= this.levels.DEBUG) {
            console.timeEnd(label);
        }
    },

    /**
     * 获取当前配置状态
     * @returns {Object} 配置状态
     */
    getStatus() {
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
        const moduleStatus = {};
        for (const [key, value] of Object.entries(this.modules)) {
            moduleStatus[key] = {
                name: value.name,
                enabled: value.enabled,
                icon: value.icon
            };
        }
        return {
            enabled: this.enabled,
            level: levelNames[this.currentLevel],
            prefix: this.prefix,
            modules: moduleStatus
        };
    },

    /**
     * 获取模块列表（用于 UI 显示）
     * @returns {Array} 模块列表
     */
    getModuleList() {
        return Object.entries(this.modules).map(([key, value]) => ({
            key,
            name: value.name,
            enabled: value.enabled,
            icon: value.icon
        }));
    }
};

// 挂载到命名空间
StockProfitCalculator.Logger = Logger;

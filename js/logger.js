/**
 * 统一日志管理模块
 * 提供可控的日志输出，支持通过配置开关控制
 * 
 * 版本: 1.0.0
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
    enabled: true,

    /**
     * 日志前缀
     */
    prefix: '',

    /**
     * 初始化日志模块
     */
    init() {
        // 从 Config 读取日志配置
        const Config = StockProfitCalculator.Config;
        this.enabled = Config.get('development.consoleLog', false);
        this.currentLevel = this._parseLogLevel(Config.get('errorHandling.logLevel', 'info'));
        
        // 如果 URL 中包含 debug=1 参数，强制启用日志
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('debug') === '1') {
                this.enabled = true;
                this.currentLevel = this.levels.DEBUG;
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
     * 设置日志开关
     * @param {boolean} enabled - 是否启用日志
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        // 同步到 Config
        const Config = StockProfitCalculator.Config;
        Config.set('development.consoleLog', enabled);
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
        
        // 同步到 Config
        const Config = StockProfitCalculator.Config;
        const levelNames = ['debug', 'info', 'warn', 'error', 'none'];
        Config.set('errorHandling.logLevel', levelNames[this.currentLevel] || 'info');
        Config.save();
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
        if (this.enabled && this.currentLevel <= this.levels.DEBUG) {
            console.log(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出信息日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    info(message, ...args) {
        if (this.enabled && this.currentLevel <= this.levels.INFO) {
            console.info(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出警告日志
     * @param {string} message - 日志消息
     * @param {...any} args - 额外参数
     */
    warn(message, ...args) {
        if (this.enabled && this.currentLevel <= this.levels.WARN) {
            console.warn(this._formatMessage(message), ...args);
        }
    },

    /**
     * 输出错误日志
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
        return {
            enabled: this.enabled,
            level: levelNames[this.currentLevel],
            prefix: this.prefix
        };
    }
};

// 挂载到命名空间
StockProfitCalculator.Logger = Logger;

// 初始化日志模块
Logger.init();

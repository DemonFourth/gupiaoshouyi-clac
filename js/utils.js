/**
 * 工具函数模块
 * 提供公共的工具函数，避免代码重复
 */

const Utils = {
    /**
     * 格式化价格显示（智能显示小数位数）
     * @param {number} price - 价格
     * @returns {string} 格式化后的价格字符串
     */
    formatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num)) return '0.00';

        const multiplied = num * 1000;
        const thirdDecimal = multiplied % 10;

        if (thirdDecimal === 0) {
            return num.toFixed(2);
        } else {
            return num.toFixed(3);
        }
    },

    /**
     * 格式化可空数字，空值时返回占位符
     * @param {number|null|undefined} value - 数值
     * @param {number} digits - 保留小数位
     * @param {string} fallback - 空值占位符
     * @returns {string} 格式化后的数字或占位符
     */
    formatNullableNumber(value, digits = 2, fallback = '--') {
        if (!Number.isFinite(value)) {
            return fallback;
        }
        return value.toFixed(digits);
    },

    /**
     * 格式化可空金额，空值时返回占位符
     * @param {number|null|undefined} value - 数值
     * @param {number} digits - 保留小数位
     * @param {string} fallback - 空值占位符
     * @returns {string} 格式化后的金额或占位符
     */
    formatNullableCurrency(value, digits = 2, fallback = '--') {
        if (!Number.isFinite(value)) {
            return fallback;
        }
        return `¥${value.toFixed(digits)}`;
    },

    /**
     * 格式化大数字并返回完整信息（用于tooltip）
     * @param {number} value - 数值
     * @param {number} digits - 保留小数位
     * @returns {Object} {display: 显示值, full: 完整值, converted: 是否转换}
     */
    formatLargeNumberWithTooltip(value, digits = 2) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return { display: '¥0.00', full: '¥0.00', converted: false };
        }

        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        const fullValue = sign + '¥' + absNum.toLocaleString('zh-CN', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });

        // 获取用户配置的阈值
        const threshold = Config.get('ui.preferences.largeNumberThreshold', 10000);

        // 阈值为0时禁用转换
        if (threshold <= 0) {
            return { display: fullValue, full: fullValue, converted: false };
        }

        // 根据阈值判断是否需要转换
        if (absNum >= 100000000) {
            // 亿元
            return {
                display: sign + '¥' + (absNum / 100000000).toFixed(digits) + '亿',
                full: fullValue,
                converted: true
            };
        } else if (absNum >= threshold) {
            // 万元（根据阈值）
            return {
                display: sign + '¥' + (absNum / 10000).toFixed(digits) + '万',
                full: fullValue,
                converted: true
            };
        } else {
            // 未超过阈值，原样显示
            return { display: fullValue, full: fullValue, converted: false };
        }
    },

    /**
     * 格式化可空百分比，空值时返回占位符
     * @param {number|null|undefined} value - 数值
     * @param {number} digits - 保留小数位
     * @param {string} fallback - 空值占位符
     * @returns {string} 格式化后的百分比或占位符
     */
    formatNullablePercent(value, digits = 2, fallback = '--') {
        if (!Number.isFinite(value)) {
            return fallback;
        }
        return `${value.toFixed(digits)}%`;
    },

    /**
     * 深拷贝对象
     * @param {Object} obj - 要拷贝的对象
     * @returns {Object} 拷贝后的新对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        return JSON.parse(JSON.stringify(obj));
    },

};

/**
 * 统一错误处理模块
 * 提供全局错误处理和安全执行函数
 */
const ErrorHandler = {
    /**
     * 错误级别
     */
    levels: {
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error',
        FATAL: 'fatal'
    },

    /**
     * 错误日志存储
     * @type {Array.<{time: Date, level: string, message: string, error: Error|null}>}
     */
    errorLog: [],

    /**
     * 最大错误日志数量
     */
    maxLogSize: 100,

    /**
     * 显示错误提示
     * @param {string} message - 错误消息
     * @param {Error|null} error - 错误对象
     * @param {string} level - 错误级别
     */
    showError(message, error = null, level = this.levels.ERROR) {
        // 记录错误日志
        this.logError(message, error, level);

        // 根据级别决定显示方式
        switch (level) {
            case this.levels.FATAL:
                console.error('【致命错误】', message, error);
                this._showAlert(message, level);
                break;
            case this.levels.ERROR:
                console.error('【错误】', message, error);
                this._showAlert(message, level);
                break;
            case this.levels.WARN:
                console.warn('【警告】', message, error);
                this._showAlert(message, level);
                break;
            case this.levels.INFO:
                console.info('【信息】', message, error);
                this._showAlert(message, level);
                break;
        }
    },

    /**
     * 显示提示框（使用 DOM 元素）
     * @private
     * @param {string} message - 提示消息
     * @param {string} level - 错误级别
     * @param {number} duration - 显示时长（毫秒），0 表示不自动关闭
     */
    _showAlert(message, level, duration = 5000) {
        const container = document.getElementById('alertContainer');
        if (!container) {
            // 如果容器不存在，使用 alert 作为后备
            alert(message);
            return;
        }

        // 创建提示框
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${level}`;

        // 添加图标
        const iconMap = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            fatal: '💀'
        };
        const icon = document.createElement('span');
        icon.className = 'alert-icon';
        icon.textContent = iconMap[level] || 'ℹ️';
        alertDiv.appendChild(icon);

        // 添加消息
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        alertDiv.appendChild(messageSpan);

        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'alert-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            if (progressBar) progressBar.style.animationPlayState = 'paused';
            alertDiv.style.animation = 'fadeOut 0.3s ease-out';
            alertDiv.addEventListener('animationend', () => {
                alertDiv.remove();
            }, { once: true });
        };
        alertDiv.appendChild(closeBtn);

        // 添加倒计时进度条
        let progressBar = null;
        if (duration > 0) {
            progressBar = document.createElement('div');
            progressBar.className = 'alert-progress';
            progressBar.style.setProperty('--duration', `${duration}ms`);
            alertDiv.appendChild(progressBar);
        }

        // 添加到容器
        container.appendChild(alertDiv);

        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.style.animation = 'fadeOut 0.3s ease-out';
                    alertDiv.addEventListener('animationend', () => {
                        alertDiv.remove();
                    }, { once: true });
                }
            }, duration);
        }
    },

    /**
     * 记录错误日志
     * @param {string} message - 错误消息
     * @param {Error|null} error - 错误对象
     * @param {string} level - 错误级别
     */
    logError(message, error = null, level = this.levels.ERROR) {
        const logEntry = {
            time: new Date(),
            level: level,
            message: message,
            error: error
        };

        this.errorLog.push(logEntry);

        // 限制日志数量
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // 保存到 localStorage
        try {
            localStorage.setItem('errorLog', JSON.stringify(this.errorLog.slice(-50)));
        } catch (e) {
            // 忽略存储错误
        }
    },

    /**
     * 显示错误详细信息
     * @param {Error|null} error - 错误对象
     */
    showErrorDetails(error) {
        if (!error) {
            this.showInfo('没有可用的错误信息');
            return;
        }

        const details = `
错误名称：${error.name || '未知'}
错误消息：${error.message || '无消息'}
错误堆栈：
${error.stack || '无堆栈信息'}
        `.trim();

        this.showInfo(details);
    },

    /**
     * 显示成功提示（3秒自动消失）
     * @param {string} message - 提示消息
     */
    showSuccess(message) {
        this._showAlert(message, 'info', 3000);
    },

    /**
     * 显示警告提示（3秒自动消失）
     * @param {string} message - 提示消息
     */
    showWarning(message) {
        this._showAlert(message, 'warn', 3000);
    },

    /**
     * 显示信息提示（3秒自动消失）
     * @param {string} message - 提示消息
     */
    showInfo(message) {
        this._showAlert(message, 'info', 3000);
    },

    /**
     * 显示错误提示（简化版，5秒自动消失）
     * @param {string} message - 错误消息
     */
    showErrorSimple(message) {
        this._showAlert(message, 'error', 5000);
    },

    /**
     * 安全执行同步函数
     * @param {Function} fn - 要执行的函数
     * @param {*} fallback - 执行失败时的返回值
     * @param {string} errorMessage - 错误消息
     * @returns {*} 函数执行结果或 fallback
     */
    safeExecute(fn, fallback = null, errorMessage = '操作失败') {
        try {
            return fn();
        } catch (error) {
            this.showError(errorMessage, error);
            return fallback;
        }
    },

    /**
     * 安全执行异步函数
     * @param {Function} fn - 要执行的异步函数
     * @param {*} fallback - 执行失败时的返回值
     * @param {string} errorMessage - 错误消息
     * @returns {Promise<*>} 函数执行结果或 fallback
     */
    async safeExecuteAsync(fn, fallback = null, errorMessage = '操作失败') {
        try {
            return await fn();
        } catch (error) {
            this.showError(errorMessage, error);
            return fallback;
        }
    },

    /**
     * 包装函数使其安全执行
     * @param {Function} fn - 要包装的函数
     * @param {string} errorMessage - 错误消息
     * @returns {Function} 包装后的函数
     */
    wrapSafe(fn, errorMessage = '操作失败') {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.showError(errorMessage, error);
                return null;
            }
        };
    },

    /**
     * 包装异步函数使其安全执行
     * @param {Function} fn - 要包装的异步函数
     * @param {string} errorMessage - 错误消息
     * @returns {Function} 包装后的异步函数
     */
    wrapSafeAsync(fn, errorMessage = '操作失败') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.showError(errorMessage, error);
                return null;
            }
        };
    },

    /**
     * 获取错误日志
     * @param {number} limit - 返回的最大日志数量
     * @returns {Array} 错误日志数组
     */
    getErrorLog(limit = 50) {
        return this.errorLog.slice(-limit);
    },

    /**
     * 清空错误日志
     */
    clearErrorLog() {
        this.errorLog = [];
        localStorage.removeItem('errorLog');
    },

    /**
     * 导出错误日志
     */
    exportErrorLog() {
        const logData = JSON.stringify(this.errorLog, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `错误日志_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 验证错误是否为网络错误
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否为网络错误
     */
    isNetworkError(error) {
        return error instanceof TypeError ||
               error.message.includes('Network') ||
               error.message.includes('fetch') ||
               error.message.includes('network');
    },

    /**
     * 验证错误是否为数据错误
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否为数据错误
     */
    isDataError(error) {
        return error instanceof SyntaxError ||
               error.message.includes('JSON') ||
               error.message.includes('parse');
    },

    /**
     * 验证错误是否为权限错误
     * @param {Error} error - 错误对象
     * @returns {boolean} 是否为权限错误
     */
    isPermissionError(error) {
        return error.message.includes('permission') ||
               error.message.includes('授权') ||
               error.message.includes('access');
    },

    /**
     * 全局错误处理器初始化
     */
    init() {
        // 捕获未处理的错误
        window.addEventListener('error', (event) => {
            this.showError(
                '未捕获的错误：' + event.message,
                event.error,
                this.levels.FATAL
            );
        });

        // 捕获未处理的 Promise 错误
        window.addEventListener('unhandledrejection', (event) => {
            this.showError(
                '未处理的 Promise 错误：' + event.reason,
                null,
                this.levels.FATAL
            );
        });

        // 加载保存的错误日志
        try {
            const savedLog = localStorage.getItem('errorLog');
            if (savedLog) {
                this.errorLog = JSON.parse(savedLog);
            }
        } catch (e) {
            // 忽略加载错误
        }
    }
};

// 暴露到全局
window.ErrorHandler = ErrorHandler;

// 初始化全局错误处理器
ErrorHandler.init();

/**
 * 数据验证模块
 * 提供各种数据验证功能
 */
const Validator = {
    /**
     * 验证股票代码
     * @param {string} code - 股票代码
     * @returns {boolean} 是否有效
     */
    validateStockCode(code) {
        if (!code || typeof code !== 'string') {
            return false;
        }
        // 股票代码：6位数字
        return /^[0-9]{6}$/.test(code);
    },

    /**
     * 验证股票名称
     * @param {string} name - 股票名称
     * @returns {boolean} 是否有效
     */
    validateStockName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        // 股票名称：2-20个字符（支持长ETF名称，如"华夏上证50ETF"）
        return /^.{2,20}$/.test(name.trim());
    },

    /**
     * 验证价格
     * @param {number|string} price - 价格
     * @returns {boolean} 是否有效
     */
    validatePrice(price) {
        const num = parseFloat(price);
        return !isNaN(num) && num > 0 && num <= 9999.999;
    },

    /**
     * 验证数量
     * @param {number|string} amount - 数量
     * @returns {boolean} 是否有效
     */
    validateAmount(amount) {
        const num = parseInt(amount);
        return !isNaN(num) && num > 0 && num <= 1000000 && num % 100 === 0;
    },

    /**
     * 验证手续费
     * @param {number|string} fee - 手续费
     * @returns {boolean} 是否有效
     */
    validateFee(fee) {
        const num = parseFloat(fee);
        return !isNaN(num) && num >= 0 && num <= 10000;
    },

    /**
     * 验证日期
     * @param {string} dateStr - 日期字符串 (YYYY-MM-DD)
     * @returns {boolean} 是否有效
     */
    validateDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return false;
        }

        // 格式检查
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return false;
        }

        const date = new Date(dateStr);
        const isValidDate = date instanceof Date && !isNaN(date.getTime());

        // 日期范围检查：2000-01-01 到当前日期+1年
        if (!isValidDate) {
            return false;
        }

        const minDate = new Date('2000-01-01');
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);

        return date >= minDate && date <= maxDate;
    },

    /**
     * 验证交易类型
     * @param {string} type - 交易类型
     * @returns {boolean} 是否有效
     */
    validateTradeType(type) {
        const validTypes = ['buy', 'sell', 'dividend', 'tax'];
        return validTypes.includes(type);
    },

    /**
     * 验证交易记录
     * @param {Object} trade - 交易记录对象
     * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
     */
    validateTrade(trade) {
        const errors = [];

        if (!trade || typeof trade !== 'object') {
            return { valid: false, errors: ['交易记录无效'] };
        }

        // 验证必填字段
        if (!trade.id) {
            errors.push('缺少交易ID');
        }

        if (!this.validateDate(trade.date)) {
            errors.push('交易日期无效');
        }

        if (!this.validateTradeType(trade.type)) {
            errors.push('交易类型无效');
        }

        // 根据交易类型验证不同字段
        if (trade.type === 'buy' || trade.type === 'sell') {
            if (!this.validatePrice(trade.price)) {
                errors.push('价格无效');
            }
            if (!this.validateAmount(trade.amount)) {
                errors.push('数量无效');
            }
            if (!this.validateFee(trade.fee)) {
                errors.push('手续费无效');
            }
            // 验证总金额
            const expectedTotal = Math.round((parseFloat(trade.price) || 0) * (parseInt(trade.amount) || 0) * 100) / 100;
            const actualTotal = Math.round((parseFloat(trade.totalAmount) || 0) * 100) / 100;
            if (Math.abs(expectedTotal - actualTotal) > 0.01) {
                errors.push('总金额计算错误');
            }
        } else if (trade.type === 'dividend' || trade.type === 'tax') {
            // 分红和红利税只需要验证金额
            if (trade.totalAmount === undefined || trade.totalAmount === null) {
                errors.push('缺少金额');
            }
            const amount = parseFloat(trade.totalAmount);
            if (isNaN(amount) || amount < 0) {
                errors.push('金额无效');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 验证股票对象
     * @param {Object} stock - 股票对象
     * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
     */
    validateStock(stock) {
        const errors = [];

        if (!stock || typeof stock !== 'object') {
            return { valid: false, errors: ['股票对象无效'] };
        }

        if (!this.validateStockCode(stock.code)) {
            errors.push('股票代码无效');
        }

        if (!this.validateStockName(stock.name)) {
            errors.push('股票名称无效');
        }

        if (!stock.group || !['holding', 'cleared'].includes(stock.group)) {
            errors.push('股票分组无效');
        }

        if (!Array.isArray(stock.trades)) {
            errors.push('交易记录格式无效');
        } else {
            // 验证每条交易记录
            stock.trades.forEach((trade, index) => {
                const result = this.validateTrade(trade);
                if (!result.valid) {
                    errors.push(`第${index + 1}条交易记录无效：${result.errors.join(', ')}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 验证完整数据对象
     * @param {Object} data - 数据对象
     * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
     */
    validateData(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['数据对象无效'] };
        }

        if (!Array.isArray(data.stocks)) {
            errors.push('股票列表格式无效');
        } else {
            // 验证每只股票
            data.stocks.forEach((stock, index) => {
                const result = this.validateStock(stock);
                if (!result.valid) {
                    errors.push(`第${index + 1}只股票无效：${result.errors.join(', ')}`);
                }
            });
        }

        if (typeof data.currentStockCode !== 'string') {
            errors.push('当前股票代码无效');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 验证并清理股票代码
     * @param {string} code - 股票代码
     * @returns {string|null} 清理后的股票代码或 null
     */
    cleanStockCode(code) {
        if (!code || typeof code !== 'string') {
            return null;
        }
        // 移除所有非数字字符
        const cleaned = code.replace(/\D/g, '');
        // 补齐到6位
        if (cleaned.length === 6) {
            return cleaned;
        }
        return null;
    },

    /**
     * 验证并清理股票名称
     * @param {string} name - 股票名称
     * @returns {string|null} 清理后的股票名称或 null
     */
    cleanStockName(name) {
        if (!name || typeof name !== 'string') {
            return null;
        }
        // 去除首尾空格
        const cleaned = name.trim();
        // 长度检查（支持长ETF名称，2-20个字符）
        if (cleaned.length >= 2 && cleaned.length <= 20) {
            return cleaned;
        }
        return null;
    },

    /**
     * 验证并格式化价格
     * @param {number|string} price - 价格
     * @returns {number|null} 格式化后的价格或 null
     */
    validateAndFormatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num) || num <= 0 || num > 9999.999) {
            return null;
        }
        return Math.round(num * 1000) / 1000; // 保留3位小数
    },

    /**
     * 验证并格式化数量
     * @param {number|string} amount - 数量
     * @returns {number|null} 格式化后的数量或 null
     */
    formatAmount(amount) {
        const num = parseInt(amount);
        if (isNaN(num) || num <= 0 || num > 1000000 || num % 100 !== 0) {
            return null;
        }
        return num;
    },

    /**
     * 验证并格式化日期
     * @param {string} dateStr - 日期字符串
     * @returns {string|null} 格式化后的日期或 null
     */
    formatDate(dateStr) {
        if (!this.validateDate(dateStr)) {
            return null;
        }
        // 确保格式为 YYYY-MM-DD
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 批量验证交易记录
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 验证结果 {valid: boolean, errors: Object.<number, string[]>}
     */
    validateTradesBatch(trades) {
        const errors = {};

        if (!Array.isArray(trades)) {
            return { valid: false, errors: { all: ['交易记录格式无效'] } };
        }

        trades.forEach((trade, index) => {
            const result = this.validateTrade(trade);
            if (!result.valid) {
                errors[index] = result.errors;
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    },

    /**
     * 获取验证错误摘要
     * @param {Object} validationResult - 验证结果对象
     * @returns {string} 错误摘要
     */
    getErrorSummary(validationResult) {
        if (!validationResult || validationResult.valid) {
            return '验证通过';
        }

        if (Array.isArray(validationResult.errors)) {
            return validationResult.errors.join('; ');
        }

        if (typeof validationResult.errors === 'object') {
            const summaries = Object.entries(validationResult.errors)
                .map(([index, errors]) => `记录${parseInt(index) + 1}: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
            return summaries.join('; ');
        }

        return '验证失败';
    }
};

// 暴露到全局
window.Validator = Validator;

/**
 * 统一加载状态管理模块
 * 提供全局加载状态的显示和隐藏
 */
const Loading = {
    /**
     * 加载状态容器
     * @type {HTMLElement|null}
     */
    container: null,

    /**
     * 加载状态计数器（支持嵌套加载）
     * @type {number}
     */
    loadingCount: 0,

    /**
     * 默认配置
     */
    config: {
        text: '加载中...',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        textColor: '#ffffff',
        fontSize: '16px',
        zIndex: 9999
    },

    /**
     * 显示加载状态
     * @param {string} message - 加载提示文字
     * @param {Object} options - 自定义配置
     */
    show(message = '加载中...', options = {}) {
        try {
            // 增加加载计数
            this.loadingCount++;

            // 如果已经在加载状态，只更新文字
            if (this.loadingCount > 1 && this.container) {
                const textElement = this.container.querySelector('.loading-text');
                if (textElement) {
                    textElement.textContent = message;
                }
                return;
            }

            // 创建加载容器
            this._createContainer(message, options);
        } catch (error) {
            console.error('显示加载状态失败:', error);
        }
    },

    /**
     * 隐藏加载状态
     */
    hide() {
        try {
            // 减少加载计数
            this.loadingCount--;

            // 只有当计数为0时才隐藏
            if (this.loadingCount <= 0) {
                this.loadingCount = 0;
                this._removeContainer();
            }
        } catch (error) {
            console.error('隐藏加载状态失败:', error);
        }
    },

    /**
     * 立即隐藏所有加载状态
     */
    hideAll() {
        try {
            this.loadingCount = 0;
            this._removeContainer();
        } catch (error) {
            console.error('隐藏所有加载状态失败:', error);
        }
    },

    /**
     * 带超时的加载
     * @param {string} message - 加载提示文字
     * @param {number} timeout - 超时时间（毫秒），默认从 Config 加载
     * @returns {Promise} 超时 Promise
     */
    showWithTimeout(message = '加载中...', timeout = null) {
        this.show(message);

        // 从 Config 加载超时配置
        if (timeout === null) {
            const Config = StockProfitCalculator.Config;
            timeout = Config.get('performance.loading.timeout', 30000);
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.hide();
                reject(new Error('操作超时'));
            }, timeout);
        });
    },

    /**
     * 安全执行异步函数（自动管理加载状态）
     * @param {Function} asyncFn - 异步函数
     * @param {string} message - 加载提示文字
     * @returns {Promise} 异步函数结果
     */
    async execute(asyncFn, message = '加载中...') {
        try {
            this.show(message);
            const result = await asyncFn();
            return result;
        } catch (error) {
            console.error('执行异步函数失败:', error);
            throw error;
        } finally {
            this.hide();
        }
    },

    /**
     * 创建加载容器
     * @private
     * @param {string} message - 加载提示文字
     * @param {Object} options - 自定义配置
     */
    _createContainer(message, options) {
        // 移除已存在的容器
        this._removeContainer();

        // 合并配置
        const config = { ...this.config, ...options };

        // 创建容器
        this.container = document.createElement('div');
        this.container.id = 'global-loading';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${config.backgroundColor};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: ${config.zIndex};
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // 创建加载动画
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: loading-spin 1s linear infinite;
        `;

        // 创建加载文字
        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = message;
        text.style.cssText = `
            margin-top: 16px;
            color: ${config.textColor};
            font-size: ${config.fontSize};
            font-weight: 500;
        `;

        // 添加到容器
        this.container.appendChild(spinner);
        this.container.appendChild(text);

        // 添加到页面
        document.body.appendChild(this.container);

        // 添加动画样式
        this._addStyles();

        // 显示动画
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
        });
    },

    /**
     * 移除加载容器
     * @private
     */
    _removeContainer() {
        if (this.container) {
            this.container.style.opacity = '0';
            setTimeout(() => {
                if (this.container && this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
                this.container = null;
            }, 300);
        }
    },

    /**
     * 添加加载动画样式
     * @private
     */
    _addStyles() {
        if (document.getElementById('loading-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            @keyframes loading-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * 更新加载文字
     * @param {string} message - 新的加载文字
     */
    updateText(message) {
        if (this.container) {
            const textElement = this.container.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    },

    /**
     * 检查是否正在加载
     * @returns {boolean} 是否正在加载
     */
    isLoading() {
        return this.loadingCount > 0 && this.container !== null;
    },

    /**
     * 获取加载计数
     * @returns {number} 加载计数
     */
    getLoadingCount() {
        return this.loadingCount;
    },

    /**
     * 设置默认配置
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    },

    /**
     * 重置配置为默认值
     */
    resetConfig() {
        this.config = {
            text: '加载中...',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#ffffff',
            fontSize: '16px',
            zIndex: 9999
        };
    }
};

// 挂载到命名空间
StockProfitCalculator.ErrorHandler = ErrorHandler;
StockProfitCalculator.Validator = Validator;
StockProfitCalculator.Loading = Loading;

/**
 * 渲染持仓周期历史列表（通用函数）
 * @param {Object} options - 渲染选项
 * @param {Array} options.cycleHistory - 周期历史数据
 * @param {HTMLElement} options.container - 渲染容器
 * @param {number|null} options.holdingProfit - 浮动盈亏（用于当前持仓周期）
 * @param {number|null} options.currentPrice - 当前股价（用于计算涨跌幅）
 * @param {number|null} options.totalAllProfit - 总收益（可选，默认自动计算）
 * @param {boolean} options.showClearPrice - 是否显示清仓股价和涨跌幅（详情页需要）
 * @returns {string} 渲染后的HTML字符串
 */
function renderCycleHistoryList(options) {
    const {
        cycleHistory = [],
        container = null,
        holdingProfit = null,
        currentPrice = null,
        totalAllProfit = null,
        showClearPrice = true
    } = options;

    // 空数据处理
    if (cycleHistory.length === 0) {
        const emptyHtml = '<div class="cycle-history-empty">暂无持仓周期历史</div>';
        if (container) container.innerHTML = emptyHtml;
        return emptyHtml;
    }

    // 计算总收益
    let totalProfit = totalAllProfit;
    if (totalProfit === null) {
        totalProfit = cycleHistory.reduce((sum, cycle) => {
            let profit = cycle.profit || 0;
            // 如果是当前持仓周期，加上浮动盈亏
            if (cycle.status === 'active' && holdingProfit !== null) {
                profit += holdingProfit;
            }
            return sum + profit;
        }, 0);
    }

    const totalProfitClass = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
    const totalProfitText = totalProfit >= 0 ? `+${totalProfit.toFixed(2)}` : totalProfit.toFixed(2);

    // 构建周期列表
    let listHtml = '';
    cycleHistory.forEach(cycle => {
        const isActive = cycle.status === 'active';
        const statusClass = isActive ? 'cycle-item-active' : 'cycle-item-closed';
        const statusText = isActive ? '当前' : '已结束';

        // 格式化日期范围
        const startDate = cycle.startDate || '--';
        const endDate = cycle.endDate || '至今';

        // 格式化收益（当前持仓周期加上浮动盈亏）
        let profit = cycle.profit || 0;
        if (isActive && holdingProfit !== null) {
            profit += holdingProfit;
        }
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        const profitText = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);

        // 格式化统计字段
        const totalBuyCost = (cycle.totalBuyCost || 0).toFixed(2);
        const totalSellAmount = (cycle.totalSellAmount || 0).toFixed(2);
        const totalFee = (cycle.totalFee || 0).toFixed(2);
        const totalDividend = (cycle.totalDividend || 0).toFixed(2);

        // 清仓股价和涨跌幅（仅已结束周期且需要显示）
        let statsLabelsHtml = '';
        let statsValuesHtml = '';
        
        if (showClearPrice) {
            let clearPriceText = '--';
            let changePercentText = '--';
            let changePercentClass = '';
            if (!isActive && cycle.clearPrice) {
                clearPriceText = cycle.clearPrice.toFixed(3);
                if (currentPrice && currentPrice > 0) {
                    const changePercent = ((currentPrice - cycle.clearPrice) / cycle.clearPrice) * 100;
                    changePercentText = changePercent >= 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;
                    changePercentClass = changePercent >= 0 ? 'profit-positive' : 'profit-negative';
                }
            }
            statsLabelsHtml = `
                            <span>投入</span>
                            <span>卖出</span>
                            <span>手续费</span>
                            <span>分红</span>
                            <span>清仓价</span>
                            <span>至今涨跌</span>`;
            statsValuesHtml = `
                            <span>¥${totalBuyCost}</span>
                            <span>¥${totalSellAmount}</span>
                            <span>¥${totalFee}</span>
                            <span>¥${totalDividend}</span>
                            <span>${clearPriceText}</span>
                            <span class="${changePercentClass}">${changePercentText}</span>`;
        } else {
            statsLabelsHtml = `
                            <span>投入</span>
                            <span>卖出</span>
                            <span>手续费</span>
                            <span>分红</span>`;
            statsValuesHtml = `
                            <span>¥${totalBuyCost}</span>
                            <span>¥${totalSellAmount}</span>
                            <span>¥${totalFee}</span>
                            <span>¥${totalDividend}</span>`;
        }

        // 计算收益率（当前持仓周期需要用实际收益计算）
        let returnRate = cycle.returnRate || 0;
        if (isActive && holdingProfit !== null && cycle.totalBuyCost > 0) {
            returnRate = (profit / cycle.totalBuyCost) * 100;
        }
        const returnRateText = returnRate >= 0 ? `+${returnRate.toFixed(2)}%` : `${returnRate.toFixed(2)}%`;

        listHtml += `
            <div class="cycle-history-item ${statusClass}">
                <div class="cycle-item-header">
                    <span class="cycle-number">第${cycle.cycle}轮</span>
                    <span class="cycle-status">${statusText}</span>
                </div>
                <div class="cycle-item-dates">
                    <span class="cycle-date">${startDate} ~ ${endDate}</span>
                    <span class="cycle-days">${cycle.days}天</span>
                </div>
                <div class="cycle-item-stats">
                    <div class="cycle-stats-row cycle-stats-labels">
                        ${statsLabelsHtml}
                    </div>
                    <div class="cycle-stats-row cycle-stats-values">
                        ${statsValuesHtml}
                    </div>
                </div>
                <div class="cycle-item-profit">
                    <span class="profit-label">收益</span>
                    <span class="profit-value ${profitClass}">¥${profitText} (${returnRateText})</span>
                </div>
            </div>
        `;
    });

    const resultHtml = `<div class="cycle-history-total">总收益：<span class="${totalProfitClass}">¥${totalProfitText}</span></div>${listHtml}`;

    if (container) {
        container.innerHTML = resultHtml;
    }

    return resultHtml;
}

// 挂载到命名空间
StockProfitCalculator.renderCycleHistoryList = renderCycleHistoryList;
StockProfitCalculator.Utils = Utils;

/**
 * 表单工具模块
 * 提供通用的表单验证、序列化、重置等功能
 * 
 * 版本: 1.0.0
 * 创建日期: 2026-03-13
 */

const FormHelper = {
    /**
     * 验证表单
     * @param {HTMLFormElement} form - 表单元素
     * @param {Array} rules - 验证规则数组
     * @returns {Object} 验证结果 { valid: boolean, errors: Array, firstErrorField: HTMLElement }
     */
    validate(form, rules) {
        const errors = [];
        let firstErrorField = null;

        // 清除之前的错误提示
        this.clearErrors(form);

        rules.forEach(rule => {
            const field = form.querySelector(`[name="${rule.name}"]`);
            if (!field) return;

            const value = this._getFieldValue(field, rule.type);
            const label = rule.label || rule.name;

            // 必填验证
            if (rule.required && this._isEmpty(value)) {
                errors.push({ field: rule.name, message: `${label}不能为空` });
                this._showFieldError(field, `${label}不能为空`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 如果字段为空且非必填，跳过其他验证
            if (this._isEmpty(value)) return;

            // 模式验证
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push({ field: rule.name, message: `${label}格式不正确` });
                this._showFieldError(field, `${label}格式不正确`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 最小值验证
            if (rule.min !== undefined && parseFloat(value) < rule.min) {
                errors.push({ field: rule.name, message: `${label}不能小于${rule.min}` });
                this._showFieldError(field, `${label}不能小于${rule.min}`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 最大值验证
            if (rule.max !== undefined && parseFloat(value) > rule.max) {
                errors.push({ field: rule.name, message: `${label}不能大于${rule.max}` });
                this._showFieldError(field, `${label}不能大于${rule.max}`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 最小长度验证
            if (rule.minLength && value.length < rule.minLength) {
                errors.push({ field: rule.name, message: `${label}长度不能少于${rule.minLength}个字符` });
                this._showFieldError(field, `${label}长度不能少于${rule.minLength}个字符`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 最大长度验证
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push({ field: rule.name, message: `${label}长度不能超过${rule.maxLength}个字符` });
                this._showFieldError(field, `${label}长度不能超过${rule.maxLength}个字符`);
                if (!firstErrorField) firstErrorField = field;
                return;
            }

            // 自定义验证函数
            if (rule.validator && typeof rule.validator === 'function') {
                const result = rule.validator(value, form);
                if (result !== true) {
                    errors.push({ field: rule.name, message: result || `${label}验证失败` });
                    this._showFieldError(field, result || `${label}验证失败`);
                    if (!firstErrorField) firstErrorField = field;
                    return;
                }
            }

            // 移除字段错误样式
            this._clearFieldError(field);
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            firstErrorField: firstErrorField
        };
    },

    /**
     * 获取字段值
     * @param {HTMLElement} field - 字段元素
     * @param {string} type - 字段类型
     * @returns {*} 字段值
     */
    _getFieldValue(field, type) {
        if (field.type === 'checkbox' || field.type === 'radio') {
            return field.checked;
        }
        return field.value.trim();
    },

    /**
     * 检查值是否为空
     * @param {*} value - 值
     * @returns {boolean} 是否为空
     */
    _isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (typeof value === 'boolean') return false;
        if (typeof value === 'number') return false;
        return false;
    },

    /**
     * 显示字段错误
     * @param {HTMLElement} field - 字段元素
     * @param {string} message - 错误消息
     */
    _showFieldError(field, message) {
        // 添加错误样式
        field.classList.add('error');

        // 查找或创建错误消息容器
        let errorDiv = field.parentNode.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            field.parentNode.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
    },

    /**
     * 清除字段错误
     * @param {HTMLElement} field - 字段元素
     */
    _clearFieldError(field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    /**
     * 清除所有错误提示
     * @param {HTMLFormElement} form - 表单元素
     */
    clearErrors(form) {
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.remove());
    },

    /**
     * 序列化表单
     * @param {HTMLFormElement} form - 表单元素
     * @returns {Object} 表单数据对象
     */
    serialize(form) {
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // 处理多值字段（如复选框）
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value.trim();
            }
        }

        return data;
    },

    /**
     * 填充表单
     * @param {HTMLFormElement} form - 表单元素
     * @param {Object} data - 数据对象
     */
    fillForm(form, data) {
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (!field) return;

            const value = data[key];

            if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = !!value;
            } else if (field.tagName === 'SELECT') {
                field.value = value;
            } else {
                field.value = value;
            }
        });
    },

    /**
     * 重置表单
     * @param {HTMLFormElement} form - 表单元素
     */
    reset(form) {
        form.reset();
        this.clearErrors(form);
    },

    /**
     * 禁用表单
     * @param {HTMLFormElement} form - 表单元素
     */
    disable(form) {
        const elements = form.querySelectorAll('input, select, textarea, button');
        elements.forEach(el => el.disabled = true);
    },

    /**
     * 启用表单
     * @param {HTMLFormElement} form - 表单元素
     */
    enable(form) {
        const elements = form.querySelectorAll('input, select, textarea, button');
        elements.forEach(el => el.disabled = false);
    },

    /**
     * 创建验证规则
     * @param {Object} config - 规则配置
     * @returns {Object} 验证规则对象
     */
    createRule(config) {
        return {
            name: config.name || '',
            label: config.label || '',
            type: config.type || 'text',
            required: config.required || false,
            pattern: config.pattern || null,
            min: config.min || undefined,
            max: config.max || undefined,
            minLength: config.minLength || undefined,
            maxLength: config.maxLength || undefined,
            validator: config.validator || null
        };
    },

    /**
     * 绑定实时验证
     * @param {HTMLFormElement} form - 表单元素
     * @param {Array} rules - 验证规则数组
     */
    bindRealtimeValidation(form, rules) {
        rules.forEach(rule => {
            const field = form.querySelector(`[name="${rule.name}"]`);
            if (!field) return;

            field.addEventListener('input', () => {
                this._clearFieldError(field);
            });

            field.addEventListener('blur', () => {
                const value = this._getFieldValue(field, rule.type);
                const label = rule.label || rule.name;

                // 必填验证
                if (rule.required && this._isEmpty(value)) {
                    this._showFieldError(field, `${label}不能为空`);
                    return;
                }

                // 如果字段为空且非必填，跳过其他验证
                if (this._isEmpty(value)) return;

                // 其他验证
                const result = this.validate(form, [rule]);
                if (!result.valid) {
                    this._showFieldError(field, result.errors[0].message);
                }
            });
        });
    },

    /**
     * 获取错误摘要
     * @param {Array} errors - 错误数组
     * @returns {string} 错误摘要
     */
    getErrorSummary(errors) {
        if (!errors || errors.length === 0) return '';

        const messages = errors.map(e => e.message).join('；');
        return `表单验证失败：${messages}`;
    }
};

/**
 * 预定义验证规则
 * 在对象完全初始化后定义，避免自引用初始化错误
 */
FormHelper.Rules = {
    // 股票代码规则
    stockCode: FormHelper.createRule({
        name: 'stockCode',
        label: '股票代码',
        type: 'text',
        required: true,
        pattern: /^[0-9]{6}$/,
        minLength: 6,
        maxLength: 6
    }),

    // 股票名称规则
    stockName: FormHelper.createRule({
        name: 'stockName',
        label: '股票名称',
        type: 'text',
        required: true,
        minLength: 2,
        maxLength: 10
    }),

    // 价格规则
    price: FormHelper.createRule({
        name: 'price',
        label: '价格',
        type: 'number',
        required: true,
        min: 0.001,
        max: 9999.999
    }),

    // 数量规则
    amount: FormHelper.createRule({
        name: 'amount',
        label: '数量',
        type: 'number',
        required: true,
        min: 100,
        max: 1000000
    }),

    // 手续费规则
    fee: FormHelper.createRule({
        name: 'fee',
        label: '手续费',
        type: 'number',
        required: false,
        min: 0,
        max: 10000
    }),

    // 日期规则
    date: FormHelper.createRule({
        name: 'date',
        label: '日期',
        type: 'text',
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        validator: (value) => {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }
    }),

    // 金额规则
    amountValue: FormHelper.createRule({
        name: 'amountValue',
        label: '金额',
        type: 'number',
        required: true,
        min: 0.01
    })
};

// 挂载到命名空间
StockProfitCalculator.FormHelper = FormHelper;
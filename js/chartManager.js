/**
 * 图表实例管理模块
 * 负责统一管理 ECharts 实例，防止内存泄漏
 */

const ChartManager = {
    /**
     * 图表实例存储
     * @type {Object.<string, echarts.ECharts>}
     */
    charts: {},

    /**
     * 当前主题
     * @type {string} 'dark' | 'light'
     */
    currentTheme: 'dark',

    /**
     * 主题颜色配置
     */
    themeColors: {
        dark: {
            text: '#e8eaf6',
            axisLine: 'rgba(255, 255, 255, 0.1)',
            splitLine: 'rgba(255, 255, 255, 0.05)'
        },
        light: {
            text: '#1e293b',
            axisLine: 'rgba(0, 0, 0, 0.1)',
            splitLine: 'rgba(0, 0, 0, 0.05)'
        }
    },

    /**
     * 统一的 resize 事件管理器
     */
    _resizeManager: {
        enabled: false,
        debounceTimer: null,
        debounceDelay: null,  // 从 Config 加载
        resizeHandler: null
    },

    /**
     * 懒加载管理器
     */
    _lazyLoadManager: {
        observer: null,
        pendingCharts: new Map(),  // 待懒加载的图表: chartId -> { dom, option, renderCallback }
        threshold: 0.1,  // 可见阈值（10%）
        rootMargin: '0px 0px 100px 0px'  // 提前 100px 开始加载
    },

    /**
     * 初始化图表实例
     * @param {string} chartId - 图表唯一标识
     * @param {HTMLElement} chartDom - 图表容器 DOM 元素
     * @param {Object} option - ECharts 配置选项
     * @param {Object} options - 可选配置
     * @param {boolean} options.bindResize - 是否绑定 resize 监听（默认 true）
     * @returns {echarts.ECharts} 图表实例
     */
    init(chartId, chartDom, option, options = {}) {
        try {
            // console.log(`[ChartManager.init] 创建图表: ${chartId}, option=${option ? '有' : '无'}`);

            // 先销毁已存在的实例，防止内存泄漏
            this.dispose(chartId);

            // Create chart instance
            const chart = echarts.init(chartDom);
            this.charts[chartId] = chart;

            // 注入主题配置
            const themeAwareOption = option ? this.injectThemeConfig(option) : null;

            // 只有当 option 存在时才设置配置
            if (themeAwareOption != null) {
                this.charts[chartId].setOption(themeAwareOption);
            }

            // 添加窗口大小变化监听（如果启用）
            if (options.bindResize !== false) {
                this._bindResize(chartId);
            }
            return this.charts[chartId];
        } catch (error) {
            console.error(`初始化图表失败 [${chartId}]:`, error);
            return null;
        }
    },

    /**
     * 销毁指定图表实例
     * @param {string} chartId - 图表唯一标识
     */
    dispose(chartId) {
        try {
            if (this.charts[chartId]) {
                // 移除窗口大小变化监听
                this._unbindResize(chartId);

                // 销毁图表实例
                this.charts[chartId].dispose();
                delete this.charts[chartId];
            }
        } catch (error) {
            console.error(`销毁图表失败 [${chartId}]:`, error);
        }
    },

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象（主题配置）
     * @param {Object} source - 源对象（用户配置）
     * @returns {Object} 合并后的对象
     */
    mergeDeep(target, source) {
        const output = Object.assign({}, target);

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        // 目标中不存在该键，直接使用源对象的值
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        // 递归合并，确保主题配置的基础属性（如 color）不被覆盖
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    // 源对象的值不是对象，直接覆盖
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }

        return output;
    },

    /**
     * 判断是否为对象
     * @param {any} item - 待判断的值
     * @returns {boolean}
     */
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },

    /**
     * 获取当前主题颜色配置
     * @returns {Object} 主题颜色配置
     */
    getThemeColors() {
        return this.themeColors[this.currentTheme] || this.themeColors.dark;
    },

    /**
     * 注入主题配置到图表option
     * @param {Object} option - ECharts配置选项
     * @returns {Object} 注入主题后的配置
     */
    injectThemeConfig(option) {
        if (!option) return option;

        const colors = this.getThemeColors();
        // console.log(`[ChartManager] 注入主题配置: theme=${this.currentTheme}, textColor=${colors.text}`);

        // 构建主题配置模板
        const themeConfig = {
            textStyle: {
                color: colors.text
            },
            title: {
                textStyle: {
                    color: colors.text
                }
            },
            xAxis: {
                axisLine: {
                    lineStyle: {
                        color: colors.axisLine
                    }
                },
                axisLabel: {
                    color: colors.text
                },
                splitLine: {
                    lineStyle: {
                        color: colors.splitLine
                    }
                }
            },
            yAxis: {
                nameTextStyle: {
                    color: colors.text
                },
                axisLine: {
                    lineStyle: {
                        color: colors.axisLine
                    }
                },
                axisLabel: {
                    color: colors.text
                },
                splitLine: {
                    lineStyle: {
                        color: colors.splitLine
                    }
                }
            }
        };

        // 只在用户已定义 legend 时才注入颜色
        if (option.legend) {
            themeConfig.legend = {
                textStyle: {
                    color: colors.text
                }
            };
        }

        // 深度合并用户配置和主题配置
        const merged = this.mergeDeep(themeConfig, option);

        // 特殊处理：如果 title 是数组，需要为每个 title 项注入 textStyle.color
        if (Array.isArray(merged.title)) {
            merged.title = merged.title.map(titleItem => {
                if (titleItem && typeof titleItem === 'object') {
                    return {
                        ...titleItem,
                        textStyle: {
                            color: colors.text,
                            ...(titleItem.textStyle || {})
                        }
                    };
                }
                return titleItem;
            });
        }

        return merged;
    },

    /**
     * 刷新所有图表的主题配置
     */
    refreshAllCharts() {
        try {
            const chartIds = Object.keys(this.charts);
            // console.log(`[ChartManager] 刷新 ${chartIds.length} 个图表的主题配置`);

            if (chartIds.length === 0) {
                // console.log('[ChartManager] 没有图表需要刷新');
                return;
            }

            const colors = this.getThemeColors();

            chartIds.forEach(chartId => {
                const chart = this.charts[chartId];
                if (chart) {
                    // console.log(`[ChartManager] 刷新图表: ${chartId}`);

                    // 获取当前配置,检查是否有legend
                    const currentOption = chart.getOption();
                    const hasLegend = currentOption.legend && currentOption.legend.length > 0;

                    // 构建更新配置
                    const updateConfig = {
                        textStyle: { color: colors.text },
                        title: { textStyle: { color: colors.text } },
                        xAxis: {
                            axisLine: { lineStyle: { color: colors.axisLine } },
                            axisLabel: { color: colors.text },
                            splitLine: { lineStyle: { color: colors.splitLine } }
                        },
                        yAxis: {
                            nameTextStyle: { color: colors.text },
                            axisLine: { lineStyle: { color: colors.axisLine } },
                            axisLabel: { color: colors.text },
                            splitLine: { lineStyle: { color: colors.splitLine } }
                        }
                    };

                    // 只在图表已有legend时才更新颜色
                    if (hasLegend) {
                        updateConfig.legend = { textStyle: { color: colors.text } };
                    }

                    // 特殊处理：如果当前图表的 title 是数组，需要为每个 title 项设置 textStyle.color
                    if (currentOption.title && Array.isArray(currentOption.title) && currentOption.title.length > 0) {
                        updateConfig.title = currentOption.title.map(titleItem => {
                            if (titleItem && typeof titleItem === 'object') {
                                // 先展开原有的 textStyle（排除 color），然后设置新的 color
                                const { color: _, ...restTextStyle } = titleItem.textStyle || {};
                                return {
                                    ...titleItem,
                                    textStyle: {
                                        ...restTextStyle,
                                        color: colors.text
                                    }
                                };
                            }
                            return titleItem;
                        });
                    }

                    chart.setOption(updateConfig);
                }
            });
        } catch (error) {
            console.error('刷新图表主题失败:', error);
        }
    },

    /**
     * 处理主题切换
     * @param {string} newTheme - 新主题 'dark' | 'light'
     */
    onThemeChange(newTheme) {
        // console.log(`[ChartManager] 主题切换: ${this.currentTheme} -> ${newTheme}`);
        
        // 更新当前主题
        this.currentTheme = newTheme;
        
        // 刷新所有图表
        this.refreshAllCharts();
    },

    /**
     * 销毁所有图表实例
     * 通常在页面切换或应用关闭时调用
     */
    disposeAll() {
        try {
            // 清理懒加载
            this.clearPendingCharts();

            // 销毁所有图表
            Object.keys(this.charts).forEach(chartId => {
                this.dispose(chartId);
            });
        } catch (error) {
            console.error('销毁所有图表失败:', error);
        }
    },

    /**
     * 更新图表配置
     * @param {string} chartId - 图表唯一标识
     * @param {Object} option - 新的 ECharts 配置选项
     * @param {boolean} notMerge - 是否不合并配置，默认为 false
     */
    update(chartId, option, notMerge = false) {
        try {
            if (this.charts[chartId]) {
                // 注入主题配置
                const themeAwareOption = this.injectThemeConfig(option);
                this.charts[chartId].setOption(themeAwareOption, notMerge);
            }
        } catch (error) {
            console.error(`更新图表配置失败 [${chartId}]:`, error);
        }
    },

    /**
     * 设置图表配置(自动注入主题)
     * 这是 setOption 的包装方法,自动注入主题配置
     * @param {string} chartId - 图表唯一标识
     * @param {Object} option - ECharts 配置选项
     * @param {boolean} notMerge - 是否不合并配置，默认为 false
     */
    setOption(chartId, option, notMerge = false) {
        this.update(chartId, option, notMerge);
    },

    /**
     * 调整图表大小
     * @param {string} chartId - 图表唯一标识
     */
    resize(chartId) {
        try {
            if (this.charts[chartId]) {
                this.charts[chartId].resize();
            }
        } catch (error) {
            console.error(`调整图表大小失败 [${chartId}]:`, error);
        }
    },

    /**
     * 调整所有图表大小
     * 通常在窗口大小变化时调用
     */
    resizeAll() {
        try {
            Object.values(this.charts).forEach(chart => {
                chart.resize();
            });
        } catch (error) {
            console.error('调整所有图表大小失败:', error);
        }
    },

    /**
     * 启用统一的 resize 事件管理
     * 使用防抖来减少 resize 事件触发频率
     */
    enableUnifiedResize() {
        if (this._resizeManager.enabled) {
            return;  // 已启用，直接返回
        }

        // 从 Config 加载防抖延迟配置
        const Config = StockProfitCalculator.Config;
        this._resizeManager.debounceDelay = Config.get('performance.debounce.resize', 200);

        // 创建防抖处理函数
        this._resizeManager.resizeHandler = () => {
            // 清除之前的定时器
            if (this._resizeManager.debounceTimer) {
                clearTimeout(this._resizeManager.debounceTimer);
            }

            // 设置新的定时器
            this._resizeManager.debounceTimer = setTimeout(() => {
                this.resizeAll();
            }, this._resizeManager.debounceDelay);
        };

        // 绑定统一的 resize 事件
        window.addEventListener('resize', this._resizeManager.resizeHandler);
        this._resizeManager.enabled = true;
    },

    /**
     * 禁用统一的 resize 事件管理
     */
    disableUnifiedResize() {
        if (!this._resizeManager.enabled) {
            return;  // 已禁用，直接返回
        }

        // 解绑 resize 事件
        if (this._resizeManager.resizeHandler) {
            window.removeEventListener('resize', this._resizeManager.resizeHandler);
        }

        // 清除防抖定时器
        if (this._resizeManager.debounceTimer) {
            clearTimeout(this._resizeManager.debounceTimer);
            this._resizeManager.debounceTimer = null;
        }

        this._resizeManager.enabled = false;
        this._resizeManager.resizeHandler = null;
    },

    /**
     * 手动触发图表 resize（不使用防抖）
     * 适用于需要立即响应的场景
     */
    forceResizeAll() {
        this.resizeAll();
    },

    /**
     * 初始化懒加载功能
     * 创建 IntersectionObserver 实例
     */
    initLazyLoad() {
        if (this._lazyLoadManager.observer) {
            return;  // 已初始化，直接返回
        }

        // 创建 IntersectionObserver
        this._lazyLoadManager.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const chartId = entry.target.dataset.chartId;
                    this._renderPendingChart(chartId);
                }
            });
        }, {
            threshold: this._lazyLoadManager.threshold,
            rootMargin: this._lazyLoadManager.rootMargin
        });
    },

    /**
     * 观察图表容器，当图表进入视口时自动渲染
     * @param {string} chartId - 图表唯一标识
     * @param {HTMLElement} dom - 图表容器 DOM 元素
     * @param {Object} option - ECharts 配置选项
     * @param {Function} renderCallback - 渲染完成后的回调函数（可选）
     */
    observeChart(chartId, dom, option, renderCallback = null) {
        // 确保懒加载已初始化
        this.initLazyLoad();

        // 存储待渲染的图表配置
        this._lazyLoadManager.pendingCharts.set(chartId, {
            dom: dom,
            option: option,
            renderCallback: renderCallback,
            rendered: false
        });

        // 在 DOM 元素上设置图表 ID
        dom.dataset.chartId = chartId;

        // 添加观察
        this._lazyLoadManager.observer.observe(dom);
    },

    /**
     * 取消观察图表
     * @param {string} chartId - 图表唯一标识
     */
    unobserveChart(chartId) {
        const pending = this._lazyLoadManager.pendingCharts.get(chartId);
        if (pending && this._lazyLoadManager.observer) {
            this._lazyLoadManager.observer.unobserve(pending.dom);
            this._lazyLoadManager.pendingCharts.delete(chartId);
        }
    },

    /**
     * 渲染待渲染的图表
     * @private
     * @param {string} chartId - 图表唯一标识
     */
    _renderPendingChart(chartId) {
        const pending = this._lazyLoadManager.pendingCharts.get(chartId);
        if (!pending || pending.rendered) {
            return;
        }

        // 取消观察
        this.unobserveChart(chartId);

        // 初始化图表
        const chart = this.init(chartId, pending.dom, pending.option);

        // 标记为已渲染
        pending.rendered = true;

        // 执行回调
        if (pending.renderCallback && chart) {
            pending.renderCallback(chart);
        }
    },

    /**
     * 强制渲染待渲染的图表（不等待进入视口）
     * @param {string} chartId - 图表唯一标识
     */
    forceRenderChart(chartId) {
        this._renderPendingChart(chartId);
    },

    /**
     * 清理所有待渲染的图表
     */
    clearPendingCharts() {
        if (this._lazyLoadManager.observer) {
            this._lazyLoadManager.observer.disconnect();
        }
        this._lazyLoadManager.pendingCharts.clear();
    },

    /**
     * 获取待渲染的图表数量
     * @returns {number} 待渲染的图表数量
     */
    getPendingChartCount() {
        return this._lazyLoadManager.pendingCharts.size;
    },

    /**
     * 检查图表是否已渲染
     * @param {string} chartId - 图表唯一标识
     * @returns {boolean} 是否已渲染
     */
    isChartRendered(chartId) {
        const pending = this._lazyLoadManager.pendingCharts.get(chartId);
        return pending ? pending.rendered : false;
    },

    /**
     * 获取图表实例
     * @param {string} chartId - 图表唯一标识
     * @returns {echarts.ECharts|null} 图表实例或 null
     */
    getChart(chartId) {
        return this.charts[chartId] || null;
    },

    /**
     * 检查图表是否存在
     * @param {string} chartId - 图表唯一标识
     * @returns {boolean} 图表是否存在
     */
    hasChart(chartId) {
        return !!this.charts[chartId];
    },

    /**
     * 获取所有图表ID
     * @returns {string[]} 图表ID数组
     */
    getAllChartIds() {
        return Object.keys(this.charts);
    },

    /**
     * 获取图表数量
     * @returns {number} 图表数量
     */
    getChartCount() {
        return Object.keys(this.charts).length;
    },

    /**
     * 清空所有图表实例（不销毁，仅清空数据）
     * @param {string} chartId - 图表唯一标识（可选，不传则清空所有）
     */
    clear(chartId) {
        try {
            if (chartId) {
                if (this.charts[chartId]) {
                    this.charts[chartId].clear();
                }
            } else {
                Object.values(this.charts).forEach(chart => {
                    chart.clear();
                });
            }
        } catch (error) {
            console.error('清空图表失败:', error);
        }
    },

    /**
     * 显示图表加载动画
     * @param {string} chartId - 图表唯一标识
     * @param {string} text - 加载提示文本
     */
    showLoading(chartId, text = '加载中...') {
        try {
            if (this.charts[chartId]) {
                this.charts[chartId].showLoading({
                    text: text,
                    color: '#667eea',
                    textColor: '#333',
                    maskColor: 'rgba(255, 255, 255, 0.8)',
                    zlevel: 0
                });
            }
        } catch (error) {
            console.error(`显示图表加载动画失败 [${chartId}]:`, error);
        }
    },

    /**
     * 隐藏图表加载动画
     * @param {string} chartId - 图表唯一标识
     */
    hideLoading(chartId) {
        try {
            if (this.charts[chartId]) {
                this.charts[chartId].hideLoading();
            }
        } catch (error) {
            console.error(`隐藏图表加载动画失败 [${chartId}]:`, error);
        }
    },

    /**
     * 绑定窗口大小变化监听
     * @private
     * @param {string} chartId - 图表唯一标识
     */
    _bindResize(chartId) {
        this._unbindResize(chartId);

        const handler = () => {
            this.resize(chartId);
        };

        this.charts[chartId]._resizeHandler = handler;
        window.addEventListener('resize', handler);
    },

    /**
     * 解绑窗口大小变化监听
     * @private
     * @param {string} chartId - 图表唯一标识
     */
    _unbindResize(chartId) {
        if (this.charts[chartId] && this.charts[chartId]._resizeHandler) {
            window.removeEventListener('resize', this.charts[chartId]._resizeHandler);
            delete this.charts[chartId]._resizeHandler;
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.ChartManager = ChartManager;

// 初始化时读取当前主题
Object.defineProperty(ChartManager, '_init', {
    value: function() {
        // 从 localStorage 读取主题,因为 DOM 可能还没准备好
        const theme = localStorage.getItem('theme') || 'dark';
        this.currentTheme = theme;
        // console.log(`[ChartManager] 初始化主题: ${theme}`);
    },
    writable: false,
    configurable: false
});

// 执行初始化
ChartManager._init();

// DOM 准备好后再次检查主题
document.addEventListener('DOMContentLoaded', () => {
    const domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme && domTheme !== ChartManager.currentTheme) {
        // console.log(`[ChartManager] DOM主题更新: ${ChartManager.currentTheme} -> ${domTheme}`);
        ChartManager.currentTheme = domTheme;
    }
});

// 页面卸载时自动销毁所有图表
window.addEventListener('beforeunload', () => {
    ChartManager.disposeAll();
});
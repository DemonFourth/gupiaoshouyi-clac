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
            // 先销毁已存在的实例，防止内存泄漏
            this.dispose(chartId);

            // Get current theme
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            
            // Create chart with theme-aware default options
            const chart = echarts.init(chartDom);
            this.charts[chartId] = chart;
            
            // Set default theme options
            const textColor = theme === 'dark' ? '#e8eaf6' : '#1e293b';
            const axisLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const splitLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
            
            // Apply default theme configuration
            chart.setOption({
                textStyle: {
                    color: textColor
                },
                title: {
                    textStyle: {
                        color: textColor
                    }
                },
                xAxis: {
                    axisLine: { lineStyle: { color: axisLineColor } },
                    axisLabel: { color: textColor },
                    splitLine: { lineStyle: { color: splitLineColor } }
                },
                yAxis: {
                    axisLine: { lineStyle: { color: axisLineColor } },
                    axisLabel: { color: textColor },
                    splitLine: { lineStyle: { color: splitLineColor } }
                },
                legend: {
                    textStyle: { color: textColor }
                }
            });
            
            // 只有当 option 存在时才设置配置
            if (option != null) {
                this.charts[chartId].setOption(option);
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
                this.charts[chartId].setOption(option, notMerge);
            }
        } catch (error) {
            console.error(`更新图表配置失败 [${chartId}]:`, error);
        }
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
     * 导出图表为图片
     * @param {string} chartId - 图表唯一标识
     * @param {string} filename - 文件名（不含扩展名）
     * @param {string} type - 图片类型 'png' 或 'jpeg'
     */
    exportImage(chartId, filename = 'chart', type = 'png') {
        try {
            if (this.charts[chartId]) {
                const url = this.charts[chartId].getDataURL({
                    type: type,
                    pixelRatio: 2,
                    backgroundColor: '#fff'
                });

                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${type}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error(`导出图表图片失败 [${chartId}]:`, error);
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
    },

    /**
     * 批量初始化图表
     * @param {Array.<{id: string, dom: HTMLElement, option: Object}>} chartConfigs - 图表配置数组
     * @returns {Object.<string, echarts.ECharts>} 图表实例对象
     */
    initBatch(chartConfigs) {
        const charts = {};
        chartConfigs.forEach(config => {
            const chart = this.init(config.id, config.dom, config.option);
            if (chart) {
                charts[config.id] = chart;
            }
        });
        return charts;
    },

    /**
     * 延迟初始化图表（用于DOM未就绪的情况）
     * @param {string} chartId - 图表唯一标识
     * @param {string} domSelector - DOM 选择器
     * @param {Object} option - ECharts 配置选项
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Promise<echarts.ECharts|null>} 图表实例或 null
     */
    async initDelayed(chartId, domSelector, option, delay = 100) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const dom = document.querySelector(domSelector);
                if (dom) {
                    const chart = this.init(chartId, dom, option);
                    resolve(chart);
                } else {
                    console.error(`找不到图表容器 [${domSelector}]`);
                    resolve(null);
                }
            }, delay);
        });
    }
};

// 挂载到命名空间
StockProfitCalculator.ChartManager = ChartManager;

// 页面卸载时自动销毁所有图表
window.addEventListener('beforeunload', () => {
    ChartManager.disposeAll();
});
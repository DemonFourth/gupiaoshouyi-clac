/**
 * 详情页面模块
 * 负责单只股票的详情展示
 *
 * 版本: 1.1.0
 * 更新日期: 2026-03-12
 * 修改内容: 添加 DOM 缓存优化
 */

const Detail = {
    currentStockCode: null,
    currentStock: null,
    currentStockPrice: null,
    calcResult: null,
    snapshot: null,

    // DOM 元素缓存
    _domCache: null,

    // 持仓明细分页状态（从 Config 读取配置）
    _holdingDetailPagination: {
        currentPage: 1,
        itemsPerPage: 30,  // 默认值，会在 renderHoldingDetail 中从 Config 更新
        totalItems: 0
    },

    _tooltipAutoFlipBound: false,

    // 图表懒加载相关
    _chartObserver: null,
    _chartsLoaded: false,

    // 图表实例管理
    _chartInstances: {
        holdingTrendChart: null,
        cumulativeProfitChart: null,
        profitTrendChart: null,
        returnRateTrendChart: null,
        perShareCostTrendChart: null
    },

    /**
     * 初始化 DOM 缓存
     */
    initDOMCache() {
        this._domCache = {
            // 页面头部元素
            backBtn: document.getElementById('backBtn'),
            stockInfo: document.getElementById('stockInfo'),
            currentPrice: document.getElementById('currentPrice'),
            priceChange: document.getElementById('priceChange'),
            priceRefreshStatus: document.getElementById('priceRefreshStatus'),

            // 汇总信息元素
            totalCost: document.getElementById('totalCost'),
            totalSell: document.getElementById('totalSell'),
            totalFee: document.getElementById('totalFee'),
            totalProfit: document.getElementById('totalProfit'),
            totalReturnRate: document.getElementById('totalReturnRate'),
            weeklyProfit: document.getElementById('weeklyProfit'),
            monthlyProfit: document.getElementById('monthlyProfit'),

            // 当前持仓信息元素
            realtimeCost: document.getElementById('realtimeCost'),
            realtimeHolding: document.getElementById('realtimeHolding'),
            marketValue: document.getElementById('marketValue'),
            latestProfit: document.getElementById('latestProfit'),
            latestReturnRate: document.getElementById('latestReturnRate'),
            cycleProfit: document.getElementById('cycleProfit'),
            cycleReturnRate: document.getElementById('cycleReturnRate'),
            costPerShare: document.getElementById('costPerShare'),
            dilutedCostPerShare: document.getElementById('dilutedCostPerShare'),
            holdingStartDate: document.getElementById('holdingStartDate'),
            holdingDays: document.getElementById('holdingDays'),
            holdingCycle: document.getElementById('holdingCycle'),
            holdingTooltip: document.getElementById('holdingTooltip'),
            currentCycleBuyCost: document.getElementById('currentCycleBuyCost'),
            currentCycleSellAmount: document.getElementById('currentCycleSellAmount'),
            currentCycleNetInvest: document.getElementById('currentCycleNetInvest'),

            // 总收益信息元素
            totalAllProfit: document.getElementById('totalAllProfit'),
            totalAllReturnRate: document.getElementById('totalAllReturnRate'),

            // 交易表单元素
            addTradeFormContainer: document.getElementById('addTradeFormContainer'),
            addTradeForm: document.getElementById('addTradeForm'),
            tradeDate: document.getElementById('tradeDate'),
            tradeType: document.getElementById('tradeType'),
            tradePrice: document.getElementById('tradePrice'),
            tradeAmount: document.getElementById('tradeAmount'),
            tradeFee: document.getElementById('tradeFee'),
            tradeAmountDisplay: document.getElementById('tradeAmountDisplay'),
            toggleAddTradeBtn: document.getElementById('toggleAddTradeBtn'),
            cancelAddTradeBtn: document.getElementById('cancelAddTradeBtn'),

            // 持仓明细元素
            holdingDetailBody: document.getElementById('holdingDetailBody'),
            holdingDetailPaginationContainer: document.getElementById('holdingDetailPaginationContainer'),

            // 统计数据元素
            statBuyCount: document.getElementById('statBuyCount'),
            statSellCount: document.getElementById('statSellCount'),
            statProfitCount: document.getElementById('statProfitCount'),
            statLossCount: document.getElementById('statLossCount'),
            statWinRate: document.getElementById('statWinRate'),
            statAvgReturnRate: document.getElementById('statAvgReturnRate'),
            statMaxProfit: document.getElementById('statMaxProfit'),
            statMaxLoss: document.getElementById('statMaxLoss'),

            // 图表容器
            holdingTrendChart: document.getElementById('holdingTrendChart'),
            cumulativeProfitChart: document.getElementById('cumulativeProfitChart'),
            profitTrendChart: document.getElementById('profitTrendChart'),
            returnRateTrendChart: document.getElementById('returnRateTrendChart'),
            perShareCostTrendChart: document.getElementById('perShareCostTrendChart'),

            // 按钮
            refreshPriceBtn: document.getElementById('refreshPriceBtn')
        };
    },

    /**
     * 确保 DOM 缓存已初始化
     */
    _ensureDOMCache() {
        if (!this._domCache) {
            this.initDOMCache();
        }
    },

    /**
     * 计算动态标签间隔
     * @param {number} dataPointCount - 数据点数量
     * @returns {number|string} 标签间隔（'auto' 或数字）
     */
    calculateLabelInterval(dataPointCount) {
        if (dataPointCount <= 20) return 0;  // 显示所有标签
        if (dataPointCount <= 50) return 'auto';  // 自动计算
        if (dataPointCount <= 100) return 2;  // 每2个显示1个
        if (dataPointCount <= 200) return 5;  // 每5个显示1个
        if (dataPointCount <= 500) return 10; // 每10个显示1个
        return Math.ceil(dataPointCount / 50); // 确保最多显示50个标签
    },

    /**
     * 初始化图表懒加载观察器
     */
    _initChartObserver() {
        if (this._chartObserver) return;

        // 创建 IntersectionObserver
        this._chartObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this._chartsLoaded) {
                    this._chartsLoaded = true;
                    this._renderTimeSeriesChartsInternal();
                    // 停止观察
                    this._chartObserver.disconnect();
                }
            });
        }, {
            threshold: 0.1,  // 当 10% 可见时触发
            rootMargin: '0px 0px 100px 0px'  // 提前 100px 加载
        });

        // 观察所有图表容器
        const chartContainers = [
            this._domCache.holdingTrendChart,
            this._domCache.cumulativeProfitChart,
            this._domCache.profitTrendChart,
            this._domCache.returnRateTrendChart,
            this._domCache.perShareCostTrendChart
        ];

        console.log('[Detail] _initChartObserver: 图表容器状态:', {
            holdingTrendChart: !!this._domCache.holdingTrendChart,
            cumulativeProfitChart: !!this._domCache.cumulativeProfitChart,
            profitTrendChart: !!this._domCache.profitTrendChart,
            returnRateTrendChart: !!this._domCache.returnRateTrendChart,
            perShareCostTrendChart: !!this._domCache.perShareCostTrendChart
        });

        chartContainers.forEach(container => {
            if (container) {
                this._chartObserver.observe(container);
            }
        });

        // 检查是否有图表容器，如果有，立即触发渲染
        // 这解决了页面刷新后图表不显示的问题
        setTimeout(() => {
            const anyContainerExists = chartContainers.some(container => container !== null);
            if (!this._chartsLoaded && anyContainerExists) {
                this._chartsLoaded = true;
                this._renderTimeSeriesChartsInternal();
                this._chartObserver.disconnect();
            }
        }, 300);  // 延迟 300ms 确保 DOM 已完全渲染
    },

    /**
     * 内部图表渲染方法
     */
    _renderTimeSeriesChartsInternal() {
        console.log('[Detail] _renderTimeSeriesChartsInternal: 开始渲染图表');
        
        const timeSeries = this.snapshot?.calcResult?.timeSeries;
        console.log('[Detail] _renderTimeSeriesChartsInternal: timeSeries 存在:', !!timeSeries);
        
        if (!timeSeries) {
            console.log('[Detail] _renderTimeSeriesChartsInternal: timeSeries 为空，跳过渲染');
            return;
        }

        console.log('[Detail] _renderTimeSeriesChartsInternal: timeSeries 数据:', {
            dates: timeSeries.dates?.length,
            holdings: timeSeries.holdings?.length,
            costs: timeSeries.costs?.length,
            profits: timeSeries.profits?.length,
            returnRates: timeSeries.returnRates?.length,
            costPerShares: timeSeries.costPerShares?.length
        });

        this.renderHoldingTrendChart(timeSeries);
        this.renderCumulativeProfitChart(timeSeries);
        this.renderProfitTrendChart(timeSeries);
        this.renderReturnRateTrendChart(timeSeries);
        this.renderPerShareCostTrendChart(timeSeries);
    },

    /**
     * 统一管理所有图表的 resize 操作
     */
    _resizeAllCharts() {
        // 处理普通的图表实例
        Object.values(this._chartInstances).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });

        // 处理特殊的 resize 处理函数
        if (this._chartInstances.perShareCostTrendChartResizeHandler) {
            this._chartInstances.perShareCostTrendChartResizeHandler();
        }
    },

    /**
     * 初始化统一的图表 resize 管理
     */
    _initChartResizeManager() {
        // 如果已经初始化，直接返回
        if (this._chartResizeHandler) {
            return;
        }

        // 使用 ChartManager 的统一 resize 管理
        StockProfitCalculator.ChartManager.enableUnifiedResize();
        this._chartResizeHandler = true;  // 标记为已初始化
    },

    /**
     * 销毁图表 resize 管理
     */
    _destroyChartResizeManager() {
        if (this._chartResizeHandler) {
            // 使用 ChartManager 的统一 resize 管理
            StockProfitCalculator.ChartManager.disableUnifiedResize();
            this._chartResizeHandler = null;
        }

        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = null;
        }
    },

    /**
     * 获取 dataZoom 配置
     * @param {number} xAxisIndex - x轴索引
     * @returns {Array} dataZoom 配置数组
     */
    getDataZoomConfig(xAxisIndex = 0) {
        return [
            {
                type: 'slider',        // 滑动条缩放
                xAxisIndex: xAxisIndex,
                filterMode: 'filter',
                start: 0,
                end: 100,
                bottom: 10,
                height: 20,
                borderColor: 'transparent',
                backgroundColor: '#e2e2e2',
                handleIcon: 'path://M10.7,11.9H9.3c-4.9,0.3-8.8-4-10-8.9c0.2-0.1,0.5-0.2,0.7-0.2c2.1,0.4,3.4,2.6,3.7,4.3c0.3,1.7,0.3,3.5,0,5.1c-0.3,1.7-2,3.5-3.7,3.9c-2.1,0.4-3.4-0.8-4.3-2.5c-0.1-0.2-0.1-0.5-0.2-0.7c0-0.5,0.1-0.9,0.2-1.3,0.2c1.5,1.3,2.6,3.2,2.6,5.1c0,2.9-2.4,5.3-5.3,5.3c-2.9,0-5.3-2.4-5.3-5.3c0-1.9,1-3.8,2.6-5.1c0.4,0,0.9-0.1,1.3-0.2c0.1,0.2,0.1,0.5,0.2,0.7c0.9,1.7,2.2,2.9,4.3,2.5c1.7-0.4,3.4-2.2,3.7-3.9c0.3-1.7,0.3-3.5,0-5.1c-0.3-1.7-1.6-3.9-3.7-4.3c-0.2-0.1-0.5-0.1-0.7-0.2c-0.5,0-0.9,0.1-1.3,0.2c-1.5-1.3-2.6-3.2-2.6-5.1c0-2.9,2.4-5.3,5.3-5.3c2.9,0,5.3,2.4,5.3,5.3c0,1.9-1,3.8-2.6,5.1c-0.4-0.1-0.9,0.2-1.3,0.2z',
                handleSize: '80%',
                handleStyle: {
                    color: '#a7b7cc'
                },
                textStyle: {
                    color: '#333'
                }
            },
            {
                type: 'inside',        // 鼠标滚轮缩放
                xAxisIndex: xAxisIndex,
                filterMode: 'filter'
            }
        ];
    },

    /**
     * 处理持仓明细分页页码变化
     * @param {string} action - 'prev' 或 'next'
     */
    handleHoldingDetailPageChange(action) {
        if (action === 'prev' && this._holdingDetailPagination.currentPage > 1) {
            this._holdingDetailPagination.currentPage--;
        } else if (action === 'next') {
            this._holdingDetailPagination.currentPage++;
        }
        
        // 重新渲染持仓明细
        this.updateHoldingDetail();
    },

    /**
     * 加载股票详情
     * @param {string} stockCode - 股票代码
     */
    async loadStock(stockCode) {
        console.log('[loadStock] 开始执行, stockCode:', stockCode);
        
        const TradeManager = StockProfitCalculator.TradeManager;
        const DataManager = StockProfitCalculator.DataManager;
        const Router = StockProfitCalculator.Router;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;

        const perfToken = window.Perf ? window.Perf.start('Detail.loadStock') : null;
        this.currentStockCode = stockCode;
        console.log('[loadStock] 设置 currentStockCode:', this.currentStockCode);

        // 确保 DOM 缓存已初始化
        this._ensureDOMCache();

        // 切换股票时先重置行情状态，避免复用上一只股票的最新价
        this.currentStockPrice = null;
        const priceElement = this._domCache.currentPrice;
        const changeElement = this._domCache.priceChange;
        if (priceElement) {
            priceElement.innerHTML = '<span class="loading">加载中...</span>';
            priceElement.className = 'header-quote-value';
        }
        if (changeElement) {
            changeElement.innerHTML = '<span class="loading">--</span>';
            changeElement.className = 'header-quote-value';
        }

        // headerQuote 显示由 Router 控制

        // 同步设置 TradeManager 的当前股票代码
        TradeManager.setCurrentStock(stockCode);

        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);

        if (!stock) {
            console.error('股票不存在:', stockCode);
            Router.showOverview();
            return;
        }

        this.currentStock = stock;

        // 检查是否有交易记录
        if (!stock.trades || stock.trades.length === 0) {
            console.log('[loadStock] 股票没有交易记录，显示空状态提示');
            // 显示空状态提示
            this._showEmptyState();
        } else {
            console.log('[loadStock] 股票有交易记录，数量:', stock.trades.length);
        }

        // 更新页面标题
        document.querySelector('h1').textContent = `${stock.name}(${stock.code})`;
        document.getElementById('stockInfo').textContent = '点击返回查看所有股票';
        console.log('[loadStock] 更新页面标题:', stock.name);

        // 显示返回按钮
        document.getElementById('backBtn').style.display = 'inline-flex';

        // 先构建 snapshot（包含数据计算），避免重复计算
        console.log('[loadStock] 开始构建 snapshot');
        this.snapshot = await StockSnapshot.build(stockCode, null);
        console.log('[loadStock] snapshot 构建完成');
        this.calcResult = this.snapshot.calcResult;

        // 更新UI
        console.log('[loadStock] 更新 UI');
        this.updateAll(stock);

        // 获取实时股价
        console.log('[loadStock] 获取实时股价');
        await this.fetchStockPrice();

        // 绑定表单事件
        console.log('[loadStock] 绑定表单事件');
        this.bindFormEvents();

        // 绑定 tooltip 自动左右翻转（仅详情页 realtime/summary）
        this.bindTooltipAutoFlip();

        if (window.Perf) window.Perf.end(perfToken, { stockCode });
    },

    bindTooltipAutoFlip() {
        if (this._tooltipAutoFlipBound) return;
        if (typeof document === 'undefined' || !document || typeof document.addEventListener !== 'function') return;
        this._tooltipAutoFlipBound = true;

        const selector = '#detailPage .realtime-info .tooltip-container, #detailPage .summary-info .tooltip-container';
        const margin = 8;

        const update = (container) => {
            const tooltip = container.querySelector ? container.querySelector('.tooltip-text') : null;
            if (!tooltip) return;

            // Make it measurable
            const prevVisibility = tooltip.style.visibility;
            const prevOpacity = tooltip.style.opacity;
            const prevDisplay = tooltip.style.display;
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
            tooltip.style.display = 'block';

            // Default is right-aligned in CSS (right:0). Check if it clips left.
            tooltip.classList.remove('tooltip-align-left');
            const rectRight = tooltip.getBoundingClientRect();
            const clipsLeft = rectRight.left < margin;
            if (clipsLeft) {
                tooltip.classList.add('tooltip-align-left');
            }

            // Restore
            tooltip.style.visibility = prevVisibility;
            tooltip.style.opacity = prevOpacity;
            tooltip.style.display = prevDisplay;
        };

        document.addEventListener('mouseover', (e) => {
            const target = e && e.target;
            if (!target || !target.closest) return;
            const container = target.closest(selector);
            if (!container) return;
            update(container);
        });
    },

    /**
     * 显示空状态提示
     * @private
     */
    _showEmptyState() {
        // 显示提示消息
        const ErrorHandler = StockProfitCalculator.ErrorHandler;
        if (ErrorHandler && ErrorHandler.showInfo) {
            ErrorHandler.showInfo('该股票暂无交易记录，请添加第一笔交易');
        }
        
        // 自动打开添加交易表单
        setTimeout(() => {
            const container = document.getElementById('addTradeFormContainer');
            if (container) {
                container.style.display = 'block';
                // 预填充日期
                const dateInput = document.getElementById('tradeDate');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        }, 500);
    },

    /**
     * 绑定表单事件
     */
    bindFormEvents() {
        const form = document.getElementById('addTradeForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.addTrade();
            };
        }
    },

    /**
     * 更新所有UI
     */
    async updateAll(stock) {
        const DataService = StockProfitCalculator.DataService;
        
        // 每次都从 DataService 获取最新数据（不使用缓存）
        if (!stock) {
            stock = await DataService.getStock(this.currentStockCode);
        }
        if (!stock) return;

        const StockSnapshot = StockProfitCalculator.StockSnapshot;
        const TradeManager = StockProfitCalculator.TradeManager;

        this.currentStock = stock;

        // 使 StockSnapshot 缓存失效，确保重新计算
        StockSnapshot.invalidate(stock.code);
        DataService.invalidateCache(stock.code);

        // 重新构建 snapshot（如果有股价则包含股价，否则不含）
        this.snapshot = await StockSnapshot.build(stock.code, this.currentStockPrice !== null ? {
            price: this.currentStockPrice,
            change: 0,
            changePercent: 0
        } : null);
        this.calcResult = this.snapshot.calcResult;

        // 更新汇总卡片
        this.updateSummaryCards();

        // 更新交易表格
        TradeManager.renderTradeTable(stock.trades, this.calcResult);

        // 更新持仓明细
        this.updateHoldingDetail();

        // 更新统计报表
        this.updateStatistics();

        // 更新图表
        this.renderTimeSeriesCharts();
    },

    /**
     * 更新汇总卡片
     */
    async updateSummaryCards() {
        this._ensureDOMCache();

        const Utils = StockProfitCalculator.Utils;

        let snapshot = this.snapshot;
        if (!snapshot) {
            const stock = this.currentStock || await StockProfitCalculator.DataService.getStock(this.currentStockCode);
            if (stock) {
                this.currentStock = stock;
                snapshot = await StockProfitCalculator.StockSnapshot.build(stock.code, this.currentStockPrice !== null ? {
                    price: this.currentStockPrice,
                    change: 0,
                    changePercent: 0
                } : null);
                this.snapshot = snapshot;
                this.calcResult = snapshot.calcResult;
            }
        }
        const result = snapshot ? snapshot.summary : this.calcResult.summary;
        const periodProfit = snapshot ? snapshot.periodProfit : {
            weeklyProfit: 0,
            monthlyProfit: 0
        };

        // 使用缓存的 DOM 元素
        this._domCache.totalCost.textContent = '¥' + result.totalBuyCost.toFixed(2);
        this._domCache.totalSell.textContent = '¥' + result.totalSellAmount.toFixed(2);
        this._domCache.totalFee.textContent = '¥' + result.totalFee.toFixed(2);

        const profitElement = this._domCache.totalProfit;
        profitElement.textContent = '¥' + result.totalProfit.toFixed(2);
        profitElement.className = 'summary-value ' + (result.totalProfit >= 0 ? 'profit' : 'loss');

        const weeklyProfitElement = this._domCache.weeklyProfit;
        weeklyProfitElement.textContent = '¥' + periodProfit.weeklyProfit.toFixed(2);
        weeklyProfitElement.className = 'summary-value ' + (periodProfit.weeklyProfit >= 0 ? 'profit' : 'loss');

        const monthlyProfitElement = this._domCache.monthlyProfit;
        monthlyProfitElement.textContent = '¥' + periodProfit.monthlyProfit.toFixed(2);
        monthlyProfitElement.className = 'summary-value ' + (periodProfit.monthlyProfit >= 0 ? 'profit' : 'loss');

        this._domCache.totalReturnRate.textContent = result.totalReturnRate.toFixed(3) + '%';

        // 更新实时持仓区域
        this._domCache.realtimeCost.textContent = '¥' + result.currentCost.toFixed(2);
        this._domCache.realtimeHolding.textContent = result.currentHolding + '股';

        // 更新当前持仓周期投入成本和卖出金额
        this._domCache.currentCycleBuyCost.textContent = '¥' + result.currentCycleBuyCost.toFixed(2);
        this._domCache.currentCycleSellAmount.textContent = '¥' + result.currentCycleSellAmount.toFixed(2);

        // 计算并更新净投入（投入成本 - 卖出金额）
        const netInvest = result.currentCycleBuyCost - result.currentCycleSellAmount;
        this._domCache.currentCycleNetInvest.textContent = '¥' + netInvest.toFixed(2);

        // 更新持仓明细提示
        this.updateHoldingTooltip();

        // 更新当前持仓收益和总收益（使用 snapshot 中已计算的数据）
        if (this.currentStockPrice && result.currentHolding > 0) {
            // 这些数据已经在 StockSnapshot.attachQuote() 中计算过了
            const marketValue = this.currentStockPrice * result.currentHolding;

            // 使用 snapshot 中的 currentHoldingProfit（包含浮动盈亏 + 分红 - 红利税）
            const currentHoldingProfit = snapshot.currentHoldingProfit;
            const currentHoldingReturnRate = snapshot.currentHoldingReturnRate;
            const cycleProfit = snapshot.cycleProfit;
            const cycleReturnRate = snapshot.cycleReturnRate;

            this._domCache.marketValue.textContent = '¥' + marketValue.toFixed(2);
            this._domCache.latestProfit.textContent = '¥' + currentHoldingProfit.toFixed(2);

            const latestReturnRateElement = this._domCache.latestReturnRate;
            latestReturnRateElement.textContent = currentHoldingReturnRate.toFixed(3) + '%';
            latestReturnRateElement.className = 'detail-summary-dual-value ' + (currentHoldingReturnRate >= 0 ? 'profit' : 'loss');

            const latestProfitElement = this._domCache.latestProfit;
            latestProfitElement.textContent = '¥' + currentHoldingProfit.toFixed(2);
            latestProfitElement.className = 'detail-summary-dual-value ' + (currentHoldingProfit >= 0 ? 'profit' : 'loss');

            // 更新当前持仓周期收益
            const cycleProfitElement = this._domCache.cycleProfit;
            if (cycleProfit !== null) {
                cycleProfitElement.textContent = '¥' + cycleProfit.toFixed(2);
                cycleProfitElement.className = 'detail-summary-dual-value ' + (cycleProfit >= 0 ? 'profit' : 'loss');
            } else {
                cycleProfitElement.textContent = '--';
                cycleProfitElement.className = 'detail-summary-dual-value';
            }

            // 更新当前持仓周期收益率
            const cycleReturnRateElement = this._domCache.cycleReturnRate;
            if (cycleReturnRate !== null) {
                cycleReturnRateElement.textContent = cycleReturnRate.toFixed(3) + '%';
                cycleReturnRateElement.className = 'detail-summary-dual-value ' + (cycleReturnRate >= 0 ? 'profit' : 'loss');
            } else {
                cycleReturnRateElement.textContent = '--';
                cycleReturnRateElement.className = 'detail-summary-dual-value';
            }

            this._domCache.costPerShare.textContent = '¥' + (result.currentHolding > 0 ? (result.currentCost / result.currentHolding).toFixed(3) : '--');

            const totalAllProfit = snapshot.totalAllProfit;
            const totalAllProfitElement = this._domCache.totalAllProfit;
            totalAllProfitElement.textContent = Utils.formatNullableCurrency(totalAllProfit, 2);
            totalAllProfitElement.className = 'summary-value ' + (totalAllProfit !== null && totalAllProfit >= 0 ? 'profit' : 'loss');

            this._domCache.dilutedCostPerShare.textContent = Utils.formatNullableCurrency(snapshot.dilutedCostPerShare, 3);

            // 更新持仓开始日期和持有天数
            const holdingInfo = snapshot.holdingInfo;
            this._domCache.holdingStartDate.textContent = holdingInfo.startDate;
            this._domCache.holdingDays.textContent = holdingInfo.holdingDays + '天';

            // 更新持仓轮次
            const cycleHistory = snapshot.cycleHistory || [];
            const currentCycleNumber = snapshot.currentCycleNumber;
            const isHolding = snapshot.summary.currentHolding > 0;
            
            if (currentCycleNumber !== null && cycleHistory.length > 0) {
                const cycleLabel = isHolding 
                    ? `第${currentCycleNumber}轮持仓` 
                    : `共${cycleHistory.length}轮持仓`;
                this._domCache.holdingCycle.textContent = cycleLabel;
                this._domCache.holdingCycle.style.cursor = 'pointer';
                this._domCache.holdingCycle.onclick = () => this.showCycleHistoryModal();
            } else {
                this._domCache.holdingCycle.textContent = '--';
                this._domCache.holdingCycle.style.cursor = 'default';
                this._domCache.holdingCycle.onclick = null;
            }

            const totalAllReturnRate = snapshot.totalAllReturnRate;
            const totalAllReturnRateElement = this._domCache.totalAllReturnRate;
            totalAllReturnRateElement.textContent = Utils.formatNullablePercent(totalAllReturnRate, 3);
            totalAllReturnRateElement.className = 'summary-value ' + (totalAllReturnRate !== null && totalAllReturnRate >= 0 ? 'profit' : 'loss');
        } else {
            this._domCache.costPerShare.textContent = '¥' + (snapshot ? snapshot.costPerShare : 0).toFixed(3);
            this._domCache.dilutedCostPerShare.textContent = '--';
            
            // 重置持仓市值为 --（已清仓股票持仓股数为0）
            this._domCache.marketValue.textContent = '--';

            // 重置当前持仓周期投入成本和卖出金额
            this._domCache.currentCycleBuyCost.textContent = '--';
            this._domCache.currentCycleSellAmount.textContent = '--';
            this._domCache.currentCycleNetInvest.textContent = '--';

            // 更新当前持有股收益和收益率（显示为 --）
            this._domCache.latestProfit.textContent = '--';
            this._domCache.latestReturnRate.textContent = '--';
            this._domCache.cycleProfit.textContent = '--';
            this._domCache.cycleReturnRate.textContent = '--';

            const totalAllProfitElement = this._domCache.totalAllProfit;
            totalAllProfitElement.textContent = '¥' + result.totalProfit.toFixed(2);
            totalAllProfitElement.className = 'summary-value ' + (result.totalProfit >= 0 ? 'profit' : 'loss');

            const totalAllReturnRateElement = this._domCache.totalAllReturnRate;
            totalAllReturnRateElement.textContent = result.totalReturnRate.toFixed(3) + '%';
            totalAllReturnRateElement.className = 'summary-value ' + (result.totalReturnRate >= 0 ? 'profit' : 'loss');

            // 更新持仓开始日期和持有天数
            const holdingInfo = snapshot.holdingInfo;
            this._domCache.holdingStartDate.textContent = holdingInfo.startDate;
            this._domCache.holdingDays.textContent = holdingInfo.holdingDays + '天';

            // 更新持仓轮次（已清仓）
            const cycleHistory = snapshot.cycleHistory || [];
            if (cycleHistory.length > 0) {
                this._domCache.holdingCycle.textContent = `共${cycleHistory.length}轮持仓`;
                this._domCache.holdingCycle.style.cursor = 'pointer';
                this._domCache.holdingCycle.onclick = () => this.showCycleHistoryModal();
            } else {
                this._domCache.holdingCycle.textContent = '--';
                this._domCache.holdingCycle.style.cursor = 'default';
                this._domCache.holdingCycle.onclick = null;
            }
        }
    },

    /**
     * 更新持仓提示
     */
    updateHoldingTooltip() {
        const tooltip = document.getElementById('holdingTooltip');
        if (!tooltip) return;

        const holdingQueue = this.calcResult.holdingQueue;
        if (!holdingQueue || holdingQueue.length === 0) {
            tooltip.innerHTML = '<div><strong>持仓明细：</strong></div><div>暂无持仓</div>';
            return;
        }

        let html = '<div><strong>持仓明细：</strong></div>';
        // 每笔买入单独一行，使用 <div> 确保换行
        holdingQueue.forEach(h => {
            html += `<div>${h.date} 买入 ${h.amount}股</div>`;
        });
        tooltip.innerHTML = html;
    },

    /**
     * 更新持仓明细表格
     */
    updateHoldingDetail() {
        this._ensureDOMCache();
        const Utils = StockProfitCalculator.Utils;

        const holdingBody = this._domCache.holdingDetailBody;
        const holdingSection = holdingBody && typeof holdingBody.closest === 'function'
            ? holdingBody.closest('.section')
            : null;

        // 根据配置决定是否显示
        const showHoldingDetail = StockProfitCalculator.Config.get('ui.preferences.showHoldingDetail', true);
        if (holdingSection && holdingSection.style) {
            holdingSection.style.display = showHoldingDetail ? 'block' : 'none';
        }

        // 如果隐藏，不继续处理
        if (!showHoldingDetail || !holdingBody) return;

        const details = this.calcResult.holdingDetail;
        const tbody = holdingBody;
        const Pagination = StockProfitCalculator.Pagination;
        const Config = StockProfitCalculator.Config;

        tbody.innerHTML = '';

        // 从 Config 读取分页配置
        const threshold = Config.get('ui.pagination.threshold', 50);
        const itemsPerPage = Config.get('ui.pagination.itemsPerPage', 30);

        // 更新分页状态
        this._holdingDetailPagination.totalItems = details.length;
        this._holdingDetailPagination.itemsPerPage = itemsPerPage;

        // 判断是否需要分页（记录数 >= 阈值）
        const shouldPaginate = details.length >= threshold;

        let paginationState;
        let paginatedDetails;

        if (shouldPaginate) {
            // 启用分页
            this._holdingDetailPagination.totalPages = Pagination.calculateTotalPages(
                this._holdingDetailPagination.totalItems,
                this._holdingDetailPagination.itemsPerPage
            );

            // 创建分页状态对象
            paginationState = Pagination.createState(
                this._holdingDetailPagination.totalItems,
                this._holdingDetailPagination.itemsPerPage,
                this._holdingDetailPagination.currentPage
            );

            // 获取当前页的数据
            paginatedDetails = Pagination.getPaginatedData(
                details,
                this._holdingDetailPagination.currentPage,
                this._holdingDetailPagination.itemsPerPage
            );
        } else {
            // 不分页，显示全部
            this._holdingDetailPagination.totalPages = 1;
            this._holdingDetailPagination.currentPage = 1;

            // 创建不分页的状态对象
            paginationState = Pagination.createState(
                this._holdingDetailPagination.totalItems,
                this._holdingDetailPagination.totalItems,
                1
            );
            paginatedDetails = details;
        }

        // 使用 DocumentFragment 批量插入表格行，减少 DOM 重排
        const fragment = document.createDocumentFragment();

        paginatedDetails.forEach(buy => {
            let sellRecordsHtml = '-';
            if (buy.sellDetails.length > 0) {
                sellRecordsHtml = '<div class="sell-records">';
                buy.sellDetails.forEach(detail => {
                    const profitClass = detail.profit < 0 ? 'loss' : 'profit';
                    const profitSign = detail.profit >= 0 ? '+' : '-';
                    sellRecordsHtml += `<div class="sell-record-item">
                        ${detail.sellDate} | ¥${Utils.formatPrice(detail.sellPrice)} | ${detail.amount}股 | <span class="${profitClass}">${profitSign}¥${Math.abs(detail.profit).toFixed(2)}</span>
                    </div>`;
                });
                sellRecordsHtml += '</div>';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${buy.date}</td>
                <td>¥${Utils.formatPrice(buy.price)}</td>
                <td>${buy.amount}</td>
                <td>${buy.soldAmount}</td>
                <td><strong>${buy.remainingAmount}</strong></td>
                <td><span class="badge ${buy.statusClass}">${buy.status}</span></td>
                <td>${sellRecordsHtml}</td>
            `;
            fragment.appendChild(row);
        });

        // 一次性将所有行添加到 tbody，减少 DOM 重排
        tbody.appendChild(fragment);

        // 渲染分页控件
        if (this._holdingDetailPagination.totalPages > 1) {
            const paginationHtml = Pagination.renderControls(
                paginationState,
                'holdingDetailPaginationContainer',
                (action) => this.handleHoldingDetailPageChange(action)
            );
            
            const paginationContainer = this._domCache.holdingDetailPaginationContainer;
            if (paginationContainer) {
                paginationContainer.innerHTML = paginationHtml;
                Pagination.bindEvents('holdingDetailPaginationContainer', (action) => this.handleHoldingDetailPageChange(action));
            }
        } else {
            const paginationContainer = this._domCache.holdingDetailPaginationContainer;
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
        }
    },

    /**
     * 更新统计数据
     */
    updateStatistics() {
        const stats = this.calcResult.statistics || {};

        // 添加默认值，防止 undefined 调用 toFixed()
        const buyCount = stats.buyCount !== undefined ? stats.buyCount : 0;
        const sellCount = stats.sellCount !== undefined ? stats.sellCount : 0;
        const profitTrades = stats.profitTrades !== undefined ? stats.profitTrades : 0;
        const lossTrades = stats.lossTrades !== undefined ? stats.lossTrades : 0;
        const winRate = stats.winRate !== undefined ? stats.winRate : 0;
        const avgReturnRate = stats.avgReturnRate !== undefined ? stats.avgReturnRate : 0;
        const maxProfit = stats.maxProfit !== undefined ? stats.maxProfit : 0;
        const maxLoss = stats.maxLoss !== undefined ? stats.maxLoss : 0;

        document.getElementById('statBuyCount').textContent = buyCount;
        document.getElementById('statSellCount').textContent = sellCount;
        document.getElementById('statProfitCount').textContent = profitTrades;
        document.getElementById('statLossCount').textContent = lossTrades;
        document.getElementById('statWinRate').textContent = winRate.toFixed(3) + '%';
        document.getElementById('statAvgReturnRate').textContent = avgReturnRate.toFixed(3) + '%';
        document.getElementById('statMaxProfit').textContent = '¥' + maxProfit.toFixed(2);
        document.getElementById('statMaxLoss').textContent = '¥' + maxLoss.toFixed(2);
    },

    /**
     * 获取实时股价
     */
    async fetchStockPrice() {
        const perfToken = window.Perf ? window.Perf.start('Detail.fetchStockPrice') : null;
        const DataManager = StockProfitCalculator.DataManager;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;
        const StockPriceAPI = StockProfitCalculator.StockPriceAPI;
        const Utils = StockProfitCalculator.Utils;
        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === this.currentStockCode);
        if (!stock) return;

        try {
            // 使用 StockPriceAPI 获取股价
            const quote = await StockPriceAPI.fetchPrice(stock.code);
            
            if (!quote || !Number.isFinite(quote.price) || !Number.isFinite(quote.change) || !Number.isFinite(quote.changePercent)) {
                this.currentStockPrice = null;
                this.snapshot = await StockSnapshot.build(stock.code, null);
                this.calcResult = this.snapshot.calcResult;
                
                const priceElement = document.getElementById('currentPrice');
                const changeElement = document.getElementById('priceChange');
                
                if (priceElement) {
                    priceElement.innerHTML = Utils.formatNullableCurrency(null, 3);
                    priceElement.className = 'header-quote-value';
                }
                if (changeElement) {
                    changeElement.innerHTML = Utils.formatNullableNumber(null, 3);
                    changeElement.className = 'header-quote-value';
                }

                ErrorHandler.showErrorSimple('行情无效');
                this.updateSummaryCards();
               if (window.Perf) window.Perf.end(perfToken, { ok: false, reason: 'invalid-quote' });
                return;
            }

            this.currentStockPrice = quote.price;
            this.snapshot = await StockSnapshot.build(stock.code, {
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent
            });
            this.calcResult = this.snapshot.calcResult;

            const priceElement = document.getElementById('currentPrice');
            const changeElement = document.getElementById('priceChange');

            if (priceElement) {
                priceElement.innerHTML = `¥${Utils.formatPrice(quote.price)}`;
                priceElement.className = 'header-quote-value ' + (quote.change >= 0 ? 'profit' : 'loss');
            }

            if (changeElement) {
                const changeSign = quote.change >= 0 ? '+' : '';
                changeElement.innerHTML = `${changeSign}${quote.change.toFixed(3)} (${changeSign}${quote.changePercent.toFixed(3)}%)`;
                changeElement.className = 'header-quote-value ' + (quote.change >= 0 ? 'profit' : 'loss');
            }

            ErrorHandler.showSuccess('刷新完成');

            // 更新收益计算
            this.updateSummaryCards();

            // 交易表格中的“预估按最新价卖出”依赖 currentStockPrice，需要在拿到价格后刷新一次
            if (typeof TradeManager !== 'undefined' && TradeManager.renderTradeTable) {
                TradeManager.renderTradeTable(stock.trades, this.calcResult);
            }
            // 更新每股成本趋势图中的“最新价”标线
            try {
                const ts = this.calcResult?.timeSeries;
                if (ts) this.renderPerShareCostTrendChart(ts);
            } catch (e) {
                console.warn('刷新后重绘每股成本趋势图失败', e);
            }
            if (window.Perf) window.Perf.end(perfToken, { ok: true });
            }
        catch (error) {
            ErrorHandler.showErrorSimple('刷新失败');
            console.error('获取股价失败:', error);
            if (window.Perf) window.Perf.end(perfToken, { ok: false, reason: 'fetch-error' });
        }
    },

    /**
     * 切换添加交易表单显示
     */
    toggleAddTradeForm() {
        const container = document.getElementById('addTradeFormContainer');
        if (container) {
            if (container.style.display === 'none') {
                container.style.display = 'block';
                const dateInput = document.getElementById('tradeDate');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                // 重置表单状态
                document.getElementById('tradeType').value = 'buy';
                this.onTradeTypeChange();
            } else {
                container.style.display = 'none';
                this.resetAddTradeForm();
            }
        }
    },

    /**
     * 重置添加交易表单
     */
    resetAddTradeForm() {
        document.getElementById('tradePrice').value = '';
        document.getElementById('tradeAmount').value = '';
        document.getElementById('tradeFee').value = '5';
        document.getElementById('tradeAmountDisplay').value = '';
        document.getElementById('tradeType').value = 'buy';
    },

    /**
     * 操作类型切换时更新表单显示
     */
    onTradeTypeChange() {
        const type = document.getElementById('tradeType').value;
        const amountDisplay = document.getElementById('tradeAmountDisplay');

        if (type === 'dividend' || type === 'tax') {
            // 分红和红利税补缴：价格、数量、手续费只读显示"-"，金额可输入
            
            // 金额变为可编辑
            amountDisplay.readOnly = false;
            amountDisplay.placeholder = '请输入金额';
            amountDisplay.style.background = '#fff';
            amountDisplay.value = '';
            
            // 价格、数量、手续费显示"-"且只读
            document.getElementById('tradePrice').value = '';
            document.getElementById('tradePrice').readOnly = true;
            document.getElementById('tradePrice').placeholder = '-';
            document.getElementById('tradePrice').style.background = '#f5f5f5';
            
            document.getElementById('tradeAmount').value = '';
            document.getElementById('tradeAmount').readOnly = true;
            document.getElementById('tradeAmount').placeholder = '-';
            document.getElementById('tradeAmount').style.background = '#f5f5f5';
            
            document.getElementById('tradeFee').value = '';
            document.getElementById('tradeFee').readOnly = true;
            document.getElementById('tradeFee').placeholder = '-';
            document.getElementById('tradeFee').style.background = '#f5f5f5';
        } else {
            // 买入和卖出：价格、数量、手续费可编辑，金额只读
            
            // 价格、数量、手续费可编辑
            document.getElementById('tradePrice').readOnly = false;
            document.getElementById('tradePrice').placeholder = '请输入价格';
            document.getElementById('tradePrice').style.background = '#fff';
            
            document.getElementById('tradeAmount').readOnly = false;
            document.getElementById('tradeAmount').placeholder = '请输入数量';
            document.getElementById('tradeAmount').style.background = '#fff';
            
            document.getElementById('tradeFee').readOnly = false;
            document.getElementById('tradeFee').placeholder = '默认5元';
            document.getElementById('tradeFee').style.background = '#fff';
            document.getElementById('tradeFee').value = '5';
            
            // 金额变为只读
            amountDisplay.readOnly = true;
            amountDisplay.placeholder = '自动计算';
            amountDisplay.style.background = '#f5f5f5';
            amountDisplay.style.cursor = 'not-allowed';
            amountDisplay.value = '';
            
            // 清空价格和数量
            document.getElementById('tradePrice').value = '';
            document.getElementById('tradeAmount').value = '';
        }
    },

    /**
     * 更新交易金额显示（价格 * 数量）- 仅用于买入/卖出
     */
    updateTradeAmount() {
        const type = document.getElementById('tradeType').value;
        if (type === 'dividend' || type === 'tax') {
            return; // 分红和红利税不需要自动计算
        }
        
        const price = parseFloat(document.getElementById('tradePrice').value) || 0;
        const amount = parseInt(document.getElementById('tradeAmount').value) || 0;
        const total = price * amount;
        
        const displayEl = document.getElementById('tradeAmountDisplay');
        if (total > 0) {
            displayEl.value = total.toFixed(2);
        } else {
            displayEl.value = '';
        }
    },

    /**
     * 添加交易记录
     */
    async addTrade() {
        const date = document.getElementById('tradeDate').value;
        const type = document.getElementById('tradeType').value;

        if (!date) {
            ErrorHandler.showErrorSimple('请选择日期');
            return;
        }

        let newTrade;

        if (type === 'dividend' || type === 'tax') {
            // 分红和红利税补缴：只需要金额
            const totalAmount = parseFloat(document.getElementById('tradeAmountDisplay').value);

            if (!totalAmount || totalAmount <= 0) {
                ErrorHandler.showErrorSimple('请填写正确的金额');
                return;
            }
            
            // 统一数据结构，使用相同字段
            newTrade = {
                id: Date.now(),
                date,
                type,
                amount: 0,      // 股数为0
                price: 0,       // 价格为0
                fee: 0,         // 手续费为0
                totalAmount     // 额外字段存储金额
            };
        } else {
            // 买入和卖出：需要价格、数量、手续费
            const price = parseFloat(document.getElementById('tradePrice').value);
            const amount = parseInt(document.getElementById('tradeAmount').value);
            const fee = parseFloat(document.getElementById('tradeFee').value) || 5;

            if (!price || !amount) {
                ErrorHandler.showErrorSimple('请填写完整信息');
                return;
            }
            
            // 统一数据结构，添加 totalAmount 字段
            newTrade = {
                id: Date.now(),
                date,
                type,
                price,
                amount,
                fee,
                totalAmount: Math.round(price * amount * 100) / 100  // 金额 = 价格 * 数量，保留2位小数
            };
        }

        const DataManager = StockProfitCalculator.DataManager;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;
        const DataService = StockProfitCalculator.DataService;
        const EventBus = StockProfitCalculator.EventBus;
        
        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === this.currentStockCode);
        if (!stock) return;

        // 在修改数据前，先使所有缓存失效（避免竞争条件）
        StockSnapshot.invalidate(this.currentStockCode);
        DataManager.invalidateCache();
        DataService.invalidateCache(this.currentStockCode);

        stock.trades.push(newTrade);
        await DataManager.save(data);

        // 触发 TRADE_ADDED 事件（携带股票代码）
        EventBus.emit(EventBus.EventTypes.TRADE_ADDED, {
            stockCode: this.currentStockCode,
            trade: newTrade
        });

        // 重新获取最新的股票对象（避免使用克隆的对象）
        const updatedStock = await DataService.getStock(this.currentStockCode);
        if (!updatedStock) return;

        // 确保缓存已失效（再次调用）
        StockSnapshot.invalidate(this.currentStockCode);
        DataService.invalidateCache(this.currentStockCode);

        // 重新计算
        this.currentStock = updatedStock;
        this.snapshot = await StockSnapshot.build(updatedStock.code, this.currentStockPrice !== null ? {
            price: this.currentStockPrice,
            change: 0,
            changePercent: 0
        } : null);
        this.calcResult = this.snapshot.calcResult;
        await this.updateAll(updatedStock);
        this.toggleAddTradeForm();
    },

    /**
     * 渲染时间序列图表（使用懒加载）
     */
    renderTimeSeriesCharts() {
        this._ensureDOMCache();

        // 如果已经加载过，直接重新渲染
        if (this._chartsLoaded) {
            this._renderTimeSeriesChartsInternal();
            return;
        }

        // 否则初始化懒加载观察器
        this._initChartObserver();
    },

    renderHoldingTrendChart(timeSeries) {
        this._ensureDOMCache();
        const chartDom = this._domCache.holdingTrendChart;
        if (!chartDom) return;

        // 启用统一的 resize 管理
        this._initChartResizeManager();

        // 销毁旧实例
        if (this._chartInstances.holdingTrendChart) {
            this._chartInstances.holdingTrendChart.dispose();
        }

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-holdingTrendChart', chartDom, null, { bindResize: false });
        this._chartInstances.holdingTrendChart = myChart;

        const option = {
            title: {
                text: '持仓数量变化趋势',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    return `${data.name}<br/>持仓: ${data.value}股`;
                }
            },
            dataZoom: this.getDataZoomConfig(0),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '25%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeSeries.dates,
                axisLabel: {
                    rotate: 45,
                    interval: this.calculateLabelInterval(timeSeries.dates.length),
                    formatter: function(value) {
                        // 只显示月-日，年份太长
                        return value.substring(5);
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '持仓数量(股)',
                axisLabel: { formatter: '{value}' }
            },
            series: [{
                name: '持仓数量',
                type: 'line',
                data: timeSeries.holdings,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { color: '#2196F3', width: 2 },
                itemStyle: { color: '#2196F3' },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
                            { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
                        ]
                    }
                }
            }]
        };

        myChart.setOption(option);
    },

    renderCumulativeProfitChart(timeSeries) {
        this._ensureDOMCache();
        const chartDom = this._domCache.cumulativeProfitChart;
        if (!chartDom) return;

        // 销毁旧实例
        if (this._chartInstances.cumulativeProfitChart) {
            this._chartInstances.cumulativeProfitChart.dispose();
        }

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-cumulativeProfitChart', chartDom, null, { bindResize: false });
        this._chartInstances.cumulativeProfitChart = myChart;

        const option = {
            title: {
                text: '累计收益变化趋势',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    const value = data.value;
                    const sign = value >= 0 ? '+' : '';
                    return `${data.name}<br/>累计收益: ${sign}¥${value.toFixed(2)}`;
                }
            },
            dataZoom: this.getDataZoomConfig(0),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '25%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeSeries.dates,
                axisLabel: {
                    rotate: 45,
                    interval: this.calculateLabelInterval(timeSeries.dates.length),
                    formatter: function(value) {
                        // 只显示月-日，年份太长
                        return value.substring(5);
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '累计收益(元)',
                axisLabel: { formatter: '¥{value}' }
            },
            series: [{
                name: '累计收益',
                type: 'line',
                data: timeSeries.cumulativeProfits,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { width: 2 },
                itemStyle: {
                    color: function(params) {
                        return params.value >= 0 ? '#f44336' : '#4caf50';
                    }
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(244, 67, 54, 0.3)' },
                            { offset: 1, color: 'rgba(244, 67, 54, 0.05)' }
                        ]
                    }
                },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
                },
                markPoint: {
                    symbol: 'circle',
                    symbolSize: 4,
                    label: {
                        show: true,
                        position: 'top',
                        formatter: function(params) {
                            return timeSeries.yearMarkers[params.dataIndex] || '';
                        },
                        fontSize: 12,
                        color: '#666',
                        fontWeight: 'bold',
                        offset: [0, -10]
                    }
                }
            }]
        };

        myChart.setOption(option);
    },

    renderProfitTrendChart(timeSeries) {
        this._ensureDOMCache();
        const chartDom = this._domCache.profitTrendChart;
        if (!chartDom) return;

        // 销毁旧实例
        if (this._chartInstances.profitTrendChart) {
            this._chartInstances.profitTrendChart.dispose();
        }

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-profitTrendChart', chartDom, null, { bindResize: false });
        this._chartInstances.profitTrendChart = myChart;

        const colors = timeSeries.profits.map(value =>
            value >= 0 ? '#f44336' : '#4caf50'
        );

        const option = {
            title: {
                text: '单笔交易收益',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    const value = data.value;
                    if (value === 0) {
                        return `${data.name}<br/>买入（无收益）`;
                    }
                    const sign = value >= 0 ? '+' : '';
                    return `${data.name}<br/>收益: ${sign}¥${value.toFixed(2)}`;
                }
            },
            dataZoom: this.getDataZoomConfig(0),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '25%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeSeries.dates,
                axisLabel: {
                    rotate: 45,
                    interval: this.calculateLabelInterval(timeSeries.dates.length),
                    formatter: function(value) {
                        // 只显示月-日，年份太长
                        return value.substring(5);
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '收益(元)',
                axisLabel: { formatter: '¥{value}' }
            },
            series: [{
                name: '单笔收益',
                type: 'bar',
                data: timeSeries.profits.map((value, index) => ({
                    value: value,
                    itemStyle: { color: colors[index] }
                })),
                barWidth: '60%',
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
                },
                markPoint: {
                    symbol: 'circle',
                    symbolSize: 4,
                    label: {
                        show: true,
                        position: 'top',
                        formatter: function(params) {
                            return timeSeries.yearMarkers[params.dataIndex] || '';
                        },
                        fontSize: 12,
                        color: '#666',
                        fontWeight: 'bold',
                        offset: [0, -10]
                    }
                }
            }]
        };

        myChart.setOption(option);
    },

    renderReturnRateTrendChart(timeSeries) {
        this._ensureDOMCache();
        const chartDom = this._domCache.returnRateTrendChart;
        if (!chartDom) return;

        // 销毁旧实例
        if (this._chartInstances.returnRateTrendChart) {
            this._chartInstances.returnRateTrendChart.dispose();
        }

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-returnRateTrendChart', chartDom, null, { bindResize: false });
        this._chartInstances.returnRateTrendChart = myChart;

        const option = {
            title: {
                text: '累计收益率变化趋势',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    const value = data.value;
                    const sign = value >= 0 ? '+' : '';
                    return `${data.name}<br/>收益率: ${sign}${value.toFixed(3)}%`;
                }
            },
            dataZoom: this.getDataZoomConfig(0),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '25%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeSeries.dates,
                axisLabel: {
                    rotate: 45,
                    interval: this.calculateLabelInterval(timeSeries.dates.length),
                    formatter: function(value) {
                        // 只显示月-日，年份太长
                        return value.substring(5);
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '收益率(%)',
                axisLabel: { formatter: '{value}%' }
            },
            series: [{
                name: '累计收益率',
                type: 'line',
                data: timeSeries.returnRates,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { width: 2 },
                itemStyle: {
                    color: function(params) {
                        return params.value >= 0 ? '#f44336' : '#4caf50';
                    }
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(156, 39, 176, 0.3)' },
                            { offset: 1, color: 'rgba(156, 39, 176, 0.05)' }
                        ]
                    }
                },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
                }
            }]
        };

        myChart.setOption(option);
    },

    // 新增：每股成本趋势图（每股持仓成本 vs 每股摊薄成本，并标注最新价）
    renderPerShareCostTrendChart(timeSeries) {
        this._ensureDOMCache();
        const Utils = StockProfitCalculator.Utils;

        const chartDom = this._domCache.perShareCostTrendChart;
        if (!chartDom) return;

        // 销毁旧实例
        if (this._chartInstances.perShareCostTrendChart) {
            this._chartInstances.perShareCostTrendChart.dispose();
        }

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-perShareCostTrendChart', chartDom, null, { bindResize: false });
        this._chartInstances.perShareCostTrendChart = myChart;
        const latestPrice = this.currentStockPrice;

        // === 加仓对比数据 ===
        const additionComparisons = this.calcResult.additionComparisons || [];

        // 计算实时股价与最近一次加仓的对比
        let latestPriceComparison = null;
        if (additionComparisons.length > 0 && Number.isFinite(latestPrice)) {
            const latestAddition = additionComparisons[additionComparisons.length - 1];
            const change = latestPrice - latestAddition.price;
            const changePercent = latestAddition.price > 0
                ? (change / latestAddition.price * 100)
                : 0;

            latestPriceComparison = {
                change: change,
                changePercent: changePercent,
                latestAdditionPrice: latestAddition.price,
                latestAdditionDate: latestAddition.date
            };
        }

        // 构造 markLine：最新价
        const markLine = (Number.isFinite(latestPrice)) ? {
            symbol: 'none',
            label: {
                show: false
            },
            lineStyle: { color: '#FF5722', type: 'dashed', width: 2 },
            data: [{ yAxis: latestPrice }]
        } : undefined;

        // 计算自适应Y轴范围：根据两条成本曲线与最新价共同决定
        const cps = (timeSeries.costPerShares || []).filter(v => v != null && Number.isFinite(v));
        const dps = (timeSeries.dilutedCostPerShares || []).filter(v => v != null && Number.isFinite(v));
        const vals = [...cps, ...dps];
        if (Number.isFinite(latestPrice)) vals.push(latestPrice);
        const minVal = vals.length ? Math.min(...vals) : 0;
        const maxVal = vals.length ? Math.max(...vals) : 1;
        const padding = (maxVal - minVal) * 0.08; // 8% 空隙
        const axisMin = minVal - padding;
        const axisMax = maxVal + padding;

        const hasLatest = Number.isFinite(latestPrice);
        // 差值与百分比（使用右上角 title 展示，避免覆盖图形）
        const len = (timeSeries.dates || []).length;
        const lastCps = (timeSeries.costPerShares || [])[len - 1];
        const lastDps = (timeSeries.dilutedCostPerShares || [])[len - 1];
        const signedVal = (n, d=3) => (n >= 0 ? '+' : '') + n.toFixed(d);
        const diffMoneyVal = (price, cost) => (Number.isFinite(price) && Number.isFinite(cost)) ? signedVal(price - cost, 3) : '--';
        const diffPctVal = (price, cost) => (Number.isFinite(price) && Number.isFinite(cost) && cost !== 0) ? signedVal(((price - cost) / cost) * 100, 2) + '%' : '--';
        const cpsDiffStr = hasLatest ? `${diffMoneyVal(latestPrice, lastCps)} (${diffPctVal(latestPrice, lastCps)})` : '';
        const dpsDiffStr = hasLatest ? `${diffMoneyVal(latestPrice, lastDps)} (${diffPctVal(latestPrice, lastDps)})` : '';

        // 以上变量已定义，避免重复定义
        const cpsKey = hasLatest && Number.isFinite(latestPrice) && Number.isFinite(lastCps) && (latestPrice - lastCps) >= 0 ? 'pos' : 'neg';
        const dpsKey = hasLatest && Number.isFinite(latestPrice) && Number.isFinite(lastDps) && (latestPrice - lastDps) >= 0 ? 'pos' : 'neg';

        const titles = [
            {
                text: '每股成本趋势（持仓 vs 摊薄）',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            }
        ];

        // 合并所有对比信息到一个标题框中
        if (hasLatest || latestPriceComparison) {
            let titleLines = [];

            // 最新价对比最近加仓
            if (latestPriceComparison) {
                const compKey = latestPriceComparison.changePercent >= 0 ? 'pos' : 'neg';
                const signedVal = (n, d=3) => (n >= 0 ? '+' : '') + n.toFixed(d);
                const changeStr = signedVal(latestPriceComparison.change, 3);
                const pctStr = signedVal(latestPriceComparison.changePercent, 2) + '%';
                const addPriceStr = '¥' + latestPriceComparison.latestAdditionPrice.toFixed(3);
                const dateStr = latestPriceComparison.latestAdditionDate;
                titleLines.push(`最新价对比最近加仓: {${compKey}|${changeStr} (${pctStr})}`);
                titleLines.push(`(加仓价: ${addPriceStr}, ${dateStr})`);
            }

            // 对比持仓和摊薄
            if (hasLatest) {
                titleLines.push(`对比持仓: {${cpsKey}|${cpsDiffStr}}`);
                titleLines.push(`对比摊薄: {${dpsKey}|${dpsDiffStr}}`);
            }

            titles.push({
                text: titleLines.join('\n'),
                right: 10,
                top: 6,
                textStyle: {
                    fontSize: 11,
                    color: '#333',
                    lineHeight: 18,
                    fontWeight: 'normal',
                    rich: {
                        pos: { color: '#f44336', fontWeight: 'bold' },
                        neg: { color: '#4caf50', fontWeight: 'bold' }
                    }
                },
                backgroundColor: 'rgba(0,0,0,0.03)',
                padding: [8, 10],
                borderColor: '#ddd',
                borderWidth: 1
            });
        }

        const option = {
            title: titles,
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const cps = params.find(p => p.seriesName === '每股持仓成本');
                    const dps = params.find(p => p.seriesName === '每股摊薄成本');
                    const date = params[0]?.name || '';
                    const cpsVal = cps && cps.value != null ? `¥${Number(cps.value).toFixed(3)}` : '--';
                    const dpsVal = dps && dps.value != null ? `¥${Number(dps.value).toFixed(3)}` : '--';
                    const lpVal  = hasLatest ? `¥${Utils.formatPrice(latestPrice)}` : '--';

                    let result = `${date}<br/>持仓: ${cpsVal}<br/>摊薄: ${dpsVal}`;
                    if (hasLatest) {
                        result += `<br/>最新价: ${lpVal}`;
                    }

                    // 检查是否有加仓对比数据
                    const additionComp = additionComparisons.find(comp => comp.date === date);
                    if (additionComp) {
                        const signedVal = (n, d=3) => (n >= 0 ? '+' : '') + n.toFixed(d);
                        const color = additionComp.changePercent > 0 ? '#f44336' : '#4caf50';
                        result += `<br/><hr style="margin:4px 0;"/>`;
                        result += `<span style="color:${color};font-weight:bold;">加仓对比：</span><br/>`;
                        result += `本次加仓价: ¥${additionComp.price.toFixed(3)}<br/>`;
                        result += `上次加仓价: ¥${additionComp.lastPrice.toFixed(3)}<br/>`;
                        result += `<span style="color:${color};font-weight:bold;">差额: ${signedVal(additionComp.change)} (${signedVal(additionComp.changePercent, 2)}%)</span>`;
                    }

                    return result;
                }
            },
            dataZoom: this.getDataZoomConfig(0),
            grid: {
                left: '3%', right: '4%', bottom: '25%', top: hasLatest || latestPriceComparison ? 80 : 60, containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timeSeries.dates,
                axisLabel: {
                    rotate: 45,
                    interval: this.calculateLabelInterval(timeSeries.dates.length),
                    formatter: function(value) {
                        // 只显示月-日，年份太长
                        return value.substring(5);
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '成本(元/股)',
                axisLabel: { formatter: '¥{value}' },
                min: function() { return axisMin; },
                max: function() { return axisMax; }
            },
            series: [
                {
                    name: '每股持仓成本',
                    type: 'line',
                    data: (timeSeries.costPerShares || []).map(v => (v == null ? null : Number(v.toFixed ? v.toFixed(3) : v))),
                    smooth: true,
                    symbol: 'circle', symbolSize: 6,
                    lineStyle: { color: '#2196F3', width: 2 },
                    itemStyle: { color: '#2196F3' }
                },
                {
                    name: '每股摊薄成本',
                    type: 'line',
                    data: (timeSeries.dilutedCostPerShares || []).map(v => (v == null ? null : Number(v.toFixed ? v.toFixed(3) : v))),
                    smooth: true,
                    symbol: 'triangle', symbolSize: 6,
                    lineStyle: { color: '#9C27B0', width: 2 },
                    itemStyle: { color: '#9C27B0' },
                    markLine: markLine
                }
            ]
        };

        // 移除先前的右上角 graphic 角标，改为用 title[right] 渲染，不遮挡折线

        // 不再添加“最新价”常量线序列，避免视觉重叠，仅保留橙色 markLine

        myChart.setOption(option);

        // 在横坐标区域外侧（画布最右侧）绘制“最新价 x.xx”标签，纵向对齐到橙色虚线
        const updateOutsideLatestLabel = () => {
            try {
                if (!Number.isFinite(latestPrice)) {
                    myChart.setOption({ graphic: [{ id: 'lp-outside', $action: 'remove' }] });
                    return;
                }
                const dates = timeSeries.dates || [];
                const lastIndex = Math.max(0, dates.length - 1);
                // 取seriesIndex 0 (每股持仓成本) 所在网格进行像素转换，仅用其纵坐标
                const pt = myChart.convertToPixel({ seriesIndex: 0 }, [lastIndex, latestPrice]);
                if (!pt || !Array.isArray(pt)) return;
                let y = Math.round(pt[1]);
                // 将文本放在横轴外侧的同一行，向上微调避免和轴线重叠
                y = y - 2;
                myChart.setOption({
                    graphic: [{
                        id: 'lp-outside',
                        type: 'text',
                        right: -2, // 略微超出绘图区，尽量贴近横轴外侧
                        top: y,
                        silent: true,
                        style: {
                            text: `最新价 ${Number(latestPrice).toFixed(3)}`,
                            fill: '#FF5722',
                            fontSize: 12,
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: [1, 3],
                            lineHeight: 14
                        }
                    }]
                });
            } catch (e) {
                // 忽略单次失败，通常是渲染尚未完成
            }
        };

        // 首次渲染完成后定位一次
        myChart.off && myChart.off('finished');
        myChart.on && myChart.on('finished', updateOutsideLatestLabel);
        // 立即尝试一次（某些情况下 finished 已触发）
        setTimeout(updateOutsideLatestLabel, 0);

        // 调整大小时，同时重算位置
        const onResize = () => {
            myChart.resize();
            updateOutsideLatestLabel();
        };

        // 保存特殊的 resize 处理函数
        this._chartInstances.perShareCostTrendChartResizeHandler = onResize;
    },

    /**
     * 显示持仓周期历史弹窗
     */
    showCycleHistoryModal() {
        if (!this.snapshot) return;

        const cycleHistory = this.snapshot.cycleHistory || [];
        if (cycleHistory.length === 0) {
            StockProfitCalculator.ErrorHandler.showWarning('该股票暂无持仓周期记录');
            return;
        }

        const stock = this.snapshot.stock;
        const isHolding = this.snapshot.summary.currentHolding > 0;

        // 计算总收益
        const totalProfit = this.snapshot.totalAllProfit || 0;
        const totalProfitClass = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        const totalProfitText = totalProfit >= 0 ? `+${totalProfit.toFixed(2)}` : totalProfit.toFixed(2);

        // 构建弹窗内容
        let contentHtml = '<div class="cycle-history-modal-content">';
        contentHtml += `<div class="cycle-history-header">
            <span class="header-stock-name"><strong>${stock.name}</strong> (${stock.code})</span>
            <span class="header-total-profit">总收益 <span class="${totalProfitClass}">¥${totalProfitText}</span></span>
        </div>`;
        contentHtml += '<div class="cycle-history-list">';

        cycleHistory.forEach(cycle => {
            const isActive = cycle.status === 'active';
            const statusClass = isActive ? 'cycle-item-active' : 'cycle-item-closed';
            const statusText = isActive ? '当前' : '已结束';
            
            // 格式化日期范围
            const startDate = cycle.startDate ? cycle.startDate.substring(5) : '--'; // MM-DD
            const endDate = cycle.endDate ? cycle.endDate.substring(5) : '至今';
            
            // 格式化收益
            let profit = cycle.profit || 0;
            // 如果是当前持仓周期，加上浮动盈亏
            if (isActive && this.snapshot.holdingProfit !== null) {
                profit += this.snapshot.holdingProfit;
            }
            const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
            const profitText = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
            
            contentHtml += `
                <div class="cycle-history-item ${statusClass}">
                    <div class="cycle-item-header">
                        <span class="cycle-number">第${cycle.cycle}轮</span>
                        <span class="cycle-status">${statusText}</span>
                    </div>
                    <div class="cycle-item-dates">
                        <span class="cycle-date">${startDate} ~ ${endDate}</span>
                        <span class="cycle-days">${cycle.days}天</span>
                    </div>
                    <div class="cycle-item-profit">
                        <span class="profit-label">收益</span>
                        <span class="profit-value ${profitClass}">¥${profitText}</span>
                    </div>
                </div>
            `;
        });

        contentHtml += '</div>';
        contentHtml += '</div>';

        // 显示弹窗
        this._showModal('持仓周期历史', contentHtml);
    },

    /**
     * 显示通用弹窗
     * @private
     * @param {string} title - 弹窗标题
     * @param {string} content - 弹窗内容HTML
     */
    _showModal(title, content) {
        // 检查是否已存在弹窗，如果存在则移除
        const existingModal = document.getElementById('cycleHistoryModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建弹窗
        const modal = document.createElement('div');
        modal.id = 'cycleHistoryModal';
        modal.className = 'cycle-history-modal';
        modal.innerHTML = `
            <div class="cycle-history-modal-backdrop"></div>
            <div class="cycle-history-modal-container">
                <div class="cycle-history-modal-header">
                    <h3>${title}</h3>
                    <button class="cycle-history-modal-close" title="关闭">&times;</button>
                </div>
                ${content}
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = modal.querySelector('.cycle-history-modal-close');
        const backdrop = modal.querySelector('.cycle-history-modal-backdrop');
        
        const closeModal = () => modal.remove();
        closeBtn.onclick = closeModal;
        backdrop.onclick = closeModal;

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
};


        
        // 挂载到命名空间
StockProfitCalculator.Detail = Detail;

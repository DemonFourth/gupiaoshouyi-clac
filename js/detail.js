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
            holdingTooltip: document.getElementById('holdingTooltip'),

            // 持仓周期历史区块元素
            cycleHistorySection: document.getElementById('cycleHistorySection'),
            cycleHistoryTotal: document.getElementById('cycleHistoryTotal'),
            cycleHistoryList: document.getElementById('cycleHistoryList'),
            cycleHistoryCollapseBtn: document.getElementById('cycleHistoryCollapseBtn'),
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

        StockProfitCalculator.Logger?.debug?.('[Detail] _initChartObserver: 图表容器状态:', {
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
        StockProfitCalculator.Logger?.debug?.('[Detail] _renderTimeSeriesChartsInternal: 开始渲染图表');
        
        const timeSeries = this.snapshot?.calcResult?.timeSeries;
        StockProfitCalculator.Logger?.debug?.('[Detail] _renderTimeSeriesChartsInternal: timeSeries 存在:', !!timeSeries);
        
        if (!timeSeries) {
            StockProfitCalculator.Logger?.debug?.('[Detail] _renderTimeSeriesChartsInternal: timeSeries 为空，跳过渲染');
            return;
        }

        StockProfitCalculator.Logger?.debug?.('[Detail] _renderTimeSeriesChartsInternal: timeSeries 数据:', {
            dates: timeSeries.dates?.length,
            holdings: timeSeries.holdings?.length,
            costs: timeSeries.costs?.length,
            profits: timeSeries.profits?.length,
            returnRates: timeSeries.returnRates?.length,
            costPerShares: timeSeries.costPerShares?.length,
            buyPrices: timeSeries.buyPrices?.length
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
        StockProfitCalculator.Logger?.debug?.('[loadStock] 开始执行, stockCode:', stockCode);
        
        const TradeManager = StockProfitCalculator.TradeManager;
        const DataManager = StockProfitCalculator.DataManager;
        const Router = StockProfitCalculator.Router;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;

        const perfToken = window.Perf ? window.Perf.start('Detail.loadStock') : null;
        this.currentStockCode = stockCode;
        StockProfitCalculator.Logger?.debug?.('[loadStock] 设置 currentStockCode:', this.currentStockCode);

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
            StockProfitCalculator.Logger?.debug?.('[loadStock] 股票没有交易记录，显示空状态提示');
            // 显示空状态提示
            this._showEmptyState();
        } else {
            StockProfitCalculator.Logger?.debug?.('[loadStock] 股票有交易记录，数量:', stock.trades.length);
        }

        // 更新页面标题
        const h1 = document.querySelector('h1');
        const fullName = `${stock.name}(${stock.code})`;
        h1.textContent = fullName;
        h1.title = fullName;  // 悬浮显示完整名称
        document.getElementById('stockInfo').textContent = '点击返回查看所有股票';
        StockProfitCalculator.Logger?.debug?.('[loadStock] 更新页面标题:', stock.name);

        // 显示返回按钮
        document.getElementById('backBtn').style.display = 'inline-flex';

        // 先构建 snapshot（包含数据计算），避免重复计算
        StockProfitCalculator.Logger?.debug?.('[loadStock] 开始构建 snapshot');
        this.snapshot = await StockSnapshot.build(stockCode, null);
        StockProfitCalculator.Logger?.debug?.('[loadStock] snapshot 构建完成');
        this.calcResult = this.snapshot.calcResult;

        // 更新UI
        StockProfitCalculator.Logger?.debug?.('[loadStock] 更新 UI');
        this.updateAll(stock);

        // 获取实时股价
        StockProfitCalculator.Logger?.debug?.('[loadStock] 获取实时股价');
        await this.fetchStockPrice();

        // 绑定表单事件
        StockProfitCalculator.Logger?.debug?.('[loadStock] 绑定表单事件');
        this.bindFormEvents();

        // Tooltip 已由 TooltipManager 统一管理，在 app.js 中初始化

        if (window.Perf) window.Perf.end(perfToken, { stockCode });
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

        // 自动打开添加交易弹窗（替代旧的表单）
        setTimeout(() => {
            const addBtn = document.getElementById('toggleAddTradeBtn');
            if (addBtn) {
                addBtn.click();  // 模拟点击按钮，打开弹窗
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

        // 使用缓存的 DOM 元素 - 应用大数字转换
        const totalCostFmt = Utils.formatLargeNumberWithTooltip(result.totalBuyCost);
        this._domCache.totalCost.textContent = totalCostFmt.display;
        if (totalCostFmt.converted) {
            this._domCache.totalCost.classList.add('large-number-tooltip');
            this._domCache.totalCost.setAttribute('data-full-value', totalCostFmt.full);
        }

        const totalSellFmt = Utils.formatLargeNumberWithTooltip(result.totalSellAmount);
        this._domCache.totalSell.textContent = totalSellFmt.display;
        if (totalSellFmt.converted) {
            this._domCache.totalSell.classList.add('large-number-tooltip');
            this._domCache.totalSell.setAttribute('data-full-value', totalSellFmt.full);
        }

        const totalFeeFmt = Utils.formatLargeNumberWithTooltip(result.totalFee);
        this._domCache.totalFee.textContent = totalFeeFmt.display;
        if (totalFeeFmt.converted) {
            this._domCache.totalFee.classList.add('large-number-tooltip');
            this._domCache.totalFee.setAttribute('data-full-value', totalFeeFmt.full);
        }

        const profitElement = this._domCache.totalProfit;
        const totalProfitFmt = Utils.formatLargeNumberWithTooltip(result.totalProfit);
        profitElement.textContent = totalProfitFmt.display;
        profitElement.className = 'detail-value ' + (result.totalProfit >= 0 ? 'profit' : 'loss');
        if (totalProfitFmt.converted) {
            profitElement.classList.add('large-number-tooltip');
            profitElement.setAttribute('data-full-value', totalProfitFmt.full);
        }

        const weeklyProfitElement = this._domCache.weeklyProfit;
        const weeklyProfitFmt = Utils.formatLargeNumberWithTooltip(periodProfit.weeklyProfit);
        weeklyProfitElement.textContent = weeklyProfitFmt.display;
        weeklyProfitElement.className = 'detail-value ' + (periodProfit.weeklyProfit >= 0 ? 'profit' : 'loss');
        if (weeklyProfitFmt.converted) {
            weeklyProfitElement.classList.add('large-number-tooltip');
            weeklyProfitElement.setAttribute('data-full-value', weeklyProfitFmt.full);
        }

        const monthlyProfitElement = this._domCache.monthlyProfit;
        const monthlyProfitFmt = Utils.formatLargeNumberWithTooltip(periodProfit.monthlyProfit);
        monthlyProfitElement.textContent = monthlyProfitFmt.display;
        monthlyProfitElement.className = 'detail-value ' + (periodProfit.monthlyProfit >= 0 ? 'profit' : 'loss');
        if (monthlyProfitFmt.converted) {
            monthlyProfitElement.classList.add('large-number-tooltip');
            monthlyProfitElement.setAttribute('data-full-value', monthlyProfitFmt.full);
        }

        this._domCache.totalReturnRate.textContent = result.totalReturnRate.toFixed(3) + '%';

        // 更新实时持仓区域 - 应用大数字转换
        const realtimeCostFmt = Utils.formatLargeNumberWithTooltip(result.currentCost);
        this._domCache.realtimeCost.textContent = realtimeCostFmt.display;
        if (realtimeCostFmt.converted) {
            this._domCache.realtimeCost.classList.add('large-number-tooltip');
            this._domCache.realtimeCost.setAttribute('data-full-value', realtimeCostFmt.full);
        }
        this._domCache.realtimeHolding.textContent = result.currentHolding + '股';

        // 更新当前持仓周期投入成本和卖出金额 - 应用大数字转换
        const buyCostFmt = Utils.formatLargeNumberWithTooltip(result.currentCycleBuyCost);
        this._domCache.currentCycleBuyCost.textContent = buyCostFmt.display;
        if (buyCostFmt.converted) {
            this._domCache.currentCycleBuyCost.classList.add('large-number-tooltip');
            this._domCache.currentCycleBuyCost.setAttribute('data-full-value', buyCostFmt.full);
        }

        const sellAmountFmt = Utils.formatLargeNumberWithTooltip(result.currentCycleSellAmount);
        this._domCache.currentCycleSellAmount.textContent = sellAmountFmt.display;
        if (sellAmountFmt.converted) {
            this._domCache.currentCycleSellAmount.classList.add('large-number-tooltip');
            this._domCache.currentCycleSellAmount.setAttribute('data-full-value', sellAmountFmt.full);
        }

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

            // 持仓市值 - 应用大数字转换
            const marketValueFmt = Utils.formatLargeNumberWithTooltip(marketValue);
            this._domCache.marketValue.textContent = marketValueFmt.display;
            if (marketValueFmt.converted) {
                this._domCache.marketValue.classList.add('large-number-tooltip');
                this._domCache.marketValue.setAttribute('data-full-value', marketValueFmt.full);
            }

            const latestReturnRateElement = this._domCache.latestReturnRate;
            latestReturnRateElement.textContent = currentHoldingReturnRate.toFixed(3) + '%';
            latestReturnRateElement.classList.remove('profit', 'loss');
            latestReturnRateElement.classList.add(currentHoldingReturnRate >= 0 ? 'profit' : 'loss');

            // 持有股收益 - 应用大数字转换
            const latestProfitElement = this._domCache.latestProfit;
            const latestProfitFmt = Utils.formatLargeNumberWithTooltip(currentHoldingProfit);
            latestProfitElement.textContent = latestProfitFmt.display;
            latestProfitElement.classList.remove('profit', 'loss');
            latestProfitElement.classList.add(currentHoldingProfit >= 0 ? 'profit' : 'loss');
            if (latestProfitFmt.converted) {
                latestProfitElement.classList.add('large-number-tooltip');
                latestProfitElement.setAttribute('data-full-value', latestProfitFmt.full);
            }

            // 更新当前持仓周期收益 - 应用大数字转换
            const cycleProfitElement = this._domCache.cycleProfit;
            if (cycleProfit !== null) {
                const cycleProfitFmt = Utils.formatLargeNumberWithTooltip(cycleProfit);
                cycleProfitElement.textContent = cycleProfitFmt.display;
                cycleProfitElement.classList.remove('profit', 'loss');
                cycleProfitElement.classList.add(cycleProfit >= 0 ? 'profit' : 'loss');
                if (cycleProfitFmt.converted) {
                    cycleProfitElement.classList.add('large-number-tooltip');
                    cycleProfitElement.setAttribute('data-full-value', cycleProfitFmt.full);
                }
            } else {
                cycleProfitElement.textContent = '--';
                cycleProfitElement.classList.remove('profit', 'loss');
            }

            // 更新当前持仓周期收益率
            const cycleReturnRateElement = this._domCache.cycleReturnRate;
            if (cycleReturnRate !== null) {
                cycleReturnRateElement.textContent = cycleReturnRate.toFixed(3) + '%';
                cycleReturnRateElement.classList.remove('profit', 'loss');
                cycleReturnRateElement.classList.add(cycleReturnRate >= 0 ? 'profit' : 'loss');
            } else {
                cycleReturnRateElement.textContent = '--';
                cycleReturnRateElement.classList.remove('profit', 'loss');
            }

            this._domCache.costPerShare.textContent = '¥' + (result.currentHolding > 0 ? (result.currentCost / result.currentHolding).toFixed(3) : '--');

            // 更新标题栏新增数据
            this._updateHeaderQuoteData(result, snapshot, marketValue, currentHoldingProfit, currentHoldingReturnRate, this.currentStockPrice);

            const totalAllProfit = snapshot.totalAllProfit;
            const totalAllProfitElement = this._domCache.totalAllProfit;
            totalAllProfitElement.textContent = Utils.formatNullableCurrency(totalAllProfit, 2);
            // 保留 hero-card-value 类，只更新 profit/loss 状态
            totalAllProfitElement.classList.remove('profit', 'loss');
            totalAllProfitElement.classList.add(totalAllProfit !== null && totalAllProfit >= 0 ? 'profit' : 'loss');

            this._domCache.dilutedCostPerShare.textContent = Utils.formatNullableCurrency(snapshot.dilutedCostPerShare, 3);

            // 更新持仓开始日期和持有天数
            const holdingInfo = snapshot.holdingInfo;
            this._domCache.holdingStartDate.textContent = holdingInfo.startDate;
            this._domCache.holdingDays.textContent = holdingInfo.holdingDays + '天';

            // 渲染持仓周期历史区块
            this._renderCycleHistorySection(snapshot);

            const totalAllReturnRate = snapshot.totalAllReturnRate;
            const totalAllReturnRateElement = this._domCache.totalAllReturnRate;
            totalAllReturnRateElement.textContent = Utils.formatNullablePercent(totalAllReturnRate, 3);
            // 保留 hero-card-value 类，只更新 profit/loss 状态
            totalAllReturnRateElement.classList.remove('profit', 'loss');
            totalAllReturnRateElement.classList.add(totalAllReturnRate !== null && totalAllReturnRate >= 0 ? 'profit' : 'loss');
        } else {
            this._domCache.costPerShare.textContent = '¥' + (snapshot ? snapshot.costPerShare : 0).toFixed(3);
            this._domCache.dilutedCostPerShare.textContent = '--';
            
            // 重置持仓市值为 --（已清仓股票持仓股数为0）
            this._domCache.marketValue.textContent = '--';

            // 更新标题栏新增数据（已清仓）
            this._updateHeaderQuoteData(result, snapshot, 0, null, null, null);

            // 更新当前持有股收益和收益率（显示为 --）
            this._domCache.latestProfit.textContent = '--';
            this._domCache.latestReturnRate.textContent = '--';
            this._domCache.cycleProfit.textContent = '--';
            this._domCache.cycleReturnRate.textContent = '--';
            
            // 清除 profit/loss 类
            this._domCache.latestProfit.classList.remove('profit', 'loss');
            this._domCache.cycleProfit.classList.remove('profit', 'loss');
            this._domCache.cycleReturnRate.classList.remove('profit', 'loss');

            const totalAllProfitElement = this._domCache.totalAllProfit;
            totalAllProfitElement.textContent = '¥' + result.totalProfit.toFixed(2);
            // 保留 hero-card-value 类，只更新 profit/loss 状态
            totalAllProfitElement.classList.remove('profit', 'loss');
            totalAllProfitElement.classList.add(result.totalProfit >= 0 ? 'profit' : 'loss');

            const totalAllReturnRateElement = this._domCache.totalAllReturnRate;
            totalAllReturnRateElement.textContent = result.totalReturnRate.toFixed(3) + '%';
            // 保留 hero-card-value 类，只更新 profit/loss 状态
            totalAllReturnRateElement.classList.remove('profit', 'loss');
            totalAllReturnRateElement.classList.add(result.totalReturnRate >= 0 ? 'profit' : 'loss');

            // 更新持仓开始日期和持有天数
            const holdingInfo = snapshot.holdingInfo;
            this._domCache.holdingStartDate.textContent = holdingInfo.startDate;
            this._domCache.holdingDays.textContent = holdingInfo.holdingDays + '天';

            // 渲染持仓周期历史区块
            this._renderCycleHistorySection(snapshot);
        }
    },

    /**
     * 更新标题栏新增数据（每股成本、持仓成本、持有收益等）
     * @private
     */
    _updateHeaderQuoteData(result, snapshot, marketValue, holdingProfit, holdingReturnRate, currentPrice) {
        const Utils = StockProfitCalculator.Utils;

        // 每股成本
        const costPerShareHeader = document.getElementById('costPerShareHeader');
        if (costPerShareHeader) {
            if (result.currentHolding > 0) {
                const costPerShare = result.currentCost / result.currentHolding;
                costPerShareHeader.textContent = '¥' + costPerShare.toFixed(3);
                // 现价 > 成本 = 盈利（红色），现价 < 成本 = 亏损（绿色）
                if (currentPrice != null) {
                    costPerShareHeader.className = 'header-quote-value ' + (currentPrice > costPerShare ? 'profit' : (currentPrice < costPerShare ? 'loss' : ''));
                } else {
                    costPerShareHeader.className = 'header-quote-value';
                }
            } else {
                costPerShareHeader.textContent = '--';
                costPerShareHeader.className = 'header-quote-value';
            }
        }

        // 每股摊薄成本
        const dilutedCostPerShareHeader = document.getElementById('dilutedCostPerShareHeader');
        if (dilutedCostPerShareHeader) {
            const dilutedCost = snapshot?.dilutedCostPerShare;
            if (dilutedCost != null && result.currentHolding > 0) {
                dilutedCostPerShareHeader.textContent = '¥' + dilutedCost.toFixed(3);
                // 现价 > 摊薄成本 = 盈利（红色），现价 < 摊薄成本 = 亏损（绿色）
                if (currentPrice != null) {
                    dilutedCostPerShareHeader.className = 'header-quote-value ' + (currentPrice > dilutedCost ? 'profit' : (currentPrice < dilutedCost ? 'loss' : ''));
                } else {
                    dilutedCostPerShareHeader.className = 'header-quote-value';
                }
            } else {
                dilutedCostPerShareHeader.textContent = '--';
                dilutedCostPerShareHeader.className = 'header-quote-value';
            }
        }

        // 持仓成本 - 应用大数字转换
        const holdingCostHeader = document.getElementById('holdingCostHeader');
        if (holdingCostHeader) {
            if (result.currentHolding > 0) {
                const holdingCostFmt = Utils.formatLargeNumberWithTooltip(result.currentCost);
                holdingCostHeader.textContent = holdingCostFmt.display;
                holdingCostHeader.className = 'header-quote-value';
                if (holdingCostFmt.converted) {
                    holdingCostHeader.classList.add('large-number-tooltip');
                    holdingCostHeader.setAttribute('data-full-value', holdingCostFmt.full);
                }
            } else {
                holdingCostHeader.textContent = '--';
                holdingCostHeader.className = 'header-quote-value';
            }
        }

        // 持仓市值 - 应用大数字转换
        const marketValueHeader = document.getElementById('marketValueHeader');
        if (marketValueHeader) {
            if (marketValue > 0) {
                const marketValueFmt = Utils.formatLargeNumberWithTooltip(marketValue);
                marketValueHeader.textContent = marketValueFmt.display;
                marketValueHeader.className = 'header-quote-value ' + (marketValue > result.currentCost ? 'profit' : (marketValue < result.currentCost ? 'loss' : ''));
                if (marketValueFmt.converted) {
                    marketValueHeader.classList.add('large-number-tooltip');
                    marketValueHeader.setAttribute('data-full-value', marketValueFmt.full);
                }
            } else {
                marketValueHeader.textContent = '--';
                marketValueHeader.className = 'header-quote-value';
            }
        }

        // 持有收益 - 应用大数字转换
        const holdingProfitHeader = document.getElementById('holdingProfitHeader');
        if (holdingProfitHeader) {
            if (holdingProfit != null && result.currentHolding > 0) {
                const holdingProfitFmt = Utils.formatLargeNumberWithTooltip(Math.abs(holdingProfit));
                const sign = holdingProfit >= 0 ? '+' : '-';
                holdingProfitHeader.textContent = sign + holdingProfitFmt.display;
                holdingProfitHeader.className = 'header-quote-value ' + (holdingProfit >= 0 ? 'profit' : 'loss');
                if (holdingProfitFmt.converted) {
                    holdingProfitHeader.classList.add('large-number-tooltip');
                    holdingProfitHeader.setAttribute('data-full-value', sign + holdingProfitFmt.full);
                }
            } else {
                holdingProfitHeader.textContent = '--';
                holdingProfitHeader.className = 'header-quote-value';
            }
        }

        // 收益率
        const holdingReturnRateHeader = document.getElementById('holdingReturnRateHeader');
        if (holdingReturnRateHeader) {
            if (holdingReturnRate != null && result.currentHolding > 0) {
                // 格式：+6.65% 或 -6.65%，与持有收益格式一致（符号在前）
                const sign = holdingReturnRate >= 0 ? '+' : '-';
                holdingReturnRateHeader.textContent = sign + Math.abs(holdingReturnRate).toFixed(2) + '%';
                holdingReturnRateHeader.className = 'header-quote-value ' + (holdingReturnRate >= 0 ? 'profit' : 'loss');
            } else {
                holdingReturnRateHeader.textContent = '--';
                holdingReturnRateHeader.className = 'header-quote-value';
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
     * 切换添加交易表单显示 - 改为打开弹窗
     */
    toggleAddTradeForm() {
        // 使用编辑弹窗进行添加
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('tradeModalTitle');
        const saveBtn = document.getElementById('updateTradeBtn');

        if (modal) {
            // 设置为添加模式
            modalTitle.textContent = '添加交易记录';
            saveBtn.textContent = '添加';

            // 清空编辑ID（表示这是添加模式）
            const editTradeId = document.getElementById('editTradeId');
            if (editTradeId) {
                editTradeId.value = '';
            }

            // 隐藏股票信息（添加模式在股票详情页，已知股票）
            const stockInfoDiv = document.getElementById('editTradeStockInfo');
            if (stockInfoDiv) {
                stockInfoDiv.style.display = 'none';
            }

            // 设置默认日期
            const dateInput = document.getElementById('editTradeDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }

            // 重置表单
            document.getElementById('editTradeType').value = 'buy';
            document.getElementById('editTradePrice').value = '';
            document.getElementById('editTradeAmount').value = '';
            document.getElementById('editTradeFee').value = '5';
            document.getElementById('editTradeAmountDisplay').value = '';
            const noteInput = document.getElementById('editTradeNote');
            if (noteInput) {
                noteInput.value = '';
            }

            // 触发类型切换
            if (StockProfitCalculator.TradeManager) {
                StockProfitCalculator.TradeManager.onEditTypeChange();
            }

            // 显示弹窗
            modal.style.display = 'block';
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
            // 分红和红利税：价格、数量、手续费只读显示"-"，金额可输入
            
            // 金额变为可编辑
            amountDisplay.readOnly = false;
            amountDisplay.placeholder = '请输入金额';
            amountDisplay.style.background = '#fff';
            amountDisplay.style.cursor = 'text';
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

        // 获取备注
        const noteInput = document.getElementById('tradeNote');
        const note = noteInput ? noteInput.value.trim() : '';

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
                totalAmount,    // 额外字段存储金额
                note            // 新增备注字段
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
                totalAmount: Math.round(price * amount * 100) / 100,  // 金额 = 价格 * 数量，保留2位小数
                note            // 新增备注字段
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

        // 清空备注输入框
        if (noteInput) {
            noteInput.value = '';
        }
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
                top: 60,
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

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-holdingTrendChart', chartDom, option, { bindResize: false });
        this._chartInstances.holdingTrendChart = myChart;
    },

    renderCumulativeProfitChart(timeSeries) {
        this._ensureDOMCache();
        const chartDom = this._domCache.cumulativeProfitChart;
        if (!chartDom) return;

        // 销毁旧实例
        if (this._chartInstances.cumulativeProfitChart) {
            this._chartInstances.cumulativeProfitChart.dispose();
        }

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
                top: 60,
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

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-cumulativeProfitChart', chartDom, option, { bindResize: false });
        this._chartInstances.cumulativeProfitChart = myChart;
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
                top: 60,
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

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-profitTrendChart', chartDom, option, { bindResize: false });
        this._chartInstances.profitTrendChart = myChart;
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
                top: 60,
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

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-returnRateTrendChart', chartDom, option, { bindResize: false });
        this._chartInstances.returnRateTrendChart = myChart;
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

        // 计算自适应Y轴范围：根据三条曲线（持仓成本、摊薄成本、买入价）与最新价共同决定
        const cps = (timeSeries.costPerShares || []).filter(v => v != null && Number.isFinite(v));
        const dps = (timeSeries.dilutedCostPerShares || []).filter(v => v != null && Number.isFinite(v));
        const bps = (timeSeries.buyPrices || []).filter(v => v != null && Number.isFinite(v));
        const vals = [...cps, ...dps, ...bps];
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
                text: '每股成本趋势（买入 vs 持仓 vs 摊薄）',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            }
        ];

        const option = {
            title: titles,
            legend: {
                data: hasLatest ? ['买入价', '每股持仓成本', '每股摊薄成本', '最新价'] : ['买入价', '每股持仓成本', '每股摊薄成本'],
                top: 30,
                textStyle: { fontSize: 12 }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const bps = params.find(p => p.seriesName === '买入价');
                    const cps = params.find(p => p.seriesName === '每股持仓成本');
                    const dps = params.find(p => p.seriesName === '每股摊薄成本');
                    const date = params[0]?.name || '';
                    const bpsVal = bps && bps.value != null ? `¥${Number(bps.value).toFixed(3)}` : '--';
                    const cpsVal = cps && cps.value != null ? `¥${Number(cps.value).toFixed(3)}` : '--';
                    const dpsVal = dps && dps.value != null ? `¥${Number(dps.value).toFixed(3)}` : '--';
                    const lpVal  = hasLatest ? `¥${Utils.formatPrice(latestPrice)}` : '--';

                    let result = `${date}<br/>买入: ${bpsVal}<br/>持仓: ${cpsVal}<br/>摊薄: ${dpsVal}`;
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
                left: '3%', right: '4%', bottom: '3%', top: 60, containLabel: true
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
                name: '价格(元/股)',
                axisLabel: { formatter: '¥{value}' },
                min: function() { return axisMin; },
                max: function() { return axisMax; }
            },
            series: [
                {
                    name: '买入价',
                    type: 'line',
                    data: (timeSeries.buyPrices || []).map(v => (v == null ? null : Number(v.toFixed ? v.toFixed(3) : v))),
                    smooth: true,
                    symbol: 'diamond', symbolSize: 6,
                    lineStyle: { color: '#FF9800', width: 2 },
                    itemStyle: { color: '#FF9800' }
                },
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
                    itemStyle: { color: '#9C27B0' }
                },
                // 最新价标记线作为独立series
                ...(hasLatest ? [{
                    name: '最新价',
                    type: 'line',
                    data: [],  // 空数据,只显示markLine
                    markLine: markLine,
                    symbol: 'none',  // 不显示数据点
                    lineStyle: { width: 0 },  // 不显示线条
                    itemStyle: { color: '#FF5722' }  // 橙色,与markLine颜色一致
                }] : [])
            ]
        };

        // 移除先前的右上角 graphic 角标，改为用 title[right] 渲染，不遮挡折线

        // 不再添加“最新价”常量线序列，避免视觉重叠，仅保留橙色 markLine

        // 使用 ChartManager.init()，禁用各自的 resize 监听
        const myChart = StockProfitCalculator.ChartManager.init('detail-perShareCostTrendChart', chartDom, option, { bindResize: false });
        this._chartInstances.perShareCostTrendChart = myChart;

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

        // 渲染加仓对比表格
        this._renderAdditionComparisonTable(
            additionComparisons, 
            this.calcResult?.additionComparisonsByCycle || {},
            timeSeries, 
            latestPrice, 
            lastCps, 
            lastDps, 
            this.calcResult?.holdingCycleHistory
        );

        // 渲染卖出预测区域
        this._renderSellPrediction(latestPrice);
    },

    /**
     * 渲染加仓对比表格（多轮分组版本）
     * @private
     * @param {Array} additionComparisons - 加仓对比数据（最新一轮）
     * @param {Object} additionComparisonsByCycle - 按轮次保存的加仓对比数据
     * @param {Object} timeSeries - 时间序列数据
     * @param {number} latestPrice - 最新股价
     * @param {number} lastCps - 最新每股持仓成本
     * @param {number} lastDps - 最新每股摊薄成本
     * @param {Array} cycleHistory - 持仓周期历史
     */
    _renderAdditionComparisonTable(additionComparisons, additionComparisonsByCycle, timeSeries, latestPrice, lastCps, lastDps, cycleHistory) {
        const container = document.getElementById('additionComparisonTable');
        if (!container) return;

        // 只要有持仓周期历史就显示表格
        const cycleArray = cycleHistory || [];
        if (cycleArray.length === 0) {
            container.innerHTML = '';
            return;
        }

        const additionsByCycle = additionComparisonsByCycle || {};
        const dates = timeSeries?.dates || [];
        const costPerShares = timeSeries?.costPerShares || [];
        const dilutedCosts = timeSeries?.dilutedCostPerShares || [];
        const holdings = timeSeries?.holdings || [];

        // 构建总标题
        const cycleCount = cycleArray.length;
        const totalTitle = cycleCount > 1 
            ? `加仓对比记录（共${cycleCount}轮）` 
            : '加仓对比记录';

        let html = `
            <div class="ac-section-header">
                <div class="ac-title-row">
                    <span class="ac-section-title">${totalTitle}</span>
                    <button type="button" class="ac-section-toggle" title="折叠/展开全部">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="ac-cycles-container">
        `;

        // 倒序遍历轮次（最新在前）
        const reversedCycles = [...cycleArray].reverse();
        
        reversedCycles.forEach((cycle, index) => {
            const cycleNum = cycle.cycle;
            const isFirstCycle = (index === 0);  // 第一轮是最新轮次
            const isCurrentHolding = cycle.status === 'active';
            
            // 默认：最新一轮展开，其他折叠
            const collapsedClass = isFirstCycle ? '' : 'ac-cycle-collapsed';
            
            // 轮次标题
            const cycleLabel = isCurrentHolding ? '当前持仓' : '已清仓';
            const cycleTitle = `第${cycleNum}轮（${cycleLabel}）`;
            
            // 筛选属于该轮的加仓记录（从按轮次保存的数据中获取）
            const cycleAdditions = additionsByCycle[cycleNum] || [];
            
            // 获取该轮的建仓信息
            const buildDate = cycle.startDate || '--';
            const buildDateIndex = dates.indexOf(buildDate);
            const buildPrice = buildDateIndex >= 0 ? costPerShares[buildDateIndex] : null;
            const buildHolding = buildDateIndex >= 0 ? holdings[buildDateIndex] : null;
            const buildDps = buildDateIndex >= 0 ? dilutedCosts[buildDateIndex] : null;

            html += `
                <div class="ac-cycle-group ${collapsedClass}" data-cycle="${cycleNum}">
                    <div class="ac-cycle-header">
                        <div class="ac-cycle-title-row">
                            <span class="ac-cycle-title">${cycleTitle}</span>
                            <button type="button" class="ac-cycle-toggle" title="折叠/展开">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="ac-cycle-content">
                    <table class="ac-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>价格</th>
                                <th>股数</th>
                                <th>金额</th>
                                <th>相对上次</th>
                                <th>持仓成本</th>
                                <th>摊薄成本</th>
                                <th>现价对比</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // 建仓行
            if (buildPrice != null && buildDate !== '--') {
                const buildCps = buildPrice;
                const buildDpsVal = buildDps != null ? buildDps : buildPrice;
                
                // 现价对比（只有最新一轮才用最新价格对比）
                let buildCompareText = '--';
                if (isFirstCycle && latestPrice != null) {
                    const cpsDiff = latestPrice - buildCps;
                    const dpsDiff = latestPrice - buildDpsVal;
                    const cpsPct = buildCps > 0 ? (cpsDiff / buildCps * 100) : 0;
                    const dpsPct = buildDpsVal > 0 ? (dpsDiff / buildDpsVal * 100) : 0;
                    
                    const cpsLine = `<span class="${cpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">持仓: ${cpsDiff >= 0 ? '+' : ''}${cpsDiff.toFixed(3)} (${cpsPct >= 0 ? '+' : ''}${cpsPct.toFixed(2)}%)</span>`;
                    const dpsLine = `<span class="${dpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">摊薄: ${dpsDiff >= 0 ? '+' : ''}${dpsDiff.toFixed(3)} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(2)}%)</span>`;
                    buildCompareText = `<div class="ac-compare">${cpsLine}${dpsLine}</div>`;
                } else if (!isFirstCycle && cycle.clearPrice != null) {
                    // 历史轮次用清仓价对比
                    const cpsDiff = cycle.clearPrice - buildCps;
                    const dpsDiff = cycle.clearPrice - buildDpsVal;
                    const cpsPct = buildCps > 0 ? (cpsDiff / buildCps * 100) : 0;
                    const dpsPct = buildDpsVal > 0 ? (dpsDiff / buildDpsVal * 100) : 0;
                    
                    const cpsLine = `<span class="${cpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">持仓: ${cpsDiff >= 0 ? '+' : ''}${cpsDiff.toFixed(3)} (${cpsPct >= 0 ? '+' : ''}${cpsPct.toFixed(2)}%)</span>`;
                    const dpsLine = `<span class="${dpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">摊薄: ${dpsDiff >= 0 ? '+' : ''}${dpsDiff.toFixed(3)} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(2)}%)</span>`;
                    buildCompareText = `<div class="ac-compare">${cpsLine}${dpsLine}</div>`;
                }

                const buildAmountText = buildHolding != null ? buildHolding.toLocaleString() : '--';
                const buildTotalAmount = (buildPrice != null && buildHolding != null) ? (buildPrice * buildHolding) : null;
                const buildAmountMoneyText = buildTotalAmount != null ? '¥' + buildTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '--';

                html += `
                    <tr class="ac-build">
                        <td>${buildDate}</td>
                        <td>¥${buildPrice.toFixed(3)}</td>
                        <td>${buildAmountText}</td>
                        <td>${buildAmountMoneyText}</td>
                        <td><span class="ac-build-label">建仓</span></td>
                        <td>¥${buildCps.toFixed(3)}</td>
                        <td>¥${buildDpsVal.toFixed(3)}</td>
                        <td>${buildCompareText}</td>
                    </tr>
                `;
            }

            // 加仓行
            cycleAdditions.forEach((item) => {
                const date = item.date || '--';
                const price = item.price != null ? item.price.toFixed(3) : '--';
                
                // 相对上次涨跌
                let changeText = '--';
                if (item.change != null && item.lastPrice != null) {
                    const change = item.change;
                    const changePercent = item.changePercent || 0;
                    const sign = change >= 0 ? '+' : '';
                    changeText = `<span class="${change >= 0 ? 'ac-profit' : 'ac-loss'}">${sign}${change.toFixed(3)} (${sign}${changePercent.toFixed(2)}%)</span>`;
                }

                const amount = item.amount || '--';
                const amountText = typeof amount === 'number' ? amount.toLocaleString() : amount;

                const dateIndex = dates.indexOf(date);
                const costPerShare = dateIndex >= 0 ? costPerShares[dateIndex] : null;
                const dilutedCost = dateIndex >= 0 ? dilutedCosts[dateIndex] : null;
                
                const cpsText = costPerShare != null ? costPerShare.toFixed(3) : '--';
                const dpsText = dilutedCost != null ? dilutedCost.toFixed(3) : '--';

                const itemPrice = item.price || 0;
                const itemAmount = item.amount || 0;
                const totalAmountText = (itemPrice && itemAmount) ? '¥' + (itemPrice * itemAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '--';

                // 现价对比
                let priceCompareText = '--';
                if (isFirstCycle && latestPrice != null && costPerShare != null) {
                    const cpsDiff = latestPrice - costPerShare;
                    const dpsDiff = dilutedCost != null ? latestPrice - dilutedCost : null;
                    const cpsPct = costPerShare > 0 ? (cpsDiff / costPerShare * 100) : 0;
                    const dpsPct = dilutedCost != null && dilutedCost > 0 ? (dpsDiff / dilutedCost * 100) : 0;
                    
                    const cpsLine = `<span class="${cpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">持仓: ${cpsDiff >= 0 ? '+' : ''}${cpsDiff.toFixed(3)} (${cpsPct >= 0 ? '+' : ''}${cpsPct.toFixed(2)}%)</span>`;
                    const dpsLine = dilutedCost != null 
                        ? `<span class="${dpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">摊薄: ${dpsDiff >= 0 ? '+' : ''}${dpsDiff.toFixed(3)} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(2)}%)</span>`
                        : '<span>摊薄: --</span>';
                    priceCompareText = `<div class="ac-compare">${cpsLine}${dpsLine}</div>`;
                } else if (!isFirstCycle && cycle.clearPrice != null && costPerShare != null) {
                    const cpsDiff = cycle.clearPrice - costPerShare;
                    const dpsDiff = dilutedCost != null ? cycle.clearPrice - dilutedCost : null;
                    const cpsPct = costPerShare > 0 ? (cpsDiff / costPerShare * 100) : 0;
                    const dpsPct = dilutedCost != null && dilutedCost > 0 ? (dpsDiff / dilutedCost * 100) : 0;
                    
                    const cpsLine = `<span class="${cpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">持仓: ${cpsDiff >= 0 ? '+' : ''}${cpsDiff.toFixed(3)} (${cpsPct >= 0 ? '+' : ''}${cpsPct.toFixed(2)}%)</span>`;
                    const dpsLine = dilutedCost != null 
                        ? `<span class="${dpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">摊薄: ${dpsDiff >= 0 ? '+' : ''}${dpsDiff.toFixed(3)} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(2)}%)</span>`
                        : '<span>摊薄: --</span>';
                    priceCompareText = `<div class="ac-compare">${cpsLine}${dpsLine}</div>`;
                }

                const rowClass = item.isLatestAddition ? 'ac-latest' : '';

                html += `
                    <tr class="${rowClass}">
                        <td>${date}</td>
                        <td>¥${price}</td>
                        <td>${amountText}</td>
                        <td>${totalAmountText}</td>
                        <td>${changeText}</td>
                        <td>¥${cpsText}</td>
                        <td>¥${dpsText}</td>
                        <td>${priceCompareText}</td>
                    </tr>
                `;
            });

            // 预测行（只有最新一轮显示）
            if (isFirstCycle && latestPrice != null) {
                const lastAdditionPrice = cycleAdditions.length > 0 ? cycleAdditions[cycleAdditions.length - 1].price : null;
                
                let predictChangeText = '--';
                if (lastAdditionPrice != null && lastAdditionPrice > 0) {
                    const predictChange = latestPrice - lastAdditionPrice;
                    const predictChangePercent = (predictChange / lastAdditionPrice * 100);
                    const predictSign = predictChange >= 0 ? '+' : '';
                    predictChangeText = `<span class="${predictChange >= 0 ? 'ac-profit' : 'ac-loss'}">${predictSign}${predictChange.toFixed(3)} (${predictSign}${predictChangePercent.toFixed(2)}%)</span>`;
                }

                html += `
                    <tr class="ac-predict">
                        <td><span class="ac-predict-label">预测</span></td>
                        <td><input type="number" class="ac-predict-input" id="predictPrice" value="${latestPrice.toFixed(3)}" step="0.001" min="0.001" placeholder="价格"></td>
                        <td><input type="number" class="ac-predict-input" id="predictAmount" placeholder="股数" min="100" step="100"></td>
                        <td class="ac-predict-amount" id="predictAmountMoney">--</td>
                        <td>${predictChangeText}</td>
                        <td class="ac-predict-cps" id="predictCps">--</td>
                        <td class="ac-predict-dps" id="predictDps">--</td>
                        <td class="ac-predict-compare" id="predictCompare">--</td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        container.innerHTML = html;

        // 绑定总折叠按钮事件
        const sectionToggle = container.querySelector('.ac-section-toggle');
        if (sectionToggle) {
            sectionToggle.addEventListener('click', () => {
                const cyclesContainer = container.querySelector('.ac-cycles-container');
                const isCollapsed = sectionToggle.classList.contains('ac-section-collapsed');
                
                if (isCollapsed) {
                    // 展开
                    sectionToggle.classList.remove('ac-section-collapsed');
                    cyclesContainer.style.display = 'flex';
                } else {
                    // 折叠
                    sectionToggle.classList.add('ac-section-collapsed');
                    cyclesContainer.style.display = 'none';
                }
            });
        }

        // 绑定折叠按钮事件
        container.querySelectorAll('.ac-cycle-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const cycleGroup = btn.closest('.ac-cycle-group');
                cycleGroup.classList.toggle('ac-cycle-collapsed');
            });
        });

        // 绑定预测输入框事件
        const predictInput = document.getElementById('predictAmount');
        const predictPriceInput = document.getElementById('predictPrice');
        
        // 计算预测结果的函数
        const calculatePrediction = () => {
            const amount = parseInt(predictInput?.value) || 0;
            const price = parseFloat(predictPriceInput?.value) || 0;
            const predictCpsEl = document.getElementById('predictCps');
            const predictDpsEl = document.getElementById('predictDps');
            const predictAmountMoneyEl = document.getElementById('predictAmountMoney');
            const predictCompareEl = document.getElementById('predictCompare');
            
            if (amount > 0 && price > 0) {
                const currentHolding = this.calcResult?.summary?.currentHolding || 0;
                const currentCost = this.calcResult?.summary?.currentCost || 0;
                const currentCycleProfit = this.calcResult?.summary?.currentCycleProfit || 0;
                const currentCycleDividend = this.calcResult?.summary?.currentCycleDividend || 0;
                const currentCycleTax = this.calcResult?.summary?.currentCycleTax || 0;
                
                const predictAmountMoney = price * amount;
                if (predictAmountMoneyEl) predictAmountMoneyEl.textContent = '¥' + predictAmountMoney.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                const newHolding = currentHolding + amount;
                const newCost = currentCost + price * amount;
                const predictCps = newHolding > 0 ? newCost / newHolding : 0;
                
                // 每股摊薄成本：只考虑卖出收益，不考虑分红和红利税
                const cumulativeSellProfit = currentCycleProfit - currentCycleDividend + currentCycleTax;
                const dilutedBase = currentCost - cumulativeSellProfit;
                const newDilutedBase = dilutedBase + price * amount;
                const predictDps = newHolding > 0 ? newDilutedBase / newHolding : 0;
                
                if (predictCpsEl) predictCpsEl.textContent = '¥' + predictCps.toFixed(3);
                if (predictDpsEl) predictDpsEl.textContent = '¥' + predictDps.toFixed(3);
                
                if (predictCompareEl) {
                    const cpsDiff = price - predictCps;
                    const dpsDiff = price - predictDps;
                    const cpsPct = predictCps > 0 ? (cpsDiff / predictCps * 100) : 0;
                    const dpsPct = predictDps > 0 ? (dpsDiff / predictDps * 100) : 0;
                    
                    const cpsLine = `<span class="${cpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">持仓: ${cpsDiff >= 0 ? '+' : ''}${cpsDiff.toFixed(3)} (${cpsPct >= 0 ? '+' : ''}${cpsPct.toFixed(2)}%)</span>`;
                    const dpsLine = `<span class="${dpsDiff >= 0 ? 'ac-profit' : 'ac-loss'}">摊薄: ${dpsDiff >= 0 ? '+' : ''}${dpsDiff.toFixed(3)} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(2)}%)</span>`;
                    predictCompareEl.innerHTML = `<div class="ac-compare">${cpsLine}${dpsLine}</div>`;
                }
            } else {
                if (predictCpsEl) predictCpsEl.textContent = '--';
                if (predictDpsEl) predictDpsEl.textContent = '--';
                if (predictAmountMoneyEl) predictAmountMoneyEl.textContent = '--';
                if (predictCompareEl) predictCompareEl.textContent = '--';
            }
        };
        
        // 绑定股数输入事件
        if (predictInput) {
            predictInput.addEventListener('input', calculatePrediction);
        }
        
        // 绑定价格输入事件
        if (predictPriceInput) {
            predictPriceInput.addEventListener('input', calculatePrediction);
        }
    },

    /**
     * 渲染持仓周期历史区块
     * @private
     * @param {Object} snapshot - 股票快照数据
     */
    _renderCycleHistorySection(snapshot) {
        if (!snapshot) return;

        // 获取配置
        const Config = StockProfitCalculator.Config;
        const showCycleHistory = Config.get('ui.preferences.showCycleHistory', true);

        // 获取 DOM 元素
        const section = this._domCache.cycleHistorySection;
        const totalElement = this._domCache.cycleHistoryTotal;
        const listElement = this._domCache.cycleHistoryList;

        if (!section || !totalElement || !listElement) return;

        // 根据配置控制显示/隐藏
        section.style.display = showCycleHistory ? 'block' : 'none';

        if (!showCycleHistory) return;

        const cycleHistory = snapshot.cycleHistory || [];

        // 空数据处理
        if (cycleHistory.length === 0) {
            totalElement.textContent = '总收益：¥0.00';
            listElement.innerHTML = '<div class="cycle-history-empty">暂无持仓周期历史</div>';
            return;
        }

        // 计算总收益
        const totalProfit = snapshot.totalAllProfit || 0;
        const totalProfitClass = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        const totalProfitText = totalProfit >= 0 ? `+${totalProfit.toFixed(2)}` : totalProfit.toFixed(2);
        totalElement.innerHTML = `总收益：<span class="${totalProfitClass}">¥${totalProfitText}</span>`;

        // 使用通用渲染函数
        StockProfitCalculator.renderCycleHistoryList({
            cycleHistory: cycleHistory,
            container: listElement,
            holdingProfit: snapshot.holdingProfit,
            currentPrice: this.currentStockPrice || snapshot.currentStockPrice,
            totalAllProfit: snapshot.totalAllProfit,
            showClearPrice: true  // 详情页显示清仓股价
        });

        // 绑定折叠按钮事件（只绑定一次）
        const collapseBtn = this._domCache.cycleHistoryCollapseBtn;
        if (collapseBtn && !collapseBtn._bound) {
            collapseBtn.onclick = () => {
                section.classList.toggle('collapsed');
            };
            collapseBtn._bound = true;
        }
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
     * 计算FIFO卖出成本
     * @private
     * @param {Array} holdingQueue - 持仓队列
     * @param {number} sellAmount - 卖出股数
     * @returns {number} FIFO卖出成本
     */
    _calculateFIFOSellCost(holdingQueue, sellAmount) {
        if (!holdingQueue || holdingQueue.length === 0 || sellAmount <= 0) {
            return 0;
        }

        // 深拷贝队列，避免影响原数据
        const queue = holdingQueue.map(h => ({ ...h }));
        let remainingAmount = sellAmount;
        let totalCost = 0;

        while (remainingAmount > 0 && queue.length > 0) {
            const holding = queue[0];
            if (holding.amount <= remainingAmount) {
                // 完全卖出该批次
                totalCost += holding.price * holding.amount + (holding.fee || 0);
                remainingAmount -= holding.amount;
                queue.shift();
            } else {
                // 部分卖出该批次
                const feePortion = (holding.fee || 0) * remainingAmount / holding.amount;
                totalCost += holding.price * remainingAmount + feePortion;
                holding.amount -= remainingAmount;
                remainingAmount = 0;
            }
        }

        return totalCost;
    },

    /**
     * 渲染卖出预测区域
     * @private
     * @param {number} latestPrice - 最新股价
     */
    _renderSellPrediction(latestPrice) {
        const container = document.getElementById('sellPredictionSection');
        if (!container) return;

        const currentHolding = this.calcResult?.summary?.currentHolding || 0;

        // 无持仓时隐藏区域
        if (currentHolding <= 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        const currentCost = this.calcResult?.summary?.currentCost || 0;
        const currentCycleProfit = this.calcResult?.summary?.currentCycleProfit || 0;
        const currentCycleDividend = this.calcResult?.summary?.currentCycleDividend || 0;
        const currentCycleTax = this.calcResult?.summary?.currentCycleTax || 0;
        const holdingQueue = this.calcResult?.holdingQueue || [];

        // 当前每股成本
        const currentCps = currentHolding > 0 ? currentCost / currentHolding : 0;
        // 当前每股摊薄成本：只考虑卖出收益，不考虑分红和红利税
        const cumulativeSellProfit = currentCycleProfit - currentCycleDividend + currentCycleTax;
        const currentDps = currentHolding > 0 ? (currentCost - cumulativeSellProfit) / currentHolding : 0;

        // 默认卖出价格
        const defaultSellPrice = latestPrice != null ? latestPrice.toFixed(3) : '';

        // 计算快捷按钮股数（向下取整到100的倍数）
        const calcQuickAmount = (ratio) => Math.floor(currentHolding * ratio / 100) * 100;

        const html = `
            <div class="sp-container">
                <div class="sp-header">
                    <h3 class="sp-title">卖出预测</h3>
                    <button type="button" class="sp-toggle-btn" id="sellPredictionToggle">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="sp-content" id="sellPredictionContent">
                    <div class="sp-holding-row">
                        <div class="sp-holding-group sp-current-group">
                            <div class="sp-holding-title">当前持仓</div>
                            <div class="sp-holding-data">
                                <span class="sp-holding-value">${currentHolding.toLocaleString()}股</span>
                                <span class="sp-holding-cost">成本 ¥${currentCps.toFixed(3)}</span>
                                <span class="sp-holding-cost">摊薄 ¥${currentDps.toFixed(3)}</span>
                            </div>
                        </div>
                        <div class="sp-holding-group sp-after-group">
                            <div class="sp-holding-title">卖出后</div>
                            <div class="sp-holding-data">
                                <span class="sp-holding-value" id="sellPredictAfterHolding">--</span>
                                <span class="sp-holding-cost" id="sellPredictAfterCps">--</span>
                                <span class="sp-holding-cost" id="sellPredictAfterDps">--</span>
                            </div>
                        </div>
                    </div>
                    <div class="sp-input-row">
                        <div class="sp-input-group">
                            <label class="sp-input-label">卖出价格</label>
                            <input type="number" class="sp-input" id="sellPredictPrice" 
                                   value="${defaultSellPrice}" step="0.001" min="0.001" placeholder="价格">
                        </div>
                        <div class="sp-input-group sp-amount-group">
                            <label class="sp-input-label">卖出股数</label>
                            <div class="sp-amount-row">
                                <input type="number" class="sp-input sp-amount-input" id="sellPredictAmount" 
                                       placeholder="股数" min="100" step="100" max="${currentHolding}">
                                <div class="sp-quick-btns">
                                    <button type="button" class="sp-quick-btn" data-ratio="0.25">1/4仓</button>
                                    <button type="button" class="sp-quick-btn" data-ratio="0.33">1/3仓</button>
                                    <button type="button" class="sp-quick-btn" data-ratio="0.5">半仓</button>
                                    <button type="button" class="sp-quick-btn" data-ratio="1">全仓</button>
                                </div>
                            </div>
                        </div>
                        <div class="sp-result-group">
                            <label class="sp-input-label">卖出金额</label>
                            <span class="sp-result-value" id="sellPredictAmountMoney">--</span>
                        </div>
                        <div class="sp-result-group">
                            <label class="sp-input-label">预估收益</label>
                            <span class="sp-result-value" id="sellPredictProfit">--</span>
                        </div>
                        <div class="sp-result-group">
                            <label class="sp-input-label">收益率</label>
                            <span class="sp-result-value" id="sellPredictRate">--</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // 绑定折叠按钮事件
        const toggleBtn = document.getElementById('sellPredictionToggle');
        const content = document.getElementById('sellPredictionContent');
        if (toggleBtn && content) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = content.classList.contains('sp-collapsed');
                if (isCollapsed) {
                    content.classList.remove('sp-collapsed');
                    toggleBtn.classList.remove('sp-toggle-collapsed');
                } else {
                    content.classList.add('sp-collapsed');
                    toggleBtn.classList.add('sp-toggle-collapsed');
                }
            });
        }

        // 绑定输入事件
        const priceInput = document.getElementById('sellPredictPrice');
        const amountInput = document.getElementById('sellPredictAmount');

        // 计算快捷按钮股数（向下取整到100的倍数）
        const getQuickAmount = (ratio) => {
            const amount = Math.floor(currentHolding * ratio / 100) * 100;
            return Math.max(0, amount);
        };

        // 绑定快捷按钮事件
        container.querySelectorAll('.sp-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const ratio = parseFloat(btn.dataset.ratio) || 0;
                const quickAmount = getQuickAmount(ratio);
                if (amountInput) {
                    amountInput.value = quickAmount;
                    amountInput.dispatchEvent(new Event('input'));
                }
            });
        });

        const calculateSellPrediction = () => {
            const sellPrice = parseFloat(priceInput?.value) || 0;
            const sellAmount = parseInt(amountInput?.value) || 0;

            const amountMoneyEl = document.getElementById('sellPredictAmountMoney');
            const profitEl = document.getElementById('sellPredictProfit');
            const rateEl = document.getElementById('sellPredictRate');
            const afterHoldingEl = document.getElementById('sellPredictAfterHolding');
            const afterCpsEl = document.getElementById('sellPredictAfterCps');
            const afterDpsEl = document.getElementById('sellPredictAfterDps');

            // 验证卖出股数
            if (sellAmount > currentHolding) {
                if (amountMoneyEl) amountMoneyEl.textContent = '超过持仓';
                if (amountMoneyEl) amountMoneyEl.classList.add('sp-error');
                if (profitEl) profitEl.textContent = '--';
                if (rateEl) rateEl.textContent = '--';
                if (afterHoldingEl) afterHoldingEl.textContent = '--';
                if (afterCpsEl) afterCpsEl.textContent = '--';
                if (afterDpsEl) afterDpsEl.textContent = '--';
                return;
            }

            if (amountMoneyEl) amountMoneyEl.classList.remove('sp-error');

            if (sellAmount > 0 && sellPrice > 0) {
                // 计算FIFO成本
                const sellCost = this._calculateFIFOSellCost(holdingQueue, sellAmount);

                // 卖出金额
                const sellAmountMoney = sellPrice * sellAmount;

                // 预估收益
                const estimatedProfit = sellAmountMoney - sellCost;

                // 收益率
                const profitRate = sellCost > 0 ? (estimatedProfit / sellCost * 100) : 0;

                // 更新显示
                if (amountMoneyEl) amountMoneyEl.textContent = '¥' + sellAmountMoney.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

                if (profitEl) {
                    const profitClass = estimatedProfit >= 0 ? 'sp-profit' : 'sp-loss';
                    profitEl.className = 'sp-result-value ' + profitClass;
                    profitEl.textContent = (estimatedProfit >= 0 ? '+' : '') + '¥' + estimatedProfit.toFixed(2);
                }

                if (rateEl) {
                    const rateClass = profitRate >= 0 ? 'sp-profit' : 'sp-loss';
                    rateEl.className = 'sp-result-value ' + rateClass;
                    rateEl.textContent = (profitRate >= 0 ? '+' : '') + profitRate.toFixed(2) + '%';
                }

                // 卖出后数据
                const afterHolding = currentHolding - sellAmount;
                const afterCost = currentCost - sellCost;
                const afterCps = afterHolding > 0 ? afterCost / afterHolding : 0;

                // 摊薄成本：只考虑卖出收益，不考虑分红和红利税
                const cumulativeSellProfit = currentCycleProfit - currentCycleDividend + currentCycleTax;
                const dilutedBase = currentCost - cumulativeSellProfit;
                const afterDilutedBase = dilutedBase - sellCost;
                const afterDps = afterHolding > 0 ? afterDilutedBase / afterHolding : 0;

                // 更新卖出后显示
                if (afterHoldingEl) {
                    afterHoldingEl.textContent = afterHolding > 0 ? afterHolding.toLocaleString() + '股' : '清仓';
                }

                if (afterCpsEl) {
                    afterCpsEl.textContent = afterHolding > 0 ? '成本 ¥' + afterCps.toFixed(3) : '--';
                }

                if (afterDpsEl) {
                    afterDpsEl.textContent = afterHolding > 0 ? '摊薄 ¥' + afterDps.toFixed(3) : '--';
                }
            } else {
                if (amountMoneyEl) amountMoneyEl.textContent = '--';
                if (profitEl) {
                    profitEl.className = 'sp-result-value';
                    profitEl.textContent = '--';
                }
                if (rateEl) {
                    rateEl.className = 'sp-result-value';
                    rateEl.textContent = '--';
                }
                if (afterHoldingEl) afterHoldingEl.textContent = '--';
                if (afterCpsEl) afterCpsEl.textContent = '--';
                if (afterDpsEl) afterDpsEl.textContent = '--';
            }
        };

        if (priceInput) {
            priceInput.addEventListener('input', calculateSellPrediction);
        }

        if (amountInput) {
            amountInput.addEventListener('input', calculateSellPrediction);
        }
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
    },

    /**
     * 平滑刷新（保持滚动位置，无闪烁）
     */
    async refresh() {
        if (!this.currentStockCode) return;
        
        // 保存当前滚动位置
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        
        // 重新加载股票数据
        await this.loadStock(this.currentStockCode);
        
        // 只有当滚动位置大于0时才恢复（避免覆盖Router的滚动位置恢复）
        if (scrollTop > 0) {
            // 使用多次requestAnimationFrame确保DOM完全渲染
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // 强制设置滚动位置（不使用smooth，避免动画）
                    window.scrollTo(0, scrollTop);
                });
            });
        }
    }
};


        
        // 挂载到命名空间
StockProfitCalculator.Detail = Detail;

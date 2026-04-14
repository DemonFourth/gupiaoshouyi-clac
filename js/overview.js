/**
 * 汇总页面模块
 * 负责所有股票的汇总展示
 *
 * 版本: 1.1.0
 * 更新日期: 2026-03-12
 * 修改内容: 使用 DataService 和 EventBus，移除模块间直接调用
 */
const Overview = {
    _domCache: null,  // DOM 缓存
    _chartObserver: null,  // 图表懒加载观察器
    _chartsLoaded: false,  // 图表是否已加载

    // 图表实例管理
    _chartInstances: {
        yearlyChart: null,
        monthlyChart: null
    },

    // 图表 resize 管理
    _chartResizeHandler: null,
    _resizeDebounceTimer: null,

    stockPrices: {},  // 缓存股票价格
    stockSnapshots: {},
    yearlyMonthlyData: {},
    sortState: {
        holding: {
            field: 'change',
            direction: 'desc'
        },
        cleared: {
            field: 'clear-date',
            direction: 'desc'
        }
    },
    viewMode: {
        holding: 'card',  // 持仓中视图模式：card | list
        cleared: 'card'   // 已清仓视图模式：card | list
    },
    cardCols: {
        holding: 4,  // 持仓中卡片列数
        cleared: 4   // 已清仓卡片列数
    },

    /**
     * 初始化 DOM 缓存
     */
    initDOMCache() {
        this._domCache = {
            // 页面头部元素
            backBtn: document.getElementById('backBtn'),
            pageTitle: document.querySelector('h1'),
            stockInfo: document.getElementById('stockInfo'),

            // 搜索框元素
            stockSearchInput: document.getElementById('stockSearchInput'),
            searchResults: document.getElementById('searchResults'),

            // 汇总统计元素
            overviewTotalMarketValue: document.getElementById('overviewTotalMarketValue'),
            overviewTotalHoldingCost: document.getElementById('overviewTotalHoldingCost'),
            overviewTotalProfit: document.getElementById('overviewTotalProfit'),
            overviewTotalReturnRate: document.getElementById('overviewTotalReturnRate'),
            overviewWeeklyProfit: document.getElementById('overviewWeeklyProfit'),
            overviewMonthlyProfit: document.getElementById('overviewMonthlyProfit'),

            // 历史累计统计元素
            overviewTotalInvestment: document.getElementById('overviewTotalInvestment'),
            overviewNetInvestment: document.getElementById('overviewNetInvestment'),
            overviewOverallProfit: document.getElementById('overviewOverallProfit'),
            overviewOverallReturnRate: document.getElementById('overviewOverallReturnRate'),
            overviewTotalFee: document.getElementById('overviewTotalFee'),
            overviewTurnoverRate: document.getElementById('overviewTurnoverRate'),

            // 持仓统计元素
            overviewHoldingCount: document.getElementById('overviewHoldingCount'),
            overviewHoldingCount2: document.getElementById('overviewHoldingCount2'),
            overviewProfitCount: document.getElementById('overviewProfitCount'),
            overviewLossCount: document.getElementById('overviewLossCount'),

            // 清仓统计元素
            overviewClearedCount: document.getElementById('overviewClearedCount'),
            overviewClearedProfitCount: document.getElementById('overviewClearedProfitCount'),
            overviewClearedLossCount: document.getElementById('overviewClearedLossCount'),

            // 排序控制元素
            holdingSortAscBtn: document.getElementById('holdingSortAscBtn'),
            holdingSortDescBtn: document.getElementById('holdingSortDescBtn'),

            // 视图切换元素
            gridIcon: document.querySelector('.view-icon-grid'),
            listIcon: document.querySelector('.view-icon-list'),
            fieldSettingsBtn: document.getElementById('fieldSettingsBtn'),

            // 股票列表容器
            holdingStocksList: document.getElementById('holdingStocksList'),
            clearedStocksList: document.getElementById('clearedStocksList'),

            // 图表容器
            yearlyProfitChart: document.getElementById('yearlyProfitChart'),
            monthlyProfitChart: document.getElementById('monthlyProfitChart')
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
     * 初始化图表懒加载观察器
     */
    _initChartObserver() {
        if (this._chartObserver) return;

        // 创建 IntersectionObserver
        this._chartObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this._chartsLoaded) {
                    this._chartsLoaded = true;
                    this._renderChartsInternal();
                    // 停止观察
                    this._chartObserver.disconnect();
                }
            });
        }, {
            threshold: 0.1,  // 当 10% 可见时触发
            rootMargin: '0px 0px 100px 0px'  // 提前 100px 加载
        });

        // 观察图表容器
        if (this._domCache.yearlyProfitChart) {
            this._chartObserver.observe(this._domCache.yearlyProfitChart);
        }
        if (this._domCache.monthlyProfitChart) {
            this._chartObserver.observe(this._domCache.monthlyProfitChart);
        }
    },

    /**
     * 内部图表渲染方法
     */
    _renderChartsInternal() {
        this.buildAggregatedChartData();
        this.renderYearlyProfitChart();
        this.renderMonthlyProfitChart(this.selectedYear);
    },

    /**
     * 统一管理所有图表的 resize 操作
     */
    _resizeAllCharts() {
        Object.values(this._chartInstances).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
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
     * 初始化汇总页面
     */
    async init() {
        const perfToken = window.Perf ? window.Perf.start('Overview.init') : null;

        // 初始化 DOM 缓存
        this._ensureDOMCache();

        // 隐藏返回按钮
        this._domCache.backBtn.style.display = 'none';

        // 更新页面标题
        this._domCache.pageTitle.textContent = '股票收益计算器';
        this._domCache.stockInfo.textContent = '支持多股票管理 | FIFO先进先出计算';

        // 加载数据（通过 DataService）
        this.stocks = await StockProfitCalculator.DataService.getAllStocks();
        await this.rebuildSnapshots();

        // 渲染汇总统计
        this.renderSummary();

        // 初始化视图模式 UI 状态
        this._initViewModeUI();

        // 初始化卡片列数设置
        this._initCardCols();

        // 渲染股票列表
        this.renderStockLists();
        this.updateSortDirectionUI();

        // 渲染图表
        this.renderCharts();

        // 批量获取股价
        await this.fetchAllStockPrices();

        // 初始化搜索框
        this._initSearch();

        // 初始化字段设置按钮
        this._setupFieldSettingsButton();

        // 监听数据变更事件
        this._setupEventListeners();

        if (window.Perf) window.Perf.end(perfToken);
    },

    /**
     * 设置事件监听器
     */
    _setupEventListeners() {
        const eventBus = StockProfitCalculator.EventBus;
        const DataService = StockProfitCalculator.DataService;
        const StockSnapshot = StockProfitCalculator.StockSnapshot;

        // 监听数据变更
        eventBus.on(eventBus.EventTypes.DATA_CHANGED, () => {
            // 先失效所有缓存，再刷新
            DataService.invalidateAllCache();
            StockSnapshot.clear();
            this.refresh();
        });

        // 监听股票变更
        eventBus.on(eventBus.EventTypes.STOCK_ADDED, () => {
            DataService.invalidateAllCache();
            StockSnapshot.clear();
            this.refresh();
        });

        eventBus.on(eventBus.EventTypes.STOCK_DELETED, () => {
            DataService.invalidateAllCache();
            StockSnapshot.clear();
            this.refresh();
        });

        // 监听交易变更
        eventBus.on(eventBus.EventTypes.TRADE_ADDED, (data) => {
            // 先失效缓存，再刷新
            this._invalidateSnapshot(data.stockCode);
            DataService.invalidateCache(data.stockCode);
            this.refresh();
        });

        eventBus.on(eventBus.EventTypes.TRADE_UPDATED, (data) => {
            this._invalidateSnapshot(data.stockCode);
            DataService.invalidateCache(data.stockCode);
            this.refresh();
        });

        eventBus.on(eventBus.EventTypes.TRADE_DELETED, (data) => {
            this._invalidateSnapshot(data.stockCode);
            DataService.invalidateCache(data.stockCode);
            this.refresh();
        });
    },

    /**
     * 使指定股票的快照失效
     */
    _invalidateSnapshot(stockCode) {
        delete this.stockSnapshots[stockCode];
        StockProfitCalculator.StockSnapshot.invalidate(stockCode);
    },

    /**
     * 刷新页面
     */
    async refresh() {
        // 先使 DataManager 缓存失效，强制重新加载
        StockProfitCalculator.DataManager.invalidateCache();
        
        // 重新加载所有股票数据
        this.stocks = await StockProfitCalculator.DataService.getAllStocks();
        
        // 清空快照缓存
        this.stockSnapshots = {};
        
        this.rebuildSnapshots();
        this.renderSummary();
        this.renderStockLists();
        this.updateSortDirectionUI();
        this.renderCharts();
    },

    async rebuildSnapshots() {
        this.stockSnapshots = {};
        for (const stock of (this.stocks || [])) {
            const snapshot = await StockProfitCalculator.StockSnapshot.getBaseSnapshot(stock.code);
            if (snapshot) {
                this.stockSnapshots[stock.code] = snapshot;
            } else {
                console.error(`[Overview] Failed to build snapshot for stock: ${stock.code}`);
            }
        }
        this.buildAggregatedChartData();
    },

    getStockSnapshot(stock) {
        // 优先使用缓存（同步）
        if (this.stockSnapshots[stock.code]) {
            return StockProfitCalculator.StockSnapshot.attachQuote(
                this.stockSnapshots[stock.code], 
                this.getQuoteInfo(stock.code)
            );
        }
        
        // 缓存不存在，返回完整的空对象结构避免错误
        console.error(`[Overview] Snapshot not found in cache for stock: ${stock.code}`);
        return {
            stockCode: stock.code,
            stock: stock,
            calcResult: {
                sellRecords: [],
                holdingQueue: [],
                holdingDetail: [],
                cycleInfo: {},
                timeSeries: { dates: [], profits: [] }
            },
            summary: {
                currentHolding: 0,
                currentCost: 0,
                totalProfit: 0,
                totalReturnRate: 0,
                totalBuyCost: 0,
                currentCycleProfit: 0,
                currentCycleDividend: 0,
                currentCycleTax: 0
            },
            periodProfit: {
                weeklyProfit: 0,
                monthlyProfit: 0
            },
            totalAllProfit: 0,
            totalAllReturnRate: 0,
            firstBuyDate: null,
            holdingCost: 0,
            holdingInfo: {
                startDate: '--',
                holdingDays: 0
            },
            quote: null,
            marketValue: null,
            holdingProfit: null,
            holdingReturnRate: null,
            cycleProfit: null,
            cycleReturnRate: null,
            costPerShare: 0,
            dilutedCostPerShare: null,
            yearlyStats: [],
            currentPrice: null,
            currentHoldingProfit: null,
            currentHoldingReturnRate: null
        };
    },

    buildAggregatedChartData() {
        const yearlyProfitData = {};
        const monthlyProfitData = {};

        (this.stocks || []).forEach(stock => {
            stock.trades.forEach(trade => {
                const year = trade.date.substring(0, 4);
                const month = trade.date.substring(5, 7);

                if (!yearlyProfitData[year]) {
                    yearlyProfitData[year] = 0;
                }

                if (!monthlyProfitData[year]) {
                    monthlyProfitData[year] = {};
                }
                if (!monthlyProfitData[year][month]) {
                    monthlyProfitData[year][month] = 0;
                }

                if (trade.type === 'dividend') {
                    yearlyProfitData[year] += trade.totalAmount || 0;
                    monthlyProfitData[year][month] += trade.totalAmount || 0;
                } else if (trade.type === 'tax') {
                    yearlyProfitData[year] -= trade.totalAmount || 0;
                    monthlyProfitData[year][month] -= trade.totalAmount || 0;
                }
            });

            const snapshot = this.getStockSnapshot(stock);
            snapshot.calcResult.sellRecords.forEach(sell => {
                const year = sell.date.substring(0, 4);
                const month = sell.date.substring(5, 7);

                if (!yearlyProfitData[year]) {
                    yearlyProfitData[year] = 0;
                }
                yearlyProfitData[year] += sell.profit;

                if (!monthlyProfitData[year]) {
                    monthlyProfitData[year] = {};
                }
                if (!monthlyProfitData[year][month]) {
                    monthlyProfitData[year][month] = 0;
                }
                monthlyProfitData[year][month] += sell.profit;
            });
        });

        this.yearlyProfitData = yearlyProfitData;
        this.yearlyMonthlyData = monthlyProfitData;

        const years = Object.keys(this.yearlyProfitData).sort();
        this.selectedYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear().toString();
    },

    /**
     * 渲染汇总统计
     * 只计算当前持仓的收益，不包含已卖出收益
     */
    renderSummary() {
        this._ensureDOMCache();

        let totalMarketValue = 0;      // 当前持仓总市值
        let totalHoldingCost = 0;      // 当前持仓总成本
        let totalHoldingProfit = 0;    // 当前持仓总收益
        let totalWeeklyProfit = 0;     // 本周收益
        let totalMonthlyProfit = 0;    // 本月收益

        // 历史累计统计
        let totalInvestment = 0;       // 全部投入资金
        let totalSellAmount = 0;       // 总卖出金额
        let totalFee = 0;              // 总手续费
        let overallProfit = 0;         // 整体收益（已实现 + 浮动盈亏）

        // 持仓股票统计数据
        let holdingCount = 0;          // 持仓股票数量
        let profitCount = 0;           // 盈利股票数量
        let lossCount = 0;             // 亏损股票数量
        let stockProfits = [];         // 各股票收益数据

        // 清仓股票统计数据
        let clearedCount = 0;          // 清仓股票数量
        let clearedProfitCount = 0;    // 清仓盈利股票数量
        let clearedLossCount = 0;      // 清仓亏损股票数量
        let clearedStockProfits = [];  // 清仓股票收益数据

        this.stocks.forEach(stock => {
            const quote = this.getQuoteInfo(stock.code);
            const snapshot = this.getStockSnapshot(stock);
            const summary = snapshot.summary;

            totalWeeklyProfit += snapshot.periodProfit.weeklyProfit;
            totalMonthlyProfit += snapshot.periodProfit.monthlyProfit;

            // 计算历史累计统计
            totalInvestment += summary.totalBuyCost || 0;
            totalSellAmount += summary.totalSellAmount || 0;
            totalFee += summary.totalFee || 0;
            if (summary.currentHolding > 0) {
                // 持仓中：使用浮动盈亏（holdingProfit 已包含分红）
                overallProfit += snapshot.holdingProfit || 0;
            } else {
                // 已清仓：使用已实现收益
                overallProfit += summary.totalProfit || 0;
            }

            // 持仓股票统计
            if (summary.currentHolding > 0) {
                holdingCount++;

                // 累计持仓成本
                totalHoldingCost += summary.currentCost;

                // 如果有缓存的股价，计算市值和收益
                if (snapshot.marketValue !== null && snapshot.holdingProfit !== null) {
                    totalMarketValue += snapshot.marketValue;
                    totalHoldingProfit += snapshot.holdingProfit;

                    // 统计盈亏数量
                    if (snapshot.holdingProfit > 0) {
                        profitCount++;
                    } else if (snapshot.holdingProfit < 0) {
                        lossCount++;
                    }

                    // 记录各股票收益
                    stockProfits.push({
                        name: stock.name,
                        code: stock.code,
                        profit: snapshot.holdingProfit,
                        returnRate: (snapshot.holdingProfit / summary.currentCost * 100)
                    });
                }
            }
            // 清仓股票统计（分组为cleared或有交易记录但无持仓）
            else if (stock.group === 'cleared' || (summary.currentHolding === 0 && stock.trades.length > 0)) {
                clearedCount++;
                
                // 清仓股票的收益就是已实现收益
                const clearedProfit = summary.totalProfit;
                
                if (clearedProfit > 0) {
                    clearedProfitCount++;
                } else if (clearedProfit < 0) {
                    clearedLossCount++;
                }

                // 记录清仓股票收益
                clearedStockProfits.push({
                    name: stock.name,
                    code: stock.code,
                    profit: clearedProfit,
                    returnRate: summary.totalReturnRate
                });
            }
        });

        // 计算当前持仓总收益率
        // 收益率 = 收益 / 持仓成本
        const totalReturnRate = totalHoldingCost > 0 
            ? (totalHoldingProfit / totalHoldingCost * 100) 
            : 0;

        // 分离持仓盈利和亏损股票
        const profitStocks = stockProfits.filter(sp => sp.profit > 0)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 5);
        
        const lossStocks = stockProfits.filter(sp => sp.profit < 0)
            .sort((a, b) => a.profit - b.profit)
            .slice(0, 5);

        // 分离清仓盈利和亏损股票
        const clearedProfitStocks = clearedStockProfits.filter(sp => sp.profit > 0)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 5);
        
        const clearedLossStocks = clearedStockProfits.filter(sp => sp.profit < 0)
            .sort((a, b) => a.profit - b.profit)
            .slice(0, 5);

        // 更新UI - 基础数据
        this._domCache.overviewTotalMarketValue.textContent = '¥' + totalMarketValue.toFixed(2);
        this._domCache.overviewTotalHoldingCost.textContent = '¥' + totalHoldingCost.toFixed(2);

        const profitElement = this._domCache.overviewTotalProfit;
        profitElement.textContent = '¥' + totalHoldingProfit.toFixed(2);
        profitElement.className = 'osv2-hero-value ' + (totalHoldingProfit >= 0 ? 'profit' : 'loss');

        const returnRateElement = this._domCache.overviewTotalReturnRate;
        returnRateElement.textContent = totalReturnRate.toFixed(3) + '%';
        returnRateElement.className = 'osv2-hero-value ' + (totalReturnRate >= 0 ? 'profit' : 'loss');

        const weeklyProfitElement = this._domCache.overviewWeeklyProfit;
        weeklyProfitElement.textContent = '¥' + totalWeeklyProfit.toFixed(2);
        weeklyProfitElement.className = 'osv2-hero-value ' + (totalWeeklyProfit >= 0 ? 'profit' : 'loss');

        const monthlyProfitElement = this._domCache.overviewMonthlyProfit;
        monthlyProfitElement.textContent = '¥' + totalMonthlyProfit.toFixed(2);
        monthlyProfitElement.className = 'osv2-hero-value ' + (totalMonthlyProfit >= 0 ? 'profit' : 'loss');

        // 更新UI - 历史累计统计（使用大数字格式化，自动添加tooltip）
        const totalInvestmentFmt = Utils.formatLargeNumberWithTooltip(totalInvestment);
        this._domCache.overviewTotalInvestment.textContent = totalInvestmentFmt.display;
        this._domCache.overviewTotalInvestment.title = totalInvestmentFmt.converted ? totalInvestmentFmt.full : '';
        
        const overallProfitElement = this._domCache.overviewOverallProfit;
        const overallProfitFmt = Utils.formatLargeNumberWithTooltip(overallProfit);
        overallProfitElement.textContent = overallProfitFmt.display;
        overallProfitElement.title = overallProfitFmt.converted ? overallProfitFmt.full : '';
        overallProfitElement.className = 'osv2-stat-value ' + (overallProfit >= 0 ? 'profit' : 'loss');

        // 计算衍生指标
        const netInvestment = totalInvestment - totalSellAmount;  // 净投入资金
        const overallReturnRate = totalInvestment > 0 ? (overallProfit / totalInvestment * 100) : 0;  // 整体收益率
        const turnoverRate = totalInvestment > 0 ? (totalSellAmount / totalInvestment * 100) : 0;  // 资金周转率

        // 更新UI - 净投入资金
        const netInvestmentFmt = Utils.formatLargeNumberWithTooltip(netInvestment);
        this._domCache.overviewNetInvestment.textContent = netInvestmentFmt.display;
        this._domCache.overviewNetInvestment.title = netInvestmentFmt.converted ? netInvestmentFmt.full : '';

        // 更新UI - 整体收益率
        const overallReturnRateElement = this._domCache.overviewOverallReturnRate;
        overallReturnRateElement.textContent = overallReturnRate.toFixed(3) + '%';
        overallReturnRateElement.className = 'osv2-stat-value ' + (overallReturnRate >= 0 ? 'profit' : 'loss');

        // 更新UI - 总手续费
        const totalFeeFmt = Utils.formatLargeNumberWithTooltip(totalFee);
        this._domCache.overviewTotalFee.textContent = totalFeeFmt.display;
        this._domCache.overviewTotalFee.title = totalFeeFmt.converted ? totalFeeFmt.full : '';

        // 更新UI - 资金周转率
        this._domCache.overviewTurnoverRate.textContent = turnoverRate.toFixed(3) + '%';

        // 添加点击事件监听：本周收益
        this._setupProfitClickEvent(weeklyProfitElement, 'week');

        // 添加点击事件监听：本月收益
        this._setupProfitClickEvent(monthlyProfitElement, 'month');

        // 更新UI - 持仓股票统计数据
        this._domCache.overviewHoldingCount.textContent = holdingCount + '只';
        if (this._domCache.overviewHoldingCount2) {
            this._domCache.overviewHoldingCount2.textContent = holdingCount + '只';
        }
        this._domCache.overviewProfitCount.textContent = '盈利' + profitCount + '只';
        this._domCache.overviewLossCount.textContent = '亏损' + lossCount + '只';

        // 更新UI - 清仓股票统计数据
        this._domCache.overviewClearedCount.textContent = clearedCount + '只';
        if (this._domCache.overviewClearedProfitCount) {
            this._domCache.overviewClearedProfitCount.textContent = '盈利' + clearedProfitCount + '只';
        }
        if (this._domCache.overviewClearedLossCount) {
            this._domCache.overviewClearedLossCount.textContent = '亏损' + clearedLossCount + '只';
        }

        // 更新持仓中/已清仓标题中的盈利/亏损统计
        const holdingStatsEl = document.getElementById('holdingProfitLossStats');
        if (holdingStatsEl) {
            holdingStatsEl.innerHTML = `<span class="profit-count">盈利${profitCount}只</span><span class="loss-count">亏损${lossCount}只</span>`;
        }
        const clearedStatsEl = document.getElementById('clearedProfitLossStats');
        if (clearedStatsEl) {
            clearedStatsEl.innerHTML = `<span class="profit-count">盈利${clearedProfitCount}只</span><span class="loss-count">亏损${clearedLossCount}只</span>`;
        }

        // 渲染持仓盈利股票列表
        this.renderProfitLossList('profitStockList', profitStocks, true);

        // 渲染持仓亏损股票列表
        this.renderProfitLossList('lossStockList', lossStocks, false);

        // 渲染清仓盈利股票列表
        this.renderProfitLossList('clearedProfitStockList', clearedProfitStocks, true);
        
        // 渲染清仓亏损股票列表
        this.renderProfitLossList('clearedLossStockList', clearedLossStocks, false);
    },

    /**
     * 渲染盈利/亏损股票列表
     */
    renderProfitLossList(containerId, stocks, isProfit) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (stocks.length === 0) {
            container.innerHTML = '<div class="profit-loss-empty">暂无数据</div>';
            return;
        }

        // 使用 DocumentFragment 批量插入，减少 DOM 重排
        const fragment = document.createDocumentFragment();

        stocks.forEach((stock, index) => {
            const item = document.createElement('div');
            item.className = 'profit-loss-item';
            item.onclick = () => {
                StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, {
                    page: 'detail',
                    stockCode: stock.code
                });
            };

            const profitSign = stock.profit >= 0 ? '+' : '';
            const rateSign = stock.returnRate >= 0 ? '+' : '';

            item.innerHTML = `
                <span class="profit-loss-rank">${index + 1}</span>
                <div class="profit-loss-stock">
                    <span class="profit-loss-name" title="${stock.name}">${stock.name}</span>
                    <span class="profit-loss-code">${stock.code}</span>
                </div>
                <div class="profit-loss-stats">
                    <span class="profit-loss-profit ${isProfit ? 'profit' : 'loss'}">
                        ${profitSign}¥${stock.profit.toFixed(2)}
                    </span>
                    <span class="profit-loss-rate ${isProfit ? 'profit' : 'loss'}">
                        ${rateSign}${stock.returnRate.toFixed(2)}%
                    </span>
                </div>
            `;

            fragment.appendChild(item);
        });

        // 一次性将所有项添加到容器
        container.appendChild(fragment);
    },

    /**
     * 渲染股票列表
     */
    renderStockLists() {
        // 按分组分类
        const holdingStocks = this.stocks.filter(s => s.group === 'holding');
        const clearedStocks = this.stocks.filter(s => s.group === 'cleared');

        // 渲染各分组（带排序）
        this.renderStockCards('holdingStocksList', holdingStocks, 'holding');
        this.renderStockCards('clearedStocksList', clearedStocks, 'cleared');
    },

    /**
     * 排序变化处理
     */
    onSortChange(group) {
        const selectId = group === 'holding' ? 'holdingSortSelect' : 'clearedSortSelect';
        const select = document.getElementById(selectId);
        if (select) {
            if (group === 'holding') {
                this.sortState.holding.field = select.value;
                this.updateSortDirectionUI();
            } else {
                this.sortState.cleared.field = select.value;
                this.updateClearedSortDirectionUI();
            }
            this.renderStockLists();
        }
    },

    setHoldingSortDirection(direction) {
        this.sortState.holding.direction = direction;
        this.updateSortDirectionUI();
        this.renderStockLists();
    },

    setClearedSortDirection(direction) {
        this.sortState.cleared.direction = direction;
        this.updateClearedSortDirectionUI();
        this.renderStockLists();
    },

    getSortKey(group) {
        if (group === 'holding') {
            const { field, direction } = this.sortState.holding;
            if (field === 'default') {
                return field;
            }
            return `${field}-${direction}`;
        }

        // 已清仓分组
        if (group === 'cleared') {
            const { field, direction } = this.sortState.cleared;
            return `${field}-${direction}`;
        }

        return 'default';
    },

    updateSortDirectionUI() {
        this._ensureDOMCache();
        const ascBtn = this._domCache.holdingSortAscBtn;
        const descBtn = this._domCache.holdingSortDescBtn;
        if (!ascBtn || !descBtn) return;

        const direction = this.sortState.holding.direction;
        ascBtn.classList.toggle('active', direction === 'asc');
        descBtn.classList.toggle('active', direction === 'desc');
    },

    updateClearedSortDirectionUI() {
        this._ensureDOMCache();
        const ascBtn = document.getElementById('clearedSortAscBtn');
        const descBtn = document.getElementById('clearedSortDescBtn');
        if (!ascBtn || !descBtn) return;

        const direction = this.sortState.cleared.direction;
        ascBtn.classList.toggle('active', direction === 'asc');
        descBtn.classList.toggle('active', direction === 'desc');
    },

    /**
     * 获取股票的排序数据
     */
    getStockSortData(stock) {
        const snapshot = this.getStockSnapshot(stock);

        return {
            stock,
            result: snapshot.calcResult,
            totalProfit: snapshot.totalAllProfit,
            firstBuyDate: snapshot.firstBuyDate,
            holdingCost: snapshot.holdingCost,
            holdingInfo: snapshot.holdingInfo,
            quote: snapshot.quote,
            snapshot
        };
    },

    /**
     * 获取股票行情信息
     */
    getQuoteInfo(code) {
        return this.stockPrices[code] || null;
    },

    /**
     * 格式化当日涨跌信息
     */
    formatDailyChange(quote) {
        if (!quote || quote.change === undefined || quote.changePercent === undefined) {
            return '--';
        }

        const changeSign = quote.change >= 0 ? '+' : '';
        const percentSign = quote.changePercent >= 0 ? '+' : '';
        return `${changeSign}${quote.change.toFixed(2)} (${percentSign}${quote.changePercent.toFixed(2)}%)`;
    },

    /**
     * 获取股票的最近清仓日期
     * @param {Object} stock - 股票对象
     * @returns {string|null} 最近清仓日期（YYYY-MM-DD）或 null
     */
    getClearDate(stock) {
        const snapshot = this.getStockSnapshot(stock);
        const calcResult = snapshot?.calcResult;
        if (!calcResult || !calcResult.cycleInfo) return null;

        // 找到所有清仓交易
        const clearDates = [];
        for (const [tradeId, info] of Object.entries(calcResult.cycleInfo)) {
            if (info.sellType === '清仓') {
                const trade = stock.trades.find(t => t.id === parseInt(tradeId));
                if (trade && trade.date) {
                    clearDates.push(trade.date);
                }
            }
        }

        // 返回最近一次清仓日期（排序后取最后一个）
        if (clearDates.length === 0) return null;
        return clearDates.sort().pop();
    },

    /**
     * 排序股票列表
     */
    sortStocks(stockDataList, sortBy) {
        switch (sortBy) {
            case 'profit-desc': // 收益降序
                return stockDataList.sort((a, b) => b.totalProfit - a.totalProfit);
            case 'profit-asc':  // 收益升序
                return stockDataList.sort((a, b) => a.totalProfit - b.totalProfit);
            case 'return-desc': // 收益率降序
                return stockDataList.sort((a, b) => (b.totalProfit / (b.holdingCost || 1)) - (a.totalProfit / (a.holdingCost || 1)));
            case 'return-asc':  // 收益率升序
                return stockDataList.sort((a, b) => (a.totalProfit / (a.holdingCost || 1)) - (b.totalProfit / (b.holdingCost || 1)));
            case 'market-value-desc': // 持仓市值降序
                return stockDataList.sort((a, b) => (b.snapshot?.marketValue || 0) - (a.snapshot?.marketValue || 0));
            case 'market-value-asc':  // 持仓市值升序
                return stockDataList.sort((a, b) => (a.snapshot?.marketValue || 0) - (b.snapshot?.marketValue || 0));
            case 'holding-days-desc': // 持仓天数降序
                return stockDataList.sort((a, b) => (b.holdingInfo?.holdingDays || 0) - (a.holdingInfo?.holdingDays || 0));
            case 'holding-days-asc':  // 持仓天数升序
                return stockDataList.sort((a, b) => (a.holdingInfo?.holdingDays || 0) - (b.holdingInfo?.holdingDays || 0));
            case 'change-desc': // 当日涨幅降序
                return stockDataList.sort((a, b) => ((b.snapshot?.quote?.changePercent) ?? -Infinity) - ((a.snapshot?.quote?.changePercent) ?? -Infinity));
            case 'change-asc':  // 当日涨幅升序
                return stockDataList.sort((a, b) => ((a.snapshot?.quote?.changePercent) ?? Infinity) - ((b.snapshot?.quote?.changePercent) ?? Infinity));
            case 'first-buy-asc':   // 建仓时间升序（早的在前）
                return stockDataList.sort((a, b) => {
                    if (!a.firstBuyDate) return 1;
                    if (!b.firstBuyDate) return -1;
                    return a.firstBuyDate.localeCompare(b.firstBuyDate);
                });
            case 'first-buy-desc':  // 建仓时间降序（晚的在前）
                return stockDataList.sort((a, b) => {
                    if (!a.firstBuyDate) return 1;
                    if (!b.firstBuyDate) return -1;
                    return b.firstBuyDate.localeCompare(a.firstBuyDate);
                });
            case 'cost-desc':   // 持仓成本降序
                return stockDataList.sort((a, b) => b.holdingCost - a.holdingCost);
            case 'cost-asc':    // 持仓成本升序
                return stockDataList.sort((a, b) => a.holdingCost - b.holdingCost);
            // 已清仓专属排序选项
            case 'clear-date-desc':   // 清仓日期降序（最近清仓在前）
                return stockDataList.sort((a, b) => {
                    const aClearDate = this.getClearDate(a.stock);
                    const bClearDate = this.getClearDate(b.stock);
                    if (!aClearDate) return 1;
                    if (!bClearDate) return -1;
                    return bClearDate.localeCompare(aClearDate);
                });
            case 'clear-date-asc':   // 清仓日期升序（最早清仓在前）
                return stockDataList.sort((a, b) => {
                    const aClearDate = this.getClearDate(a.stock);
                    const bClearDate = this.getClearDate(b.stock);
                    if (!aClearDate) return 1;
                    if (!bClearDate) return -1;
                    return aClearDate.localeCompare(bClearDate);
                });
            default:
                return stockDataList;
        }
    },

    /**
     * 初始化视图模式 UI 状态
     */
    _initViewModeUI() {
        this._ensureDOMCache();

        // 更新悬浮视图切换按钮图标（使用持仓中的状态）
        const floatBtn = document.getElementById('viewModeFloatBtn');
        if (floatBtn) {
            const gridIcon = floatBtn.querySelector('.view-icon-grid');
            const listIcon = floatBtn.querySelector('.view-icon-list');
            if (gridIcon && listIcon) {
                if (this.viewMode.holding === 'list') {
                    gridIcon.style.display = 'none';
                    listIcon.style.display = 'inline';
                } else {
                    gridIcon.style.display = 'inline';
                    listIcon.style.display = 'none';
                }
            }
        }

        // 分别更新持仓中和已清仓的容器样式
        const holdingContainer = this._domCache.holdingStocksList;
        const clearedContainer = this._domCache.clearedStocksList;

        if (holdingContainer) {
            if (this.viewMode.holding === 'list') {
                holdingContainer.classList.add('list-mode');
                holdingContainer.classList.remove('cols-2', 'cols-3', 'cols-4');
            } else {
                holdingContainer.classList.remove('list-mode');
                holdingContainer.classList.add(`cols-${this.cardCols.holding}`);
            }
        }

        if (clearedContainer) {
            if (this.viewMode.cleared === 'list') {
                clearedContainer.classList.add('list-mode');
                clearedContainer.classList.remove('cols-2', 'cols-3', 'cols-4');
            } else {
                clearedContainer.classList.remove('list-mode');
                clearedContainer.classList.add(`cols-${this.cardCols.cleared}`);
            }
        }

        // 更新列数按钮显示状态和 active 状态
        ['holding', 'cleared'].forEach(group => {
            const colsGroupId = group === 'holding' ? 'holdingColsGroup' : 'clearedColsGroup';
            const colsGroup = document.getElementById(colsGroupId);
            if (colsGroup) {
                colsGroup.style.display = this.viewMode[group] === 'card' ? 'inline-flex' : 'none';
                // 更新列数按钮的 active 状态
                colsGroup.querySelectorAll('.card-cols-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.cols) === this.cardCols[group]);
                });
            }
        });
    },

    /**
     * 切换视图模式（同时切换持仓中和已清仓）
     */
    toggleViewMode() {
        // 计算新的视图模式（统一切换两个分组）
        const newMode = this.viewMode.holding === 'card' ? 'list' : 'card';
        this.viewMode.holding = newMode;
        this.viewMode.cleared = newMode;

        // 更新悬浮按钮图标
        const floatBtn = document.getElementById('viewModeFloatBtn');
        if (floatBtn) {
            const gridIcon = floatBtn.querySelector('.view-icon-grid');
            const listIcon = floatBtn.querySelector('.view-icon-list');
            if (gridIcon && listIcon) {
                if (newMode === 'list') {
                    gridIcon.style.display = 'none';
                    listIcon.style.display = 'inline';
                } else {
                    gridIcon.style.display = 'inline';
                    listIcon.style.display = 'none';
                }
            }
        }

        // 更新两个分组的容器样式和列数按钮
        ['holding', 'cleared'].forEach(group => {
            const containerId = group === 'holding' ? 'holdingStocksList' : 'clearedStocksList';
            const container = document.getElementById(containerId);
            if (container) {
                if (newMode === 'list') {
                    container.classList.add('list-mode');
                } else {
                    container.classList.remove('list-mode');
                }
            }

            // 更新布局选择按钮显示状态（仅在卡片视图时显示）
            const colsGroupId = group === 'holding' ? 'holdingColsGroup' : 'clearedColsGroup';
            const colsGroup = document.getElementById(colsGroupId);
            if (colsGroup) {
                colsGroup.style.display = newMode === 'card' ? 'inline-flex' : 'none';
            }
        });

        // 重新渲染两个分组
        const holdingStocks = this.stocks.filter(s => s.group === 'holding');
        const clearedStocks = this.stocks.filter(s => s.group === 'cleared');
        this.renderStockCards('holdingStocksList', holdingStocks, 'holding');
        this.renderStockCards('clearedStocksList', clearedStocks, 'cleared');
    },

    /**
     * 切换卡片列数
     */
    toggleCardCols(group, cols) {
        const containerId = group === 'holding' ? 'holdingStocksList' : 'clearedStocksList';
        const container = document.getElementById(containerId);
        
        if (container) {
            // 移除所有列数类
            container.classList.remove('cols-2', 'cols-3', 'cols-4');
            // 添加新的列数类
            container.classList.add(`cols-${cols}`);
        }

        // 更新按钮状态
        const colsGroupId = group === 'holding' ? 'holdingColsGroup' : 'clearedColsGroup';
        const colsGroup = document.getElementById(colsGroupId);
        if (colsGroup) {
            colsGroup.querySelectorAll('.card-cols-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cols === String(cols));
            });
        }

        // 保存到配置
        if (StockProfitCalculator.Config) {
            const configPath = `ui.preferences.cardCols.${group}`;
            StockProfitCalculator.Config.set(configPath, cols);
            StockProfitCalculator.Config.save();
        }
    },

    /**
     * 初始化卡片列数设置
     */
    _initCardCols() {
        // 初始化列数配置
        this.cardCols = { holding: 2, cleared: 2 };
        
        // 从配置加载
        if (StockProfitCalculator.Config) {
            const holdingCols = StockProfitCalculator.Config.get('ui.preferences.cardCols.holding', 2);
            const clearedCols = StockProfitCalculator.Config.get('ui.preferences.cardCols.cleared', 2);
            this.cardCols.holding = holdingCols;
            this.cardCols.cleared = clearedCols;
        }

        // 应用列数到容器
        ['holding', 'cleared'].forEach(group => {
            const containerId = group === 'holding' ? 'holdingStocksList' : 'clearedStocksList';
            const container = document.getElementById(containerId);
            if (container) {
                container.classList.add(`cols-${this.cardCols[group]}`);
            }

            // 更新按钮状态
            const colsGroupId = group === 'holding' ? 'holdingColsGroup' : 'clearedColsGroup';
            const colsGroup = document.getElementById(colsGroupId);
            if (colsGroup) {
                colsGroup.querySelectorAll('.card-cols-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.cols === String(this.cardCols[group]));
                });
            }
        });
    },

    /**
     * 渲染股票卡片
     */
    renderStockCards(containerId, stocks, group) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (stocks.length === 0) {
            container.innerHTML = '<div class="empty-hint">暂无股票</div>';
            return;
        }

        // 获取排序数据
        const stockDataList = stocks.map(stock => this.getStockSortData(stock));

        // 排序
        const sortBy = this.getSortKey(group);
        this.sortStocks(stockDataList, sortBy);

        // 设置容器列数类
        container.classList.remove('cols-2', 'cols-3', 'cols-4');
        if (this.viewMode[group] === 'card') {
            container.classList.add(`cols-${this.cardCols[group]}`);
        }

        // 使用 DocumentFragment 批量插入，减少 DOM 重排
        const fragment = document.createDocumentFragment();

        stockDataList.forEach(data => {
            const card = this.createStockCard(data.stock, data.result, data.snapshot, group);
            fragment.appendChild(card);
        });

        // 一次性将所有卡片添加到容器
        container.appendChild(fragment);
        
        // 如果是列表视图，调整缩放以防止溢出
        const currentViewMode = this.viewMode[group] || 'list';
        if (currentViewMode === 'list') {
            this._adjustListCardScale(container);
        }

        // 动态绑定卡片视图中的按钮事件
        container.querySelectorAll('.stock-card-action-edit').forEach(btn => {
            const stockCode = btn.dataset.stockCode;
            btn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.editStock(stockCode);
            };
        });

        container.querySelectorAll('.stock-card-action-delete').forEach(btn => {
            const stockCode = btn.dataset.stockCode;
            btn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.deleteStock(stockCode);
            };
        });

        // 绑定轮次点击事件（显示历史弹窗）
        container.querySelectorAll('.stock-card-cycle-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const stockCode = item.dataset.stockCode;
                this.showCycleHistoryModal(stockCode);
            };
        });
    },

    /**
     * 创建股票卡片
     */
    createStockCard(stock, result, snapshot = null, group = 'holding') {
        // 根据分组和视图模式选择创建方式
        const currentViewMode = this.viewMode[group] || 'list';
        if (currentViewMode === 'list') {
            return this.createListCard(stock, result, snapshot, group);
        }
        return this.createGridCard(stock, result, snapshot, group);
    },

    /**
     * 创建方框卡片（原样式）
     */
    createGridCard(stock, result, snapshot = null, group = 'holding') {
        const card = document.createElement('div');
        
        snapshot = snapshot || this.getStockSnapshot(stock);
        const summary = snapshot.summary;
        const quote = snapshot.quote;
        const holdingInfo = snapshot.holdingInfo;
        const marketValue = snapshot.marketValue;
        const holdingProfit = snapshot.holdingProfit;
        const holdingReturnRate = snapshot.holdingReturnRate;
        const cycleProfit = snapshot.cycleProfit;
        const cycleReturnRate = snapshot.cycleReturnRate;
        const costPerShare = snapshot.costPerShare;
        const dilutedCostPerShare = snapshot.dilutedCostPerShare;
        const totalAllProfit = snapshot.totalAllProfit;
        const totalAllReturnRate = snapshot.totalAllReturnRate;
        const cycleHistory = snapshot.cycleHistory || [];
        const currentCycleNumber = snapshot.currentCycleNumber;
        const yearlyStats = snapshot.yearlyStats || [];

        // 获取字段显示配置
        const fields = this._getFieldPreferences('card', group);

        // 判断盈亏状态（持仓中基于周期收益，已清仓基于总收益）
        const isCleared = group === 'cleared';
        const isProfit = isCleared 
            ? totalAllProfit >= 0 
            : (cycleProfit !== null ? cycleProfit : 0) >= 0;
        card.className = `stock-card-v2 ${isProfit ? 'is-profit' : 'is-loss'}`;

        // 当日涨跌
        const dailyChangeValue = quote ? quote.change : null;
        const dailyBadgeClass = dailyChangeValue !== null && dailyChangeValue >= 0 ? 'up' : 'down';
        const dailyBadgeText = this.formatDailyChange(quote);

        // 格式化核心收益显示（持仓中：当前持仓周期收益；已清仓：总收益）
        let profitDisplay, returnRateDisplay, cycleProfitFmtMain;
        if (isCleared) {
            // 已清仓：显示总收益
            cycleProfitFmtMain = Utils.formatLargeNumberWithTooltip(totalAllProfit);
            profitDisplay = (totalAllProfit >= 0 ? '+' : '') + cycleProfitFmtMain.display;
            returnRateDisplay = (totalAllReturnRate >= 0 ? '+' : '') + totalAllReturnRate.toFixed(2) + '%';
        } else {
            // 持仓中：显示当前持仓周期收益
            const displayCycleProfit = cycleProfit !== null ? cycleProfit : 0;
            const displayCycleReturnRate = cycleReturnRate !== null ? cycleReturnRate : 0;
            cycleProfitFmtMain = Utils.formatLargeNumberWithTooltip(displayCycleProfit);
            profitDisplay = (displayCycleProfit >= 0 ? '+' : '') + cycleProfitFmtMain.display;
            returnRateDisplay = (displayCycleReturnRate >= 0 ? '+' : '') + displayCycleReturnRate.toFixed(2) + '%';
        }

        // 格式化周期收益（用于数据列显示）
        const cycleProfitFmt = cycleProfit !== null ? Utils.formatLargeNumberWithTooltip(cycleProfit) : null;
        const cycleProfitDisplay = cycleProfitFmt ? (cycleProfit >= 0 ? '+' : '') + cycleProfitFmt.display : '--';
        const cycleReturnRateDisplay = cycleReturnRate !== null ? (cycleReturnRate >= 0 ? '+' : '') + cycleReturnRate.toFixed(2) + '%' : '--';

        // 格式化市值和成本
        const mvFmt = marketValue !== null ? Utils.formatLargeNumberWithTooltip(marketValue) : null;
        const mvDisplay = mvFmt ? mvFmt.display : '--';
        const costFmt = Utils.formatLargeNumberWithTooltip(summary.currentCost);

        // 动态生成数据列
        const generateColItems = (items) => {
            return items.filter(item => item.visible !== false).map(item => item.html).join('');
        };

        // 持仓列
        const positionItems = [
            { visible: fields.holding?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">持仓股数</span><span class="sc-col-value">${summary.currentHolding}股</span></div>` },
            { visible: fields.marketValue?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">持仓市值</span><span class="sc-col-value" ${mvFmt && mvFmt.converted ? 'title="' + mvFmt.full + '"' : ''}>${mvDisplay}</span></div>` },
            { visible: fields.cost?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">持仓成本</span><span class="sc-col-value" ${costFmt.converted ? 'title="' + costFmt.full + '"' : ''}>${costFmt.display}</span></div>` }
        ];

        // 价格列
        const priceItems = [
            { visible: fields.currentPrice?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">当日股价</span><span class="sc-col-value">${quote ? '¥' + quote.price.toFixed(2) : '--'}</span></div>` },
            { visible: fields.costPerShare?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">每股持仓成本</span><span class="sc-col-value">¥${costPerShare.toFixed(2)}</span></div>` },
            { visible: fields.dilutedCostPerShare?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">每股摊薄成本</span><span class="sc-col-value">${dilutedCostPerShare !== null ? '¥' + dilutedCostPerShare.toFixed(2) : '--'}</span></div>` }
        ];

        // 收益列（显示总收益和总收益率）
        const totalProfitFmtCol = Utils.formatLargeNumberWithTooltip(totalAllProfit);
        const totalProfitDisplay = (totalAllProfit >= 0 ? '+' : '') + totalProfitFmtCol.display;
        const totalReturnRateDisplay = (totalAllReturnRate >= 0 ? '+' : '') + totalAllReturnRate.toFixed(2) + '%';
        const profitItems = [
            { visible: fields.totalProfit?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">总收益</span><span class="sc-col-value ${totalAllProfit >= 0 ? 'profit' : 'loss'}" ${totalProfitFmtCol.converted ? 'title="' + totalProfitFmtCol.full + '"' : ''}>${totalProfitDisplay}</span></div>` },
            { visible: fields.totalReturnRate?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">总收益率</span><span class="sc-col-value ${totalAllReturnRate >= 0 ? 'profit' : 'loss'}">${totalReturnRateDisplay}</span></div>` }
        ];

        // 周期列（带点击历史功能）
        const clearDate = this.getClearDate(stock);
        
        // 已清仓股票从最后一轮周期获取持仓开始和天数
        let displayStartDate = holdingInfo.startDate;
        let displayHoldingDays = holdingInfo.holdingDays;
        if (isCleared && cycleHistory.length > 0) {
            const lastCycle = cycleHistory[cycleHistory.length - 1];
            if (lastCycle) {
                displayStartDate = lastCycle.startDate || displayStartDate;
                displayHoldingDays = lastCycle.days !== undefined ? lastCycle.days : displayHoldingDays;
            }
        }
        
        const cycleItems = [
            { visible: true, html: `<div class="sc-col-item sc-col-cycle-link" data-stock-code="${stock.code}"><span class="sc-col-label">持仓轮次</span><span class="sc-col-value">${currentCycleNumber !== null ? '第' + currentCycleNumber + '轮' : (isCleared && cycleHistory.length > 0 ? '共' + cycleHistory.length + '轮' : '--')}</span></div>` },
            { visible: fields.holdingStartDate?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">持仓开始</span><span class="sc-col-value">${displayStartDate || '--'}</span></div>` },
            { visible: fields.holdingDays?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">持仓天数</span><span class="sc-col-value">${displayHoldingDays !== undefined && displayHoldingDays !== null ? displayHoldingDays + '天' : '--'}</span></div>` },
            { visible: fields.clearDate?.visible, html: `<div class="sc-col-item"><span class="sc-col-label">清仓日期</span><span class="sc-col-value">${clearDate || '--'}</span></div>` }
        ];

        // 判断是否有可见内容
        const hasPosition = positionItems.some(i => i.visible);
        const hasPrice = priceItems.some(i => i.visible);
        const hasProfit = profitItems.some(i => i.visible);
        const hasCycle = cycleItems.some(i => i.visible);

        card.innerHTML = `
            <div class="sc-header">
                <span class="sc-name sc-name-clickable" data-stock-code="${stock.code}">${stock.name}</span>
                <span class="sc-code">${stock.code}</span>
                ${dailyChangeValue !== null ? `<span class="sc-daily-badge ${dailyBadgeClass}">${dailyBadgeText}</span>` : ''}
            </div>
            <div class="sc-main">
                <div class="sc-profit-value ${isProfit ? 'profit' : 'loss'}" ${cycleProfitFmtMain.converted ? 'title="' + cycleProfitFmtMain.full + '"' : ''}>${profitDisplay}</div>
                <div class="sc-profit-rate ${isProfit ? 'profit' : 'loss'}">${returnRateDisplay}</div>
            </div>
            <div class="sc-data">
                ${hasPosition ? `<div class="sc-col">${generateColItems(positionItems)}</div>` : ''}
                ${hasPrice ? `<div class="sc-col">${generateColItems(priceItems)}</div>` : ''}
                ${hasProfit ? `<div class="sc-col">${generateColItems(profitItems)}</div>` : ''}
                ${hasCycle ? `<div class="sc-col">${generateColItems(cycleItems)}</div>` : ''}
            </div>
            ${fields.yearlyStats?.visible && yearlyStats.length > 0 ? `
            <div class="sc-yearly" data-count="${yearlyStats.length}">
                ${yearlyStats.slice(0, 3).map(ys => `
                    <div class="sc-yearly-item">
                        <span class="sc-yearly-year">${ys.year}年</span>
                        <span class="sc-yearly-profit ${ys.profit >= 0 ? 'profit' : 'loss'}">${ys.profit >= 0 ? '+' : ''}¥${ys.profit.toFixed(0)}</span>
                        <span class="sc-yearly-trades">${ys.trades}次</span>
                    </div>
                `).join('')}
                ${yearlyStats.length > 3 ? yearlyStats.slice(3).map(ys => `
                    <div class="sc-yearly-item sc-yearly-hidden">
                        <span class="sc-yearly-year">${ys.year}年</span>
                        <span class="sc-yearly-profit ${ys.profit >= 0 ? 'profit' : 'loss'}">${ys.profit >= 0 ? '+' : ''}¥${ys.profit.toFixed(0)}</span>
                        <span class="sc-yearly-trades">${ys.trades}次</span>
                    </div>
                `).join('') : ''}
                ${yearlyStats.length > 3 ? `
                    <button class="sc-yearly-more" data-action="toggle-yearly">
                        <span class="sc-yearly-more-text">查看更多 ${yearlyStats.length - 3} 年</span>
                        <svg class="sc-yearly-more-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            ` : ''}
            <div class="sc-actions">
                <button class="sc-action-btn" title="删除股票" data-action="delete" data-stock-code="${stock.code}">🗑</button>
            </div>
        `;

        // 绑定股票名称点击事件（跳转详情页）
        const nameEl = card.querySelector('.sc-name-clickable');
        if (nameEl) {
            nameEl.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, {
                    page: 'detail',
                    stockCode: stock.code
                });
            };
        }

        // 绑定删除按钮事件
        const deleteBtn = card.querySelector('.sc-action-btn[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.deleteStock(stock.code);
            };
        }

        // 绑定年度统计"查看更多"按钮事件
        const yearlyMoreBtn = card.querySelector('.sc-yearly-more');
        if (yearlyMoreBtn) {
            yearlyMoreBtn.onclick = (e) => {
                e.stopPropagation();
                const yearlyContainer = yearlyMoreBtn.closest('.sc-yearly');
                const isExpanded = yearlyContainer.classList.toggle('expanded');
                const textEl = yearlyMoreBtn.querySelector('.sc-yearly-more-text');
                const iconEl = yearlyMoreBtn.querySelector('.sc-yearly-more-icon');
                const hiddenCount = yearlyContainer.querySelectorAll('.sc-yearly-hidden').length;
                
                if (isExpanded) {
                    textEl.textContent = '收起';
                    iconEl.style.transform = 'rotate(180deg)';
                } else {
                    textEl.textContent = `查看更多 ${hiddenCount} 年`;
                    iconEl.style.transform = 'rotate(0deg)';
                }
            };
        }

        // 绑定持仓周期点击事件
        const cycleLink = card.querySelector('.sc-col-cycle-link');
        if (cycleLink && cycleHistory.length > 0) {
            cycleLink.onclick = (e) => {
                e.stopPropagation();
                this._showCycleHistoryModal(stock, cycleHistory, snapshot);
            };
        }

        return card;
    },

    /**
     * 显示持仓周期历史弹窗
     * @param {Object} stock - 股票信息
     * @param {Array} cycleHistory - 周期历史数据
     * @param {Object} snapshot - 快照数据（可选，用于获取浮动盈亏）
     */
    _showCycleHistoryModal(stock, cycleHistory, snapshot = null) {
        const modal = document.getElementById('cycleHistoryModal');
        const content = document.getElementById('cycleHistoryContent');
        const title = document.getElementById('cycleHistoryTitle');
        
        if (!modal || !content || !title) return;
        
        title.textContent = `${stock.name}(${stock.code}) - 持仓周期历史`;
        
        // 使用通用渲染函数
        StockProfitCalculator.renderCycleHistoryList({
            cycleHistory: cycleHistory,
            container: content,
            holdingProfit: snapshot ? snapshot.holdingProfit : null,
            totalAllProfit: snapshot ? snapshot.totalAllProfit : null,
            showClearPrice: false  // 弹窗不显示清仓股价
        });
        
        modal.style.display = 'flex';
        
        // 绑定关闭按钮
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }
        
        // 点击遮罩关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    },

    /**
     * 创建列表卡片（横向布局）
     */
    createListCard(stock, result, snapshot = null, group = 'holding') {
        const card = document.createElement('div');
        
        snapshot = snapshot || this.getStockSnapshot(stock);
        const summary = snapshot.summary;
        const quote = snapshot.quote;
        const holdingInfo = snapshot.holdingInfo;
        const marketValue = snapshot.marketValue;
        const cycleProfit = snapshot.cycleProfit;
        const cycleReturnRate = snapshot.cycleReturnRate;
        const totalAllProfit = snapshot.totalAllProfit;
        const totalAllReturnRate = snapshot.totalAllReturnRate;
        const costPerShare = snapshot.costPerShare;
        const dilutedCostPerShare = snapshot.dilutedCostPerShare;
        const cycleHistory = snapshot.cycleHistory || [];
        const currentCycleNumber = snapshot.currentCycleNumber;

        const isCleared = summary.currentHolding === 0;
        const isHolding = !isCleared;

        // 获取字段显示配置
        const fields = this._getFieldPreferences('list', group);

        // ===== 计算核心收益显示 =====
        let displayProfit, displayReturnRate;
        let profitValueClass, profitRateClass;
        
        if (isCleared) {
            // 已清仓：显示总收益
            displayProfit = totalAllProfit;
            displayReturnRate = totalAllReturnRate;
        } else {
            // 持仓中：显示当前持仓周期收益
            displayProfit = cycleProfit !== null ? cycleProfit : 0;
            displayReturnRate = cycleReturnRate !== null ? cycleReturnRate : 0;
        }
        
        profitValueClass = displayProfit >= 0 ? 'profit' : 'loss';
        profitRateClass = displayReturnRate >= 0 ? 'profit' : 'loss';
        
        const profitFmt = Utils.formatLargeNumberWithTooltip(displayProfit);
        const profitDisplay = (displayProfit >= 0 ? '+' : '') + profitFmt.display;
        const rateDisplay = (displayReturnRate >= 0 ? '+' : '') + displayReturnRate.toFixed(2) + '%';

        // ===== 设置卡片类名 =====
        let cardClass = 'stock-card-list-v2';
        if (displayProfit > 0) cardClass += ' is-profit';
        else if (displayProfit < 0) cardClass += ' is-loss';
        if (isCleared) cardClass += ' is-cleared';
        card.className = cardClass;

        // ===== 构建字段项 =====
        const fieldItems = [];
        
        // 持仓股数
        if (fields.holding?.visible && isHolding) {
            fieldItems.push({
                label: '持仓',
                value: summary.currentHolding + '股',
                valueClass: ''
            });
        }
        
        // 持仓市值
        if (fields.marketValue?.visible && isHolding) {
            const mvFmt = marketValue !== null ? Utils.formatLargeNumberWithTooltip(marketValue) : null;
            fieldItems.push({
                label: '市值',
                value: mvFmt ? mvFmt.display : '--',
                title: mvFmt && mvFmt.converted ? mvFmt.full : '',
                valueClass: ''
            });
        }
        
        // 持仓成本
        if (fields.cost?.visible && isHolding) {
            const costFmt = Utils.formatLargeNumberWithTooltip(summary.currentCost);
            fieldItems.push({
                label: '成本',
                value: costFmt.display,
                title: costFmt.converted ? costFmt.full : '',
                valueClass: ''
            });
        }
        
        // 建仓日（持仓中）
        if (fields.startDate?.visible && isHolding) {
            fieldItems.push({
                label: '建仓日',
                value: holdingInfo.startDate || '--',
                valueClass: ''
            });
        }
        
        // 持仓开始（已清仓）
        if (fields.holdingStartDate?.visible && isCleared) {
            let displayStartDate = '--';
            if (cycleHistory.length > 0) {
                const lastCycle = cycleHistory[cycleHistory.length - 1];
                if (lastCycle && lastCycle.startDate) {
                    displayStartDate = lastCycle.startDate;
                }
            }
            fieldItems.push({
                label: '持仓开始',
                value: displayStartDate,
                valueClass: ''
            });
        }
        
        // 持仓天数
        if (fields.holdingDays?.visible) {
            let displayDays = holdingInfo.holdingDays;
            if (isCleared && cycleHistory.length > 0) {
                const lastCycle = cycleHistory[cycleHistory.length - 1];
                if (lastCycle && lastCycle.days !== undefined) {
                    displayDays = lastCycle.days;
                }
            }
            fieldItems.push({
                label: '持仓天数',
                value: displayDays !== undefined && displayDays !== null ? displayDays + '天' : '--',
                valueClass: ''
            });
        }
        
        // 现价
        if (fields.currentPrice?.visible) {
            fieldItems.push({
                label: '现价',
                value: quote ? '¥' + quote.price.toFixed(3) : '--',
                valueClass: ''
            });
        }
        
        // 当日涨幅
        if (fields.dailyChange?.visible) {
            fieldItems.push({
                label: '涨幅',
                value: this.formatDailyChange(quote),
                valueClass: quote && quote.change >= 0 ? 'profit' : (quote && quote.change < 0 ? 'loss' : '')
            });
        }
        
        // 每股持仓成本
        if (fields.costPerShare?.visible && isHolding) {
            fieldItems.push({
                label: '每股成本',
                value: '¥' + costPerShare.toFixed(3),
                valueClass: ''
            });
        }
        
        // 每股摊薄成本
        if (fields.dilutedCostPerShare?.visible && isHolding) {
            fieldItems.push({
                label: '摊薄成本',
                value: dilutedCostPerShare !== null ? '¥' + dilutedCostPerShare.toFixed(3) : '--',
                valueClass: ''
            });
        }
        
        // 总收益
        if (fields.totalProfit?.visible) {
            const totalProfitFmt = Utils.formatLargeNumberWithTooltip(totalAllProfit);
            fieldItems.push({
                label: '总收益',
                value: (totalAllProfit >= 0 ? '+' : '') + totalProfitFmt.display,
                title: totalProfitFmt.converted ? totalProfitFmt.full : '',
                valueClass: totalAllProfit >= 0 ? 'profit' : 'loss'
            });
        }
        
        // 总收益率
        if (fields.totalReturnRate?.visible) {
            fieldItems.push({
                label: '总收益率',
                value: (totalAllReturnRate >= 0 ? '+' : '') + totalAllReturnRate.toFixed(2) + '%',
                valueClass: totalAllReturnRate >= 0 ? 'profit' : 'loss'
            });
        }
        
        // 清仓日期
        if (fields.clearDate?.visible) {
            const clearDate = this.getClearDate(stock);
            fieldItems.push({
                label: '清仓日期',
                value: clearDate || '--',
                valueClass: ''
            });
        }

        // ===== 渲染字段 HTML =====
        let fieldsHtml = fieldItems.map(item => `
            <div class="scl-item">
                <span class="scl-label">${item.label}</span>
                <span class="scl-value ${item.valueClass}" ${item.title ? 'title="' + item.title + '"' : ''}>${item.value}</span>
            </div>
        `).join('');

        // ===== 周期区 =====
        const clearDate = this.getClearDate(stock);
        let cycleRound, cycleDays;
        
        if (isCleared) {
            cycleRound = cycleHistory.length > 0 ? '共' + cycleHistory.length + '轮' : '--';
            cycleDays = clearDate ? '清仓于 ' + clearDate.substring(5) : '--';
        } else {
            cycleRound = currentCycleNumber !== null ? '第' + currentCycleNumber + '轮' : '--';
            cycleDays = holdingInfo.holdingDays !== undefined ? holdingInfo.holdingDays + '天' : '--';
        }

        // ===== 组装 HTML =====
        card.innerHTML = `
            <div class="scl-identity">
                <span class="scl-name scl-name-clickable" data-stock-code="${stock.code}">${stock.name}</span>
                <span class="scl-code">${stock.code}</span>
            </div>
            
            <div class="scl-profit ${profitValueClass}">
                <span class="scl-profit-value ${profitValueClass}" ${profitFmt.converted ? 'title="' + profitFmt.full + '"' : ''}>${profitDisplay}</span>
                <span class="scl-profit-rate ${profitRateClass}">${rateDisplay}</span>
            </div>
            
            ${fieldsHtml ? '<div class="scl-divider"></div>' + fieldsHtml : ''}
            
            <div class="scl-divider"></div>
            
            <div class="scl-cycle">
                <div class="scl-item">
                    <span class="scl-label">轮次</span>
                    <span class="scl-value">${cycleRound}</span>
                </div>
                <div class="scl-item">
                    <span class="scl-label">天数</span>
                    <span class="scl-value">${cycleDays}</span>
                </div>
            </div>
            
            <div class="scl-actions">
                <button class="scl-action-btn scl-action-delete" title="删除股票">🗑</button>
            </div>
        `;

        // 绑定股票名称点击事件（跳转详情页）
        const nameEl = card.querySelector('.scl-name-clickable');
        if (nameEl) {
            nameEl.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, {
                    page: 'detail',
                    stockCode: stock.code
                });
            };
        }

        // 绑定删除按钮事件
        const deleteBtn = card.querySelector('.scl-action-delete');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.deleteStock(stock.code);
            };
        }

        return card;
    },

    /**
     * 调整列表卡片缩放以防止溢出
     * @param {HTMLElement} container - 卡片容器
     */
    _adjustListCardScale(container) {
        const cards = container.querySelectorAll('.stock-card-list-v2');
        if (cards.length === 0) return;
        
        // 获取容器宽度（减去内边距）
        const containerWidth = container.clientWidth;
        
        cards.forEach(card => {
            // 重置缩放以获取真实宽度
            card.style.transform = '';
            card.style.width = '';
            
            // 强制重排以获取准确的 scrollWidth
            const scrollWidth = card.scrollWidth;
            
            // 如果内容超出容器宽度
            if (scrollWidth > containerWidth) {
                // 计算缩放比例，最小 0.8 防止过度缩小
                const scale = Math.max(0.8, containerWidth / scrollWidth);
                card.style.transform = `scale(${scale})`;
                card.style.transformOrigin = 'left center';
                // 调整宽度以补偿缩放后的空间
                card.style.width = `${100 / scale}%`;
            }
        });
    },

    /**
     * 获取年度统计
     */
    /**
     * 渲染图表（使用懒加载）
     */
    renderCharts() {
        this._ensureDOMCache();

        // 如果已经加载过，直接重新渲染
        if (this._chartsLoaded) {
            this._renderChartsInternal();
            return;
        }

        // 初始化观察器并开始懒加载
        this._initChartObserver();
    },

    /**
     * 准备年度数据并确定默认选中年份
     */
    prepareYearlyData() {
        this.buildAggregatedChartData();
    },

    /**
     * 渲染年度收益图表
     */
    renderYearlyProfitChart() {
        this._ensureDOMCache();
        const chartDom = this._domCache.yearlyProfitChart;
        if (!chartDom) return;

        // 销毁旧图表
        if (this.yearlyChart) {
            this.yearlyChart.dispose();
        }
        // 使用 ChartManager.init()，禁用各自的 resize 监听
        this.yearlyChart = StockProfitCalculator.ChartManager.init('overview-yearlyProfitChart', chartDom, null, { bindResize: false });

        const years = Object.keys(this.yearlyProfitData).sort();
        const profits = years.map(y => this.yearlyProfitData[y]);

        const option = {
            title: {
                text: '年度收益统计',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    const sign = data.value >= 0 ? '+' : '';
                    return `${data.name}<br/>收益: ${sign}¥${data.value.toFixed(2)}`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: years.map(y => y + '年')
            },
            yAxis: {
                type: 'value',
                name: '收益(元)',
                axisLabel: { formatter: '¥{value}' }
            },
            series: [{
                name: '年度收益',
                type: 'bar',
                data: profits.map((p, index) => ({
                    value: p,
                    itemStyle: { 
                        color: p >= 0 ? '#f44336' : '#4caf50',
                        // 高亮选中的年份
                        opacity: years[index] === this.selectedYear ? 1 : 0.6,
                        borderWidth: years[index] === this.selectedYear ? 3 : 0,
                        borderColor: '#2196f3'
                    }
                })),
                barWidth: '50%',
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
                }
            }]
        };

        this.yearlyChart.setOption(option);

        // 保存图表实例到统一管理
        this._chartInstances.yearlyChart = this.yearlyChart;

        // 启用统一的 resize 管理
        this._initChartResizeManager();

        // 点击事件：切换年份
        this.yearlyChart.on('click', (params) => {
            if (params.componentType === 'series') {
                const clickedYear = years[params.dataIndex];
                if (clickedYear !== this.selectedYear) {
                    this.selectedYear = clickedYear;
                    // 重新渲染两个图表
                    this.renderYearlyProfitChart();
                    this.renderMonthlyProfitChart(this.selectedYear);
                }
            }
        });
    },

    /**
     * 渲染月度收益图表
     * @param {string} year - 选中的年份
     */
    renderMonthlyProfitChart(year) {
        this._ensureDOMCache();
        const chartDom = this._domCache.monthlyProfitChart;
        if (!chartDom) return;
        if (!this.yearlyMonthlyData || !this.yearlyMonthlyData[year]) {
            this.buildAggregatedChartData();
        }

        // 销毁旧图表
        if (this.monthlyChart) {
            this.monthlyChart.dispose();
        }
        // 使用 ChartManager.init()，禁用各自的 resize 监听
        this.monthlyChart = StockProfitCalculator.ChartManager.init('overview-monthlyProfitChart', chartDom, null, { bindResize: false });

        // 统计指定年份的月度收益
        // 12个月的数据
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthlyData = this.yearlyMonthlyData[year] || {};
        const profits = months.map(m => monthlyData[m] || 0);

        const option = {
            title: {
                text: `${year}年月度收益趋势`,
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0];
                    const sign = data.value >= 0 ? '+' : '';
                    return `${year}年${data.name}<br/>收益: ${sign}¥${data.value.toFixed(2)}`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: months.map(m => m + '月'),
                axisLabel: { rotate: 45 }
            },
            yAxis: {
                type: 'value',
                name: '收益(元)',
                axisLabel: { formatter: '¥{value}' }
            },
            series: [{
                name: '月度收益',
                type: 'line',
                data: profits,
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
                            { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
                            { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
                        ]
                    }
                },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0, lineStyle: { color: '#999', type: 'dashed' } }]
                }
            }]
        };

        this.monthlyChart.setOption(option);

        // 绑定点击事件：点击图表中的数据点，跳转到交易记录查询页面
        this.monthlyChart.on('click', (params) => {
            if (params.componentType === 'series') {
                const monthName = params.name; // 例如 "01月"
                const month = parseInt(monthName.replace('月', '')) - 1;  // 转换为 0-11 的月份索引
                const Router = StockProfitCalculator.Router;
                Router.showTradeRecords(year, month);
            }
        });

        // 保存图表实例到统一管理
        this._chartInstances.monthlyChart = this.monthlyChart;
    },

    /**
     * 批量获取所有股票价格
     */
    async fetchAllStockPrices() {
        // 获取所有股票的股价（包括已清仓），让已清仓股票也能显示"现价"和"涨幅"
        const stocks = this.stocks;

        if (stocks.length === 0) {
            ErrorHandler.showSuccess('刷新完成');
            return;
        }

        // 分批获取，每次最多10个（批量请求可以增加每批数量）
        const batchSize = 10;
        for (let i = 0; i < stocks.length; i += batchSize) {
            const batch = stocks.slice(i, i + batchSize);
            const codes = batch.map(s => s.code);

            try {
                // 使用批量获取
                const quotes = await StockProfitCalculator.StockPriceAPI.fetchPrices(codes);
                
                // 更新股价数据和快照
                for (const stock of batch) {
                    const quote = quotes.get(stock.code);
                    if (quote && Number.isFinite(quote.price)) {
                        this.stockPrices[stock.code] = {
                            price: quote.price,
                            change: quote.change,
                            changePercent: quote.changePercent
                        };
                        
                        const StockSnapshot = StockProfitCalculator.StockSnapshot;
                        if (!this.stockSnapshots[stock.code]) {
                            this.stockSnapshots[stock.code] = await StockSnapshot.getBaseSnapshot(stock);
                        }
                    }
                }
            } catch (error) {
                console.error('批量获取股价失败:', error);
            }
        }

        // 所有股价获取完成后，统一渲染一次
        this.renderSummary();
        this.renderStockLists();

        // 刷新完成提示
        ErrorHandler.showSuccess('刷新完成');
    },

    /**
     * 获取单个股票价格（保留用于详情页等单股票场景）
     */
    async fetchStockPrice(code) {
        try {
            // 使用 StockPriceAPI 获取股价
            const quote = await StockProfitCalculator.StockPriceAPI.fetchPrice(code);
            
            if (quote && Number.isFinite(quote.price)) {
                this.stockPrices[code] = {
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changePercent
                };
                
                const stock = this.stocks.find(s => s.code === code);
                if (stock) {
                    const StockSnapshot = StockProfitCalculator.StockSnapshot;
                    if (!this.stockSnapshots[code]) {
                        this.stockSnapshots[code] = await StockSnapshot.getBaseSnapshot(stock);
                    }
                }
            }
        } catch (error) {
            console.error('获取股价失败:', code, error);
        }
    },

    /**
     * 初始化搜索框
     * @private
     */
    _initSearch() {
        this._ensureDOMCache();
        const searchInput = this._domCache.stockSearchInput;
        const searchResults = this._domCache.searchResults;
        
        // 调试日志
        console.log('搜索框初始化:');
        console.log('searchInput:', searchInput);
        console.log('searchResults:', searchResults);
        
        if (!searchInput || !searchResults) {
            console.error('搜索框元素未找到，无法初始化');
            return;
        }
        
        // 输入事件监听（防抖 200ms，遵循规范）
        this._searchDebounceTimer = null;
        searchInput.addEventListener('input', (e) => {
            if (this._searchDebounceTimer) {
                clearTimeout(this._searchDebounceTimer);
            }
            
            const query = e.target.value.trim();
            
            // 调试日志
            console.log('输入事件触发，query:', query);
            
            if (query.length < 1) {
                searchResults.style.display = 'none';
                return;
            }
            
            this._searchDebounceTimer = setTimeout(() => {
                console.log('执行搜索，query:', query);
                this._performSearch(query);
            }, 200);  // 200ms 防抖
        });
        
        // 点击外部关闭搜索结果
        this._searchClickOutsideHandler = (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.style.display = 'none';
            }
        };
        document.addEventListener('click', this._searchClickOutsideHandler);
        
        // 键盘导航
        searchInput.addEventListener('keydown', (e) => {
            this._handleSearchKeydown(e);
        });
    },

    /**
     * 执行搜索
     * @private
     * @param {string} query - 搜索关键词
     */
    _performSearch(query) {
        this._ensureDOMCache();
        const searchResults = this._domCache.searchResults;
        
        // 检查 DOM 元素是否存在
        if (!searchResults) {
            console.error('搜索结果容器未找到');
            return;
        }
        
        // 使用模块已缓存的股票数据（this.stocks）
        // 在 init() 方法中已经通过 this.stocks = StockProfitCalculator.DataService.getAllStocks() 获取
        const stocks = this.stocks || [];
        
        // 调试日志
        console.log('搜索关键词:', query);
        console.log('股票总数:', stocks.length);
        
        // 模糊搜索：匹配股票代码或名称
        const matches = stocks.filter(stock => {
            const codeMatch = stock.code.toLowerCase().includes(query.toLowerCase());
            const nameMatch = stock.name.toLowerCase().includes(query.toLowerCase());
            return codeMatch || nameMatch;
        });
        
        // 调试日志
        console.log('匹配结果数:', matches.length);
        console.log('匹配结果:', matches);
        
        // 渲染搜索结果
        this._renderSearchResults(matches, query);
    },

    /**
     * 渲染搜索结果
     * @private
     * @param {Array} matches - 匹配的股票列表
     * @param {string} query - 搜索关键词
     */
    _renderSearchResults(matches, query) {
        this._ensureDOMCache();
        const searchResults = this._domCache.searchResults;
        
        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">未找到匹配的股票</div>';
            searchResults.style.display = 'block';
            return;
        }
        
        // 使用 DocumentFragment 批量插入（遵循规范）
        const fragment = document.createDocumentFragment();
        
        matches.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.dataset.stockCode = stock.code;
            
            // 高亮匹配文本
            const highlightedCode = this._highlightText(stock.code, query);
            const highlightedName = this._highlightText(stock.name, query);
            
            item.innerHTML = `
                <span>
                    <span class="search-result-code">${highlightedCode}</span>
                    <span class="search-result-name">${highlightedName}</span>
                </span>
                <span class="search-result-group">${stock.group === 'holding' ? '持仓中' : '已清仓'}</span>
            `;
            
            item.addEventListener('click', () => {
                this._navigateToStock(stock.code);
            });
            
            fragment.appendChild(item);
        });
        
        searchResults.innerHTML = '';
        searchResults.appendChild(fragment);
        searchResults.style.display = 'block';
    },

    /**
     * 高亮匹配文本
     * @private
     * @param {string} text - 原始文本
     * @param {string} query - 搜索关键词
     * @returns {string} 高亮后的文本
     */
    _highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    /**
     * 导航到股票详情页
     * @private
     * @param {string} stockCode - 股票代码
     */
    _navigateToStock(stockCode) {
        this._ensureDOMCache();
        const searchResults = this._domCache.searchResults;
        const searchInput = this._domCache.stockSearchInput;
        
        // 清空搜索框
        searchInput.value = '';
        searchResults.style.display = 'none';
        
        // 使用事件总线导航（遵循规范）
        const EventBus = StockProfitCalculator.EventBus;
        EventBus.emit(EventBus.EventTypes.ROUTE_CHANGE, {
            page: 'detail',
            stockCode: stockCode
        });
    },

    /**
     * 处理搜索框键盘事件
     * @private
     * @param {KeyboardEvent} e - 键盘事件
     */
    _handleSearchKeydown(e) {
        this._ensureDOMCache();
        const searchResults = this._domCache.searchResults;
        const items = searchResults.querySelectorAll('.search-result-item');
        
        if (items.length === 0) return;
        
        // 上下键导航
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const currentIndex = Array.from(items).findIndex(item => 
                item.classList.contains('highlight')
            );
            
            items.forEach(item => item.classList.remove('highlight'));
            
            let newIndex;
            if (e.key === 'ArrowDown') {
                newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            } else {
                newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            }
            
            items[newIndex].classList.add('highlight');
            items[newIndex].scrollIntoView({ block: 'nearest' });
        }
        
        // 回车键选中
        if (e.key === 'Enter') {
            e.preventDefault();
            const highlightedItem = searchResults.querySelector('.search-result-item.highlight');
            if (highlightedItem) {
                const stockCode = highlightedItem.dataset.stockCode;
                this._navigateToStock(stockCode);
            }
        }
        
        // ESC键关闭
        if (e.key === 'Escape') {
            searchResults.style.display = 'none';
        }
    },

    /**
     * 清理资源
     */
    destroy() {
        // 清理搜索相关事件监听器
        if (this._searchClickOutsideHandler) {
            document.removeEventListener('click', this._searchClickOutsideHandler);
            this._searchClickOutsideHandler = null;
        }
        
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }
    },

    /**
     * 设置收益点击事件
     * @private
     * @param {HTMLElement} element - 收益元素
     * @param {string} period - 时间段类型（'week' 或 'month'）
     */
    _setupProfitClickEvent(element, period) {
        // 移除旧的事件监听器（如果存在）
        if (element._profitClickHandler) {
            element.removeEventListener('click', element._profitClickHandler);
        }

        // 添加新的事件监听器
        element._profitClickHandler = () => {
            this._handleProfitClick(period);
        };
        element.addEventListener('click', element._profitClickHandler);
    },

    /**
     * 处理收益点击事件
     * @private
     * @param {string} period - 时间段类型（'week' 或 'month'）
     */
    _handleProfitClick(period) {
        const now = new Date();
        let year, month, startDate, endDate;

        if (period === 'week') {
            // 本周：获取本周的日期范围
            const weekRange = this.getWeekRange(now);
            year = weekRange.start.getFullYear();
            month = weekRange.start.getMonth();
            startDate = weekRange.start;
            endDate = weekRange.end;
            
            console.log('=== 点击本周收益 ===');
            console.log('weekRange:', weekRange);
        } else if (period === 'month') {
            // 本月：获取本月的年份和月份
            year = now.getFullYear();
            month = now.getMonth();
            startDate = null;
            endDate = null;
            
            console.log('=== 点击本月收益 ===');
            console.log('当前时间:', now);
        }

        // 跳转到交易记录查询页面
        const Router = StockProfitCalculator.Router;
        Router.showTradeRecords(year, month, startDate, endDate);
    },

    /**
     * 显示持仓周期历史弹窗
     * @param {string} stockCode - 股票代码
     */
    showCycleHistoryModal(stockCode) {
        // 使用 getStockSnapshot 获取完整快照（含行情数据）
        const stock = this.stocks.find(s => s.code === stockCode);
        if (!stock) return;
        
        const snapshot = this.getStockSnapshot(stock);
        if (!snapshot) return;

        const cycleHistory = snapshot.cycleHistory || [];
        if (cycleHistory.length === 0) {
            StockProfitCalculator.ErrorHandler.showWarning('该股票暂无持仓周期记录');
            return;
        }

        const isHolding = snapshot.summary.currentHolding > 0;
        const hasQuote = snapshot.holdingProfit !== null && Number.isFinite(snapshot.holdingProfit);

        // 计算总收益：如果有行情数据则使用 totalAllProfit，否则只显示已实现收益
        let totalProfit;
        if (snapshot.totalAllProfit !== null && snapshot.totalAllProfit !== undefined && Number.isFinite(snapshot.totalAllProfit)) {
            totalProfit = snapshot.totalAllProfit;
        } else {
            // 没有 totalAllProfit 时，累加所有周期收益
            totalProfit = cycleHistory.reduce((sum, c) => sum + (c.profit || 0), 0);
        }
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
            let profit = Number.isFinite(cycle.profit) ? cycle.profit : 0;
            let profitText, profitClass;
            
            // 如果是当前持仓周期
            if (isActive) {
                if (hasQuote) {
                    // 有行情数据，加上浮动盈亏
                    profit += snapshot.holdingProfit;
                    // 确保结果是有效数字
                    if (!Number.isFinite(profit)) {
                        profit = cycle.profit || 0;
                    }
                }
                profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
                profitText = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
                if (!hasQuote) {
                    // 没有行情数据，显示已实现收益 + 浮动提示
                    profitText += ' + 浮动';
                }
            } else {
                profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
                profitText = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
            }
            
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
    },

    /**
     * 获取本周的日期范围
     * @param {Date} date - 日期
     * @returns {Object} 包含开始和结束日期
     */
    getWeekRange(date) {
        const now = date || new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一

        // 创建副本，避免修改原对象
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { start: monday, end: sunday };
    },

    /**
     * 获取本月的日期范围
     * @param {Date} date - 日期
     * @returns {Object} 包含开始和结束日期
     */
    getMonthRange(date) {
        const now = date || new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);

        return { start: firstDay, end: lastDay };
    },

    /**
     * 获取用户的字段显示偏好设置
     * @param {string} viewType - 视图类型 ('list' 或 'card')
     * @param {string} group - 分组类型 ('holding' 或 'cleared')
     * @returns {Object} 字段显示设置
     */
    _getFieldPreferences(viewType, group = 'holding') {
        const config = StockProfitCalculator.Config;
        const fieldConfigKey = viewType === 'list' ? 'listFields' : 'cardFields';
        const preferencesKey = viewType === 'list' 
            ? `listViewFields${group.charAt(0).toUpperCase() + group.slice(1)}` 
            : `cardViewFields${group.charAt(0).toUpperCase() + group.slice(1)}`;
        
        // 获取默认配置
        const defaultFields = config.get(`ui.${fieldConfigKey}.${group}`, {});
        const validKeys = Object.keys(defaultFields);
        
        // 获取用户偏好设置
        const userPreferences = config.get(`ui.preferences.${preferencesKey}`, {});
        
        // 清理用户偏好中的无效字段（只保留在 defaultFields 中存在的键）
        let cleaned = false;
        for (const key of Object.keys(userPreferences)) {
            if (!validKeys.includes(key)) {
                delete userPreferences[key];
                cleaned = true;
            }
        }
        
        // 如果清理了无效字段，保存更新后的偏好
        if (cleaned) {
            config.set(`ui.preferences.${preferencesKey}`, userPreferences);
            config.save();
        }
        
        // 合并配置：用户偏好覆盖默认配置
        const fields = {};
        for (const [key, value] of Object.entries(defaultFields)) {
            fields[key] = {
                label: value.label,
                visible: userPreferences[key] !== undefined ? userPreferences[key] : value.default
            };
        }
        
        return fields;
    },

    /**
     * 保存用户的字段显示偏好设置
     * @param {string} viewType - 视图类型 ('list' 或 'card')
     * @param {string} group - 分组类型 ('holding' 或 'cleared')
     * @param {Object} preferences - 用户偏好设置
     */
    _saveFieldPreferences(viewType, group, preferences) {
        const config = StockProfitCalculator.Config;
        const preferencesKey = viewType === 'list' 
            ? `listViewFields${group.charAt(0).toUpperCase() + group.slice(1)}` 
            : `cardViewFields${group.charAt(0).toUpperCase() + group.slice(1)}`;
        
        // 保存用户偏好
        config.set(`ui.preferences.${preferencesKey}`, preferences);
        config.save();
    },

    /**
     * 打开字段设置模态对话框
     * @param {string} viewType - 视图类型 ('list' 或 'card')
     * @param {string} group - 分组类型 ('holding' 或 'cleared')
     */
    _openFieldSettingsModal(viewType, group = 'holding') {
        const fields = this._getFieldPreferences(viewType, group);
        const viewTypeName = viewType === 'list' ? '列表视图' : '卡片视图';
        const groupName = group === 'holding' ? '持仓中' : '已清仓';
        const modalTitle = `${groupName}${viewTypeName}字段设置`;
        
        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'modal-overlay field-settings-modal';
        modal.id = 'fieldSettingsModal';
        
        let checkboxesHtml = '';
        for (const [key, field] of Object.entries(fields)) {
            // 跳过无效字段（没有 label 的字段）
            if (!field.label) continue;
            
            checkboxesHtml += `
                <label class="field-settings-item">
                    <input type="checkbox" data-field-key="${key}" ${field.visible ? 'checked' : ''}>
                    <span class="field-settings-label">${field.label}</span>
                </label>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-content field-settings-content">
                <div class="modal-header">
                    <h3>${modalTitle}</h3>
                    <button class="modal-close-btn" onclick="Overview._closeFieldSettingsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="field-settings-grid">
                        ${checkboxesHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="Overview._closeFieldSettingsModal()">取消</button>
                    <button class="btn btn-primary" onclick="Overview._saveFieldSettingsFromModal('${viewType}', '${group}')">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 显示模态对话框
        modal.style.display = 'flex';
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this._closeFieldSettingsModal();
            }
        });
    },

    /**
     * 关闭字段设置模态对话框
     */
    _closeFieldSettingsModal() {
        const modal = document.getElementById('fieldSettingsModal');
        if (modal) {
            document.body.removeChild(modal);
        }
    },

    /**
     * 从模态对话框保存字段设置
     * @param {string} viewType - 视图类型 ('list' 或 'card')
     * @param {string} group - 分组类型 ('holding' 或 'cleared')
     */
    _saveFieldSettingsFromModal(viewType, group = 'holding') {
        const modal = document.getElementById('fieldSettingsModal');
        if (!modal) return;
        
        // 获取默认配置中的有效字段键
        const config = StockProfitCalculator.Config;
        const fieldConfigKey = viewType === 'list' ? 'listFields' : 'cardFields';
        const defaultFields = config.get(`ui.${fieldConfigKey}.${group}`, {});
        const validKeys = Object.keys(defaultFields);
        
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        const preferences = {};
        
        checkboxes.forEach(checkbox => {
            const key = checkbox.dataset.fieldKey;
            // 只保存有效字段
            if (validKeys.includes(key)) {
                preferences[key] = checkbox.checked;
            }
        });
        
        this._saveFieldPreferences(viewType, group, preferences);
        this._closeFieldSettingsModal();
        
        // 刷新股票列表以应用新的字段设置
        this.renderStockLists();
    },

    /**
     * 绑定字段设置按钮事件
     */
    _setupFieldSettingsButton() {
        // 持仓中分组按钮
        const fieldSettingsBtnHolding = document.getElementById('fieldSettingsBtnHolding');
        if (fieldSettingsBtnHolding) {
            fieldSettingsBtnHolding.onclick = () => {
                const viewType = this.viewMode.holding === 'list' ? 'list' : 'card';
                this._openFieldSettingsModal(viewType, 'holding');
            };
        }
        
        // 已清仓分组按钮
        const fieldSettingsBtnCleared = document.getElementById('fieldSettingsBtnCleared');
        if (fieldSettingsBtnCleared) {
            fieldSettingsBtnCleared.onclick = () => {
                const viewType = this.viewMode.cleared === 'list' ? 'list' : 'card';
                this._openFieldSettingsModal(viewType, 'cleared');
            };
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.Overview = Overview;

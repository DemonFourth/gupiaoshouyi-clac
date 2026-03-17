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
        cleared: 'default'
    },  // 排序状态
    viewMode: 'card',  // 视图模式：card | list

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

            // 持仓统计元素
            overviewHoldingCount: document.getElementById('overviewHoldingCount'),
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
        
        // 缓存不存在，返回空对象避免错误
        console.error(`[Overview] Snapshot not found in cache for stock: ${stock.code}`);
        return {
            stockCode: stock.code,
            stock: stock,
            calcResult: { sellRecords: [], holdingQueue: [], holdingDetail: [] },
            summary: { currentHolding: 0, currentCost: 0, totalProfit: 0, totalReturnRate: 0 },
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
        profitElement.className = 'overview-summary-value ' + (totalHoldingProfit >= 0 ? 'profit' : 'loss');

        const returnRateElement = this._domCache.overviewTotalReturnRate;
        returnRateElement.textContent = totalReturnRate.toFixed(3) + '%';
        returnRateElement.className = 'overview-summary-value ' + (totalReturnRate >= 0 ? 'profit' : 'loss');

        const weeklyProfitElement = this._domCache.overviewWeeklyProfit;
        weeklyProfitElement.textContent = '¥' + totalWeeklyProfit.toFixed(2);
        weeklyProfitElement.className = 'overview-summary-value ' + (totalWeeklyProfit >= 0 ? 'profit' : 'loss');

        const monthlyProfitElement = this._domCache.overviewMonthlyProfit;
        monthlyProfitElement.textContent = '¥' + totalMonthlyProfit.toFixed(2);
        monthlyProfitElement.className = 'overview-summary-value ' + (totalMonthlyProfit >= 0 ? 'profit' : 'loss');

        // 添加点击事件监听：本周收益
        this._setupProfitClickEvent(weeklyProfitElement, 'week');

        // 添加点击事件监听：本月收益
        this._setupProfitClickEvent(monthlyProfitElement, 'month');

        // 更新UI - 持仓股票统计数据
        this._domCache.overviewHoldingCount.textContent = holdingCount + '只';
        this._domCache.overviewProfitCount.textContent = '盈利' + profitCount + '只';
        this._domCache.overviewLossCount.textContent = '亏损' + lossCount + '只';

        // 更新UI - 清仓股票统计数据
        this._domCache.overviewClearedCount.textContent = clearedCount + '只';
        this._domCache.overviewClearedProfitCount.textContent = '盈利' + clearedProfitCount + '只';
        this._domCache.overviewClearedLossCount.textContent = '亏损' + clearedLossCount + '只';

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
                this.sortState[group] = select.value;
            }
            this.renderStockLists();
        }
    },

    setHoldingSortDirection(direction) {
        this.sortState.holding.direction = direction;
        this.updateSortDirectionUI();
        this.renderStockLists();
    },

    getSortKey(group) {
        if (group !== 'holding') {
            return this.sortState[group] || 'default';
        }

        const { field, direction } = this.sortState.holding;
        if (field === 'default' || field === 'first-buy') {
            return field;
        }
        return `${field}-${direction}`;
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
            case 'first-buy':   // 建仓时间（早的在前）
                return stockDataList.sort((a, b) => {
                    if (!a.firstBuyDate) return 1;
                    if (!b.firstBuyDate) return -1;
                    return a.firstBuyDate.localeCompare(b.firstBuyDate);
                });
            case 'cost-desc':   // 持仓成本降序
                return stockDataList.sort((a, b) => b.holdingCost - a.holdingCost);
            case 'cost-asc':    // 持仓成本升序
                return stockDataList.sort((a, b) => a.holdingCost - b.holdingCost);
            default:
                return stockDataList;
        }
    },

    /**
     * 切换视图模式
     */
    toggleViewMode() {
        this.viewMode = this.viewMode === 'card' ? 'list' : 'card';

        // 更新按钮图标
        const gridIcon = this._domCache.gridIcon;
        const listIcon = this._domCache.listIcon;
        if (gridIcon && listIcon) {
            if (this.viewMode === 'list') {
                gridIcon.style.display = 'none';
                listIcon.style.display = 'inline';
            } else {
                gridIcon.style.display = 'inline';
                listIcon.style.display = 'none';
            }
        }

        // 更新两个容器的样式
        const holdingContainer = this._domCache.holdingStocksList;
        const clearedContainer = this._domCache.clearedStocksList;

        [holdingContainer, clearedContainer].forEach(container => {
            if (container) {
                if (this.viewMode === 'list') {
                    container.classList.add('list-mode');
                } else {
                    container.classList.remove('list-mode');
                }
            }
        });

        // 重新渲染
        this.renderStockLists();
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

        // 使用 DocumentFragment 批量插入，减少 DOM 重排
        const fragment = document.createDocumentFragment();

        stockDataList.forEach(data => {
            const card = this.createStockCard(data.stock, data.result, data.snapshot);
            fragment.appendChild(card);
        });

        // 一次性将所有卡片添加到容器
        container.appendChild(fragment);

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
    },

    /**
     * 创建股票卡片
     */
    createStockCard(stock, result, snapshot = null) {
        // 根据视图模式选择创建方式
        if (this.viewMode === 'list') {
            return this.createListCard(stock, result, snapshot);
        }
        return this.createGridCard(stock, result, snapshot);
    },

    /**
     * 创建方框卡片（原样式）
     */
    createGridCard(stock, result, snapshot = null) {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.onclick = () => {
            StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, {
                page: 'detail',
                stockCode: stock.code
            });
        };

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
        const yearlyStats = snapshot.yearlyStats;

        // 获取字段显示配置
        const fields = this._getFieldPreferences('card');

        // 动态构建 HTML
        let bodyHtml = '';
        
        // 仓位信息 section
        const positionFields = [fields.holding, fields.marketValue, fields.cost];
        if (positionFields.some(f => f.visible)) {
            let metricsHtml = '';
            
            if (fields.holding.visible) {
                metricsHtml += `
                    <div class="stock-card-metric-item">
                        <span class="stock-card-metric-label">持仓股数</span>
                        <span class="stock-card-metric-value">${summary.currentHolding}股</span>
                    </div>
                `;
            }
            
            if (fields.marketValue.visible) {
                metricsHtml += `
                    <div class="stock-card-metric-item">
                        <span class="stock-card-metric-label">持仓市值</span>
                        <span class="stock-card-metric-value">${marketValue !== null ? '¥' + marketValue.toFixed(2) : '--'}</span>
                    </div>
                `;
            }
            
            if (fields.cost.visible) {
                metricsHtml += `
                    <div class="stock-card-metric-item">
                        <span class="stock-card-metric-label">持仓成本</span>
                        <span class="stock-card-metric-value">¥${summary.currentCost.toFixed(2)}</span>
                    </div>
                `;
            }
            
            bodyHtml += `
                <div class="stock-card-section">
                    <div class="stock-card-section-title">仓位信息</div>
                    <div class="stock-card-metric-grid stock-card-metric-grid-3">
                        ${metricsHtml}
                    </div>
                </div>
            `;
        }
        
        // 当日行情 section
        const quoteFields = [fields.costPerShare, fields.dilutedCostPerShare, fields.currentPrice, fields.dailyChange];
        if (quoteFields.some(f => f.visible)) {
            let quoteHtml = '';
            
            if (fields.costPerShare.visible) {
                quoteHtml += `
                    <div class="stock-card-quote-item">
                        <span class="stock-card-quote-label">每股持仓成本</span>
                        <span class="stock-card-quote-value">¥${costPerShare.toFixed(3)}</span>
                    </div>
                `;
            }
            
            if (fields.dilutedCostPerShare.visible) {
                quoteHtml += `
                    <div class="stock-card-quote-item">
                        <span class="stock-card-quote-label">每股摊薄成本</span>
                        <span class="stock-card-quote-value">${dilutedCostPerShare !== null ? '¥' + dilutedCostPerShare.toFixed(3) : '--'}</span>
                    </div>
                `;
            }
            
            if (fields.currentPrice.visible) {
                quoteHtml += `
                    <div class="stock-card-quote-item">
                        <span class="stock-card-quote-label">当日股价</span>
                        <span class="stock-card-quote-value">${quote ? '¥' + quote.price.toFixed(3) : '--'}</span>
                    </div>
                `;
            }
            
            if (fields.dailyChange.visible) {
                quoteHtml += `
                    <div class="stock-card-quote-item">
                        <span class="stock-card-quote-label">当日涨幅</span>
                        <span class="stock-card-quote-value ${quote && quote.change >= 0 ? 'profit' : 'loss'}">${this.formatDailyChange(quote)}</span>
                    </div>
                `;
            }
            
            bodyHtml += `
                <div class="stock-card-section">
                    <div class="stock-card-section-title">当日行情</div>
                    <div class="stock-card-quote-grid">
                        ${quoteHtml}
                    </div>
                </div>
            `;
        }
        
        // 收益表现 section
        const profitFields = [fields.cycleProfit, fields.cycleReturnRate, fields.totalProfit, fields.totalReturnRate];
        if (profitFields.some(f => f.visible)) {
            let profitHtml = '';
            
            if (fields.cycleProfit.visible) {
                profitHtml += `
                    <div class="stock-card-metric-item stock-card-metric-item-emphasis">
                        <span class="stock-card-metric-label">当前持仓周期收益</span>
                        <span class="stock-card-metric-value ${cycleProfit !== null && cycleProfit >= 0 ? 'profit' : 'loss'}">
                            ${cycleProfit !== null ? '¥' + cycleProfit.toFixed(2) : '--'}
                        </span>
                    </div>
                `;
            }
            
            if (fields.cycleReturnRate.visible) {
                profitHtml += `
                    <div class="stock-card-metric-item stock-card-metric-item-emphasis">
                        <span class="stock-card-metric-label">当前持仓周期收益率</span>
                        <span class="stock-card-metric-value ${cycleReturnRate !== null && cycleReturnRate >= 0 ? 'profit' : 'loss'}">
                            ${cycleReturnRate !== null ? cycleReturnRate.toFixed(3) + '%' : '--'}
                        </span>
                    </div>
                `;
            }
            
            if (fields.totalProfit.visible) {
                profitHtml += `
                    <div class="stock-card-metric-item stock-card-metric-item-emphasis">
                        <span class="stock-card-metric-label">总收益</span>
                        <span class="stock-card-metric-value ${totalAllProfit >= 0 ? 'profit' : 'loss'}">¥${totalAllProfit.toFixed(2)}</span>
                    </div>
                `;
            }
            
            if (fields.totalReturnRate.visible) {
                profitHtml += `
                    <div class="stock-card-metric-item stock-card-metric-item-emphasis">
                        <span class="stock-card-metric-label">总收益率</span>
                        <span class="stock-card-metric-value ${totalAllReturnRate >= 0 ? 'profit' : 'loss'}">${totalAllReturnRate.toFixed(3)}%</span>
                    </div>
                `;
            }
            
            bodyHtml += `
                <div class="stock-card-section stock-card-section-emphasis">
                    <div class="stock-card-section-title">收益表现</div>
                    <div class="stock-card-metric-grid">
                        ${profitHtml}
                    </div>
                </div>
            `;
        }
        
        // 持仓周期 section
        const holdingFields = [fields.holdingStartDate, fields.holdingDays];
        if (holdingFields.some(f => f.visible)) {
            let holdingHtml = '';
            
            if (fields.holdingStartDate.visible) {
                holdingHtml += `
                    <div class="stock-card-metric-item">
                        <span class="stock-card-metric-label">当前持仓开始</span>
                        <span class="stock-card-metric-value">${holdingInfo.startDate}</span>
                    </div>
                `;
            }
            
            if (fields.holdingDays.visible) {
                holdingHtml += `
                    <div class="stock-card-metric-item">
                        <span class="stock-card-metric-label">持仓天数</span>
                        <span class="stock-card-metric-value">${holdingInfo.holdingDays}天</span>
                    </div>
                `;
            }
            
            bodyHtml += `
                <div class="stock-card-section">
                    <div class="stock-card-section-title">持仓周期</div>
                    <div class="stock-card-metric-grid">
                        ${holdingHtml}
                    </div>
                </div>
            `;
        }
        
        // 年度统计 footer
        let footerHtml = '';
        if (fields.yearlyStats.visible) {
            footerHtml += `
                <div class="stock-card-footer">
                    <div class="stock-card-yearly">
                        ${yearlyStats.map(ys => `
                            <div class="yearly-stat">
                                <span class="yearly-label">${ys.year}年</span>
                                <span class="yearly-value ${ys.profit >= 0 ? 'profit' : 'loss'}">
                                    ${ys.profit >= 0 ? '+' : ''}¥${ys.profit.toFixed(0)}
                                </span>
                                <span class="yearly-trades">${ys.trades}次</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="stock-card-header">
                <div class="stock-card-name">${stock.name}</div>
                <div class="stock-card-code">${stock.code}</div>
                <div class="stock-card-actions">
                    <button class="stock-card-action stock-card-action-edit" title="编辑股票" aria-label="编辑股票" data-stock-code="${stock.code}">✎</button>
                    <button class="stock-card-action stock-card-action-delete" title="删除股票" aria-label="删除股票" data-stock-code="${stock.code}">🗑</button>
                </div>
            </div>
            <div class="stock-card-body">
                ${bodyHtml}
            </div>
            ${footerHtml}
        `;

        // 动态绑定事件监听器
        const editBtn = card.querySelector('.stock-card-action-edit');
        const deleteBtn = card.querySelector('.stock-card-action-delete');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.editStock(stock.code);
            };
        }
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.deleteStock(stock.code);
            };
        }

        return card;
    },

    /**
     * 创建列表卡片（横向布局）
     */
    createListCard(stock, result, snapshot = null) {
        const card = document.createElement('div');
        card.className = 'stock-card stock-card-list';
        card.onclick = () => {
            StockProfitCalculator.EventBus.emit(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, {
                page: 'detail',
                stockCode: stock.code
            });
        };

        snapshot = snapshot || this.getStockSnapshot(stock);
        const summary = snapshot.summary;
        const quote = snapshot.quote;
        const holdingInfo = snapshot.holdingInfo;
        const marketValue = snapshot.marketValue;
        const holdingProfit = snapshot.holdingProfit;
        const holdingReturnRate = snapshot.holdingReturnRate;
        const cycleProfit = snapshot.cycleProfit;
        const cycleReturnRate = snapshot.cycleReturnRate;
        const totalAllProfit = snapshot.totalAllProfit;
        const totalAllReturnRate = snapshot.totalAllReturnRate;
        const costPerShare = snapshot.costPerShare;
        const dilutedCostPerShare = snapshot.dilutedCostPerShare;

        const profitSign = totalAllProfit >= 0 ? '+' : '';

        // 获取字段显示配置
        const fields = this._getFieldPreferences('list');

        // 动态构建字段 HTML
        let fieldsHtml = '';
        
        // 股票名称和代码（始终显示）
        fieldsHtml += `
            <div class="stock-card-list-name">
                <span class="stock-card-list-title">${stock.name}</span>
                <span class="stock-card-list-code">${stock.code}</span>
            </div>
        `;
        
        // 根据配置添加字段
        if (fields.holding.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">持仓</span>
                    <span class="stock-card-list-value">${summary.currentHolding}股</span>
                </div>
            `;
        }
        
        if (fields.marketValue.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">市值</span>
                    <span class="stock-card-list-value">${marketValue !== null ? '¥' + marketValue.toFixed(2) : '--'}</span>
                </div>
            `;
        }
        
        if (fields.cost.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">成本</span>
                    <span class="stock-card-list-value">¥${summary.currentCost.toFixed(2)}</span>
                </div>
            `;
        }
        
        if (fields.startDate.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">建仓日</span>
                    <span class="stock-card-list-value">${holdingInfo.startDate}</span>
                </div>
            `;
        }
        
        if (fields.holdingDays.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">持仓天数</span>
                    <span class="stock-card-list-value">${holdingInfo.holdingDays}天</span>
                </div>
            `;
        }
        
        if (fields.currentPrice.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">现价</span>
                    <span class="stock-card-list-value">${quote ? '¥' + quote.price.toFixed(3) : '--'}</span>
                </div>
            `;
        }
        
        if (fields.dailyChange.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">涨幅</span>
                    <span class="stock-card-list-value ${quote && quote.change >= 0 ? 'profit' : 'loss'}">${this.formatDailyChange(quote)}</span>
                </div>
            `;
        }
        
        if (fields.costPerShare.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">每股持仓成本</span>
                    <span class="stock-card-list-value">¥${costPerShare.toFixed(3)}</span>
                </div>
            `;
        }
        
        if (fields.dilutedCostPerShare.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">每股摊薄成本</span>
                    <span class="stock-card-list-value">${dilutedCostPerShare !== null ? '¥' + dilutedCostPerShare.toFixed(3) : '--'}</span>
                </div>
            `;
        }
        
        if (fields.cycleProfit.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">当前持仓周期收益</span>
                    <span class="stock-card-list-value ${cycleProfit !== null && cycleProfit >= 0 ? 'profit' : 'loss'}">
                        ${cycleProfit !== null ? (cycleProfit >= 0 ? '+' : '') + '¥' + cycleProfit.toFixed(2) : '--'}
                    </span>
                </div>
            `;
        }
        
        if (fields.cycleReturnRate.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">当前持仓周期收益率</span>
                    <span class="stock-card-list-value ${cycleReturnRate !== null && cycleReturnRate >= 0 ? 'profit' : 'loss'}">
                        ${cycleReturnRate !== null ? (cycleReturnRate >= 0 ? '+' : '') + cycleReturnRate.toFixed(3) + '%' : '--'}
                    </span>
                </div>
            `;
        }
        
        if (fields.totalProfit.visible) {
            fieldsHtml += `
                <div class="stock-card-list-item">
                    <span class="stock-card-list-label">收益</span>
                    <span class="stock-card-list-value ${totalAllProfit >= 0 ? 'profit' : 'loss'}">
                        ${profitSign}¥${totalAllProfit.toFixed(2)}
                    </span>
                </div>
            `;
        }

        // 操作按钮（始终显示）
        fieldsHtml += `
            <div class="stock-card-list-actions">
                <button class="stock-card-action stock-card-action-edit" title="编辑股票" aria-label="编辑股票" data-stock-code="${stock.code}">✎</button>
                <button class="stock-card-action stock-card-action-delete" title="删除股票" aria-label="删除股票" data-stock-code="${stock.code}">🗑</button>
            </div>
        `;

        card.innerHTML = fieldsHtml;

        // 动态绑定事件监听器
        const editBtn = card.querySelector('.stock-card-action-edit');
        const deleteBtn = card.querySelector('.stock-card-action-delete');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.editStock(stock.code);
            };
        }
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                StockProfitCalculator.StockManager.deleteStock(stock.code);
            };
        }

        return card;
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
        const stocks = this.stocks.filter(s => {
            const snapshot = this.getStockSnapshot(s);
            return snapshot.summary.currentHolding > 0;
        });

        // 分批获取，每次最多5个
        const batchSize = 5;
        for (let i = 0; i < stocks.length; i += batchSize) {
            const batch = stocks.slice(i, i + batchSize);
            await Promise.all(batch.map(stock => this.fetchStockPrice(stock.code)));
            
            // 更新汇总统计
            this.renderSummary();
            this.renderStockLists();
        }
    },

    /**
     * 获取单个股票价格
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
     * 获取本周的日期范围
     * @param {Date} date - 日期
     * @returns {Object} 包含开始和结束日期
     */
    getWeekRange(date) {
        const now = date || new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一

        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(now.setDate(diff + 6));
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
     * @returns {Object} 字段显示设置
     */
    _getFieldPreferences(viewType) {
        const config = StockProfitCalculator.Config;
        const fieldConfigKey = viewType === 'list' ? 'listFields' : 'cardFields';
        const preferencesKey = viewType === 'list' ? 'listViewFields' : 'cardViewFields';
        
        // 获取默认配置
        const defaultFields = config.get(`ui.${fieldConfigKey}.holding`, {});
        
        // 获取用户偏好设置
        const userPreferences = config.get(`ui.preferences.${preferencesKey}`, {});
        
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
     * @param {Object} preferences - 用户偏好设置
     */
    _saveFieldPreferences(viewType, preferences) {
        const config = StockProfitCalculator.Config;
        const preferencesKey = viewType === 'list' ? 'listViewFields' : 'cardViewFields';
        
        // 保存用户偏好
        config.set(`ui.preferences.${preferencesKey}`, preferences);
        config.save();
    },

    /**
     * 打开字段设置模态对话框
     * @param {string} viewType - 视图类型 ('list' 或 'card')
     */
    _openFieldSettingsModal(viewType) {
        const fields = this._getFieldPreferences(viewType);
        const modalTitle = viewType === 'list' ? '列表视图字段设置' : '卡片视图字段设置';
        
        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'modal-overlay field-settings-modal';
        modal.id = 'fieldSettingsModal';
        
        let checkboxesHtml = '';
        for (const [key, field] of Object.entries(fields)) {
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
                    <button class="btn btn-primary" onclick="Overview._saveFieldSettingsFromModal('${viewType}')">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 显示模态对话框
        modal.style.display = 'block';
        
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
     */
    _saveFieldSettingsFromModal(viewType) {
        const modal = document.getElementById('fieldSettingsModal');
        if (!modal) return;
        
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        const preferences = {};
        
        checkboxes.forEach(checkbox => {
            preferences[checkbox.dataset.fieldKey] = checkbox.checked;
        });
        
        this._saveFieldPreferences(viewType, preferences);
        this._closeFieldSettingsModal();
        
        // 刷新股票列表以应用新的字段设置
        this.renderStockLists();
    },

    /**
     * 绑定字段设置按钮事件
     */
    _setupFieldSettingsButton() {
        const fieldSettingsBtn = document.getElementById('fieldSettingsBtn');
        if (fieldSettingsBtn) {
            fieldSettingsBtn.addEventListener('click', () => {
                const viewType = this.viewMode === 'list' ? 'list' : 'card';
                this._openFieldSettingsModal(viewType);
            });
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.Overview = Overview;

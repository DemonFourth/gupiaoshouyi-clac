/**
 * 交易记录查询模块
 * 用于查询指定时间段的交易记录和盈亏信息
 */

const TradeRecords = {
    // 当前查询的年份
    _currentYear: null,
    
    // 当前查询的月份（null 表示全年）
    _currentMonth: null,
    
    // DOM 缓存
    _domCache: null,

    /**
     * 初始化
     */
    init() {
        this.initDOMCache();
        console.log('TradeRecords 模块初始化完成');
    },

    /**
     * 初始化 DOM 缓存
     */
    initDOMCache() {
        this._domCache = {
            tradeRecordsPage: document.getElementById('tradeRecordsPage'),
            tradeRecordsTotalProfit: document.getElementById('tradeRecordsTotalProfit'),
            tradeRecordsCount: document.getElementById('tradeRecordsCount'),
            tradeRecordsTotalFee: document.getElementById('tradeRecordsTotalFee'),
            tradeRecordsTableBody: document.getElementById('tradeRecordsTableBody'),
            tradeRecordsStockFilter: document.getElementById('tradeRecordsStockFilter'),
            tradeRecordsStartDate: document.getElementById('tradeRecordsStartDate'),
            tradeRecordsEndDate: document.getElementById('tradeRecordsEndDate'),
            tradeRecordsFilterBtn: document.getElementById('tradeRecordsFilterBtn'),
            chartSelectorCheckboxes: document.querySelectorAll('.chart-selector-checkbox'),
            chartContainers: document.querySelectorAll('.trade-records-charts .chart-container'),
            chartRows: document.querySelectorAll('.trade-records-charts .chart-row')
        };

        // 绑定筛选按钮事件
        if (this._domCache.tradeRecordsFilterBtn) {
            this._domCache.tradeRecordsFilterBtn.addEventListener('click', () => {
                this._handleFilterChange();
            });
        }

        // 绑定快捷筛选按钮事件
        document.querySelectorAll('.header-tr-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._handleQuickFilter(e.target);
            });
        });

        // 绑定图表选择复选框事件
        this._domCache.chartSelectorCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this._handleChartSelectionChange();
            });
        });

        // 初始化图表显示状态
        this._handleChartSelectionChange();
    },

    /**
     * 处理快捷筛选按钮点击
     * @param {HTMLElement} btn - 被点击的按钮
     */
    _handleQuickFilter(btn) {
        const range = btn.getAttribute('data-range');
        const today = new Date();
        let startDate, endDate;

        // 移除所有快捷按钮的 active 状态
        document.querySelectorAll('.header-tr-quick-btn').forEach(b => b.classList.remove('active'));

        switch (range) {
            case 'today':
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = today.getDay();
                const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + diffToMonday);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
        }

        // 设置日期输入框的值
        if (startDate && endDate) {
            const formatDateForInput = (date) => {
                const y = date.getFullYear();
                const m = (date.getMonth() + 1).toString().padStart(2, '0');
                const d = date.getDate().toString().padStart(2, '0');
                return `${y}-${m}-${d}`;
            };
            this._domCache.tradeRecordsStartDate.value = formatDateForInput(startDate);
            this._domCache.tradeRecordsEndDate.value = formatDateForInput(endDate);
        }

        // 设置按钮为 active 状态
        btn.classList.add('active');

        // 触发筛选
        this._handleFilterChange();
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
     * 处理图表选择变化
     */
    _handleChartSelectionChange() {
        // 记录之前的显示状态
        const previousHiddenCharts = new Set();
        this._domCache.chartContainers.forEach(container => {
            if (container.classList.contains('hidden')) {
                previousHiddenCharts.add(container.getAttribute('data-chart'));
            }
        });

        const checkedCharts = this._getCheckedCharts();
        const chartCount = checkedCharts.length;

        // 显示/隐藏图表容器
        this._domCache.chartContainers.forEach(container => {
            const chartType = container.getAttribute('data-chart');
            if (checkedCharts.includes(chartType)) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        });

        // 识别刚从隐藏变为可见的图表
        const newlyVisibleCharts = [];
        this._domCache.chartContainers.forEach(container => {
            const chartType = container.getAttribute('data-chart');
            if (previousHiddenCharts.has(chartType) && checkedCharts.includes(chartType)) {
                newlyVisibleCharts.push(chartType);
            }
        });

        // 调整布局
        this._adjustChartLayout(chartCount);

        // 对刚从隐藏变为可见的图表，强制重新渲染
        if (newlyVisibleCharts.length > 0) {
            newlyVisibleCharts.forEach(chartType => {
                const chartId = this._getChartId(chartType);
                if (chartId) {
                    const selector = document.querySelector(`.chart-type-selector[data-chart="${chartId}"]`);
                    const chartTypeValue = selector ? selector.value : null;
                    this._rerenderChart(chartId, chartTypeValue);
                }
            });
        }
    },

    /**
     * 根据图表类型获取图表ID
     * @param {string} chartType - 图表类型
     * @returns {string} 图表ID
     */
    _getChartId(chartType) {
        const mapping = {
            'dailyAmount': 'tradeRecordsDailyAmountChart',
            'dailyProfit': 'tradeRecordsDailyProfitChart',
            'typeDistribution': 'tradeRecordsTypeDistributionChart',
            'dailyCount': 'tradeRecordsDailyCountChart',
            'stockAmount': 'tradeRecordsStockAmountChart',
            'stockProfit': 'tradeRecordsStockProfitChart'
        };
        return mapping[chartType];
    },

    /**
     * 获取选中的图表
     * @returns {Array} 选中的图表类型数组
     */
    _getCheckedCharts() {
        const checkedCharts = [];
        this._domCache.chartSelectorCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkedCharts.push(checkbox.getAttribute('data-chart'));
            }
        });
        return checkedCharts;
    },

    /**
     * 调整图表布局
     * @param {number} chartCount - 可见图表数量
     */
    _adjustChartLayout(chartCount) {
        // 获取所有图表行
        const chartRows = Array.from(this._domCache.chartRows);

        // 如果没有选中的图表，隐藏所有图表行
        if (chartCount === 0) {
            chartRows.forEach(row => {
                row.style.display = 'none';
            });
            return;
        }

        // 获取所有可见的图表容器（按原始顺序）
        const visibleContainers = [];
        this._domCache.chartContainers.forEach(container => {
            if (!container.classList.contains('hidden')) {
                visibleContainers.push(container);
            }
        });

        // 清空所有图表行
        chartRows.forEach(row => {
            while (row.firstChild) {
                row.removeChild(row.firstChild);
            }
        });

        // 根据用户要求的布局规则重新组织图表容器
        // - 1个图表：放一整行
        // - 2个图表：一行两个
        // - 3个图表：一个整行，另外两个一行
        // - 4个以上图表：一行两个
        
        if (chartCount === 1) {
            // 1个图表：第一行，占满整行
            if (chartRows[0] && visibleContainers[0]) {
                chartRows[0].style.display = 'flex';
                chartRows[0].appendChild(visibleContainers[0]);
            }
        } else if (chartCount === 2) {
            // 2个图表：第一行，两个并排
            if (chartRows[0]) {
                chartRows[0].style.display = 'flex';
                if (visibleContainers[0]) chartRows[0].appendChild(visibleContainers[0]);
                if (visibleContainers[1]) chartRows[0].appendChild(visibleContainers[1]);
            }
        } else if (chartCount === 3) {
            // 3个图表：第一个图表放第一行，后两个放第二行
            if (chartRows[0] && visibleContainers[0]) {
                chartRows[0].style.display = 'flex';
                chartRows[0].appendChild(visibleContainers[0]);
            }
            if (chartRows[1]) {
                chartRows[1].style.display = 'flex';
                if (visibleContainers[1]) chartRows[1].appendChild(visibleContainers[1]);
                if (visibleContainers[2]) chartRows[1].appendChild(visibleContainers[2]);
            }
        } else {
            // 4个及以上：每行两个
            visibleContainers.forEach((container, index) => {
                const rowNumber = Math.floor(index / 2);
                if (chartRows[rowNumber]) {
                    chartRows[rowNumber].style.display = 'flex';
                    chartRows[rowNumber].appendChild(container);
                }
            });
        }

        // 隐藏没有图表的行
        chartRows.forEach(row => {
            if (row.children.length === 0) {
                row.style.display = 'none';
            }
        });

        // 调整所有图表大小以确保正确显示
        // 使用 requestAnimationFrame 确保 DOM 更新完成后再调整图表大小
        const ChartManager = StockProfitCalculator.ChartManager;
        if (ChartManager && typeof ChartManager.resizeAll === 'function') {
            requestAnimationFrame(() => {
                ChartManager.resizeAll();
            });
        }
    },

    /**
     * 图表类型配置
     */
    _chartTypeConfig: {
        tradeRecordsDailyAmountChart: {
            options: ['bar', 'line', 'stackedBar'],
            labels: { bar: '柱状图', line: '折线图', stackedBar: '堆叠柱状图' }
        },
        tradeRecordsDailyProfitChart: {
            options: ['line', 'bar', 'area'],
            labels: { line: '折线图', bar: '柱状图', area: '面积图' }
        },
        tradeRecordsTypeDistributionChart: {
            options: ['pie', 'donut'],
            labels: { pie: '饼图', donut: '环形图' }
        },
        tradeRecordsDailyCountChart: {
            options: ['line', 'bar', 'stackedBar'],
            labels: { line: '折线图', bar: '柱状图', stackedBar: '堆叠柱状图' }
        },
        tradeRecordsStockAmountChart: {
            options: ['bubble', 'bidirectionalBar', 'bidirectionalBarHorizontal', 'stackedBar'],
            labels: { bubble: '气泡图', bidirectionalBar: '双向柱状图', bidirectionalBarHorizontal: '双向条形图', stackedBar: '堆叠柱状图' }
        },
        tradeRecordsStockProfitChart: {
            options: ['bar', 'scatter', 'bubble', 'treemap', 'radar'],
            labels: { bar: '柱状图', scatter: '散点图', bubble: '气泡图', treemap: '矩形树图', radar: '雷达图' }
        }
    },

    /**
     * 图表数据缓存
     */
    _chartDataCache: {
        tradeRecordsDailyAmountChart: null,
        tradeRecordsDailyProfitChart: null,
        tradeRecordsTypeDistributionChart: null,
        tradeRecordsDailyCountChart: null,
        tradeRecordsStockAmountChart: null,
        tradeRecordsStockProfitChart: null
    },

    /**
     * 加载指定时间段的交易记录
     * @param {number} year - 年份
     * @param {number|null} month - 月份（null 表示全年）
     */
    load(year, month = null, startDate = null, endDate = null) {
        console.log('[TradeRecords.load] 收到参数:');
        console.log('  year:', year);
        console.log('  month:', month);
        console.log('  startDate:', startDate);
        console.log('  endDate:', endDate);
        
        this._ensureDOMCache();
        
        this._currentYear = year;
        this._currentMonth = month;

        // 同步更新页面顶部标题
        const titleElement = document.querySelector('.header-title h1');
        const stockInfoElement = document.getElementById('stockInfo');
        if (titleElement) {
            titleElement.textContent = '交易记录';
        }
        if (stockInfoElement) {
            // 显示日期范围
            if (startDate && endDate) {
                const formatDate = (date) => `${date.getMonth() + 1}月${date.getDate()}日`;
                stockInfoElement.textContent = `(${formatDate(startDate)} - ${formatDate(endDate)})`;
            } else if (month !== null) {
                stockInfoElement.textContent = `${year}年${month + 1}月`;
            } else {
                stockInfoElement.textContent = `${year}年`;
            }
        }

        // 清空日期筛选器的值（避免浏览器缓存干扰）
        if (this._domCache.tradeRecordsStartDate) {
            this._domCache.tradeRecordsStartDate.value = '';
        }
        if (this._domCache.tradeRecordsEndDate) {
            this._domCache.tradeRecordsEndDate.value = '';
        }

        // 如果提供了起始日期和结束日期，填充到日期筛选器
        if (startDate && endDate && this._domCache.tradeRecordsStartDate && this._domCache.tradeRecordsEndDate) {
            const formatDateForInput = (date) => {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            this._domCache.tradeRecordsStartDate.value = formatDateForInput(startDate);
            this._domCache.tradeRecordsEndDate.value = formatDateForInput(endDate);
        } else if (month !== null && this._domCache.tradeRecordsStartDate && this._domCache.tradeRecordsEndDate) {
            // 如果提供了月份，计算本月的第一天和最后一天
            const monthStr = (month + 1).toString().padStart(2, '0');
            const firstDay = new Date(`${year}-${monthStr}-01T00:00:00`);
            const lastDay = new Date(`${year}-${monthStr}-${new Date(year, month + 1, 0).getDate()}T23:59:59.999`);
            
            const formatDateForInput = (date) => {
                const y = date.getFullYear();
                const m = (date.getMonth() + 1).toString().padStart(2, '0');
                const d = date.getDate().toString().padStart(2, '0');
                return `${y}-${m}-${d}`;
            };
            this._domCache.tradeRecordsStartDate.value = formatDateForInput(firstDay);
            this._domCache.tradeRecordsEndDate.value = formatDateForInput(lastDay);
        }

        // 根据传入参数设置快捷按钮的选中状态
        this._updateQuickButtonState(year, month, startDate, endDate);

        // 异步加载数据
        this._loadDataAsync(year, month, startDate, endDate);
    },

    /**
     * 根据筛选参数更新快捷按钮的选中状态
     * @param {number} year - 年份
     * @param {number|null} month - 月份（null 表示全年）
     * @param {Date|null} startDate - 起始日期
     * @param {Date|null} endDate - 结束日期
     */
    _updateQuickButtonState(year, month, startDate, endDate) {
        // 移除所有快捷按钮的 active 状态
        document.querySelectorAll('.header-tr-quick-btn').forEach(b => b.classList.remove('active'));

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        // 判断是否匹配某个快捷筛选
        let matchedRange = null;

        if (startDate && endDate) {
            // 检查是否是"今日"
            const isToday = startDate.getFullYear() === currentYear &&
                           startDate.getMonth() === currentMonth &&
                           startDate.getDate() === currentDate &&
                           endDate.getFullYear() === currentYear &&
                           endDate.getMonth() === currentMonth &&
                           endDate.getDate() === currentDate;
            if (isToday) {
                matchedRange = 'today';
            }

            // 检查是否是"本周"
            if (!matchedRange) {
                const dayOfWeek = today.getDay();
                const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() + diffToMonday);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(today);
                weekEnd.setHours(23, 59, 59, 999);

                const isThisWeek = startDate.getTime() === weekStart.getTime() &&
                                  endDate.getTime() === weekEnd.getTime();
                if (isThisWeek) {
                    matchedRange = 'week';
                }
            }
        } else if (month !== null) {
            // 检查是否是"本月"
            if (year === currentYear && month === currentMonth) {
                matchedRange = 'month';
            }
        } else {
            // 检查是否是"本年"
            if (year === currentYear) {
                matchedRange = 'year';
            }
        }

        // 设置匹配的按钮为 active
        if (matchedRange) {
            const btn = document.querySelector(`.header-tr-quick-btn[data-range="${matchedRange}"]`);
            if (btn) {
                btn.classList.add('active');
            }
        }
    },

    /**
     * 异步加载数据
     */
    async _loadDataAsync(year, month, startDate, endDate) {
        // 获取数据
        const DataService = StockProfitCalculator.DataService;
        const Calculator = StockProfitCalculator.Calculator;

        const stocks = await DataService.getAllStocks();

        // 调试日志
        console.log('=== TradeRecords.load ===');
        console.log('查询参数：year =', year, ', month =', month);
        console.log('时间范围：startDate =', startDate, ', endDate =', endDate);
        console.log('获取到的 stocks:', stocks);
        console.log('stocks 数量:', stocks.length);

        // 填充股票筛选下拉框
        this._populateStockFilter(stocks);

        // 获取选中的股票
        const selectedStockCode = this._domCache.tradeRecordsStockFilter ? this._domCache.tradeRecordsStockFilter.value : '';

        // 为每只股票调用 calculateAll() 获取 sellRecords
        let allSellRecords = [];
        let allTrades = [];

        stocks.forEach(stock => {
            // 如果选中了特定股票，跳过其他股票
            if (selectedStockCode && stock.code !== selectedStockCode) {
                return;
            }

            console.log('股票:', stock.code, stock.name, '交易记录数:', stock.trades.length);
            
            // 获取所有交易记录（用于显示）
            stock.trades.forEach(trade => {
                allTrades.push({
                    ...trade,
                    stockCode: stock.code,
                    stockName: stock.name
                });
            });

            // 调用 calculateAll() 获取 sellRecords（包含盈亏）
            const calcResult = Calculator.calculateAll(stock.trades);
            
            // 合并 sellRecords，添加股票信息
            calcResult.sellRecords.forEach(sellRecord => {
                allSellRecords.push({
                    ...sellRecord,
                    stockCode: stock.code,
                    stockName: stock.name
                });
            });
        });

        console.log('所有交易记录数:', allTrades.length);
        console.log('所有卖出记录数:', allSellRecords.length);

        // 创建 sellProfitMap（使用 stockCode + tradeId 作为唯一 key，避免不同股票的 tradeId 重复）
        const sellProfitMap = new Map(
            allSellRecords.map(sell => [`${sell.stockCode}_${sell.tradeId}`, sell])
        );

        // 确定时间范围
        let queryStartDate, queryEndDate;
        if (startDate && endDate) {
            // 使用传入的时间范围（本周）
            queryStartDate = startDate;
            queryEndDate = endDate;
            console.log('使用传入的时间范围：', queryStartDate, '-', queryEndDate);
        } else if (month !== null) {
            // 使用月份范围（本月）
            const monthStr = (month + 1).toString().padStart(2, '0');
            queryStartDate = new Date(`${year}-${monthStr}-01T00:00:00`);
            queryEndDate = new Date(`${year}-${monthStr}-${new Date(year, month + 1, 0).getDate()}T23:59:59.999`);
            console.log('使用月份范围：', queryStartDate, '-', queryEndDate);
        } else {
            // 全年
            queryStartDate = new Date(`${year}-01-01T00:00:00`);
            queryEndDate = new Date(`${year}-12-31T23:59:59.999`);
            console.log('使用全年范围：', queryStartDate, '-', queryEndDate);
        }

        // 按日期排序
        allTrades.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 过滤交易记录并添加盈亏信息
        const periodTrades = allTrades.filter(trade => {
            const tradeDate = new Date(trade.date);
            return tradeDate >= queryStartDate && tradeDate <= queryEndDate;
        });

        console.log('过滤后的交易记录数:', periodTrades.length);

        // 获取所有股票的交易记录
        const stocksWithTrades = new Set();
        periodTrades.forEach(trade => {
            stocksWithTrades.add(trade.stockCode);
        });

        // 填充股票筛选器（并标记有交易记录的股票）
        this._populateStockFilter(stocks, Array.from(stocksWithTrades));

        // 为每笔交易添加盈亏信息
        const tradesWithProfit = periodTrades.map(trade => {
            const tradeWithProfit = {
                ...trade,
                profit: null,
                profitPercent: null
            };

            if (trade.type === 'sell') {
                // 从 sellProfitMap 获取盈亏（使用 stockCode + tradeId 作为唯一 key）
                const sellRecord = sellProfitMap.get(`${trade.stockCode}_${trade.id}`);
                if (sellRecord) {
                    tradeWithProfit.profit = sellRecord.profit;
                    tradeWithProfit.profitPercent = sellRecord.returnRate;
                }
            } else if (trade.type === 'dividend') {
                // 分红：收益为分红金额
                tradeWithProfit.profit = trade.totalAmount || 0;
            } else if (trade.type === 'tax') {
                // 红利税：收益为负数
                tradeWithProfit.profit = -(trade.totalAmount || 0);
            }

            return tradeWithProfit;
        });

        // 计算总收益
        const totalProfit = tradesWithProfit.reduce((sum, trade) => {
            return sum + (trade.profit || 0);
        }, 0);

        // 计算总手续费
        const totalFee = tradesWithProfit.reduce((sum, trade) => {
            return sum + (trade.fee || 0);
        }, 0);

        // 统计各类型交易数量
        const buyCount = tradesWithProfit.filter(t => t.type === 'buy').length;
        const sellCount = tradesWithProfit.filter(t => t.type === 'sell').length;
        const dividendCount = tradesWithProfit.filter(t => t.type === 'dividend').length;
        const taxCount = tradesWithProfit.filter(t => t.type === 'tax').length;

        console.log('查询结果：');
        console.log('  总收益:', totalProfit);
        console.log('  总手续费:', totalFee);
        console.log('  交易次数:', tradesWithProfit.length);
        console.log('  买入次数:', buyCount);
        console.log('  卖出次数:', sellCount);
        console.log('  分红次数:', dividendCount);
        console.log('  红利税次数:', taxCount);

        // 更新汇总信息
        this._updateSummary({
            totalProfit: totalProfit,
            totalFee: totalFee,
            tradeCount: tradesWithProfit.length,
            buyCount: buyCount,
            sellCount: sellCount,
            dividendCount: dividendCount,
            taxCount: taxCount
        });

        // 渲染图表
        this.renderCharts(tradesWithProfit);

        // 绑定图表类型切换事件
        this._bindChartTypeSelectors();

        // 渲染表格
        this._renderTable(tradesWithProfit);
    },

    /**
     * 更新汇总信息
     * @param {Object} result - 查询结果
     */
    _updateSummary(result) {
        this._ensureDOMCache();
        const totalProfitElement = this._domCache.tradeRecordsTotalProfit;
        const countElement = this._domCache.tradeRecordsCount;
        const totalFeeElement = this._domCache.tradeRecordsTotalFee;

        // 总收益
        const totalProfitFmt = Utils.formatLargeNumberWithTooltip(result.totalProfit);
        totalProfitElement.textContent = totalProfitFmt.display;
        totalProfitElement.className = 'tr-stat-value ' + (result.totalProfit >= 0 ? 'profit' : 'loss');
        if (totalProfitFmt.converted) {
            totalProfitElement.classList.add('large-number-tooltip');
            totalProfitElement.setAttribute('data-full-value', totalProfitFmt.full);
        }

        // 交易次数
        countElement.textContent = result.tradeCount;

        // 总手续费
        const totalFeeFmt = Utils.formatLargeNumberWithTooltip(result.totalFee);
        totalFeeElement.textContent = totalFeeFmt.display;
        if (totalFeeFmt.converted) {
            totalFeeElement.classList.add('large-number-tooltip');
            totalFeeElement.setAttribute('data-full-value', totalFeeFmt.full);
        }
    },

    /**
     * 渲染表格
     * @param {Array} trades - 交易记录
     */
    _renderTable(trades) {
        this._ensureDOMCache();
        const tableBody = this._domCache.tradeRecordsTableBody;

        if (!trades || trades.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="trade-records-empty">暂无交易记录</td></tr>';
            return;
        }

        // 使用 DocumentFragment 批量插入
        const fragment = document.createDocumentFragment();

        trades.forEach(trade => {
            // 主行
            const row = document.createElement('tr');

            // 交易类型映射
            const typeMap = {
                'buy': '买入',
                'sell': '卖出',
                'dividend': '分红',
                'tax': '红利税'
            };

            // 格式化盈亏
            let profitHtml = '--';
            if (trade.profit !== null) {
                const profitClass = trade.profit >= 0 ? 'profit' : 'loss';
                profitHtml = `<span class="trade-records-profit ${profitClass}">¥${trade.profit.toFixed(2)}</span>`;
            }

            // 格式化交易类型
            const typeClass = trade.type;

            row.innerHTML = `
                <td>${trade.date}</td>
                <td>${trade.stockCode}</td>
                <td>${trade.stockName}</td>
                <td><span class="trade-records-type ${typeClass}">${typeMap[trade.type]}</span></td>
                <td>¥${trade.price.toFixed(3)}</td>
                <td>${trade.amount}</td>
                <td>¥${trade.totalAmount.toFixed(2)}</td>
                <td>¥${trade.fee.toFixed(2)}</td>
                <td>${profitHtml}</td>
                <td>
                    <button class="btn btn-sm btn-edit-trade-record" data-stock-code="${trade.stockCode}" data-trade-id="${trade.id}" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                </td>
            `;

            fragment.appendChild(row);

            // 备注行（如果有备注）
            if (trade.note) {
                const noteRow = document.createElement('tr');
                noteRow.className = 'trade-records-note-row';
                noteRow.innerHTML = `
                    <td colspan="10">
                        <div class="trade-records-note-quote">
                            <span class="quote-icon">💬</span>
                            <span class="quote-text">${trade.note}</span>
                        </div>
                    </td>
                `;
                fragment.appendChild(noteRow);
            }
        });

        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);

        // 绑定编辑按钮事件
        this._bindEditButtons();
    },

    /**
     * 绑定编辑按钮事件
     */
    _bindEditButtons() {
        const editButtons = document.querySelectorAll('.btn-edit-trade-record');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stockCode = e.currentTarget.getAttribute('data-stock-code');
                const tradeId = parseInt(e.currentTarget.getAttribute('data-trade-id'));
                
                // 调用TradeManager的编辑方法，并设置当前股票代码
                if (StockProfitCalculator.TradeManager) {
                    // 先设置当前股票代码
                    StockProfitCalculator.TradeManager.setCurrentStock(stockCode);
                    // 再打开编辑弹窗
                    StockProfitCalculator.TradeManager.editTrade(tradeId, stockCode);
                }
            });
        });
    },

    /**
     * 绑定图表类型选择器事件
     */
    _bindChartTypeSelectors() {
        // 移除旧的事件监听器
        const selectors = document.querySelectorAll('.chart-type-selector');
        selectors.forEach(selector => {
            const newSelector = selector.cloneNode(true);
            selector.parentNode.replaceChild(newSelector, selector);
        });

        // 添加新的事件监听器
        const newSelectors = document.querySelectorAll('.chart-type-selector');
        newSelectors.forEach(selector => {
            selector.addEventListener('change', (event) => {
                const chartId = event.target.getAttribute('data-chart');
                const chartType = event.target.value;
                this._rerenderChart(chartId, chartType);
            });
        });
    },

    /**
     * 重新渲染指定图表
     * @param {string} chartId - 图表ID
     * @param {string} chartType - 图表类型
     */
    _rerenderChart(chartId, chartType) {
        const cachedData = this._chartDataCache[chartId];
        if (!cachedData) {
            console.warn('[TradeRecords._rerenderChart] 图表数据缓存不存在:', chartId);
            return;
        }

        // 根据图表ID调用对应的渲染方法
        switch (chartId) {
            case 'tradeRecordsDailyAmountChart':
                this._renderDailyAmountChart(cachedData, chartType);
                break;
            case 'tradeRecordsDailyProfitChart':
                this._renderDailyProfitChart(cachedData, chartType);
                break;
            case 'tradeRecordsTypeDistributionChart':
                this._renderTypeDistributionChart(cachedData, chartType);
                break;
            case 'tradeRecordsDailyCountChart':
                this._renderDailyCountChart(cachedData, chartType);
                break;
            case 'tradeRecordsStockAmountChart':
                this._renderStockAmountChart(cachedData, chartType);
                break;
            case 'tradeRecordsStockProfitChart':
                this._renderStockProfitChart(cachedData, chartType);
                break;
            default:
                console.warn('[TradeRecords._rerenderChart] 未知图表ID:', chartId);
        }
    },

    /**
     * 清空页面
     */
    clear() {
        this._ensureDOMCache();
        const tableBody = this._domCache.tradeRecordsTableBody;
        tableBody.innerHTML = '<tr><td colspan="9" class="trade-records-empty">暂无交易记录</td></tr>';
    },

    /**
     * 导出为 CSV
     */
    exportToCSV() {
        this._ensureDOMCache();

        if (!this._currentYear) {
            console.error('没有可导出的数据');
            return;
        }

        // 异步加载数据
        this._loadDataForExportAsync();
    },

    /**
     * 异步加载数据用于导出
     */
    async _loadDataForExportAsync() {
        const DataService = StockProfitCalculator.DataService;
        const Calculator = StockProfitCalculator.Calculator;

        const data = await DataService.getAllStocks();
        const stocks = data.stocks || [];

        // 收集所有股票的交易记录
        let allTrades = [];
        stocks.forEach(stock => {
            stock.trades.forEach(trade => {
                allTrades.push({
                    ...trade,
                    stockCode: stock.code,
                    stockName: stock.name
                });
            });
        });

        // 按日期排序
        allTrades.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 获取指定时间段的交易记录及盈亏信息
        const result = Calculator.getTradesByPeriodWithProfit(allTrades, this._currentYear, this._currentMonth);

        if (!result.trades || result.trades.length === 0) {
            console.error('没有可导出的数据');
            return;
        }

        // 构建 CSV 内容
        const csvHeader = '日期,股票代码,股票名称,交易类型,价格,数量,金额,手续费,盈亏\n';
        const csvRows = result.trades.map(trade => {
            const typeMap = {
                'buy': '买入',
                'sell': '卖出',
                'dividend': '分红',
                'tax': '红利税'
            };
            const profit = trade.profit !== null ? trade.profit.toFixed(2) : '--';
            return [
                trade.date,
                trade.stockCode,
                trade.stockName,
                typeMap[trade.type],
                trade.price.toFixed(3),
                trade.amount,
                trade.totalAmount.toFixed(2),
                trade.fee.toFixed(2),
                profit
            ].join(',');
        }).join('\n');

        const csvContent = '\uFEFF' + csvHeader + csvRows; // 添加 BOM

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = this._currentMonth ?
            `交易记录_${this._currentYear}年${this._currentMonth}月.csv` :
            `交易记录_${this._currentYear}年.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * 填充股票筛选下拉框
     * @param {Array} stocks - 股票列表
     * @param {Array} stocksWithTrades - 有交易记录的股票代码列表
     */
    _populateStockFilter(stocks, stocksWithTrades = []) {
        this._ensureDOMCache();
        const stockFilter = this._domCache.tradeRecordsStockFilter;
        if (!stockFilter) return;

        // 保存当前选中的值
        const currentValue = stockFilter.value;

        // 清空现有选项（保留第一个"全部股票"选项）
        while (stockFilter.options.length > 1) {
            stockFilter.remove(1);
        }

        // 添加股票选项
        stocks.forEach(stock => {
            const option = document.createElement('option');
            option.value = stock.code;
            
            // 如果该股票有交易记录，添加标记
            if (stocksWithTrades.includes(stock.code)) {
                option.textContent = `✓ ${stock.code} - ${stock.name}`;
                option.style.fontWeight = 'bold';
            } else {
                option.textContent = `${stock.code} - ${stock.name}`;
            }
            
            stockFilter.appendChild(option);
        });

        // 恢复之前选中的值
        stockFilter.value = currentValue;
    },

    /**
     * 处理筛选条件变化
     */
    _handleFilterChange() {
        this._ensureDOMCache();

        // 获取筛选条件
        const startDateStr = this._domCache.tradeRecordsStartDate.value;
        const endDateStr = this._domCache.tradeRecordsEndDate.value;

        let startDate = null;
        let endDate = null;

        // 解析日期
        if (startDateStr) {
            startDate = new Date(`${startDateStr}T00:00:00`);
        }
        if (endDateStr) {
            endDate = new Date(`${endDateStr}T23:59:59.999`);
        }

        // 调用 Router.showTradeRecords() 更新 Router.state 中的状态
        const Router = StockProfitCalculator.Router;
        if (Router) {
            Router.showTradeRecords(this._currentYear, null, startDate, endDate);
        }
    },

    /**
     * 刷新交易记录页面（保持当前筛选条件和滚动位置）
     */
    async refresh() {
        // 保存当前滚动位置（使用window.scrollY）
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        
        // 执行筛选刷新
        this._handleFilterChange();
        
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
    },

    /**
     * 渲染图表
     * @param {Array} trades - 交易记录
     */
    renderCharts(trades) {
        // 销毁所有图表实例，避免 DOM 移动导致的图表实例失效
        const ChartManager = StockProfitCalculator.ChartManager;
        if (ChartManager) {
            ChartManager.disposeAll();
        }

        // 计算图表数据
        const chartData = this._calculateChartData(trades);
        
        // 缓存图表数据
        this._chartDataCache.tradeRecordsDailyAmountChart = chartData.dailyAmountData;
        this._chartDataCache.tradeRecordsDailyProfitChart = chartData.dailyProfitData;
        this._chartDataCache.tradeRecordsTypeDistributionChart = chartData.typeDistributionData;
        this._chartDataCache.tradeRecordsStockAmountChart = chartData.stockAmountData;
        this._chartDataCache.tradeRecordsStockProfitChart = chartData.stockProfitData;
        this._chartDataCache.tradeRecordsDailyCountChart = chartData.dailyCountData;
        
        // 获取当前选择的图表类型
        const getChartType = (chartId) => {
            const selector = document.querySelector(`.chart-type-selector[data-chart="${chartId}"]`);
            return selector ? selector.value : null;
        };
        
        // 渲染每个图表
        this._renderDailyAmountChart(chartData.dailyAmountData, getChartType('tradeRecordsDailyAmountChart'));
        this._renderDailyProfitChart(chartData.dailyProfitData, getChartType('tradeRecordsDailyProfitChart'));
        this._renderTypeDistributionChart(chartData.typeDistributionData, getChartType('tradeRecordsTypeDistributionChart'));
        this._renderStockAmountChart(chartData.stockAmountData, getChartType('tradeRecordsStockAmountChart'));
        this._renderStockProfitChart(chartData.stockProfitData, getChartType('tradeRecordsStockProfitChart'));
        this._renderDailyCountChart(chartData.dailyCountData, getChartType('tradeRecordsDailyCountChart'));

        // 重新应用图表的显示/隐藏状态
        this._handleChartSelectionChange();
    },

    /**
     * 计算图表数据
     * @param {Array} trades - 交易记录
     * @returns {Object} 图表数据
     */
    _calculateChartData(trades) {
        // 按日期分组
        const dailyData = {};
        // 按股票分组
        const stockData = {};
        // 按类型分组
        const typeData = {
            buy: 0,
            sell: 0,
            dividend: 0,
            tax: 0
        };
        
        trades.forEach(trade => {
            const date = trade.date;
            const stockCode = trade.stockCode;
            const stockName = trade.stockName;
            const type = trade.type;
            const amount = trade.totalAmount || 0;
            const profit = trade.profit || 0;
            
            // 按日期分组
            if (!dailyData[date]) {
                dailyData[date] = {
                    buyAmount: 0,
                    sellAmount: 0,
                    profit: 0,
                    buyCount: 0,
                    sellCount: 0
                };
            }
            
            if (type === 'buy') {
                dailyData[date].buyAmount += amount;
                dailyData[date].buyCount += 1;
                typeData.buy += 1;
            } else if (type === 'sell') {
                dailyData[date].sellAmount += amount;
                dailyData[date].sellCount += 1;
                dailyData[date].profit += profit;
                typeData.sell += 1;
            } else if (type === 'dividend') {
                dailyData[date].profit += profit;
                typeData.dividend += 1;
            } else if (type === 'tax') {
                dailyData[date].profit += profit;
                typeData.tax += 1;
            }
            
            // 按股票分组
            if (!stockData[stockCode]) {
                stockData[stockCode] = {
                    stockName: stockName,
                    buyAmount: 0,
                    sellAmount: 0,
                    profit: 0
                };
            }
            
            if (type === 'buy') {
                stockData[stockCode].buyAmount += amount;
            } else if (type === 'sell') {
                stockData[stockCode].sellAmount += amount;
                stockData[stockCode].profit += profit;
            } else {
                stockData[stockCode].profit += profit;
            }
        });
        
        // 排序日期
        const sortedDates = Object.keys(dailyData).sort();
        
        // 准备每日交易额数据
        const dailyAmountData = {
            dates: sortedDates,
            buyAmounts: sortedDates.map(date => dailyData[date].buyAmount),
            sellAmounts: sortedDates.map(date => dailyData[date].sellAmount)
        };
        
        // 准备每日收益数据（累计）
        const dailyProfitData = {
            dates: sortedDates,
            cumulativeProfit: []
        };
        let cumulativeProfit = 0;
        sortedDates.forEach(date => {
            cumulativeProfit += dailyData[date].profit;
            dailyProfitData.cumulativeProfit.push(cumulativeProfit);
        });
        
        // 准备交易类型分布数据
        const typeDistributionData = [
            { value: typeData.buy, name: '买入' },
            { value: typeData.sell, name: '卖出' },
            { value: typeData.dividend, name: '分红' },
            { value: typeData.tax, name: '红利税' }
        ].filter(item => item.value > 0); // 只显示有数据的类型
        
        // 准备股票交易额数据（按总交易额排序）
        const stockAmountData = Object.values(stockData)
            .map(stock => ({
                name: stock.stockName,
                buyAmount: stock.buyAmount,
                sellAmount: stock.sellAmount,
                totalAmount: stock.buyAmount + stock.sellAmount
            }))
            .sort((a, b) => (b.buyAmount + b.sellAmount) - (a.buyAmount + a.sellAmount))
            .slice(0, 10); // 只显示前10
        
        // 准备股票收益数据（按收益绝对值排序）
        const stockProfitData = Object.values(stockData)
            .map(stock => ({
                name: stock.stockName,
                profit: stock.profit,
                buyAmount: stock.buyAmount,
                sellAmount: stock.sellAmount,
                totalAmount: stock.buyAmount + stock.sellAmount
            }))
            .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
            .slice(0, 10); // 只显示前10
        
        // 准备每日交易次数数据
        const dailyCountData = {
            dates: sortedDates,
            buyCounts: sortedDates.map(date => dailyData[date].buyCount),
            sellCounts: sortedDates.map(date => dailyData[date].sellCount)
        };
        
        return {
            dailyAmountData,
            dailyProfitData,
            typeDistributionData,
            stockAmountData,
            stockProfitData,
            dailyCountData
        };
    },

    /**
     * 渲染每日交易额趋势图
     */
    _renderDailyAmountChart(data, chartType = 'line') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsDailyAmountChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        // 根据图表类型配置
        let seriesType = 'line';
        let stack = null;
        let areaStyle = null;
        
        if (chartType === 'bar') {
            seriesType = 'bar';
        } else if (chartType === 'stackedBar') {
            seriesType = 'bar';
            stack = 'total';
        } else if (chartType === 'line') {
            seriesType = 'line';
        }
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: function(params) {
                    let result = params[0].name + '<br/>';
                    params.forEach(param => {
                        const value = param.value !== undefined ? param.value.toFixed(2) : '0.00';
                        result += `${param.marker}${param.seriesName}: ¥${value}<br/>`;
                    });
                    return result;
                }
            },
            legend: {
                data: ['买入金额', '卖出金额'],
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.dates.map(date => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}月${d.getDate()}日`;
                })
            },
            yAxis: {
                type: 'value',
                name: '金额（元）'
            },
            series: [
                {
                    name: '买入金额',
                    type: seriesType,
                    stack: stack,
                    smooth: chartType === 'line',
                    data: data.buyAmounts,
                    itemStyle: {
                        color: '#4caf50'
                    },
                    areaStyle: areaStyle
                },
                {
                    name: '卖出金额',
                    type: seriesType,
                    stack: stack,
                    smooth: chartType === 'line',
                    data: data.sellAmounts,
                    itemStyle: {
                        color: '#f44336'
                    },
                    areaStyle: areaStyle
                }
            ]
        };
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    },

    /**
     * 渲染每日收益趋势图（累计）
     */
    _renderDailyProfitChart(data, chartType = 'line') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsDailyProfitChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        // 根据图表类型配置
        let seriesType = 'line';
        let areaStyle = null;
        
        if (chartType === 'bar') {
            seriesType = 'bar';
            areaStyle = null;
        } else if (chartType === 'line') {
            seriesType = 'line';
            areaStyle = null;  // 折线图不显示面积效果
        } else if (chartType === 'area') {
            seriesType = 'line';
            areaStyle = {  // 面积图显示填充效果
                color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(244, 67, 54, 0.8)' },
                        { offset: 1, color: 'rgba(244, 67, 54, 0.3)' }
                    ]
                }
            };
        }
        
        const option = {
            legend: {
                data: ['累计收益'],
                top: 10,
                textStyle: { fontSize: 12 }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const value = params[0].value !== undefined ? params[0].value.toFixed(2) : '0.00';
                    return `${params[0].name}<br/>累计收益: ¥${value}`;
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
                data: data.dates.map(date => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}月${d.getDate()}日`;
                })
            },
            yAxis: {
                type: 'value',
                name: '收益（元）'
            },
            series: [
                {
                    name: '累计收益',
                    type: seriesType,
                    data: data.cumulativeProfit,
                    smooth: chartType !== 'bar',
                    itemStyle: {
                        color: (params) => {
                            return params.value >= 0 ? '#f44336' : '#4caf50';
                        }
                    },
                    areaStyle: areaStyle
                }
            ]
        };
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    },

    /**
     * 渲染交易类型分布饼图
     */
    _renderTypeDistributionChart(data, chartType = 'bar') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsTypeDistributionChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        if (data.length === 0) {
            // 没有数据，显示提示
            const chartDom = document.getElementById(chartId);
            if (chartDom) {
                chartDom.innerHTML = '<p style="text-align: center; padding: 100px 0; color: #999;">暂无数据</p>';
            }
            return;
        }
        
        let option = {};
        
        if (chartType === 'pie') {
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const value = params.value !== undefined ? params.value : 0;
                        const percent = params.percent !== undefined ? params.percent.toFixed(2) : '0.00';
                        return `${params.name}<br/>次数: ${value}<br/>占比: ${percent}%`;
                    }
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: data.map(item => item.name)
                },
                series: [
                    {
                        name: '交易类型',
                        type: 'pie',
                        radius: '50%',
                        data: data,
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            };
        } else if (chartType === 'donut') {
            // 环形图
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const value = params.value !== undefined ? params.value : 0;
                        const percent = params.percent !== undefined ? params.percent.toFixed(2) : '0.00';
                        return `${params.name}<br/>次数: ${value}<br/>占比: ${percent}%`;
                    }
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: data.map(item => item.name)
                },
                series: [
                    {
                        name: '交易类型',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: data,
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            };
        } else if (chartType === 'bar') {
            // 条形图
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    },
                    formatter: function(params) {
                        const value = params[0].value !== undefined ? params[0].value.toFixed(2) : '0.00';
                        return `${params[0].name}<br/>金额: ¥${value}`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value'
                },
                yAxis: {
                    type: 'category',
                    data: data.map(item => item.name)
                },
                series: [
                    {
                        name: '交易类型',
                        type: 'bar',
                        data: data,
                        itemStyle: {
                            color: (params) => {
                                const colors = ['#4caf50', '#f44336', '#2196f3', '#ff9800'];
                                return colors[params.dataIndex % colors.length];
                            }
                        }
                    }
                ]
            };
        }
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    },

    /**
     * 渲染股票交易额排行图
     */
    _renderStockAmountChart(data, chartType = 'bubble') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsStockAmountChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        if (data.length === 0) {
            const chartDom = document.getElementById(chartId);
            if (chartDom) {
                chartDom.innerHTML = '<p style="text-align: center; padding: 100px 0; color: #999;">暂无数据</p>';
            }
            return;
        }
        
        let option = {};
        
        if (chartType === 'bubble') {
            // 气泡图
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const buyAmount = params.data[0] !== undefined ? params.data[0].toFixed(2) : '0.00';
                        const sellAmount = params.data[1] !== undefined ? params.data[1].toFixed(2) : '0.00';
                        const totalAmount = params.data[2] !== undefined ? params.data[2].toFixed(2) : '0.00';
                        return `${params.name}<br/>买入金额: ¥${buyAmount}<br/>卖出金额: ¥${sellAmount}<br/>总交易额: ¥${totalAmount}`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    name: '买入金额（元）',
                    scale: true
                },
                yAxis: {
                    type: 'value',
                    name: '卖出金额（元）',
                    scale: true
                },
                series: [
                    {
                        type: 'scatter',
                        data: data.map(item => [item.buyAmount, item.sellAmount, item.totalAmount, item.name]),
                        symbolSize: function(data) {
                            return Math.min(50, Math.max(15, data[2] / 5000));
                        },
                        itemStyle: {
                            color: '#667eea',
                            opacity: 0.7
                        },
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.data[3];
                            },
                            fontSize: 10
                        }
                    }
                ]
            };
        } else if (chartType === 'bidirectionalBar') {
            // 双向柱状图
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    },
                    formatter: function(params) {
                        let result = params[0].name + '<br/>';
                        params.forEach(param => {
                            const value = param.value !== undefined ? Math.abs(param.value).toFixed(2) : '0.00';
                            result += `${param.marker}${param.seriesName}: ¥${value}<br/>`;
                        });
                        return result;
                    }
                },
                legend: {
                    data: ['买入', '卖出'],
                    top: 10
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '15%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: data.map(item => item.name),
                    axisLabel: {
                        rotate: 45,
                        interval: 0,
                        formatter: function(value) {
                            if (value.length > 6) {
                                return value.substring(0, 6) + '...';
                            }
                            return value;
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '金额（元）',
                    axisLabel: {
                        formatter: function(value) {
                            return '¥' + Math.abs(value);
                        }
                    }
                },
                series: [
                    {
                        name: '买入',
                        type: 'bar',
                        data: data.map(item => item.buyAmount),
                        itemStyle: {
                            color: '#4caf50'
                        }
                    },
                    {
                        name: '卖出',
                        type: 'bar',
                        data: data.map(item => -item.sellAmount),
                        itemStyle: {
                            color: '#f44336'
                        }
                    }
                ]
            };
        } else if (chartType === 'bidirectionalBarHorizontal') {
            // 双向条形图（横向）
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    },
                    formatter: function(params) {
                        let result = params[0].name + '<br/>';
                        params.forEach(param => {
                            const value = param.value !== undefined ? Math.abs(param.value).toFixed(2) : '0.00';
                            result += `${param.marker}${param.seriesName}: ¥${value}<br/>`;
                        });
                        return result;
                    }
                },
                legend: {
                    data: ['买入', '卖出'],
                    top: 10
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '15%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    name: '金额（元）',
                    axisLabel: {
                        formatter: function(value) {
                            return '¥' + Math.abs(value);
                        }
                    }
                },
                yAxis: {
                    type: 'category',
                    data: data.map(item => item.name),
                    axisLabel: {
                        formatter: function(value) {
                            if (value.length > 6) {
                                return value.substring(0, 6) + '...';
                            }
                            return value;
                        }
                    }
                },
                series: [
                    {
                        name: '买入',
                        type: 'bar',
                        data: data.map(item => item.buyAmount),
                        itemStyle: {
                            color: '#4caf50'
                        }
                    },
                    {
                        name: '卖出',
                        type: 'bar',
                        data: data.map(item => -item.sellAmount),
                        itemStyle: {
                            color: '#f44336'
                        }
                    }
                ]
            };
        } else if (chartType === 'stackedBar') {
            // 堆叠柱状图
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                legend: {
                    data: ['买入金额', '卖出金额'],
                    top: 10
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '15%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: data.map(item => item.name),
                    axisLabel: {
                        rotate: 45,
                        interval: 0,
                        formatter: function(value) {
                            if (value.length > 6) {
                                return value.substring(0, 6) + '...';
                            }
                            return value;
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '金额（元）'
                },
                series: [
                    {
                        name: '买入金额',
                        type: 'bar',
                        stack: 'total',
                        data: data.map(item => item.buyAmount),
                        itemStyle: {
                            color: '#4caf50'
                        }
                    },
                    {
                        name: '卖出金额',
                        type: 'bar',
                        stack: 'total',
                        data: data.map(item => item.sellAmount),
                        itemStyle: {
                            color: '#f44336'
                        }
                    }
                ]
            };
        }
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    },

    /**
     * 渲染股票收益排行图
     */
    _renderStockProfitChart(data, chartType = 'bar') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsStockProfitChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        if (data.length === 0) {
            const chartDom = document.getElementById(chartId);
            if (chartDom) {
                chartDom.innerHTML = '<p style="text-align: center; padding: 100px 0; color: #999;">暂无数据</p>';
            }
            return;
        }
        
        let option = {};
        
        if (chartType === 'bar') {
            // 柱状图
            option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
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
                    data: data.map(item => item.name),
                    axisLabel: {
                        rotate: 45,
                        interval: 0,
                        formatter: function(value) {
                            if (value.length > 6) {
                                return value.substring(0, 6) + '...';
                            }
                            return value;
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '收益（元）'
                },
                series: [
                    {
                        name: '收益',
                        type: 'bar',
                        data: data.map(item => item.profit),
                        itemStyle: {
                            color: (params) => {
                                return params.value >= 0 ? '#f44336' : '#4caf50';
                            }
                        }
                    }
                ]
            };
        } else if (chartType === 'scatter') {
            // 散点图
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const totalAmount = params.data[0] !== undefined ? params.data[0].toFixed(2) : '0.00';
                        const profit = params.data[1] !== undefined ? params.data[1].toFixed(2) : '0.00';
                        return `${params.name}<br/>总交易额: ¥${totalAmount}<br/>收益: ¥${profit}`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    name: '总交易额（元）',
                    scale: true
                },
                yAxis: {
                    type: 'value',
                    name: '收益（元）',
                    scale: true
                },
                series: [
                    {
                        type: 'scatter',
                        data: data.map(item => [item.totalAmount, item.profit, item.name]),
                        symbolSize: function(data) {
                            return Math.min(30, Math.max(10, Math.abs(data[1]) / 500));
                        },
                        itemStyle: {
                            color: (params) => {
                                return params.data[1] >= 0 ? '#f44336' : '#4caf50';
                            }
                        },
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.data[2];
                            },
                            fontSize: 10
                        }
                    }
                ]
            };
        } else if (chartType === 'bubble') {
            // 气泡图
            option = {
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const totalAmount = params.data[0] !== undefined ? params.data[0].toFixed(2) : '0.00';
                        const profit = params.data[1] !== undefined ? params.data[1].toFixed(2) : '0.00';
                        return `${params.name}<br/>总交易额: ¥${totalAmount}<br/>收益: ¥${profit}`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    name: '总交易额（元）',
                    scale: true
                },
                yAxis: {
                    type: 'value',
                    name: '收益（元）',
                    scale: true
                },
                series: [
                    {
                        type: 'scatter',
                        data: data.map(item => [item.totalAmount, item.profit, item.name]),
                        symbolSize: function(data) {
                            return Math.min(50, Math.max(15, data[0] / 5000));
                        },
                        itemStyle: {
                            color: (params) => {
                                return params.data[1] >= 0 ? '#f44336' : '#4caf50';
                            },
                            opacity: 0.7
                        },
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.data[2];
                            },
                            fontSize: 10
                        }
                    }
                ]
            };
        } else if (chartType === 'treemap') {
            // 矩形树图
            option = {
                tooltip: {
                    formatter: '{b}<br/>收益: ¥{c}'
                },
                series: [
                    {
                        type: 'treemap',
                        data: data.map(item => ({
                            name: item.name,
                            value: Math.abs(item.profit),
                            itemStyle: {
                                color: item.profit >= 0 ? '#f44336' : '#4caf50'
                            }
                        })),
                        levels: [
                            {
                                itemStyle: {
                                    borderColor: '#fff',
                                    borderWidth: 2,
                                    gapWidth: 1
                                }
                            }
                        ]
                    }
                ]
            };
        } else if (chartType === 'radar') {
            // 雷达图
            option = {
                tooltip: {
                    trigger: 'item'
                },
                legend: {
                    data: data.map(item => item.name),
                    top: 10
                },
                radar: {
                    indicator: [
                        { name: '收益', max: Math.max(...data.map(item => Math.abs(item.profit))) },
                        { name: '买入金额', max: Math.max(...data.map(item => item.buyAmount || 0)) },
                        { name: '卖出金额', max: Math.max(...data.map(item => item.sellAmount || 0)) },
                        { name: '总交易额', max: Math.max(...data.map(item => item.totalAmount)) }
                    ]
                },
                series: [
                    {
                        type: 'radar',
                        data: data.map(item => ({
                            value: [
                                item.profit,
                                item.buyAmount || 0,
                                item.sellAmount || 0,
                                item.totalAmount
                            ],
                            name: item.name,
                            itemStyle: {
                                color: item.profit >= 0 ? '#f44336' : '#4caf50'
                            }
                        }))
                    }
                ]
            };
        }
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    },

    /**
     * 渲染每日交易次数趋势图
     */
    _renderDailyCountChart(data, chartType = 'line') {
        const ChartManager = StockProfitCalculator.ChartManager;
        const chartId = 'tradeRecordsDailyCountChart';
        
        // 销毁旧图表
        ChartManager.dispose(chartId);
        
        // 根据图表类型配置
        let seriesType = 'line';
        let stack = null;
        
        if (chartType === 'bar') {
            seriesType = 'bar';
        } else if (chartType === 'stackedBar') {
            seriesType = 'bar';
            stack = 'total';
        } else if (chartType === 'line') {
            seriesType = 'line';
        }
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: function(params) {
                    let result = params[0].name + '<br/>';
                    params.forEach(param => {
                        const value = param.value !== undefined ? param.value : 0;
                        result += `${param.marker}${param.seriesName}: ${value}次<br/>`;
                    });
                    return result;
                }
            },
            legend: {
                data: ['买入次数', '卖出次数'],
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.dates.map(date => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}月${d.getDate()}日`;
                })
            },
            yAxis: {
                type: 'value',
                name: '次数'
            },
            series: [
                {
                    name: '买入次数',
                    type: seriesType,
                    stack: stack,
                    smooth: chartType === 'line',
                    data: data.buyCounts,
                    itemStyle: {
                        color: '#4caf50'
                    }
                },
                {
                    name: '卖出次数',
                    type: seriesType,
                    stack: stack,
                    smooth: chartType === 'line',
                    data: data.sellCounts,
                    itemStyle: {
                        color: '#f44336'
                    }
                }
            ]
        };
        
        const chartDom = document.getElementById(chartId);
        if (chartDom) {
            ChartManager.init(chartId, chartDom, option);
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.TradeRecords = TradeRecords;
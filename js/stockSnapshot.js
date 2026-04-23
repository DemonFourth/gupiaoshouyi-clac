/**
 * 股票页面快照构建模块
 * 负责把单只股票在页面中需要的派生数据一次性计算出来
 *
 * 版本: 1.1.0
 * 更新日期: 2026-03-12
 * 修改内容: 移除对 Calculator 的直接依赖，通过 DataService 获取计算结果
 */
const StockSnapshot = {
    _cache: new Map(), // 改用 Map 而不是 WeakMap，因为我们需要用 stockCode 作为 key

    /**
     * 构建单只股票快照
     * @param {string} stockCode - 股票代码
     * @param {Object|null} quote - 行情对象 { price, change, changePercent }
     * @returns {Object|null} 页面级快照
     */
    async build(stockCode, quote = null) {
        const base = await this.getBaseSnapshot(stockCode);
        if (!base) return null;
        return this.attachQuote(base, quote);
    },

    /**
     * 获取基础快照（不包含实时行情）
     * @param {string} stockCode - 股票代码
     * @returns {Promise<Object|null>} 基础快照
     */
    async getBaseSnapshot(stockCode) {
        if (!stockCode) return null;

        const today = new Date().toISOString().split('T')[0];
        const cached = this._cache.get(stockCode);

        if (cached && cached.dateKey === today) {
            return cached.baseSnapshot;
        }

        // 通过 DataService 获取计算结果，而不是直接调用 Calculator
        const calcResult = await StockProfitCalculator.DataService.getCalculationResult(stockCode);
        if (!calcResult || !calcResult.summary) return null;

        const stock = await StockProfitCalculator.DataService.getStock(stockCode);
        if (!stock) return null;

        const summary = calcResult.summary;
        const periodProfit = this.calculatePeriodProfit(stock.trades, new Date(), calcResult);
        const holdingInfo = this.getCurrentHoldingInfo(calcResult, stock.trades);
        const yearlyStats = this.getYearlyStats(stock.trades, calcResult);

        const costPerShare = summary.currentHolding > 0 ? (summary.currentCost / summary.currentHolding) : 0;

        const buyTrades = stock.trades
            .filter(trade => trade.type === 'buy')
            .sort((a, b) => a.date.localeCompare(b.date));

        const baseSnapshot = {
            stockCode,
            stock,
            calcResult,
            summary,
            periodProfit,
            costPerShare,
            holdingInfo,
            yearlyStats,
            firstBuyDate: buyTrades[0] ? buyTrades[0].date : null,
            holdingCost: summary.currentCost,
            // 持仓周期历史
            cycleHistory: calcResult.holdingCycleHistory || [],
            // 当前轮次编号
            currentCycleNumber: this._getCurrentCycleNumber(calcResult.holdingCycleHistory, summary.currentHolding > 0)
        };

        this._cache.set(stockCode, {
            dateKey: today,
            baseSnapshot
        });

        return baseSnapshot;
    },

    attachQuote(baseSnapshot, quote = null) {
        const summary = baseSnapshot.summary;
        const currentPrice = quote ? quote.price : null;
        const marketValue = (currentPrice !== null && summary.currentHolding > 0)
            ? summary.currentHolding * currentPrice
            : null;

        const holdingProfit = marketValue !== null
            ? marketValue - summary.currentCost
            : null;

        let holdingReturnRate = null;

        if (marketValue !== null && holdingProfit !== null) {
            holdingReturnRate = summary.currentCost > 0 ? (holdingProfit / summary.currentCost * 100) : 0;
        }

        // 当前持仓周期收益 = 当前持仓周期的已实现收益 + 浮动盈亏 + 当前持仓周期内的分红 - 当前持仓周期内的红利税
        let cycleProfit = null;
        let cycleReturnRate = null;

        if (marketValue !== null && holdingProfit !== null) {
            cycleProfit = (summary.currentCycleProfit || 0) + holdingProfit + (summary.currentCycleDividend || 0) - (summary.currentCycleTax || 0);
        }

        // 持有股收益 = 浮动盈亏（当前持有股数的盈亏总和）
        let currentHoldingProfit = null;
        let currentHoldingReturnRate = null;

        if (marketValue !== null && holdingProfit !== null) {
            currentHoldingProfit = holdingProfit;
            currentHoldingReturnRate = summary.currentCost > 0 ? (currentHoldingProfit / summary.currentCost * 100) : 0;
        }

        let totalAllProfit = summary.totalProfit;
        let totalAllReturnRate = summary.totalReturnRate;
        let dilutedCostPerShare = null;

        if (marketValue !== null) {
            totalAllProfit = summary.totalProfit + holdingProfit;
            // 摊薄成本：只考虑卖出收益，不考虑分红和红利税
            // 累计卖出收益 = 当前持仓周期收益 - 分红 + 红利税
            const cumulativeSellProfit = (summary.currentCycleProfit || 0) - (summary.currentCycleDividend || 0) + (summary.currentCycleTax || 0);
            const dilutedCost = summary.currentCost - cumulativeSellProfit;
            dilutedCostPerShare = summary.currentHolding > 0 ? (dilutedCost / summary.currentHolding) : null;

            // 持仓周期收益率 = (现价 - 摊薄成本) / 摊薄成本 * 100%
            // 使用当前持仓周期内的摊薄成本计算，确保多轮持仓周期的独立性
            if (dilutedCostPerShare !== null && dilutedCostPerShare > 0) {
                cycleReturnRate = (currentPrice - dilutedCostPerShare) / dilutedCostPerShare * 100;
            }

            // 总收益率：使用所有收益的总和（而不是当前持仓周期收益）
            // 总收益率 = 总收益 / 总投入成本 × 100%
            // 这样可以准确反映整体投资回报率，不受当前持仓周期收益为负的影响
            totalAllReturnRate = summary.totalBuyCost > 0 ? (totalAllProfit / summary.totalBuyCost * 100) : 0;
        }

        return {
            ...baseSnapshot,
            quote,
            currentPrice,
            marketValue,
            holdingProfit,
            holdingReturnRate,
            cycleProfit,
            cycleReturnRate,
            currentHoldingProfit,
            currentHoldingReturnRate,
            totalAllProfit,
            totalAllReturnRate,
            dilutedCostPerShare
        };
    },

    /**
     * 使指定股票的缓存失效
     * @param {string} stockCode - 股票代码
     */
    invalidate(stockCode) {
        this._cache.delete(stockCode);
    },

    /**
     * 清除所有缓存
     */
    clear() {
        this._cache.clear();
    },

    /**
     * 计算周期收益
     * @param {Array} trades - 交易记录
     * @param {Date} date - 参考日期
     * @param {Object} calcResult - 计算结果
     * @returns {Object} 周期收益
     */
    calculatePeriodProfit(trades, date, calcResult) {
        const Calculator = StockProfitCalculator.Calculator;
        const periodProfit = Calculator.calculatePeriodProfit(trades, date, calcResult);
        
        return {
            weeklyProfit: periodProfit.weeklyProfit,
            monthlyProfit: periodProfit.monthlyProfit
        };
    },

    /**
     * 获取当前持仓的起始日期和持仓天数
     * @param {Object} calcResult - 计算结果
     * @param {Array} trades - 交易记录
     * @returns {Object} 持仓信息
     */
    getCurrentHoldingInfo(calcResult, trades) {
        if (calcResult.summary.currentHolding <= 0) {
            return {
                startDate: '--',
                holdingDays: 0
            };
        }

        // 从 cycleInfo 和 holdingQueue 获取当前持仓周期的开始日期
        const cycleInfo = calcResult.cycleInfo || {};
        const holdingQueue = calcResult.holdingQueue || [];

        // 获取当前持仓队列中的最小周期编号
        const currentCycleNums = holdingQueue.map(h => {
            const tradeInfo = cycleInfo[h.id];
            return tradeInfo ? tradeInfo.cycle : null;
        }).filter(c => c !== null);

        let cycleStartDate = null;

        if (currentCycleNums.length > 0) {
            // 获取当前最小周期编号
            const currentCycle = Math.min(...currentCycleNums);

            // 找到该周期对应的建仓交易，获取开始日期
            for (const tradeId in cycleInfo) {
                const info = cycleInfo[tradeId];
                if (info.cycle === currentCycle && info.buyType === '建仓') {
                    cycleStartDate = info.cycleStart;
                    break;
                }
            }
        }

        // 如果没有找到，使用所有买入交易的最早日期作为fallback
        if (!cycleStartDate) {
            const buyTrades = trades
                .filter(trade => trade.type === 'buy')
                .sort((a, b) => a.date.localeCompare(b.date));
            cycleStartDate = buyTrades[0] ? buyTrades[0].date : null;
        }

        if (!cycleStartDate) {
            return {
                startDate: '--',
                holdingDays: 0
            };
        }

        const startDate = new Date(cycleStartDate);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return {
            startDate: cycleStartDate,
            holdingDays: Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)))
        };
    },

    /**
     * 获取年度统计
     * @param {Array} trades - 交易记录
     * @param {Object} calcResult - 计算结果
     * @returns {Array} 年度统计
     */
    getYearlyStats(trades, calcResult) {
        const yearlyData = {};

        trades.forEach(trade => {
            const year = trade.date.substring(0, 4);
            if (!yearlyData[year]) {
                yearlyData[year] = { profit: 0, trades: 0 };
            }
            yearlyData[year].trades++;
        });

        // 从 timeSeries 中获取收益数据
        if (calcResult.timeSeries && calcResult.timeSeries.dates) {
            calcResult.timeSeries.dates.forEach((date, index) => {
                const year = date.substring(0, 4);
                if (yearlyData[year]) {
                    // 从 profits 数组中获取收益
                    const profit = calcResult.timeSeries.profits[index] || 0;
                    yearlyData[year].profit += profit;
                }
            });
        }

        const years = Object.keys(yearlyData).sort((a, b) => b - a);
        return years.slice(0, 3).map(year => ({
            year,
            profit: yearlyData[year].profit,
            trades: yearlyData[year].trades
        }));
    },

    /**
     * 获取当前轮次编号
     * @private
     * @param {Array} cycleHistory - 周期历史数组
     * @param {boolean} isHolding - 是否当前有持仓
     * @returns {number|null} 当前轮次编号
     */
    _getCurrentCycleNumber(cycleHistory, isHolding) {
        if (!cycleHistory || cycleHistory.length === 0) {
            return null;
        }
        
        // 如果当前有持仓，返回最后一个周期编号
        if (isHolding) {
            return cycleHistory[cycleHistory.length - 1].cycle;
        }
        
        // 已清仓，返回总周期数
        return cycleHistory.length;
    }
};

// 挂载到命名空间
StockProfitCalculator.StockSnapshot = StockSnapshot;

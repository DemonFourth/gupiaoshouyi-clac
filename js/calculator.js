/**
 * 计算模块
 * 负责FIFO计算、收益率计算等核心算法
 */

const Calculator = {
    // ==================== 私有方法（_前缀）====================
    
    /**
     * 初始化计算状态
     * @private
     * @param {Array} sortedTrades - 已排序的交易记录
     * @returns {Object} 初始化的状态对象
     */
    _initializeCalculationState(sortedTrades) {
        return {
            // 基础数据
            holdingQueue: [],
            totalBuyCost: 0,
            totalSellAmount: 0,
            totalProfit: 0,
            totalFee: 0,
            currentHolding: 0,
            sellRecords: [],
            
            // 持仓明细
            buyRecords: [],
            sellRecordsForDetail: [],
            
            // 时间序列
            timeSeriesData: {
                dates: [],
                holdings: [],
                costs: [],
                profits: [],
                cumulativeProfits: [],
                returnRates: [],
                costPerShares: [],
                dilutedCostPerShares: []
            },
            cumulativeProfit: 0,
            currentCycleProfit: 0,
            currentCycleDividend: 0,  // 当前持仓周期内的分红总和
            currentCycleTax: 0,         // 当前持仓周期内的红利税总和
            
            // 持仓周期
            tradeCycleInfo: {},
            cycleHoldingQueue: [],
            currentCycle: 0,
            cycleStartDates: {},
            hasPosition: false,
            
            // 加仓对比
            lastAdditionPrice: null,
            lastAdditionTradeId: null,
            lastAdditionDate: null,
            additionComparisons: []
        };
    },

    /**
     * 处理买入交易
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} state - 计算状态
     */
    _processBuyTrade(trade, state) {
        const tradeValue = trade.totalAmount || (trade.price * trade.amount) || 0;
        
        // 添加到持仓队列
        state.holdingQueue.push({
            id: trade.id,
            date: trade.date,
            price: trade.price,
            amount: trade.amount,
            fee: trade.fee
        });
        
        // 更新基础数据
        state.totalBuyCost += tradeValue + trade.fee;
        state.totalFee += trade.fee;
        state.currentHolding += trade.amount;
        
        // 持仓明细
        state.buyRecords.push({
            id: trade.id,
            date: trade.date,
            price: trade.price,
            amount: trade.amount,
            fee: trade.fee,
            soldAmount: 0,
            sellDetails: []
        });
        
        // 持仓周期
        if (!state.hasPosition) {
            state.currentCycle++;
            state.cycleStartDates[state.currentCycle] = trade.date;
            state.hasPosition = true;
            state.tradeCycleInfo[trade.id] = {
                cycle: state.currentCycle,
                cycleStart: state.cycleStartDates[state.currentCycle],
                buyType: '建仓'
            };
        } else {
            state.tradeCycleInfo[trade.id] = {
                cycle: state.currentCycle,
                cycleStart: state.cycleStartDates[state.currentCycle],
                buyType: '加仓'
            };
        }
        state.cycleHoldingQueue.push({
            id: trade.id,
            amount: trade.amount,
            cycle: state.currentCycle
        });
        
        // 加仓对比数据
        const cycleInfo = state.tradeCycleInfo[trade.id];
        if (cycleInfo && cycleInfo.buyType === '加仓' && state.lastAdditionPrice !== null) {
            const change = trade.price - state.lastAdditionPrice;
            const changePercent = state.lastAdditionPrice > 0
                ? (change / state.lastAdditionPrice * 100)
                : 0;
            state.additionComparisons.push({
                tradeId: trade.id,
                date: trade.date,
                price: trade.price,
                lastPrice: state.lastAdditionPrice,
                change: change,
                changePercent: changePercent,
                isLatestAddition: false
            });
        }
        
        // 更新上次加仓信息
        state.lastAdditionPrice = trade.price;
        state.lastAdditionTradeId = trade.id;
        state.lastAdditionDate = trade.date;
    },

    /**
     * 处理卖出交易（FIFO算法）
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} state - 计算状态
     */
    _processSellTrade(trade, state) {
        const tradeValue = trade.totalAmount || (trade.price * trade.amount) || 0;
        let sellAmount = trade.amount;
        let costBasis = 0;
        let remainingAmount = sellAmount;
        let matchedBatches = [];
        
        // FIFO匹配
        while (remainingAmount > 0 && state.holdingQueue.length > 0) {
            const holding = state.holdingQueue[0];
            
            if (holding.amount <= remainingAmount) {
                const batchCost = holding.price * holding.amount + holding.fee;
                costBasis += batchCost;
                matchedBatches.push({
                    batchId: holding.id,
                    batchDate: holding.date,
                    amount: holding.amount,
                    cost: batchCost
                });
                remainingAmount -= holding.amount;
                state.holdingQueue.shift();
            } else {
                const feePortion = holding.fee * remainingAmount / holding.amount;
                const partialCost = holding.price * remainingAmount + feePortion;
                costBasis += partialCost;
                matchedBatches.push({
                    batchId: holding.id,
                    batchDate: holding.date,
                    amount: remainingAmount,
                    cost: partialCost
                });
                holding.amount -= remainingAmount;
                holding.fee -= feePortion;
                remainingAmount = 0;
            }
        }
        
        const sellNetAmount = tradeValue - trade.fee;
        const tradeProfit = sellNetAmount - costBasis;
        const returnRate = costBasis > 0 ? (tradeProfit / costBasis * 100) : 0;
        
        state.totalProfit += tradeProfit;
        state.totalSellAmount += sellNetAmount;
        state.totalFee += trade.fee;
        state.currentHolding -= sellAmount;
        state.cumulativeProfit += tradeProfit;
        state.currentCycleProfit += tradeProfit;
        
        state.sellRecords.push({
            tradeId: trade.id,
            date: trade.date,
            price: trade.price,
            amount: trade.amount,
            fee: trade.fee,
            netAmount: sellNetAmount,
            costBasis: costBasis,
            profit: tradeProfit,
            returnRate: returnRate,
            matchedBatches: matchedBatches
        });
        
        // 持仓明细用的卖出记录
        state.sellRecordsForDetail.push({
            id: trade.id,
            date: trade.date,
            price: trade.price,
            amount: trade.amount,
            fee: trade.fee
        });
        
        // 持仓周期
        let cycleRemainingAmount = sellAmount;
        let matchedCycles = new Set();
        
        while (cycleRemainingAmount > 0 && state.cycleHoldingQueue.length > 0) {
            const holding = state.cycleHoldingQueue[0];
            matchedCycles.add(holding.cycle);
            
            if (holding.amount <= cycleRemainingAmount) {
                cycleRemainingAmount -= holding.amount;
                state.cycleHoldingQueue.shift();
            } else {
                holding.amount -= cycleRemainingAmount;
                cycleRemainingAmount = 0;
            }
        }
        
        const holdingAfterSell = state.cycleHoldingQueue.reduce((sum, h) => sum + h.amount, 0);
        const cycle = matchedCycles.size > 0 ? Math.min(...matchedCycles) : state.currentCycle;
        
        let sellType = '减仓';
        if (holdingAfterSell === 0) {
            sellType = '清仓';
            state.hasPosition = false;
            // 清仓时重置累计收益
            state.cumulativeProfit = 0;
            state.currentCycleProfit = 0;
            state.currentCycleDividend = 0;
            state.currentCycleTax = 0;
            // 清仓时重置加仓对比数据
            state.lastAdditionPrice = null;
            state.lastAdditionTradeId = null;
            state.lastAdditionDate = null;
            state.additionComparisons.length = 0;
        }
        
        state.tradeCycleInfo[trade.id] = {
            cycle: cycle,
            cycleStart: state.cycleStartDates[cycle],
            sellType: sellType
        };
        
        return tradeProfit;
    },

    /**
     * 处理分红交易
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} state - 计算状态
     */
    _processDividendTrade(trade, state) {
        const dividendAmount = trade.totalAmount || 0;
        state.totalSellAmount += dividendAmount;
        state.totalProfit += dividendAmount;
        state.cumulativeProfit += dividendAmount;
        state.currentCycleProfit += dividendAmount;
        state.currentCycleDividend += dividendAmount;
        
        state.tradeCycleInfo[trade.id] = {
            cycle: state.currentCycle,
            cycleStart: state.cycleStartDates[state.currentCycle],
            dividendType: '分红'
        };
        
        return dividendAmount;
    },

    /**
     * 处理红利税交易
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} state - 计算状态
     */
    _processTaxTrade(trade, state) {
        const taxAmount = trade.totalAmount || 0;
        state.totalBuyCost += taxAmount;
        state.totalFee += taxAmount;
        state.totalProfit -= taxAmount;
        state.cumulativeProfit -= taxAmount;
        state.currentCycleProfit -= taxAmount;
        state.currentCycleTax += taxAmount;
        
        state.tradeCycleInfo[trade.id] = {
            cycle: state.currentCycle,
            cycleStart: state.cycleStartDates[state.currentCycle],
            taxType: '红利税'
        };
        
        return -taxAmount;
    },

    /**
     * 根据交易类型处理交易
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} state - 计算状态
     * @returns {number} 交易收益
     */
    _processTradeByType(trade, state) {
        switch (trade.type) {
            case 'buy':
                this._processBuyTrade(trade, state);
                return 0;
            case 'sell':
                return this._processSellTrade(trade, state);
            case 'dividend':
                return this._processDividendTrade(trade, state);
            case 'tax':
                return this._processTaxTrade(trade, state);
            default:
                return 0;
        }
    },

    /**
     * 更新时间序列数据
     * @private
     * @param {Object} trade - 交易记录
     * @param {number} tradeProfit - 交易收益
     * @param {Object} state - 计算状态
     */
    _updateTimeSeriesData(trade, tradeProfit, state) {
        // 计算当前持仓成本
        let currentCost = 0;
        state.holdingQueue.forEach(h => {
            currentCost += h.price * h.amount + h.fee;
        });
        
        // 计算每股持仓成本与每股摊薄成本
        const costPerShare = state.currentHolding > 0 ? (currentCost / state.currentHolding) : null;
        const dilutedCostTotal = currentCost - state.cumulativeProfit;
        const dilutedCostPerShare = state.currentHolding > 0 ? (dilutedCostTotal / state.currentHolding) : null;
        
        state.timeSeriesData.dates.push(trade.date);
        state.timeSeriesData.holdings.push(state.currentHolding);
        state.timeSeriesData.costs.push(currentCost);
        state.timeSeriesData.profits.push(tradeProfit);
        state.timeSeriesData.cumulativeProfits.push(state.cumulativeProfit);
        state.timeSeriesData.returnRates.push(currentCost > 0 ? (state.cumulativeProfit / currentCost * 100) : 0);
        state.timeSeriesData.costPerShares.push(costPerShare);
        state.timeSeriesData.dilutedCostPerShares.push(dilutedCostPerShare);
    },

    /**
     * 生成持仓明细
     * @private
     * @param {Object} state - 计算状态
     * @returns {Array} 持仓明细
     */
    _generateHoldingDetail(state) {
        let buyIndex = 0;
        
        state.sellRecordsForDetail.forEach(sell => {
            let remainingAmount = sell.amount;
            
            while (remainingAmount > 0 && buyIndex < state.buyRecords.length) {
                const buy = state.buyRecords[buyIndex];
                const availableAmount = buy.amount - buy.soldAmount;
                
                if (availableAmount <= remainingAmount) {
                    buy.soldAmount = buy.amount;
                    const sellAmount = availableAmount;
                    const sellNetAmount = sell.price * sellAmount - (sell.fee * sellAmount / sell.amount);
                    const buyCost = buy.price * sellAmount + (buy.fee * sellAmount / buy.amount);
                    const profit = sellNetAmount - buyCost;
                    buy.sellDetails.push({
                        sellDate: sell.date,
                        sellPrice: sell.price,
                        amount: availableAmount,
                        profit: profit
                    });
                    remainingAmount -= availableAmount;
                    buyIndex++;
                } else {
                    buy.soldAmount += remainingAmount;
                    const sellAmount = remainingAmount;
                    const sellNetAmount = sell.price * sellAmount - (sell.fee * sellAmount / sell.amount);
                    const buyCost = buy.price * sellAmount + (buy.fee * sellAmount / buy.amount);
                    const profit = sellNetAmount - buyCost;
                    buy.sellDetails.push({
                        sellDate: sell.date,
                        sellPrice: sell.price,
                        amount: remainingAmount,
                        profit: profit
                    });
                    remainingAmount = 0;
                }
            }
        });
        
        // 添加状态信息
        return state.buyRecords.map(buy => {
            const remainingAmount = buy.amount - buy.soldAmount;
            let status, statusClass;
            
            if (remainingAmount === 0) {
                status = '已卖出';
                statusClass = 'badge-sold';
            } else if (buy.soldAmount === 0) {
                status = '持有中';
                statusClass = 'badge-holding';
            } else {
                status = '部分卖出';
                statusClass = 'badge-partial';
            }
            
            return {
                ...buy,
                remainingAmount,
                status,
                statusClass
            };
        });
    },

    /**
     * 计算统计数据
     * @private
     * @param {Array} sortedTrades - 已排序的交易记录
     * @param {Object} state - 计算状态
     * @returns {Object} 统计数据
     */
    _calculateStatistics(sortedTrades, state) {
        const buyCount = sortedTrades.filter(t => t.type === 'buy').length;
        const sellCount = sortedTrades.filter(t => t.type === 'sell').length;
        const profitTrades = state.sellRecords.filter(s => s.profit > 0);
        const lossTrades = state.sellRecords.filter(s => s.profit < 0);
        const avgReturnRate = state.sellRecords.length > 0
            ? state.sellRecords.reduce((sum, s) => sum + s.returnRate, 0) / state.sellRecords.length
            : 0;
        const maxProfit = profitTrades.length > 0 ? Math.max(...profitTrades.map(s => s.profit)) : 0;
        const maxLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map(s => s.profit)) : 0;
        
        // 持仓天数
        let holdingDays = 0;
        if (sortedTrades.length > 0) {
            const firstDate = new Date(sortedTrades[0].date);
            const lastDate = new Date(sortedTrades[sortedTrades.length - 1].date);
            holdingDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        }
        
        return {
            buyCount,
            sellCount,
            totalTrades: sortedTrades.length,
            profitTrades: profitTrades.length,
            lossTrades: lossTrades.length,
            winRate: sellCount > 0 ? (profitTrades.length / sellCount * 100) : 0,
            avgReturnRate,
            maxProfit,
            maxLoss,
            holdingDays
        };
    },

    /**
     * 计算周期收益
     * @private
     * @param {Array} sortedTrades - 已排序的交易记录
     * @returns {Object} 周期收益数据
     */
    _calculatePeriodProfit(sortedTrades) {
        const weekRange = this.getWeekRange(new Date());
        const monthRange = this.getMonthRange(new Date());
        
        const sellProfitMap = new Map(
            sortedTrades.filter(t => t.type === 'sell').map(trade => {
                const sellRecord = { tradeId: trade.id, profit: 0 };
                return [trade.id, sellRecord.profit];
            })
        );
        
        const weeklyProfit = this.calculateProfitByDateRange(sortedTrades, weekRange.start, weekRange.end, sellProfitMap);
        const monthlyProfit = this.calculateProfitByDateRange(sortedTrades, monthRange.start, monthRange.end, sellProfitMap);
        
        return { weeklyProfit, monthlyProfit };
    },

    /**
     * 提取持仓周期历史
     * @private
     * @param {Array} trades - 交易记录数组
     * @param {Object} cycleInfo - 周期信息对象
     * @param {boolean} isHolding - 是否当前有持仓
     * @param {Array} sellRecords - 卖出记录数组
     * @returns {Array} 周期历史数组
     */
    _extractHoldingCycleHistory(trades, cycleInfo, isHolding, sellRecords = []) {
        if (!cycleInfo || Object.keys(cycleInfo).length === 0) {
            return [];
        }

        const cycles = {};
        const cycleProfits = {}; // 每个周期的收益
        
        // 遍历所有交易的周期信息
        for (const [tradeId, info] of Object.entries(cycleInfo)) {
            const cycleNum = info.cycle;
            
            // 初始化周期数据
            if (!cycles[cycleNum]) {
                cycles[cycleNum] = {
                    cycle: cycleNum,
                    startDate: info.cycleStart,
                    endDate: null,
                    status: 'closed',
                    profit: 0 // 周期收益
                };
            }
            
            // 记录建仓日期（取最早的）
            if (info.buyType === '建仓') {
                if (!cycles[cycleNum].startDate || info.cycleStart < cycles[cycleNum].startDate) {
                    cycles[cycleNum].startDate = info.cycleStart;
                }
            }
            
            // 记录清仓日期
            if (info.sellType === '清仓') {
                const trade = trades.find(t => t.id === parseInt(tradeId));
                if (trade && trade.date) {
                    if (!cycles[cycleNum].endDate || trade.date > cycles[cycleNum].endDate) {
                        cycles[cycleNum].endDate = trade.date;
                    }
                }
            }
        }
        
        // 转换为数组并计算天数
        const cycleList = Object.values(cycles).sort((a, b) => a.cycle - b.cycle);
        
        // 标记最后一个周期是否为当前持仓
        if (cycleList.length > 0 && isHolding) {
            const lastCycle = cycleList[cycleList.length - 1];
            if (!lastCycle.endDate) {
                lastCycle.status = 'active';
            }
        }
        
        // 计算每个周期的持仓天数
        cycleList.forEach(cycle => {
            if (cycle.startDate) {
                const start = new Date(cycle.startDate);
                const end = cycle.endDate ? new Date(cycle.endDate) : new Date();
                cycle.days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            } else {
                cycle.days = 0;
            }
        });
        
        // 1. 遍历卖出记录，按周期累加卖出收益
        sellRecords.forEach(sell => {
            const tradeInfo = cycleInfo[sell.tradeId];
            if (tradeInfo) {
                const cycle = tradeInfo.cycle;
                cycleProfits[cycle] = (cycleProfits[cycle] || 0) + sell.profit;
            }
        });
        
        // 2. 遍历交易记录，按周期累加分红和红利税
        trades.forEach(trade => {
            const tradeInfo = cycleInfo[trade.id];
            if (tradeInfo) {
                const cycle = tradeInfo.cycle;
                if (trade.type === 'dividend') {
                    cycleProfits[cycle] = (cycleProfits[cycle] || 0) + (trade.totalAmount || 0);
                } else if (trade.type === 'tax') {
                    cycleProfits[cycle] = (cycleProfits[cycle] || 0) - (trade.totalAmount || 0);
                }
            }
        });
        
        // 3. 将收益添加到周期对象
        cycleList.forEach(cycle => {
            cycle.profit = cycleProfits[cycle.cycle] || 0;
        });
        
        return cycleList;
    },

    // ==================== 公共方法 =====================

    /**
     * 统一计算函数 - 一次计算返回所有需要的数据
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 完整计算结果
     */
    calculateAll(trades) {
        // 按日期排序
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // 初始化计算状态
        const state = this._initializeCalculationState(sortedTrades);

        // 主循环：处理每笔交易
        sortedTrades.forEach(trade => {
            const tradeProfit = this._processTradeByType(trade, state);
            this._updateTimeSeriesData(trade, tradeProfit, state);
        });

        // 计算当前持仓成本
        let currentCost = 0;
        state.holdingQueue.forEach(h => {
            currentCost += h.price * h.amount + h.fee;
        });

        // 计算总收益率
        const totalReturnRate = state.totalBuyCost > 0
            ? (state.totalProfit / state.totalBuyCost * 100)
            : 0;

        // 生成持仓明细
        const holdingDetail = this._generateHoldingDetail(state);

        // 计算统计数据
        const statistics = this._calculateStatistics(sortedTrades, state);

        // 更新加仓对比数据的最新标记
        if (state.additionComparisons.length > 0) {
            state.additionComparisons.forEach((item, index) => {
                item.isLatestAddition = (index === state.additionComparisons.length - 1);
            });
        }

        // 计算周期收益
        const periodProfit = this._calculatePeriodProfit(sortedTrades);

        // 返回完整结果
        return {
            // 汇总数据
            summary: {
                totalBuyCost: state.totalBuyCost,
                totalSellAmount: state.totalSellAmount,
                totalProfit: state.totalProfit,
                totalFee: state.totalFee,
                totalReturnRate: totalReturnRate,
                currentHolding: state.currentHolding,
                currentCost: currentCost,
                currentCycleProfit: state.currentCycleProfit,
                currentCycleDividend: state.currentCycleDividend,
                currentCycleTax: state.currentCycleTax
            },
            // 持仓队列（用于悬浮提示）
            holdingQueue: state.holdingQueue.map(h => ({
                ...h,
                totalCost: h.price * h.amount + h.fee
            })),
            // 卖出记录（用于交易表格显示收益）
            sellRecords: state.sellRecords,
            // 持仓明细
            holdingDetail: holdingDetail,
            // 统计数据
            statistics: statistics,
            // 时间序列（图表用）
            timeSeries: state.timeSeriesData,
            // 持仓周期（交易表格用）
            cycleInfo: state.tradeCycleInfo,
            // 持仓周期历史（用于显示第几轮持仓）
            holdingCycleHistory: this._extractHoldingCycleHistory(trades, state.tradeCycleInfo, state.currentHolding > 0, state.sellRecords),
            // 加仓对比数据（图表用）
            additionComparisons: state.additionComparisons,
            // 周期收益
            weeklyProfit: periodProfit.weeklyProfit,
            monthlyProfit: periodProfit.monthlyProfit
        };
    },
    
    /**
     * 计算股票的完整收益数据（保留兼容旧代码）
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 计算结果
     */
    calculate(trades) {
        // 按日期排序
        const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        let holdingQueue = [];
        let totalBuyCost = 0;
        let totalSellAmount = 0;
        let totalProfit = 0;
        let currentHolding = 0;
        let currentCost = 0;
        let sellRecords = [];
        
        sortedTrades.forEach(trade => {
            // 使用 totalAmount 字段，如果没有则计算
            const tradeValue = trade.totalAmount || (trade.price * trade.amount) || 0;
            
            if (trade.type === 'buy') {
                // 买入：加入队列
                holdingQueue.push({
                    id: trade.id,
                    date: trade.date,
                    price: trade.price,
                    amount: trade.amount,
                    fee: trade.fee
                });
                totalBuyCost += tradeValue + trade.fee;
                currentHolding += trade.amount;
            } else if (trade.type === 'sell') {
                // 卖出：FIFO计算
                let sellAmount = trade.amount;
                let costBasis = 0;
                let remainingAmount = sellAmount;
                let matchedBatches = [];
                
                while (remainingAmount > 0 && holdingQueue.length > 0) {
                    const holding = holdingQueue[0];
                    
                    if (holding.amount <= remainingAmount) {
                        // 完全卖出该批次
                        const batchCost = holding.price * holding.amount + holding.fee;
                        costBasis += batchCost;
                        matchedBatches.push({
                            batchId: holding.id,
                            batchDate: holding.date,
                            amount: holding.amount,
                            cost: batchCost
                        });
                        remainingAmount -= holding.amount;
                        holdingQueue.shift();
                    } else {
                        // 部分卖出该批次
                        const feePortion = holding.fee * remainingAmount / holding.amount;
                        const partialCost = holding.price * remainingAmount + feePortion;
                        costBasis += partialCost;
                        matchedBatches.push({
                            batchId: holding.id,
                            batchDate: holding.date,
                            amount: remainingAmount,
                            cost: partialCost
                        });
                        holding.amount -= remainingAmount;
                        holding.fee -= feePortion;
                        remainingAmount = 0;
                    }
                }
                
                const sellNetAmount = tradeValue - trade.fee;
                const profit = sellNetAmount - costBasis;
                const returnRate = costBasis > 0 ? (profit / costBasis * 100) : 0;
                
                totalProfit += profit;
                totalSellAmount += sellNetAmount;
                currentHolding -= sellAmount;
                
                sellRecords.push({
                    tradeId: trade.id,
                    date: trade.date,
                    price: trade.price,
                    amount: trade.amount,
                    fee: trade.fee,
                    netAmount: sellNetAmount,
                    costBasis: costBasis,
                    profit: profit,
                    returnRate: returnRate,
                    matchedBatches: matchedBatches
                });
            } else if (trade.type === 'dividend') {
                // 分红：加到总卖出金额中
                const dividendAmount = trade.totalAmount || 0;
                totalSellAmount += dividendAmount;
                totalProfit += dividendAmount;
            } else if (trade.type === 'tax') {
                // 红利税补缴：加到总投入成本中
                const taxAmount = trade.totalAmount || 0;
                totalBuyCost += taxAmount;
                totalProfit -= taxAmount;
            }
        });
        
        // 计算当前持仓成本（包含剩余手续费）
        currentCost = 0;
        holdingQueue.forEach(h => {
            currentCost += h.price * h.amount + h.fee;
        });
        
        // 计算总收益率
        const totalReturnRate = totalBuyCost > 0 ? (totalProfit / totalBuyCost * 100) : 0;
        
        return {
            totalBuyCost,
            totalSellAmount,
            totalProfit,
            totalReturnRate,
            currentHolding,
            currentCost,
            holdingQueue: holdingQueue.map(h => ({
                ...h,
                totalCost: h.price * h.amount + h.fee
            })),
            sellRecords
        };
    },
    
    /**
     * 生成持仓明细
     * @param {Array} trades - 交易记录数组
     * @returns {Array} 持仓明细
     */
    generateHoldingDetail(trades) {
        const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        const buyRecords = [];
        const sellRecords = [];
        
        // 收集买入和卖出记录
        sortedTrades.forEach(trade => {
            if (trade.type === 'buy') {
                buyRecords.push({
                    id: trade.id,
                    date: trade.date,
                    price: trade.price,
                    amount: trade.amount,
                    fee: trade.fee,
                    soldAmount: 0,
                    sellDetails: []
                });
            } else {
                sellRecords.push({
                    id: trade.id,
                    date: trade.date,
                    price: trade.price,
                    amount: trade.amount,
                    fee: trade.fee
                });
            }
        });
        
        // 按FIFO原则匹配卖出记录
        let buyIndex = 0;
        sellRecords.forEach(sell => {
            let remainingAmount = sell.amount;
            
            while (remainingAmount > 0 && buyIndex < buyRecords.length) {
                const buy = buyRecords[buyIndex];
                const availableAmount = buy.amount - buy.soldAmount;
                
                if (availableAmount <= remainingAmount) {
                    // 这批买入全部卖出
                    buy.soldAmount = buy.amount;
                    // 计算这批卖出的收益
                    const sellAmount = availableAmount;
                    const sellNetAmount = sell.price * sellAmount - (sell.fee * sellAmount / sell.amount);
                    const buyCost = buy.price * sellAmount + (buy.fee * sellAmount / buy.amount);
                    const profit = sellNetAmount - buyCost;
                    buy.sellDetails.push({
                        sellDate: sell.date,
                        sellPrice: sell.price,
                        amount: availableAmount,
                        profit: profit
                    });
                    remainingAmount -= availableAmount;
                    buyIndex++;
                } else {
                    // 这批买入部分卖出
                    buy.soldAmount += remainingAmount;
                    // 计算这批卖出的收益
                    const sellAmount = remainingAmount;
                    const sellNetAmount = sell.price * sellAmount - (sell.fee * sellAmount / sell.amount);
                    const buyCost = buy.price * sellAmount + (buy.fee * sellAmount / buy.amount);
                    const profit = sellNetAmount - buyCost;
                    buy.sellDetails.push({
                        sellDate: sell.date,
                        sellPrice: sell.price,
                        amount: remainingAmount,
                        profit: profit
                    });
                    remainingAmount = 0;
                }
            }
        });
        
        // 添加状态信息
        return buyRecords.map(buy => {
            const remainingAmount = buy.amount - buy.soldAmount;
            let status, statusClass;
            
            if (remainingAmount === 0) {
                status = '已卖出';
                statusClass = 'badge-sold';
            } else if (buy.soldAmount === 0) {
                status = '持有中';
                statusClass = 'badge-holding';
            } else {
                status = '部分卖出';
                statusClass = 'badge-partial';
            }
            
            return {
                ...buy,
                remainingAmount,
                status,
                statusClass
            };
        });
    },
    
    /**
     * 计算最新收益（基于当前股价）
     * @param {number} currentHolding - 当前持仓数量
     * @param {number} currentCost - 当前持仓成本
     * @param {number} currentPrice - 当前股价
     * @returns {Object} 最新收益数据
     */
    calculateLatestProfit(currentHolding, currentCost, currentPrice) {
        const marketValue = currentHolding * currentPrice;
        const latestProfit = marketValue - currentCost;
        const latestReturnRate = currentCost > 0 ? (latestProfit / currentCost * 100) : 0;
        
        return {
            marketValue,
            latestProfit,
            latestReturnRate
        };
    },

    /**
     * 解析 YYYY-MM-DD 格式日期
     * @param {string} dateString - 日期字符串
     * @returns {Date|null} 日期对象
     */
    parseDateString(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }

        const parts = dateString.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return null;
        }

        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    /**
     * 格式化日期为 YYYY-MM-DD
     * @param {Date} date - 日期对象
     * @returns {string} 日期字符串
     */
    formatRangeDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 获取自然周范围（周一到周日）
     * @param {Date} referenceDate - 参考日期
     * @returns {Object} 周起止日期
     */
    getWeekRange(referenceDate = new Date()) {
        const currentDate = new Date(referenceDate);
        currentDate.setHours(0, 0, 0, 0);

        const dayOfWeek = currentDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    },

    /**
     * 获取自然月范围
     * @param {Date} referenceDate - 参考日期
     * @returns {Object} 月起止日期
     */
    getMonthRange(referenceDate = new Date()) {
        const currentDate = new Date(referenceDate);
        currentDate.setHours(0, 0, 0, 0);

        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    },

    /**
     * 计算指定日期范围内的收益
     * @param {Array} trades - 交易记录数组
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @param {Map<number, number>} sellProfitMap - 卖出收益映射
     * @returns {number} 区间收益
     */
    calculateProfitByDateRange(trades, startDate, endDate, sellProfitMap = null) {
        if (!Array.isArray(trades) || trades.length === 0) {
            return 0;
        }
    
        const profitMap = sellProfitMap || new Map(
            this.calculateAll(trades).sellRecords.map(sell => [sell.tradeId, sell.profit])
        );
    
        let periodProfit = 0;
    
        trades.forEach(trade => {
            const tradeDate = this.parseDateString(trade.date);
            if (!tradeDate || tradeDate < startDate || tradeDate > endDate) {
                return;
            }
    
            if (trade.type === 'sell') {
                periodProfit += profitMap.get(trade.id) || 0;
            } else if (trade.type === 'dividend') {
                periodProfit += trade.totalAmount || 0;
            } else if (trade.type === 'tax') {
                periodProfit -= trade.totalAmount || 0;
            }
        });
    
        return Math.round(periodProfit * 100) / 100;
    },
    
    /**
     * 计算自然周和自然月收益
     * @param {Array} trades - 交易记录数组
     * @param {Date} referenceDate - 参考日期
     * @param {Object} calcResult - 可选的计算结果，避免重复计算
     * @returns {Object} 周收益、月收益与区间信息
     */
    calculatePeriodProfit(trades, referenceDate = new Date(), calcResult = null) {
        const weekRange = this.getWeekRange(referenceDate);
        const monthRange = this.getMonthRange(referenceDate);
        
        // 如果提供了 calcResult，直接复用；否则计算
        const result = calcResult || this.calculateAll(trades);
        const sellProfitMap = new Map(
            result.sellRecords.map(sell => [sell.tradeId, sell.profit])
        );
    
        return {
            weeklyProfit: this.calculateProfitByDateRange(trades, weekRange.start, weekRange.end, sellProfitMap),
            monthlyProfit: this.calculateProfitByDateRange(trades, monthRange.start, monthRange.end, sellProfitMap),
            weekRange: {
                start: this.formatRangeDate(weekRange.start),
                end: this.formatRangeDate(weekRange.end)
            },
            monthRange: {
                start: this.formatRangeDate(monthRange.start),
                end: this.formatRangeDate(monthRange.end)
            }
        };
    },    
    /**
     * 计算单笔交易的收益率
     * @param {Object} trade - 交易记录
     * @param {number} costBasis - 成本基础
     * @returns {number} 收益率
     */
    calculateTradeReturnRate(trade, costBasis) {
        if (trade.type === 'buy' || costBasis === 0) {
            return null;
        }
        
        const netAmount = trade.price * trade.amount - trade.fee;
        const profit = netAmount - costBasis;
        return (profit / costBasis * 100);
    },
    
    /**
     * 计算统计数据
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 统计数据
     */
    calculateStatistics(trades) {
        const result = this.calculate(trades);
        
        // 交易次数统计
        const buyCount = trades.filter(t => t.type === 'buy').length;
        const sellCount = trades.filter(t => t.type === 'sell').length;
        
        // 盈利交易统计
        const profitTrades = result.sellRecords.filter(s => s.profit > 0);
        const lossTrades = result.sellRecords.filter(s => s.profit < 0);

        // 平均收益率
        const avgReturnRate = result.sellRecords.length > 0
            ? result.sellRecords.reduce((sum, s) => sum + s.returnRate, 0) / result.sellRecords.length
            : 0;

        // 最大盈利和亏损
        // 最大盈利：所有盈利交易中的最大盈利金额
        const maxProfit = profitTrades.length > 0
            ? Math.max(...profitTrades.map(s => s.profit))
            : 0;
        // 最大亏损：所有亏损交易中的最大亏损金额（取绝对值）
        const maxLoss = lossTrades.length > 0
            ? Math.min(...lossTrades.map(s => s.profit))
            : 0;
        
        // 持仓天数计算（简化版）
        const holdingDays = this.calculateHoldingDays(trades);
        
        return {
            buyCount,
            sellCount,
            totalTrades: trades.length,
            profitTrades: profitTrades.length,
            lossTrades: lossTrades.length,
            winRate: sellCount > 0 ? (profitTrades.length / sellCount * 100) : 0,
            avgReturnRate,
            maxProfit,
            maxLoss,
            holdingDays,
            totalProfit: result.totalProfit,
            totalReturnRate: result.totalReturnRate
        };
    },
    
    /**
     * 计算持仓天数（简化版）
     * @param {Array} trades - 交易记录数组
     * @returns {number} 平均持仓天数
     */
    calculateHoldingDays(trades) {
        if (trades.length === 0) return 0;
        
        const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        const firstDate = new Date(sortedTrades[0].date);
        const lastDate = new Date(sortedTrades[sortedTrades.length - 1].date);
        
        return Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    },
    
    // 已移除旧版 calculateTimeSeries（未被使用，且存在重复定义导致语法问题）

    /**
     * 计算时间序列数据（用于图表展示）- 增强版
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 时间序列数据，包含成本、收益、持股数量、以及按日期的每股权益数据
     */
    calculateTimeSeries(trades) {
        if (trades.length === 0) {
            return {
                dates: [],
                holdings: [],
                costs: [],
                profits: [],
                cumulativeProfits: [],
                returnRates: [],
                costPerShares: [],     // 每股持仓成本（随日期变化）
                dilutedCostPerShares: [], // 每股摊薄成本（随日期变化）
                marketPrices: []      // 对应日期的市场价（若有）
            };
        }
        
        const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        const dates = [];
        const holdings = [];
        const costs = [];
        const profits = [];
        const cumulativeProfits = [];
        const returnRates = [];
        const costPerShares = [];
        const dilutedCostPerShares = [];
        const marketPrices = [];
        
        let holdingQueue = [];
        let currentHolding = 0;
        let currentCost = 0;
        let cumulativeProfit = 0;
        let lastCostBasis = 0;
        
        sortedTrades.forEach(trade => {
            // 使用 totalAmount 字段，如果没有则计算
            const tradeValue = trade.totalAmount || (trade.price * trade.amount) || 0;
            let tradeProfit = 0;
            
            if (trade.type === 'buy') {
                holdingQueue.push({
                    id: trade.id,
                    date: trade.date,
                    price: trade.price,
                    amount: trade.amount,
                    fee: trade.fee
                });
                currentHolding += trade.amount;
                currentCost += tradeValue + trade.fee;
            } else if (trade.type === 'sell') {
                // 卖出：FIFO计算
                let sellAmount = trade.amount;
                let costBasis = 0;
                let remainingAmount = sellAmount;
                
                while (remainingAmount > 0 && holdingQueue.length > 0) {
                    const holding = holdingQueue[0];
                    
                    if (holding.amount <= remainingAmount) {
                        const batchCost = holding.price * holding.amount + holding.fee;
                        costBasis += batchCost;
                        remainingAmount -= holding.amount;
                        holdingQueue.shift();
                    } else {
                        const feePortion = holding.fee * remainingAmount / holding.amount;
                        const partialCost = holding.price * remainingAmount + feePortion;
                        costBasis += partialCost;
                        holding.amount -= remainingAmount;
                        holding.fee -= feePortion;
                        remainingAmount = 0;
                    }
                }
                
                const sellNetAmount = tradeValue - trade.fee;
                const sellProfit = sellNetAmount - costBasis;
                cumulativeProfit += sellProfit;
                currentHolding -= sellAmount;
                tradeProfit = sellProfit;
                lastCostBasis = costBasis;
                
                // 重新计算当前成本
                currentCost = 0;
                holdingQueue.forEach(h => {
                    currentCost += h.price * h.amount + h.fee;
                });
            } else if (trade.type === 'dividend') {
                // 分红
                const dividendAmount = trade.totalAmount || 0;
                cumulativeProfit += dividendAmount;
                tradeProfit = dividendAmount;
            } else if (trade.type === 'tax') {
                // 红利税补缴
                const taxAmount = trade.totalAmount || 0;
                cumulativeProfit -= taxAmount;
                tradeProfit = -taxAmount;
            }
            
            // 记录该时间点的数据
            dates.push(trade.date);
            holdings.push(currentHolding);
            costs.push(currentCost);
            profits.push(tradeProfit);
            cumulativeProfits.push(cumulativeProfit);
            
            const currentReturnRate = currentCost > 0 ? (cumulativeProfit / currentCost * 100) : 0;
            returnRates.push(currentReturnRate);
            
            // 计算当前每股权益数据
            const costPerShare = currentHolding > 0 ? (currentCost / currentHolding) : 0;
            const dilutedCostPerShare = (currentHolding > 0 && currentCost > 0)
                ? ((currentHolding * 0 /* 暂时没有实时价格，先用0 */) - cumulativeProfit) / currentHolding
                : 0;
            
            costPerShares.push(costPerShare);
            dilutedCostPerShares.push(dilutedCostPerShare);
            marketPrices.push(0); // 暂时占位
        });
        
        // 如果有市场行情，则重新计算摊薄成本
        // （这个会由 detail.js 在获取到实时行情后更新）
        return {
            dates,
            holdings,
            costs,
            profits,
            cumulativeProfits,
            returnRates,
            costPerShares,
            dilutedCostPerShares,
            marketPrices
        };
    },

    /**
     * 计算持仓周期标记
     * @param {Array} trades - 交易记录数组
     * @returns {Object} 每笔交易对应的持仓周期信息
     */
    calculateHoldingCycles(trades) {
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        const tradeCycleInfo = {}; // 存储每笔交易的周期信息
        let holdingQueue = []; // 当前持仓队列
        let currentCycle = 0; // 当前周期编号
        let cycleStartDates = {}; // 每个周期的开始日期
        let hasPosition = false; // 是否有持仓

        sortedTrades.forEach(trade => {
            if (trade.type === 'buy') {
                // 买入：如果当前没有持仓，开始新周期
                if (!hasPosition) {
                    currentCycle++;
                    cycleStartDates[currentCycle] = trade.date;
                    hasPosition = true;
                    tradeCycleInfo[trade.id] = {
                        cycle: currentCycle,
                        cycleStart: cycleStartDates[currentCycle],
                        buyType: '建仓'
                    };
                } else {
                    // 已有持仓，这是加仓
                    tradeCycleInfo[trade.id] = {
                        cycle: currentCycle,
                        cycleStart: cycleStartDates[currentCycle],
                        buyType: '加仓'
                    };
                }
                holdingQueue.push({
                    id: trade.id,
                    amount: trade.amount,
                    cycle: currentCycle
                });
            } else {
                // 卖出：FIFO匹配
                let sellAmount = trade.amount;
                let matchedCycles = new Set();
                let remainingAmount = sellAmount;

                while (remainingAmount > 0 && holdingQueue.length > 0) {
                    const holding = holdingQueue[0];
                    matchedCycles.add(holding.cycle);

                    if (holding.amount <= remainingAmount) {
                        remainingAmount -= holding.amount;
                        holdingQueue.shift();
                    } else {
                        holding.amount -= remainingAmount;
                        remainingAmount = 0;
                    }
                }

                // 判断卖出类型
                const holdingAfterSell = holdingQueue.reduce((sum, h) => sum + h.amount, 0);
                const cycle = matchedCycles.size > 0 ? Math.min(...matchedCycles) : currentCycle;

                let sellType = '减仓';
                if (holdingAfterSell === 0) {
                    sellType = '清仓';
                    hasPosition = false;
                }

                tradeCycleInfo[trade.id] = {
                    cycle: cycle,
                    cycleStart: cycleStartDates[cycle],
                    sellType: sellType
                };
            }
        });

        return tradeCycleInfo;
    },

    /**
     * 获取指定时间段的交易记录
     * @param {Array} trades - 所有交易记录
     * @param {number} year - 年份
     * @param {number|null} month - 月份（null 表示全年）
     * @returns {Array} 该时间段的交易记录
     */
    getTradesByPeriod(trades, year, month = null) {
        console.log('=== Calculator.getTradesByPeriod ===');
        console.log('输入：year =', year, ', month =', month);
        
        if (!trades || trades.length === 0) {
            console.log('trades 为空或长度为0，返回空数组');
            return [];
        }

        // 使用字符串方法创建日期，避免时区转换问题
        const monthStr = (month !== null ? month + 1 : 1).toString().padStart(2, '0');
        const startDate = new Date(`${year}-${monthStr}-01T00:00:00`);
        
        const endDate = month ?
            new Date(`${year}-${monthStr}-${new Date(year, month, 0).getDate()}T23:59:59.999`) :
            new Date(`${year + 1}-01-01T23:59:59.999`);

        console.log('查询时间范围：');
        console.log('  startDate =', startDate.toISOString());
        console.log('  endDate =', endDate.toISOString());
        console.log('  startDate (本地) =', startDate.toLocaleString());
        console.log('  endDate (本地) =', endDate.toLocaleString());

        const filteredTrades = trades.filter((trade, index) => {
            const tradeDate = new Date(trade.date);
            const inRange = tradeDate >= startDate && tradeDate <= endDate;
            
            if (index < 5) {  // 只输出前5条记录的详细信息
                console.log(`  交易记录 ${index}:`);
                console.log('    trade.date =', trade.date);
                console.log('    tradeDate =', tradeDate.toISOString());
                console.log('    tradeDate (本地) =', tradeDate.toLocaleString());
                console.log('    inRange =', inRange);
            }
            
            return inRange;
        });

        console.log('过滤结果：');
        console.log('  输入 trades 数量:', trades.length);
        console.log('  过滤后数量:', filteredTrades.length);

        return filteredTrades;
    },

    
};

// 挂载到命名空间
StockProfitCalculator.Calculator = Calculator;

/**
 * 文件存储模块
 * 负责数据的导入导出功能
 */

const FileStorage = {
    /**
     * 初始化（兼容旧代码）
     */
    init() {
        // 初始化完成
    },

    /**
     * 导出数据为JSON文件
     * @param {Object} data - 要导出的数据
     */
    exportData(data) {
        if (!data || !data.stocks || data.stocks.length === 0) {
            ErrorHandler.showWarning('没有数据可导出');
            return false;
        }

        const exportData = {
            ...data,
            exportTime: new Date().toISOString(),
            version: '1.0.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `股票收益数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
    },

    /**
     * 选择并读取JSON文件
     * @returns {Promise<Object|null>} 文件数据或null
     */
    async selectAndReadFile() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);

                    if (!this.validateImportData(data)) {
                        ErrorHandler.showErrorSimple('文件格式不正确，请选择有效的股票数据文件');
                        resolve(null);
                        return;
                    }

                    resolve(data);
                } catch (error) {
                    console.error('读取文件失败:', error);
                    ErrorHandler.showError('读取文件失败', error);
                    resolve(null);
                }
            };

            input.click();
        });
    },

    /**
     * 验证导入数据格式
     * @param {Object} data - 要验证的数据
     * @returns {boolean} 是否有效
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.stocks)) return false;

        for (const stock of data.stocks) {
            if (!stock.code || !stock.name || !Array.isArray(stock.trades)) {
                return false;
            }
        }

        return true;
    },

    /**
     * 分析导入数据与当前数据的差异
     * @param {Object} currentData - 当前数据
     * @param {Object} importData - 导入数据
     * @returns {Object} 分析结果
     */
    analyzeImportData(currentData, importData) {
        // 处理 currentData 为 null 的情况（本地模式首次导入）
        if (!currentData) {
            currentData = { stocks: [], currentStockCode: null, version: '1.0.0' };
        }

        const result = {
            newStocks: [],
            existingStocks: [],
            newTrades: 0,
            duplicateTrades: 0,
            details: []
        };

        const currentStockMap = new Map();
        currentData.stocks.forEach(stock => {
            currentStockMap.set(stock.code, stock);
        });

        importData.stocks.forEach(stock => {
            if (currentStockMap.has(stock.code)) {
                // 已存在的股票
                const currentStock = currentStockMap.get(stock.code);
                const analysis = this.analyzeTrades(currentStock.trades, stock.trades);
                
                result.existingStocks.push({
                    code: stock.code,
                    name: stock.name,
                    currentTrades: currentStock.trades.length,
                    importTrades: stock.trades.length,
                    newTrades: analysis.newCount,
                    duplicateTrades: analysis.duplicateCount,
                    newItems: analysis.newItems,
                    duplicateItems: analysis.duplicateItems
                });
                result.newTrades += analysis.newCount;
                result.duplicateTrades += analysis.duplicateCount;

                if (analysis.newCount > 0) {
                    result.details.push(`${stock.name}(${stock.code}): 新增${analysis.newCount}条，重复${analysis.duplicateCount}条`);
                } else {
                    result.details.push(`${stock.name}(${stock.code}): 全部重复，跳过${analysis.duplicateCount}条`);
                }
            } else {
                // 新股票
                result.newStocks.push({
                    code: stock.code,
                    name: stock.name,
                    trades: stock.trades.length,
                    tradeItems: stock.trades
                });
                result.newTrades += stock.trades.length;
                result.details.push(`${stock.name}(${stock.code}): 新股票，${stock.trades.length}条交易记录`);
            }
        });

        return result;
    },

    /**
     * 分析交易记录差异
     * @param {Array} currentTrades - 当前交易记录
     * @param {Array} importTrades - 导入的交易记录
     * @returns {Object} 分析结果
     */
    analyzeTrades(currentTrades, importTrades) {
        const currentKeys = new Set(
            currentTrades.map(t => `${t.date}-${t.type}-${t.price}-${t.amount}`)
        );

        const newItems = [];
        const duplicateItems = [];

        importTrades.forEach(trade => {
            const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
            if (currentKeys.has(key)) {
                duplicateItems.push(trade);
            } else {
                newItems.push(trade);
            }
        });

        return {
            newCount: newItems.length,
            duplicateCount: duplicateItems.length,
            newItems,
            duplicateItems
        };
    },

    /**
     * 合并数据
     * @param {Object} currentData - 当前数据
     * @param {Object} importData - 导入数据
     * @returns {Object} 合并后的数据
     */
    mergeData(currentData, importData) {
        const result = {
            stocks: [...currentData.stocks],
            currentStockCode: currentData.currentStockCode,
            version: currentData.version
        };

        const stockMap = new Map();
        result.stocks.forEach((stock, index) => {
            stockMap.set(stock.code, index);
        });

        importData.stocks.forEach(stock => {
            if (stockMap.has(stock.code)) {
                // 合并交易记录
                const existingIndex = stockMap.get(stock.code);
                const existing = result.stocks[existingIndex];
                existing.trades = this.mergeTrades(existing.trades, stock.trades);
            } else {
                // 添加新股票
                result.stocks.push({ ...stock });
            }
        });

        return result;
    },

    /**
     * 合并交易记录
     * @param {Array} currentTrades - 当前交易记录
     * @param {Array} importTrades - 导入的交易记录
     * @returns {Array} 合并后的交易记录
     */
    mergeTrades(currentTrades, importTrades) {
        const tradeMap = new Map();

        currentTrades.forEach(trade => {
            const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
            tradeMap.set(key, { ...trade });
        });

        importTrades.forEach(trade => {
            const key = `${trade.date}-${trade.type}-${trade.price}-${trade.amount}`;
            if (!tradeMap.has(key)) {
                tradeMap.set(key, { ...trade });
            }
        });

        const merged = Array.from(tradeMap.values());
        merged.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 重新分配ID
        merged.forEach((trade, index) => {
            trade.id = index + 1;
        });

        return merged;
    },

    /**
     * 获取存储统计信息
     * @param {Object} data - 数据对象
     * @returns {Object} 统计信息
     */
    getStorageStats(data) {
        if (!data || !data.stocks) {
            return { stockCount: 0, tradeCount: 0, dataSize: '0 KB' };
        }

        const stockCount = data.stocks.length;
        const tradeCount = data.stocks.reduce((sum, s) => sum + s.trades.length, 0);
        const dataSize = new Blob([JSON.stringify(data)]).size;
        const sizeStr = dataSize < 1024 
            ? dataSize + ' B' 
            : (dataSize / 1024).toFixed(2) + ' KB';

        return { stockCount, tradeCount, dataSize: sizeStr };
    },

    // ==================== CSV 导出功能 ====================

    /**
     * 导出数据为CSV文件
     * @param {Object} data - 要导出的数据
     * @param {string} filename - 文件名（不含扩展名）
     * @returns {boolean} 是否导出成功
     */
    exportToCSV(data, filename = null) {
        if (!data || !data.stocks || data.stocks.length === 0) {
            ErrorHandler.showWarning('没有数据可导出');
            return false;
        }

        try {
            // CSV 文件名
            const defaultFilename = `股票收益数据_${new Date().toISOString().split('T')[0]}.csv`;
            const finalFilename = filename || defaultFilename;

            // 生成 CSV 内容
            const csvContent = this._generateCSVContent(data);

            // 创建 Blob 对象
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

            // 下载文件
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('导出CSV失败:', error);
            ErrorHandler.showError('导出CSV失败', error);
            return false;
        }
    },

    /**
     * 生成 CSV 内容
     * @private
     * @param {Object} data - 数据对象
     * @returns {string} CSV 内容
     */
    _generateCSVContent(data) {
        // CSV 表头
        const headers = [
            '股票代码',
            '股票名称',
            '分组',
            '交易日期',
            '交易类型',
            '价格',
            '数量',
            '手续费',
            '金额',
            '收益'
        ];

        const rows = [headers.join(',')];

        // 交易类型映射
        const typeNames = {
            'buy': '买入',
            'sell': '卖出',
            'dividend': '分红',
            'tax': '红利税'
        };

        // 分组映射
        const groupNames = {
            'holding': '持仓中',
            'cleared': '已清仓'
        };

        // 按股票遍历
        data.stocks.forEach(stock => {
            const groupName = groupNames[stock.group] || stock.group;

            // 按交易记录遍历
            stock.trades.forEach(trade => {
                const typeName = typeNames[trade.type] || trade.type;

                // 计算收益（仅卖出类型）
                let profit = '';
                if (trade.type === 'sell') {
                    const costBasis = (trade.price * trade.amount) + trade.fee;
                    profit = ((trade.totalAmount - trade.fee) - costBasis).toFixed(2);
                }

                const row = [
                    stock.code,
                    stock.name,
                    groupName,
                    trade.date,
                    typeName,
                    trade.price || '',
                    trade.amount || '',
                    trade.fee || '',
                    trade.totalAmount || '',
                    profit
                ];

                // 转义包含逗号的字段
                const escapedRow = row.map(field => {
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return '"' + str.replace(/"/g, '""') + '"';
                    }
                    return str;
                });

                rows.push(escapedRow.join(','));
            });
        });

        return rows.join('\n');
    },

    /**
     * 导出指定股票的CSV
     * @param {Object} stock - 股票对象
     * @param {string} filename - 文件名（不含扩展名）
     * @returns {boolean} 是否导出成功
     */
    exportStockToCSV(stock, filename = null) {
        if (!stock || !stock.trades || stock.trades.length === 0) {
            ErrorHandler.showWarning('该股票没有交易记录可导出');
            return false;
        }

        try {
            const defaultFilename = `${stock.name}_${stock.code}_交易记录_${new Date().toISOString().split('T')[0]}.csv`;
            const finalFilename = filename || defaultFilename;

            const data = { stocks: [stock] };
            const csvContent = this._generateCSVContent(data);

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('导出股票CSV失败:', error);
            ErrorHandler.showError('导出CSV失败', error);
            return false;
        }
    },

    /**
     * 导出汇总CSV（按股票）
     * @param {Object} data - 数据对象
     * @param {string} filename - 文件名（不含扩展名）
     * @returns {boolean} 是否导出成功
     */
    exportSummaryToCSV(data, filename = null) {
        if (!data || !data.stocks || data.stocks.length === 0) {
            ErrorHandler.showWarning('没有数据可导出');
            return false;
        }

        try {
            const defaultFilename = `股票汇总_${new Date().toISOString().split('T')[0]}.csv`;
            const finalFilename = filename || defaultFilename;

            // 计算每只股票的汇总数据
            const summaryData = this._calculateSummary(data);

            // CSV 表头
            const headers = [
                '股票代码',
                '股票名称',
                '分组',
                '总投入成本',
                '总卖出金额',
                '总收益',
                '总收益率',
                '当前持仓',
                '持仓成本',
                '交易次数'
            ];

            const rows = [headers.join(',')];

            // 按股票生成汇总行
            summaryData.forEach(stock => {
                const returnRate = stock.totalBuyCost > 0
                    ? ((stock.totalProfit / stock.totalBuyCost) * 100).toFixed(3)
                    : '0.000';

                const row = [
                    stock.code,
                    stock.name,
                    stock.group,
                    stock.totalBuyCost.toFixed(2),
                    stock.totalSellAmount.toFixed(2),
                    stock.totalProfit.toFixed(2),
                    returnRate,
                    stock.currentHolding,
                    stock.currentCost.toFixed(2),
                    stock.tradeCount
                ];

                // 转义字段
                const escapedRow = row.map(field => {
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return '"' + str.replace(/"/g, '""') + '"';
                    }
                    return str;
                });

                rows.push(escapedRow.join(','));
            });

            const csvContent = rows.join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('导出汇总CSV失败:', error);
            ErrorHandler.showError('导出CSV失败', error);
            return false;
        }
    },

    /**
     * 计算股票汇总数据
     * @private
     * @param {Object} data - 数据对象
     * @returns {Array} 汇总数据数组
     */
    _calculateSummary(data) {
        return data.stocks.map(stock => {
            let totalBuyCost = 0;
            let totalSellAmount = 0;
            let totalProfit = 0;
            let currentHolding = 0;
            let currentCost = 0;

            stock.trades.forEach(trade => {
                if (trade.type === 'buy') {
                    totalBuyCost += trade.price * trade.amount + trade.fee;
                    currentHolding += trade.amount;
                    currentCost += trade.price * trade.amount + trade.fee;
                } else if (trade.type === 'sell') {
                    const sellAmount = trade.price * trade.amount - trade.fee;
                    totalSellAmount += sellAmount;
                    currentHolding -= trade.amount;
                    currentCost -= trade.price * trade.amount + trade.fee;
                    totalProfit += sellAmount - (trade.price * trade.amount + trade.fee);
                } else if (trade.type === 'dividend') {
                    totalSellAmount += trade.totalAmount;
                    totalProfit += trade.totalAmount;
                } else if (trade.type === 'tax') {
                    totalBuyCost += trade.totalAmount;
                    totalProfit -= trade.totalAmount;
                }
            });

            return {
                code: stock.code,
                name: stock.name,
                group: stock.group,
                totalBuyCost,
                totalSellAmount,
                totalProfit,
                currentHolding,
                currentCost,
                tradeCount: stock.trades.length
            };
        });
    },

    /**
     * 导出所有格式（JSON + CSV）
     * @param {Object} data - 数据对象
     * @returns {Object} 导出结果 {json: boolean, csv: boolean, summary: boolean}
     */
    exportAllFormats(data) {
        const results = {
            json: this.exportData(data),
            csv: this.exportToCSV(data),
            summary: this.exportSummaryToCSV(data)
        };

        const successCount = Object.values(results).filter(r => r).length;
        const message = `导出完成：成功 ${successCount}/3 个文件`;

        if (successCount > 0) {
            ErrorHandler.showSuccess(message);
        }

        return results;
    }
};

// 挂载到命名空间
StockProfitCalculator.FileStorage = FileStorage;

/**
 * 交易记录管理模块
 *
 * 版本: 1.1.0
 * 更新日期: 2026-03-12
 * 修改内容: 添加 DOM 缓存优化
 */

const TradeManager = {
    // DOM 元素缓存
    _domCache: null,

    // (Temporary) Disable JS floating tooltip implementation for easier visual debugging.
    // Tooltips will use CSS hover behavior and may be clipped by scroll containers.
    // 当前操作的股票代码（由外部设置）
    _currentStockCode: null,

    // 交易记录和计算结果缓存（用于分页翻页时重新渲染）
    _currentTrades: null,
    _currentCalcResult: null,

    // 分页状态（从 Config 读取配置）
    _pagination: {
        currentPage: 1,
        itemsPerPage: 50,  // 默认值，会在 _updatePaginationAndGetPaginatedData 中从 Config 更新
        totalItems: 0
    },

    /**
     * 初始化 DOM 缓存
     */
    initDOMCache() {
        this._domCache = {
            // 交易表格
            tradeTableBody: document.getElementById('tradeTableBody'),

            // 编辑弹窗
            editModal: document.getElementById('editModal'),
            editTradeId: document.getElementById('editTradeId'),
            editTradeDate: document.getElementById('editTradeDate'),
            editTradeType: document.getElementById('editTradeType'),
            editTradePrice: document.getElementById('editTradePrice'),
            editTradeAmount: document.getElementById('editTradeAmount'),
            editTradeFee: document.getElementById('editTradeFee'),
            editTradeAmountDisplay: document.getElementById('editTradeAmountDisplay'),
            updateTradeBtn: document.getElementById('updateTradeBtn'),
            closeEditTradeModalBtn: document.getElementById('closeEditTradeModalBtn'),

            // 分页容器
            tradePaginationContainer: document.getElementById('tradePaginationContainer')
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
     * 设置当前股票代码
     * @param {string} code - 股票代码
     */
    setCurrentStock(code) {
        this._currentStockCode = code;
    },
    
    /**
     * 获取当前股票代码
     * @returns {string} 股票代码
     */
    getCurrentStockCode() {
        return this._currentStockCode;
    },
    
    /**
     * 重置分页状态
     */
    resetPagination() {
        this._pagination = {
            currentPage: 1,
            itemsPerPage: 50,
            totalItems: 0
        };
    },
    
    /**
     * 处理分页页码变化
     * @param {string} action - 'prev' 或 'next'
     */
    handlePageChange(action) {
        if (action === 'prev' && this._pagination.currentPage > 1) {
            this._pagination.currentPage--;
        } else if (action === 'next') {
            this._pagination.currentPage++;
        }

        // 使用缓存的数据重新渲染交易记录表格
        this.updateTradeTable();
    },

    /**
     * 使用缓存数据更新交易记录表格（用于分页翻页）
     */
    updateTradeTable() {
        if (!this._currentTrades || !this._currentCalcResult) {
            return;
        }

        this._ensureDOMCache();
        const tbody = this._domCache.tradeTableBody;
        if (!tbody) return;

        const { result, sortedTrades } = this._getCalculationAndSortedTrades(this._currentTrades, this._currentCalcResult);

        // 清空表格内容
        tbody.innerHTML = '';

        // 更新分页状态并获取当前页数据
        const { paginationState, paginatedTrades } = this._updatePaginationAndGetPaginatedData(sortedTrades);

        // 渲染表格行
        this._renderTableRows(paginatedTrades, result, tbody);

        // 绑定表格行事件
        this._bindTableRowEvents(tbody);

        // 渲染分页控件
        this._renderPaginationControls(paginationState);

        // 重新绑定 tooltip（交易记录表格是动态生成的）
        if (window.TooltipManager) {
            TooltipManager.rebind();
        }
    },
    
    init() {
        // 表单事件由 Detail 模块绑定，这里不再重复绑定
    },


    /**
     * 编辑交易记录
     * @param {number} tradeId - 交易记录ID
     * @param {string} stockCode - 股票代码（可选，不传则使用当前设置的股票代码）
     */
    async editTrade(tradeId, stockCode) {
        this._ensureDOMCache();
        const code = stockCode || this._currentStockCode;
        if (!code) {
            console.error('TradeManager: 未设置股票代码');
            return;
        }

        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === code);
        if (!stock) return;

        const trade = stock.trades.find(t => t.id === tradeId);
        if (!trade) return;

        // 填充编辑表单
        this._domCache.editTradeId.value = trade.id;
        this._domCache.editTradeDate.value = trade.date;
        this._domCache.editTradeType.value = trade.type;

        // 根据交易类型填充不同字段
        if (trade.type === 'dividend' || trade.type === 'tax') {
            // 分红/红利税：价格字段临时存储金额，数量和手续费为空
            this._domCache.editTradePrice.value = trade.totalAmount || 0;
            this._domCache.editTradeAmount.value = '';
            this._domCache.editTradeFee.value = '';
            this._domCache.editTradeAmountDisplay.value = trade.totalAmount || 0;
        } else {
            // 买入/卖出
            this._domCache.editTradePrice.value = trade.price;
            this._domCache.editTradeAmount.value = trade.amount;
            this._domCache.editTradeFee.value = trade.fee;
            this._domCache.editTradeAmountDisplay.value = trade.totalAmount || (trade.price * trade.amount);
        }

        // 填充备注
        const editTradeNote = document.getElementById('editTradeNote');
        if (editTradeNote) {
            editTradeNote.value = trade.note || '';
        }

        // 显示股票信息
        const stockCodeInput = document.getElementById('editTradeStockCode');
        const stockInfoDiv = document.getElementById('editTradeStockInfo');
        const stockCodeDisplay = document.getElementById('editTradeStockCodeDisplay');
        const stockNameDisplay = document.getElementById('editTradeStockNameDisplay');
        
        if (stockCodeInput) {
            stockCodeInput.value = code;
        }
        
        if (stockInfoDiv && stockCodeDisplay && stockNameDisplay) {
            stockCodeDisplay.textContent = stock.code;
            stockNameDisplay.textContent = stock.name;
            stockInfoDiv.style.display = 'flex';
        }

        // 设置为编辑模式
        const modalTitle = document.getElementById('tradeModalTitle');
        const saveBtn = document.getElementById('updateTradeBtn');
        if (modalTitle) {
            modalTitle.textContent = '编辑交易记录';
        }
        if (saveBtn) {
            saveBtn.textContent = '保存';
        }

        // 根据类型设置表单状态
        this.onEditTypeChange();

        this._domCache.editModal.style.display = 'block';
    },
    
    /**
     * 编辑时操作类型切换
     */
    onEditTypeChange() {
        this._ensureDOMCache();
        const type = this._domCache.editTradeType.value;
        const priceInput = this._domCache.editTradePrice;
        const amountInput = this._domCache.editTradeAmount;
        const feeInput = this._domCache.editTradeFee;
        const amountDisplay = this._domCache.editTradeAmountDisplay;

        if (type === 'dividend' || type === 'tax') {
            // 分红/红利税：价格字段变为金额输入，数量和手续费禁用
            priceInput.placeholder = '请输入金额';
            amountInput.value = '';
            amountInput.placeholder = '-';
            amountInput.readOnly = true;
            amountInput.style.background = '#f5f5f5';
            feeInput.value = '';
            feeInput.placeholder = '-';
            feeInput.readOnly = true;
            feeInput.style.background = '#f5f5f5';
            // 金额可编辑
            amountDisplay.readOnly = false;
            amountDisplay.style.background = '#fff';
            amountDisplay.style.cursor = 'text';
            amountDisplay.placeholder = '请输入金额';
            // 价格字段用于输入金额
            priceInput.oninput = () => {
                amountDisplay.value = priceInput.value;
            };
        } else {
            // 买入/卖出：恢复正常
            priceInput.placeholder = '请输入价格';
            priceInput.oninput = () => this.updateEditAmount();
            amountInput.placeholder = '请输入数量';
            amountInput.readOnly = false;
            amountInput.style.background = '#fff';
            feeInput.placeholder = '默认5元';
            feeInput.readOnly = false;
            feeInput.style.background = '#fff';
            // 金额只读
            amountDisplay.readOnly = true;
            amountDisplay.style.background = '#f5f5f5';
            amountDisplay.style.cursor = 'not-allowed';
            amountDisplay.placeholder = '自动计算';
            this.updateEditAmount();
        }
    },
    
    /**
     * 更新编辑表单中的金额显示
     */
    updateEditAmount() {
        this._ensureDOMCache();
        const type = this._domCache.editTradeType.value;
        if (type === 'dividend' || type === 'tax') {
            // 分红/红利税：金额从价格字段获取
            const amount = parseFloat(this._domCache.editTradePrice.value) || 0;
            this._domCache.editTradeAmountDisplay.value = amount;
        } else {
            // 买入/卖出：金额 = 价格 * 数量
            const price = parseFloat(this._domCache.editTradePrice.value) || 0;
            const amount = parseInt(this._domCache.editTradeAmount.value) || 0;
            const total = Math.round(price * amount * 100) / 100;
            this._domCache.editTradeAmountDisplay.value = total || '';
        }
    },

    /**
     * 更新交易记录
     * @param {string} stockCode - 股票代码（可选）
     */
    async updateTrade(stockCode) {
        this._ensureDOMCache();
        const code = stockCode || this._currentStockCode;
        if (!code) {
            ErrorHandler.showErrorSimple('未设置股票代码');
            return;
        }

        const date = this._domCache.editTradeDate.value;
        const type = this._domCache.editTradeType.value;

        // 使用 Validator 进行数据验证
        const Validator = StockProfitCalculator.Validator;
        
        // 验证日期
        if (!Validator.validateDate(date)) {
            ErrorHandler.showErrorSimple('交易日期格式无效');
            return;
        }

        // 验证交易类型
        if (!Validator.validateTradeType(type)) {
            ErrorHandler.showErrorSimple('交易类型无效');
            return;
        }

        const Loading = StockProfitCalculator.Loading;
        
        // 显示加载状态
        Loading.show('正在保存交易记录...');

        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === code);
        if (!stock) {
            ErrorHandler.showErrorSimple('未找到当前股票');
            Loading.hide();
            return;
        }

        // 获取备注
        const editTradeNote = document.getElementById('editTradeNote');
        const note = editTradeNote ? editTradeNote.value.trim() : '';

        // 判断是添加还是编辑模式
        const isAddMode = !this._domCache.editTradeId.value;

        if (isAddMode) {
            // 添加模式：创建新交易记录
            let newTrade;

            if (type === 'dividend' || type === 'tax') {
                const totalAmount = parseFloat(this._domCache.editTradeAmountDisplay.value) || 0;
                if (!totalAmount || totalAmount <= 0) {
                    ErrorHandler.showErrorSimple('请填写正确的金额');
                    Loading.hide();
                    return;
                }
                newTrade = {
                    id: Date.now(),
                    date,
                    type,
                    price: 0,
                    amount: 0,
                    fee: 0,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    note
                };
            } else {
                const price = parseFloat(this._domCache.editTradePrice.value);
                const amount = parseInt(this._domCache.editTradeAmount.value);
                const fee = parseFloat(this._domCache.editTradeFee.value) || 0;

                // 使用 Validator 验证价格和数量
                if (!Validator.validatePrice(price)) {
                    ErrorHandler.showErrorSimple('价格必须在0.001-9999.999之间');
                    Loading.hide();
                    return;
                }

                if (!Validator.validateAmount(amount)) {
                    ErrorHandler.showErrorSimple('数量必须是100的倍数，且最小为100股');
                    Loading.hide();
                    return;
                }

                if (!Validator.validateFee(fee)) {
                    ErrorHandler.showErrorSimple('手续费必须在0-10000之间');
                    Loading.hide();
                    return;
                }

                newTrade = {
                    id: Date.now(),
                    date,
                    type,
                    price,
                    amount,
                    fee,
                    totalAmount: Math.round(price * amount * 100) / 100,
                    note
                };
            }

            // 添加到交易记录
            stock.trades.push(newTrade);
        } else {
            // 编辑模式：更新现有交易记录
            const tradeId = parseInt(this._domCache.editTradeId.value);
            const trade = stock.trades.find(t => t.id === tradeId);
            if (!trade) {
                ErrorHandler.showWarning('交易记录不存在');
                Loading.hide();
                return;
            }

            if (type === 'dividend' || type === 'tax') {
                const totalAmount = parseFloat(this._domCache.editTradeAmountDisplay.value) || 0;
                if (!totalAmount || totalAmount <= 0) {
                    ErrorHandler.showErrorSimple('请填写正确的金额');
                    Loading.hide();
                    return;
                }
                Object.assign(trade, {
                    date,
                    type,
                    price: 0,
                    amount: 0,
                    fee: 0,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    note
                });
            } else {
                const price = parseFloat(this._domCache.editTradePrice.value);
                const amount = parseInt(this._domCache.editTradeAmount.value);
                const fee = parseFloat(this._domCache.editTradeFee.value) || 0;

                // 使用 Validator 验证价格和数量
                if (!Validator.validatePrice(price)) {
                    ErrorHandler.showErrorSimple('价格必须在0.001-9999.999之间');
                    Loading.hide();
                    return;
                }

                if (!Validator.validateAmount(amount)) {
                    ErrorHandler.showErrorSimple('数量必须是100的倍数，且最小为100股');
                    Loading.hide();
                    return;
                }

                if (!Validator.validateFee(fee)) {
                    ErrorHandler.showErrorSimple('手续费必须在0-10000之间');
                    Loading.hide();
                    return;
                }

                Object.assign(trade, {
                    date,
                    type,
                    price,
                    amount,
                    fee,
                    totalAmount: Math.round(price * amount * 100) / 100,
                    note
                });
            }
        }

        await DataManager.save(data);

        this.closeEditModal();
        
        // 刷新所有页面
        if (window.App && window.App.updateAll) {
            await window.App.updateAll();
        }
        
        // 如果在交易记录页面，刷新交易记录页面
        const currentPage = StockProfitCalculator.Router ? StockProfitCalculator.Router.getCurrentPage() : null;
        if (currentPage === 'tradeRecords' && StockProfitCalculator.TradeRecords) {
            await StockProfitCalculator.TradeRecords.refresh();
        }

        // 隐藏加载状态
        Loading.hide();
    },
    
    /**
     * 删除交易记录
     * @param {number} tradeId - 交易记录ID
     * @param {string} stockCode - 股票代码（可选）
     */
    async deleteTrade(tradeId, stockCode) {
        if (!confirm('确定要删除这条交易记录吗？')) return;
        
        const code = stockCode || this._currentStockCode;
        if (!code) {
            ErrorHandler.showErrorSimple('未设置股票代码');
            return;
        }

        const Loading = StockProfitCalculator.Loading;
        
        // 显示加载状态
        Loading.show('正在删除交易记录...');

        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === code);
        if (!stock) {
            ErrorHandler.showErrorSimple('未找到当前股票');
            Loading.hide();
            return;
        }

        const index = stock.trades.findIndex(t => t.id === tradeId);
        if (index === -1) {
            ErrorHandler.showWarning('交易记录不存在');
            Loading.hide();
            return;
        }
        
        stock.trades.splice(index, 1);
        await DataManager.save(data);
        
        if (window.App && window.App.updateAll) {
            await window.App.updateAll();
        }

        // 隐藏加载状态
        Loading.hide();
    },
    
    /**
     * 关闭编辑弹窗
     */
    closeEditModal() {
        this._ensureDOMCache();
        this._domCache.editModal.style.display = 'none';
    },

    // ==================== 私有方法（_前缀）====================

    /**
     * 获取计算结果和排序后的交易记录
     * @private
     * @param {Array} trades - 交易记录数组
     * @param {Object} calcResult - 可选的计算结果
     * @returns {Object} 包含计算结果和排序后的交易记录
     */
    _getCalculationAndSortedTrades(trades, calcResult) {
        const result = calcResult || StockProfitCalculator.Calculator.calculateAll(trades);
        const sortedTrades = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));
        return { result, sortedTrades };
    },

    /**
     * 更新分页状态并获取当前页数据
     * @private
     * @param {Array} sortedTrades - 已排序的交易记录
     * @returns {Object} 包含分页状态和当前页数据
     */
    _updatePaginationAndGetPaginatedData(sortedTrades) {
        const Config = StockProfitCalculator.Config;

        // 从 Config 读取分页配置
        const threshold = Config.get('ui.pagination.threshold', 50);
        const itemsPerPage = Config.get('ui.pagination.itemsPerPage', 30);

        this._pagination.totalItems = sortedTrades.length;
        this._pagination.itemsPerPage = itemsPerPage;

        // 判断是否需要分页（记录数 >= 阈值）
        const shouldPaginate = sortedTrades.length >= threshold;

        if (shouldPaginate) {
            // 启用分页
            this._pagination.totalPages = Pagination.calculateTotalPages(
                this._pagination.totalItems,
                this._pagination.itemsPerPage
            );

            const paginationState = Pagination.createState(
                this._pagination.totalItems,
                this._pagination.itemsPerPage,
                this._pagination.currentPage
            );

            const paginatedTrades = Pagination.getPaginatedData(
                sortedTrades,
                this._pagination.currentPage,
                this._pagination.itemsPerPage
            );

            return { paginationState, paginatedTrades };
        } else {
            // 不分页，显示全部
            this._pagination.totalPages = 1;
            this._pagination.currentPage = 1;

            const paginationState = Pagination.createState(
                this._pagination.totalItems,
                this._pagination.totalItems,  // 显示全部时，每页条数等于总数
                1
            );

            return { paginationState, paginatedTrades: sortedTrades };
        }
    },

    /**
     * 生成收益显示HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} result - 计算结果
     * @returns {string} 收益显示HTML
     */
    _generateProfitDisplay(trade, result) {
        if (trade.type === 'sell') {
            const sellRecord = result.sellRecords.find(s => s.tradeId === trade.id);
            if (sellRecord) {
                const profitValue = sellRecord.profit;
                const returnRateValue = sellRecord.returnRate;
                const profitClass = profitValue < 0 ? 'loss' : 'profit';
                return `<span class="${profitClass}">¥${profitValue.toFixed(2)} (${returnRateValue.toFixed(3)}%)</span>`;
            }
        } else if (trade.type === 'dividend') {
            const amount = trade.totalAmount || 0;
            return `<span class="profit">+¥${amount.toFixed(2)}</span>`;
        } else if (trade.type === 'tax') {
            const amount = trade.totalAmount || 0;
            return `<span class="loss">-¥${amount.toFixed(2)}</span>`;
        }
        return '-';
    },

    /**
     * 生成持仓周期显示HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} cycleInfo - 持仓周期信息
     * @returns {string} 持仓周期显示HTML
     */
    _generateCycleDisplay(trade, cycleInfo) {
        const info = cycleInfo[trade.id];
        if (!info) return '-';

        const cycleNum = info.cycle;
        const cycleBadge = `<span class="cycle-badge cycle-${((cycleNum - 1) % 8) + 1}">第${cycleNum}轮</span>`;

        if (trade.type === 'buy') {
            const tagClass = info.buyType === '建仓' ? 'cycle-start' : 'cycle-add';
            const tagText = info.buyType === '建仓' ? '建仓' : '加仓';
            return `${cycleBadge} <span class="cycle-tag ${tagClass}">${tagText}</span>`;
        } else if (trade.type === 'sell') {
            const tagClass = info.sellType === '清仓' ? 'cycle-end' : 'cycle-reduce';
            const tagText = info.sellType === '清仓' ? '清仓' : '减仓';
            return `${cycleBadge} <span class="cycle-tag ${tagClass}">${tagText}</span>`;
        } else if (trade.type === 'dividend') {
            return `${cycleBadge} <span class="cycle-tag cycle-dividend">分红</span>`;
        } else if (trade.type === 'tax') {
            return `${cycleBadge} <span class="cycle-tag cycle-tax">红利税</span>`;
        }
        return cycleBadge;
    },

    /**
     * 生成操作类型显示HTML
     * @private
     * @param {Object} trade - 交易记录
     * @returns {Object} 包含 typeDisplay 和 typeClass 的对象
     */
    _generateTypeDisplay(trade) {
        let typeDisplay, typeClass;
        switch (trade.type) {
            case 'buy':
                typeDisplay = '买入';
                typeClass = 'badge-buy';
                break;
            case 'sell':
                typeDisplay = '卖出';
                typeClass = 'badge-sell';
                break;
            case 'dividend':
                typeDisplay = '分红';
                typeClass = 'badge-dividend';
                break;
            case 'tax':
                typeDisplay = '红利税';
                typeClass = 'badge-tax';
                break;
            default:
                typeDisplay = trade.type;
                typeClass = '';
        }
        return { typeDisplay, typeClass };
    },

    /**
     * 生成买入交易的预估盈亏tooltip HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} buyDetail - 买入明细
     * @returns {string} tooltip HTML
     */
    _generateEstimateTooltipHtml(trade, buyDetail) {
        const Utils = StockProfitCalculator.Utils;

        if (!buyDetail || !buyDetail.remainingAmount || buyDetail.remainingAmount <= 0) {
            return '';
        }

        const detailRef = (typeof globalThis !== 'undefined' && globalThis.Detail)
            ? globalThis.Detail
            : ((typeof window !== 'undefined' && window.Detail)
                ? window.Detail
                : (typeof Detail !== 'undefined' ? Detail : null));

        const latestPrice = (detailRef && Number.isFinite(detailRef.currentStockPrice))
            ? detailRef.currentStockPrice
            : null;
        if (!Number.isFinite(latestPrice) || latestPrice === null) {
            return `<div class="trade-amount-detail-item" style="opacity:0.9;">暂无最新价，无法预估剩余部分盈亏</div>`;
        }

        const remainingAmount = buyDetail.remainingAmount;
        const feePortion = (trade.amount > 0)
            ? (trade.fee || 0) * remainingAmount / trade.amount
            : 0;
        const remainingCost = trade.price * remainingAmount + feePortion;
        const remainingMarketValue = latestPrice * remainingAmount;
        const estProfit = remainingMarketValue - remainingCost;
        const estReturnRate = remainingCost > 0 ? (estProfit / remainingCost * 100) : 0;
        const profitSign = estProfit >= 0 ? '+' : '-';
        const profitClass = estProfit >= 0 ? 'profit' : 'loss';

        return [
            `<div class="trade-amount-detail-item" style="opacity:0.9;">—— 预估（按最新价卖出剩余部分）——</div>`,
            `<div class="trade-amount-detail-item">最新价：¥${Utils.formatPrice(latestPrice)} | 剩余：${remainingAmount}股</div>`,
            `<div class="trade-amount-detail-item">剩余成本：¥${remainingCost.toFixed(2)} | 剩余市值：¥${remainingMarketValue.toFixed(2)}</div>`,
            `<div class="trade-amount-detail-item">预估盈亏：<span class="${profitClass}">${profitSign}¥${Math.abs(estProfit).toFixed(2)}</span>（${profitSign}${Math.abs(estReturnRate).toFixed(3)}%）</div>`
        ].join('');
    },

    /**
     * 生成买入交易的数量显示HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} buyDetail - 买入明细
     * @returns {string} 数量显示HTML
     */
    _generateBuyAmountDisplay(trade, buyDetail) {
        const Utils = StockProfitCalculator.Utils;

        const stateLabel = buyDetail ? buyDetail.status : '持有中';
        const stateClass = buyDetail
            ? (buyDetail.remainingAmount === 0 ? 'state-sold' : (buyDetail.soldAmount > 0 ? 'state-partial' : 'state-holding'))
            : 'state-holding';
        const stateBadgeHtml = `<span class="trade-amount-state ${stateClass}">${stateLabel}</span>`;

        const estimateOnly = this._generateEstimateTooltipHtml(trade, buyDetail);

        if (buyDetail && buyDetail.sellDetails && buyDetail.sellDetails.length > 0) {
            const sellDetailsHtml = buyDetail.sellDetails.map(detail => {
                const profitSign = detail.profit >= 0 ? '+' : '-';
                const profitClass = detail.profit >= 0 ? 'profit' : 'loss';
                return `<div class="trade-amount-detail-item">${detail.sellDate} | ¥${Utils.formatPrice(detail.sellPrice)} | ${detail.amount}股 | <span class="${profitClass}">${profitSign}¥${Math.abs(detail.profit).toFixed(2)}</span></div>`;
            }).join('') + estimateOnly;

            return `
                <span class="trade-amount-inline">
                    ${trade.amount}
                    <span class="trade-amount-state-wrap">
                        ${stateBadgeHtml}
                        <div class="trade-amount-detail-tooltip" role="tooltip">${sellDetailsHtml}</div>
                    </span>
                </span>
            `;
        } else {
            return `
                <span class="trade-amount-inline">
                    ${trade.amount}
                    <span class="trade-amount-state-wrap">
                        ${stateBadgeHtml}
                        ${estimateOnly ? `<div class="trade-amount-detail-tooltip" role="tooltip">${estimateOnly}</div>` : ''}
                    </span>
                </span>
            `;
        }
    },

    /**
     * 生成价格和数量显示HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} holdingDetailMap - 持仓明细映射
     * @returns {Object} 包含 priceDisplay、amountDisplay、feeDisplay 的对象
     */
    _generatePriceAmountDisplay(trade, holdingDetailMap) {
        const Utils = StockProfitCalculator.Utils;

        let priceDisplay, amountDisplay, feeDisplay;

        if (trade.type === 'dividend' || trade.type === 'tax') {
            priceDisplay = '-';
            amountDisplay = '-';
            feeDisplay = '-';
        } else {
            priceDisplay = Utils.formatPrice(trade.price);
            if (trade.type === 'buy') {
                const buyDetail = holdingDetailMap.get(trade.id);
                amountDisplay = this._generateBuyAmountDisplay(trade, buyDetail);
            } else {
                amountDisplay = trade.amount;
            }
            feeDisplay = trade.fee.toFixed(2);
        }

        return { priceDisplay, amountDisplay, feeDisplay };
    },

    /**
     * 生成表格行HTML
     * @private
     * @param {Object} trade - 交易记录
     * @param {Object} result - 计算结果
     * @param {Object} holdingDetailMap - 持仓明细映射
     * @returns {string} 表格行HTML
     */
    _generateTableRowHTML(trade, result, holdingDetailMap) {
        const tradeValue = trade.totalAmount || (trade.price * trade.amount) || 0;
        const profitDisplay = this._generateProfitDisplay(trade, result);
        const cycleDisplay = this._generateCycleDisplay(trade, result.cycleInfo);
        const { typeDisplay, typeClass } = this._generateTypeDisplay(trade);
        const { priceDisplay, amountDisplay, feeDisplay } = this._generatePriceAmountDisplay(trade, holdingDetailMap);

        // 备注显示 - 改为引用行样式
        const noteRow = trade.note ? `
            <tr class="trade-note-row">
                <td colspan="9">
                    <div class="trade-note-quote">
                        <span class="quote-icon">💬</span>
                        <span class="quote-text">${trade.note}</span>
                    </div>
                </td>
            </tr>
        ` : '';

        return `
            <td>${trade.date}</td>
            <td><span class="badge ${typeClass}">${typeDisplay}</span></td>
            <td>${priceDisplay}</td>
            <td>${amountDisplay}</td>
            <td>${feeDisplay}</td>
            <td>${tradeValue.toFixed(2)}</td>
            <td>${profitDisplay}</td>
            <td>${cycleDisplay}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-warning btn-edit-trade" data-trade-id="${trade.id}">编辑</button>
                    <button class="btn btn-danger btn-delete-trade" data-trade-id="${trade.id}">删除</button>
                </div>
            </td>
        `;
    },

    /**
     * 渲染表格行
     * @private
     * @param {Array} paginatedTrades - 分页后的交易记录
     * @param {Object} result - 计算结果
     * @param {HTMLElement} tbody - 表格body元素
     */
    _renderTableRows(paginatedTrades, result, tbody) {
        const holdingDetailMap = new Map((result.holdingDetail || []).map(detail => [detail.id, detail]));
        const fragment = document.createDocumentFragment();

        paginatedTrades.forEach(trade => {
            // 主行
            const row = document.createElement('tr');
            row.innerHTML = this._generateTableRowHTML(trade, result, holdingDetailMap);
            fragment.appendChild(row);

            // 备注行（如果有备注）
            if (trade.note) {
                const noteRow = document.createElement('tr');
                noteRow.className = 'trade-note-row';
                noteRow.innerHTML = `
                    <td colspan="9">
                        <div class="trade-note-quote">
                            <span class="quote-icon">💬</span>
                            <span class="quote-text">${trade.note}</span>
                        </div>
                    </td>
                `;
                fragment.appendChild(noteRow);
            }
        });

        tbody.appendChild(fragment);
    },

    /**
     * 绑定表格行事件
     * @private
     * @param {HTMLElement} tbody - 表格body元素
     */
    _bindTableRowEvents(tbody) {
        tbody.querySelectorAll('.btn-edit-trade').forEach(btn => {
            const tradeId = parseInt(btn.dataset.tradeId);
            btn.onclick = () => this.editTrade(tradeId);
        });

        tbody.querySelectorAll('.btn-delete-trade').forEach(btn => {
            const tradeId = parseInt(btn.dataset.tradeId);
            btn.onclick = () => this.deleteTrade(tradeId);
        });
    },

    /**
     * 渲染分页控件
     * @private
     * @param {Object} paginationState - 分页状态
     */
    _renderPaginationControls(paginationState) {
        if (this._pagination.totalPages > 1) {
            const paginationHtml = Pagination.renderControls(
                paginationState,
                'tradePaginationContainer',
                (action) => this.handlePageChange(action)
            );

            const paginationContainer = this._domCache.tradePaginationContainer;
            if (paginationContainer) {
                paginationContainer.innerHTML = paginationHtml;
                Pagination.bindEvents('tradePaginationContainer', (action) => this.handlePageChange(action));
            }
        } else {
            const paginationContainer = this._domCache.tradePaginationContainer;
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
        }
    },

    // ==================== 公共方法 =====================

    /**
     * 渲染交易表格
     */
    renderTradeTable(trades, calcResult) {
        const perfToken = window.Perf ? window.Perf.start('TradeManager.renderTradeTable') : null;
        this._ensureDOMCache();

        // 缓存数据，用于分页翻页时重新渲染
        this._currentTrades = trades;
        this._currentCalcResult = calcResult;

        // 重置分页状态
        this._pagination.currentPage = 1;

        const tbody = this._domCache.tradeTableBody;
        if (!tbody) return;

        // 获取计算结果和排序后的交易记录
        const { result, sortedTrades } = this._getCalculationAndSortedTrades(trades, calcResult);

        // 清空表格内容
        tbody.innerHTML = '';

        // 更新分页状态并获取当前页数据
        const { paginationState, paginatedTrades } = this._updatePaginationAndGetPaginatedData(sortedTrades);

        // 渲染表格行
        this._renderTableRows(paginatedTrades, result, tbody);

        // 绑定表格行事件
        this._bindTableRowEvents(tbody);

        // 渲染分页控件
        this._renderPaginationControls(paginationState);

        // Tooltip 已由 TooltipManager 统一管理

        if (window.Perf) window.Perf.end(perfToken, { rows: paginatedTrades.length });
    }
};

// 挂载到命名空间
StockProfitCalculator.TradeManager = TradeManager;

/**
 * 股票管理模块
 * 负责股票的添加、删除、分组管理
 */

const StockManager = {
    // 股票分组定义
    GROUPS: {
        holding: { name: '持仓中', color: '#4caf50' },
        cleared: { name: '已清仓', color: '#999' }
    },
    
    /**
     * 初始化股票管理模块
     */
    init() {
        this.createStockManageModal();
        this.bindEvents();
    },
    
    /**
     * 创建股票管理弹窗
     */
    createStockManageModal() {
        const modalHTML = `
            <div id="stockModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="stockModalTitle">添加股票</h2>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>股票代码 *</label>
                            <input type="text" id="stockCode" placeholder="如: 002460" maxlength="6">
                        </div>
                        <div class="form-group">
                            <label>股票名称 *</label>
                            <input type="text" id="stockName" placeholder="如: 赣锋锂业">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="saveStockBtn">保存</button>
                        <button type="button" class="btn" id="cancelStockBtn">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 股票代码输入时自动获取名称
        const stockCodeInput = document.getElementById('stockCode');
        if (stockCodeInput) {
            stockCodeInput.addEventListener('blur', () => {
                this.autoFetchStockName();
            });
        }

        const saveBtn = document.getElementById('saveStockBtn');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveStock();
        }

        const cancelBtn = document.getElementById('cancelStockBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeModal();
        }
    },
    
    /**
     * 显示添加股票弹窗
     */
    showAddModal() {
        document.getElementById('stockModalTitle').textContent = '添加股票';
        document.getElementById('newStockCode').value = '';
        document.getElementById('newStockCode').disabled = false;
        document.getElementById('newStockName').value = '';
        // 重置已存在提示状态
        const existsTip = document.getElementById('stockExistsTip');
        if (existsTip) existsTip.style.display = 'none';
        const saveBtn = document.getElementById('saveNewStockBtn');
        if (saveBtn) saveBtn.disabled = false;
        document.getElementById('addStockModal').style.display = 'flex';
    },
    
    /**
     * 保存股票
     */
    async saveStock() {
        StockProfitCalculator.Logger?.debug?.('[saveStock] 开始执行');
        
        const code = document.getElementById('newStockCode').value.trim();
        const name = document.getElementById('newStockName').value.trim();
        // 新股票默认分组为 cleared，后续会根据交易记录自动归一化
        const group = 'cleared';
        StockProfitCalculator.Logger?.debug?.('[saveStock] 股票代码:', code, ', 名称:', name, ', 分组:', group);

        // 使用 Validator 进行数据验证
        const Validator = StockProfitCalculator.Validator;
        
        if (!Validator.validateStockCode(code)) {
            ErrorHandler.showErrorSimple('股票代码必须是6位数字');
            return;
        }

        if (!Validator.validateStockName(name)) {
            ErrorHandler.showErrorSimple('股票名称长度必须在2-20个字符之间');
            return;
        }

        const DataManager = StockProfitCalculator.DataManager;
        const Router = StockProfitCalculator.Router;
        const Loading = StockProfitCalculator.Loading;

        // 显示加载状态
        Loading.show('正在保存股票...');

        const data = await DataManager.load();
        StockProfitCalculator.Logger?.debug?.('[saveStock] 数据加载完成, 股票数量:', data.stocks.length);
        
        const isEdit = document.getElementById('newStockCode').disabled;
        StockProfitCalculator.Logger?.debug?.('[saveStock] 是否编辑模式:', isEdit);

        let result;
        if (isEdit) {
            result = await DataManager.updateStock(data, code, { name, group });
            StockProfitCalculator.Logger?.debug?.('[saveStock] updateStock 结果:', result);
        } else {
            result = await DataManager.addStock(data, { code, name, group });
            StockProfitCalculator.Logger?.debug?.('[saveStock] addStock 结果:', result);
        }
        
        StockProfitCalculator.Logger?.debug?.('[saveStock] result.success:', result?.success);

        if (result.success) {
            StockProfitCalculator.Logger?.debug?.('[saveStock] 操作成功，准备跳转');
            this.closeModal();

            ErrorHandler.showSuccess(result.message);

            // 添加新股票成功后，自动跳转到详情页，让用户开始添加交易记录
            // 详情页会自动检测并提示"请添加第一笔交易"
            if (!isEdit) {
                StockProfitCalculator.Logger?.debug?.('[saveStock] 准备跳转到详情页:', code);
                // 使用统一的路由处理函数，确保 Detail.loadStock() 被调用
                if (window.App && window.App.handleRouteChange) {
                    StockProfitCalculator.Logger?.debug?.('[saveStock] 调用 App.handleRouteChange(detail, ' + code + ')');
                    await window.App.handleRouteChange('detail', code);
                    StockProfitCalculator.Logger?.debug?.('[saveStock] handleRouteChange 完成');
                } else {
                    // 降级处理：直接调用（兼容旧代码）
                    StockProfitCalculator.Logger?.debug?.('[saveStock] 降级处理：直接调用 Router.showDetail');
                    Router.showDetail(code);
                    if (window.Detail && window.Detail.loadStock) {
                        window.Detail.loadStock(code);
                    }
                }
            }
        } else {
            StockProfitCalculator.Logger?.debug?.('[saveStock] 操作失败:', result.message);
            if (!isEdit && result.message === '该股票已存在') {
                // 已存在：直接跳转到对应股票详情页
                StockProfitCalculator.Logger?.debug?.('[saveStock] 股票已存在，跳转到详情页');
                this.closeModal();
                Loading.hide();
                Router.showDetail(code);
                return;
            }

            ErrorHandler.showErrorSimple(result.message);
        }

        // 隐藏加载状态
        Loading.hide();
    },
    
    /**
     * 关闭弹窗
     */
    closeModal() {
        document.getElementById('addStockModal').style.display = 'none';
    },
    
    // ==================== 汇总页面使用的方法 ====================
    
    /**
     * 打开添加股票弹窗（汇总页面使用）
     */
    openAddStockModal() {
        this.showAddModal();
    },
    
    /**
     * 关闭添加股票弹窗（汇总页面使用）
     */
    closeAddStockModal() {
        this.closeModal();
    },
    
    /**
     * 保存新股票（汇总页面使用）
     */
    saveNewStock() {
        this.saveStock();
    },

    /**
     * 编辑股票（汇总页面使用）
     */
    async editStock(stockCode) {
        const DataManager = StockProfitCalculator.DataManager;
        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);

        if (!stock) {
            ErrorHandler.showWarning('股票不存在');
            return;
        }

        document.getElementById('stockModalTitle').textContent = '编辑股票';
        document.getElementById('newStockCode').value = stock.code;
        document.getElementById('newStockCode').disabled = true;
        document.getElementById('newStockName').value = stock.name;
        document.getElementById('addStockModal').style.display = 'flex';
    },

    /**
     * 删除股票（汇总页面使用）
     * 使用自定义确认弹窗，需要输入股票名称确认
     */
    async deleteStock(stockCode) {
        const DataManager = StockProfitCalculator.DataManager;
        const Loading = StockProfitCalculator.Loading;
        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);

        if (!stock) {
            ErrorHandler.showWarning('股票不存在');
            return;
        }

        // 使用自定义确认弹窗
        const confirmed = await this.showDeleteConfirmDialog(stock);
        if (!confirmed) {
            return;
        }

        // 显示加载状态
        Loading.show('正在删除股票...');

        const result = await DataManager.deleteStock(data, stockCode);

        if (result.success) {
            // 刷新页面：交给统一入口处理
            if (window.App && window.App.updateAll) {
                await window.App.updateAll();
            }
            ErrorHandler.showSuccess(result.message);
        } else {
            ErrorHandler.showErrorSimple(result.message);
        }

        // 隐藏加载状态
        Loading.hide();
    },

    /**
     * 显示删除确认弹窗
     * @param {Object} stock - 股票对象
     * @returns {Promise<boolean>} - 确认返回 true，取消返回 false
     */
    showDeleteConfirmDialog(stock) {
        return new Promise((resolve) => {
            const modal = document.getElementById('deleteStockModal');
            const nameEl = document.getElementById('deleteStockName');
            const codeEl = document.getElementById('deleteStockCode');
            const countEl = document.getElementById('deleteTradeCount');
            const inputEl = document.getElementById('deleteConfirmInput');
            const hintEl = document.getElementById('deleteConfirmHint');
            const confirmBtn = document.getElementById('confirmDeleteStockBtn');
            const cancelBtn = document.getElementById('cancelDeleteStockBtn');

            // 填充股票信息
            nameEl.textContent = stock.name;
            codeEl.textContent = stock.code;
            countEl.textContent = (stock.trades && stock.trades.length ? stock.trades.length : 0) + ' 条';
            
            // 设置输入框 placeholder
            inputEl.placeholder = stock.name;
            inputEl.value = '';
            inputEl.className = 'delete-confirm-input';
            hintEl.textContent = '';
            hintEl.className = 'delete-confirm-hint';
            confirmBtn.disabled = true;

            // 当前股票名称（用于验证）
            const targetName = stock.name;

            // 输入验证函数
            const validateInput = () => {
                const inputValue = inputEl.value.trim();
                
                if (inputValue === targetName) {
                    inputEl.className = 'delete-confirm-input valid';
                    hintEl.textContent = '✓ 名称匹配，可以删除';
                    hintEl.className = 'delete-confirm-hint success';
                    confirmBtn.disabled = false;
                } else if (inputValue === '') {
                    inputEl.className = 'delete-confirm-input';
                    hintEl.textContent = '';
                    hintEl.className = 'delete-confirm-hint';
                    confirmBtn.disabled = true;
                } else {
                    inputEl.className = 'delete-confirm-input invalid';
                    hintEl.textContent = '✗ 名称不匹配';
                    hintEl.className = 'delete-confirm-hint error';
                    confirmBtn.disabled = true;
                }
            };

            // 绑定输入事件
            inputEl.addEventListener('input', validateInput);

            // 回车确认
            const handleKeydown = (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    closeModal(true);
                } else if (e.key === 'Escape') {
                    closeModal(false);
                }
            };
            inputEl.addEventListener('keydown', handleKeydown);

            // 关闭弹窗函数
            const closeModal = (result) => {
                modal.style.display = 'none';
                inputEl.removeEventListener('input', validateInput);
                inputEl.removeEventListener('keydown', handleKeydown);
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                modal.removeEventListener('click', handleModalClick);
                resolve(result);
            };

            // 确认按钮
            const handleConfirm = () => closeModal(true);
            const handleCancel = () => closeModal(false);
            
            // 点击背景关闭
            const handleModalClick = (e) => {
                if (e.target === modal) {
                    closeModal(false);
                }
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            modal.addEventListener('click', handleModalClick);

            // 显示弹窗
            modal.style.display = 'flex';
            
            // 聚焦输入框
            setTimeout(() => inputEl.focus(), 100);
        });
    },
    
    /**
     * 自动获取股票名称
     */
    async autoFetchStockName() {
        const code = document.getElementById('stockCode').value.trim();
        const nameInput = document.getElementById('stockName');

        if (!code || nameInput.value) return;

        try {
            // 使用 StockPriceAPI 获取股票名称
            const quote = await StockProfitCalculator.StockPriceAPI.fetchPrice(code);
            if (quote && quote.name) {
                nameInput.value = quote.name;
            }
        } catch (error) {
            console.warn('自动获取股票名称失败:', error);
        }
    },
    
    /**
     * 获取股票名称（汇总页面使用）
     */
    async fetchStockName(code) {
        const nameInput = document.getElementById('newStockName');
        if (!nameInput || !code || code.length < 6) return;
        
        try {
            // 使用 StockPriceAPI 获取股票名称
            const quote = await StockProfitCalculator.StockPriceAPI.fetchPrice(code);
            if (quote && quote.name) {
                nameInput.value = quote.name;
            }
        } catch (error) {
            console.warn('自动获取股票名称失败:', error);
        }
    },
    
    /**
     * 处理股票代码输入（检测是否已存在 + 获取名称）
     */
    async onStockCodeInput(code) {
        const nameInput = document.getElementById('newStockName');
        const existsTip = document.getElementById('stockExistsTip');
        const saveBtn = document.getElementById('saveNewStockBtn');
        const goToLink = document.getElementById('goToStockDetailLink');
        
        // 重置状态
        if (existsTip) existsTip.style.display = 'none';
        if (saveBtn) saveBtn.disabled = false;
        if (nameInput) nameInput.value = '';
        
        // 代码不完整，不处理
        if (!code || code.length < 6) return;
        
        // 检测股票是否已存在
        const DataManager = StockProfitCalculator.DataManager;
        const data = await DataManager.load();
        const existingStock = data.stocks.find(s => s.code === code);
        
        if (existingStock) {
            // 已存在：显示提示，禁用保存按钮
            if (existsTip) existsTip.style.display = 'flex';
            if (saveBtn) saveBtn.disabled = true;
            
            // 设置跳转链接
            if (goToLink) {
                goToLink.onclick = () => {
                    this.closeModal();
                    // 跳转到详情页
                    if (window.App && window.App.handleRouteChange) {
                        window.App.handleRouteChange('detail', code);
                    } else {
                        StockProfitCalculator.Router.showDetail(code);
                    }
                };
            }
            return;
        }
        
        // 不存在：获取股票名称
        try {
            const quote = await StockProfitCalculator.StockPriceAPI.fetchPrice(code);
            if (quote && quote.name && nameInput) {
                nameInput.value = quote.name;
            }
        } catch (error) {
            console.warn('自动获取股票名称失败:', error);
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.StockManager = StockManager;

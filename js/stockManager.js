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
                    <div class="form-row">
                        <div class="form-group">
                            <label>分组</label>
                            <select id="stockGroup">
                                <option value="holding">持仓中</option>
                                <option value="cleared">已清仓</option>
                            </select>
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
        document.getElementById('newStockName').placeholder = '如: 赣锋锂业';
        // 分组会在保存时根据持仓自动归一化；无交易记录默认归类为已清仓
        document.getElementById('newStockGroup').value = 'cleared';
        document.getElementById('addStockModal').style.display = 'block';
    },
    
    /**
     * 保存股票
     */
    async saveStock() {
        console.log('[saveStock] 开始执行');
        
        const code = document.getElementById('newStockCode').value.trim();
        const name = document.getElementById('newStockName').value.trim();
        const group = document.getElementById('newStockGroup').value;
        console.log('[saveStock] 股票代码:', code, ', 名称:', name, ', 分组:', group);

        if (!code || !name) {
            ErrorHandler.showErrorSimple('请填写股票代码和名称');
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            ErrorHandler.showErrorSimple('股票代码必须是6位数字');
            return;
        }

        const DataManager = StockProfitCalculator.DataManager;
        const Router = StockProfitCalculator.Router;

        const data = await DataManager.load();
        console.log('[saveStock] 数据加载完成, 股票数量:', data.stocks.length);
        
        const isEdit = document.getElementById('newStockCode').disabled;
        console.log('[saveStock] 是否编辑模式:', isEdit);

        let result;
        if (isEdit) {
            result = await DataManager.updateStock(data, code, { name, group });
            console.log('[saveStock] updateStock 结果:', result);
        } else {
            result = await DataManager.addStock(data, { code, name, group });
            console.log('[saveStock] addStock 结果:', result);
        }
        
        console.log('[saveStock] result.success:', result?.success);

        if (result.success) {
            console.log('[saveStock] 操作成功，准备刷新和跳转');
            this.closeModal();

            // 刷新页面：交给统一入口处理，避免模块间直接调用
            if (window.App && window.App.updateAll) {
                console.log('[saveStock] 调用 App.updateAll()');
                await window.App.updateAll();
            }

            ErrorHandler.showSuccess(result.message);

            // 添加新股票成功后，提示用户添加交易记录
            if (!isEdit) {
                ErrorHandler.showInfo('股票添加成功！请添加第一笔交易记录');
            }

            // 添加新股票成功后，自动跳转到详情页，让用户开始添加交易记录
            if (!isEdit) {
                console.log('[saveStock] 准备跳转到详情页:', code);
                // 使用统一的路由处理函数，确保 Detail.loadStock() 被调用
                if (window.App && window.App.handleRouteChange) {
                    console.log('[saveStock] 调用 App.handleRouteChange(detail, ' + code + ')');
                    await window.App.handleRouteChange('detail', code);
                    console.log('[saveStock] handleRouteChange 完成');
                } else {
                    // 降级处理：直接调用（兼容旧代码）
                    console.log('[saveStock] 降级处理：直接调用 Router.showDetail');
                    Router.showDetail(code);
                    if (window.Detail && window.Detail.loadStock) {
                        window.Detail.loadStock(code);
                    }
                }
            }
        } else {
            console.log('[saveStock] 操作失败:', result.message);
            if (!isEdit && result.message === '该股票已存在') {
                // 已存在：直接跳转到对应股票详情页
                console.log('[saveStock] 股票已存在，跳转到详情页');
                this.closeModal();
                Router.showDetail(code);
                return;
            }

            ErrorHandler.showErrorSimple(result.message);
        }
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
        document.getElementById('newStockGroup').value = stock.group;
        document.getElementById('addStockModal').style.display = 'block';
    },

    /**
     * 删除股票（汇总页面使用）
     */
    async deleteStock(stockCode) {
        const DataManager = StockProfitCalculator.DataManager;
        const data = await DataManager.load();
        const stock = data.stocks.find(s => s.code === stockCode);

        if (!stock) {
            ErrorHandler.showWarning('股票不存在');
            return;
        }

        if (!confirm(`确定要删除股票 ${stock.name} (${stock.code}) 吗？\n\n该操作将删除所有相关交易记录，且不可恢复！`)) {
            return;
        }

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
    }
};

// 挂载到命名空间
StockProfitCalculator.StockManager = StockManager;

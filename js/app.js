/**
 * 主程序入口
 * 负责全局初始化和公共功能
 */

// 将App暴露到全局作用域
window.App = {
    data: null,

    /**
     * 显示提示弹窗
     * @param {string} message - 提示消息
     * @param {string} title - 标题（可选）
     */
    showAlert(message, title = '提示') {
        const modal = document.getElementById('alertModal');
        const messageEl = document.getElementById('alertMessage');
        const titleEl = document.getElementById('alertTitle');

        if (modal && messageEl && titleEl) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.style.display = 'block';
        }
    },

    /**
     * 关闭提示弹窗
     */
    closeAlert() {
        const modal = document.getElementById('alertModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * 添加点击外部关闭弹窗功能
     */
    setupModalClickOutside() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    },

    /**
     * 初始化应用
     */
    async init() {
        console.log('[App] 初始化开始');

        const FileStorage = StockProfitCalculator.FileStorage;
        const DataManager = StockProfitCalculator.DataManager;
        const StockManager = StockProfitCalculator.StockManager;
        const TradeManager = StockProfitCalculator.TradeManager;
        const DataService = StockProfitCalculator.DataService;
        const Router = StockProfitCalculator.Router;
        const Config = StockProfitCalculator.Config;

        const perfToken = window.Perf ? window.Perf.start('App.init') : null;

        // 加载配置（必须在其他初始化之前）
        Config.load();

        // 初始化文件存储
        FileStorage.init();

        // 初始化数据
        this.data = await DataManager.init();

        // 初始化各模块
        StockManager.init();
        TradeManager.init();
        DataService.init();

        // 绑定全局按钮事件（逐步替代 index.html inline onclick）
        this.bindGlobalEvents();

        // 设置点击外部关闭弹窗
        this.setupModalClickOutside();

        // 订阅路由变化（解耦 Router -> 页面模块的直接调用）
        if (StockProfitCalculator.EventBus && StockProfitCalculator.EventBus.on) {
            StockProfitCalculator.EventBus.on(StockProfitCalculator.EventBus.EventTypes.ROUTE_CHANGE, ({ page, stockCode }) => {
                this.handleRouteChange(page, stockCode);
            });
        }

        // 初始化路由（会触发 route:change）
        Router.init();

        if (window.Perf) window.Perf.end(perfToken);

        console.log('[App] 初始化完成');
    },

    bindGlobalEvents() {
        const Router = StockProfitCalculator.Router;
        const StockManager = StockProfitCalculator.StockManager;
        const TradeManager = StockProfitCalculator.TradeManager;
        const Detail = StockProfitCalculator.Detail;

        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = () => Router.showOverview();
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.onclick = () => this.openSettingsModal();
        }

        const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
        if (closeSettingsModalBtn) {
            closeSettingsModalBtn.onclick = () => this.closeSettingsModal();
        }

        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.onclick = () => this.exportData();
        }

        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.onclick = () => this.importData();
        }

        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.onclick = () => this.exportCSV();
        }

        const exportSummaryCSVBtn = document.getElementById('exportSummaryCSVBtn');
        if (exportSummaryCSVBtn) {
            exportSummaryCSVBtn.onclick = () => this.exportSummaryCSV();
        }

        const viewBackupsBtn = document.getElementById('viewBackupsBtn');
        if (viewBackupsBtn) {
            viewBackupsBtn.onclick = () => this.openBackupModal();
        }

        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            createBackupBtn.onclick = () => this.createBackup();
        }

        const closeBackupModalBtn = document.getElementById('closeBackupModalBtn');
        if (closeBackupModalBtn) {
            closeBackupModalBtn.onclick = () => this.closeBackupModal();
        }

        const closeAlertModalBtn = document.getElementById('closeAlertModalBtn');
        if (closeAlertModalBtn) {
            closeAlertModalBtn.onclick = () => this.closeAlert();
        }

        const alertOkBtn = document.getElementById('alertOkBtn');
        if (alertOkBtn) {
            alertOkBtn.onclick = () => this.closeAlert();
        }

        const closeImportPreviewModalBtn = document.getElementById('closeImportPreviewModalBtn');
        if (closeImportPreviewModalBtn) {
            closeImportPreviewModalBtn.onclick = () => this.closeImportPreviewModal();
        }

        const confirmImportMergeBtn = document.getElementById('confirmImportMergeBtn');
        if (confirmImportMergeBtn) {
            confirmImportMergeBtn.onclick = () => this.confirmImport('merge');
        }

        const confirmImportOverwriteBtn = document.getElementById('confirmImportOverwriteBtn');
        if (confirmImportOverwriteBtn) {
            confirmImportOverwriteBtn.onclick = () => this.confirmImport('overwrite');
        }

        const cancelImportPreviewBtn = document.getElementById('cancelImportPreviewBtn');
        if (cancelImportPreviewBtn) {
            cancelImportPreviewBtn.onclick = () => this.closeImportPreviewModal();
        }

        const addStockBtn = document.getElementById('addStockBtn');
        if (addStockBtn) {
            addStockBtn.onclick = () => StockManager.openAddStockModal();
        }

        const closeAddStockModalBtn = document.getElementById('closeAddStockModalBtn');
        if (closeAddStockModalBtn) {
            closeAddStockModalBtn.onclick = () => StockManager.closeAddStockModal();
        }

        const saveNewStockBtn = document.getElementById('saveNewStockBtn');
        if (saveNewStockBtn) {
            saveNewStockBtn.onclick = () => StockManager.saveNewStock();
        }

        const cancelAddStockBtn = document.getElementById('cancelAddStockBtn');
        if (cancelAddStockBtn) {
            cancelAddStockBtn.onclick = () => StockManager.closeAddStockModal();
        }

        const updateTradeBtn = document.getElementById('updateTradeBtn');
        if (updateTradeBtn) {
            updateTradeBtn.onclick = () => TradeManager.updateTrade();
        }

        const closeEditTradeModalBtn = document.getElementById('closeEditTradeModalBtn');
        if (closeEditTradeModalBtn) {
            closeEditTradeModalBtn.onclick = () => TradeManager.closeEditModal();
        }

        const refreshPriceBtn = document.getElementById('refreshPriceBtn');
        if (refreshPriceBtn) {
            refreshPriceBtn.onclick = () => Detail.fetchStockPrice();
        }

        const toggleAddTradeBtn = document.getElementById('toggleAddTradeBtn');
        if (toggleAddTradeBtn) {
            toggleAddTradeBtn.onclick = () => Detail.toggleAddTradeForm();
        }

        const cancelAddTradeBtn = document.getElementById('cancelAddTradeBtn');
        if (cancelAddTradeBtn) {
            cancelAddTradeBtn.onclick = () => Detail.toggleAddTradeForm();
        }

        const holdingSortDescBtn = document.getElementById('holdingSortDescBtn');
        if (holdingSortDescBtn) {
            holdingSortDescBtn.onclick = () => Overview.setHoldingSortDirection('desc');
        }

        const holdingSortAscBtn = document.getElementById('holdingSortAscBtn');
        if (holdingSortAscBtn) {
            holdingSortAscBtn.onclick = () => Overview.setHoldingSortDirection('asc');
        }

        const viewModeBtn = document.getElementById('viewModeBtn');
        if (viewModeBtn) {
            viewModeBtn.onclick = () => Overview.toggleViewMode();
        }

        const perfToggle = document.getElementById('perfToggle');
        if (perfToggle) {
            // 初始化 UI 状态
            perfToggle.checked = (window.__PERF_ENABLED__ === true);
            perfToggle.onchange = () => {
                window.__PERF_ENABLED__ = perfToggle.checked;
            };
        }

        const holdingDetailToggle = document.getElementById('holdingDetailToggle');
        if (holdingDetailToggle) {
            // 初始化 UI 状态
            holdingDetailToggle.checked = Config.get('ui.preferences.showHoldingDetail', true);
            // 绑定事件
            holdingDetailToggle.onchange = () => {
                Config.set('ui.preferences.showHoldingDetail', holdingDetailToggle.checked);
                Config.save();
                this.updateAll(); // 刷新当前页面
            };
        }

        const scrollToTopBtn = document.getElementById('scrollToTopBtn');
        if (scrollToTopBtn) {
            const updateVisibility = () => {
                const y = (typeof window.scrollY === 'number') ? window.scrollY : window.pageYOffset;
                if (y > 200) {
                    scrollToTopBtn.classList.add('is-visible');
                } else {
                    scrollToTopBtn.classList.remove('is-visible');
                }
            };

            scrollToTopBtn.onclick = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            window.addEventListener('scroll', updateVisibility, { passive: true });
            updateVisibility();
        }
    },

    /**
     * 统一处理路由变化对应的页面刷新
     * @param {'overview'|'detail'} page
     * @param {string|null} stockCode
     */
    handleRouteChange(page, stockCode = null) {
        const Overview = StockProfitCalculator.Overview;
        const Detail = StockProfitCalculator.Detail;
        const Router = StockProfitCalculator.Router;

        if (page === 'overview') {
            if (typeof Overview !== 'undefined') {
                Overview.init();
            }
            return;
        }

        if (page === 'detail' && stockCode) {
            if (typeof Detail !== 'undefined') {
                Router.showDetail(stockCode);  // 先切换页面
                Detail.loadStock(stockCode);  // 再加载股票数据
            }
            return;
        }

        // tradeRecords 页面：Router.showTradeRecords() 已经调用了 TradeRecords.load()，不需要再次调用
    },

    /**
     * 更新当前页面UI
     */
    updateAll() {
        const Router = StockProfitCalculator.Router;
        const currentPage = Router.getCurrentPage();
        const stockCode = Router.getCurrentStockCode();
        this.handleRouteChange(currentPage, stockCode);
    },

    /**
     * 获取股价
     */
    async fetchStockPrice() {
        if (typeof Detail !== 'undefined' && Detail.fetchStockPrice) {
            await Detail.fetchStockPrice();
        }
    },

    // ==================== 设置弹窗相关方法 ====================

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateSettingsInfo();
        }
    },

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async updateSettingsInfo() {
        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const data = await DataManager.load();
        const stats = FileStorage.getStorageStats(data);

        document.getElementById('settingsStockCount').textContent = stats.stockCount + '只';
        document.getElementById('settingsTradeCount').textContent = stats.tradeCount + '条';
        document.getElementById('settingsDataSize').textContent = stats.dataSize;
    },

    // ==================== 数据导入导出 ====================

    async exportData() {
        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const data = await DataManager.load();
        if (FileStorage.exportData(data)) {
            ErrorHandler.showSuccess('JSON数据导出成功！');
        }
        this.closeSettingsModal();
    },

    async importData() {
        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const importData = await FileStorage.selectAndReadFile();
        if (!importData) return;

        const currentData = await DataManager.load();
        const analysis = FileStorage.analyzeImportData(currentData, importData);

        // 保存导入数据供后续使用
        this.pendingImportData = importData;

        // 显示预览
        this.showImportPreview(analysis);
    },

    showImportPreview(analysis) {
        const modal = document.getElementById('importPreviewModal');
        const content = document.getElementById('importPreviewContent');

        let html = `
            <div class="import-summary">
                <div class="import-summary-item">
                    <span class="import-summary-label">新增股票</span>
                    <span class="import-summary-value highlight">${analysis.newStocks.length}只</span>
                </div>
                <div class="import-summary-item">
                    <span class="import-summary-label">已存在股票</span>
                    <span class="import-summary-value">${analysis.existingStocks.length}只</span>
                </div>
                <div class="import-summary-item">
                    <span class="import-summary-label">新增交易记录</span>
                    <span class="import-summary-value highlight">${analysis.newTrades}条</span>
                </div>
                <div class="import-summary-item">
                    <span class="import-summary-label">重复跳过</span>
                    <span class="import-summary-value">${analysis.duplicateTrades}条</span>
                </div>
            </div>
        `;

        if (analysis.newStocks.length > 0) {
            html += `
                <div class="import-details">
                    <h4>新增股票</h4>
                    ${analysis.newStocks.map(s =>
                        `<div class="import-detail-item">${s.name}(${s.code}) - ${s.trades}条记录</div>`
                    ).join('')}
                </div>
            `;
        }

        if (analysis.existingStocks.length > 0) {
            html += `
                <div class="import-details" style="margin-top: 15px;">
                    <h4>已存在股票</h4>
                    ${analysis.existingStocks.map(s =>
                        `<div class="import-detail-item">${s.name}(${s.code}) - 新增${s.newTrades}条，重复${s.duplicateTrades}条</div>`
                    ).join('')}
                </div>
            `;
        }

        html += `
            <div class="import-warning">
                <strong>注意：</strong>覆盖数据将删除当前所有数据，请谨慎操作！
            </div>
        `;

        content.innerHTML = html;
        modal.style.display = 'block';
        this.closeSettingsModal();
    },

    closeImportPreviewModal() {
        const modal = document.getElementById('importPreviewModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.pendingImportData = null;
    },

    async confirmImport(action) {
        if (!this.pendingImportData) return;

        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const currentData = await DataManager.load();

        if (action === 'merge') {
            const mergedData = FileStorage.mergeData(currentData, this.pendingImportData);
            await DataManager.save(mergedData);
            this.data = mergedData;

            // 刷新当前页面：统一入口
            this.updateAll();
            ErrorHandler.showSuccess('数据合并成功！');
        } else if (action === 'overwrite') {
            if (confirm('确定要覆盖当前所有数据吗？此操作不可恢复！')) {
                await DataManager.save(this.pendingImportData);
                this.data = this.pendingImportData;

                // 刷新当前页面：统一入口（若当前详情股票已不存在，Router 会在加载失败后回到概览）
                this.updateAll();
                ErrorHandler.showSuccess('数据已覆盖！');
            } else {
                return;
            }
        }

        this.closeImportPreviewModal();
    },

    // ==================== CSV 导出功能 ====================

    async exportCSV() {
        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const data = await DataManager.load();
        if (!data || !data.stocks || data.stocks.length === 0) {
            ErrorHandler.showWarning('没有数据可导出');
            return;
        }

        if (FileStorage.exportToCSV(data)) {
            ErrorHandler.showSuccess('CSV导出成功！');
        }
        this.closeSettingsModal();
    },

    async exportSummaryCSV() {
        const DataManager = StockProfitCalculator.DataManager;
        const FileStorage = StockProfitCalculator.FileStorage;
        const data = await DataManager.load();
        if (!data || !data.stocks || data.stocks.length === 0) {
            ErrorHandler.showWarning('没有数据可导出');
            return;
        }

        if (FileStorage.exportSummaryToCSV(data)) {
            ErrorHandler.showSuccess('汇总CSV导出成功！');
        }
        this.closeSettingsModal();
    },

    // ==================== 备份管理功能 ====================

    openBackupModal() {
        const modal = document.getElementById('backupModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadBackupList();
        }
        this.closeSettingsModal();
    },

    closeBackupModal() {
        const modal = document.getElementById('backupModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async createBackup() {
        const DataManager = StockProfitCalculator.DataManager;
        const data = await DataManager.load();
        if (DataManager.createBackup && DataManager.createBackup(data)) {
            ErrorHandler.showSuccess('备份创建成功！');
            this.openBackupModal(); // 刷新备份列表
        } else {
            ErrorHandler.showErrorSimple('备份创建失败！');
        }
    },

    loadBackupList() {
        const DataManager = StockProfitCalculator.DataManager;
        const container = document.getElementById('backupListContainer');
        if (!container) return;

        const backups = DataManager.getBackupList();

        if (backups.length === 0) {
            container.innerHTML = `
                <div class="empty-backup">
                    <div class="empty-backup-icon">📦</div>
                    <div>暂无备份</div>
                    <div style="font-size: 13px; margin-top: 8px;">系统会自动保存最近7天的备份</div>
                </div>
            `;
            return;
        }

        let html = '<div class="backup-list">';
        backups.forEach((backup, index) => {
            const isToday = backup.date === new Date().toISOString().split('T')[0];
            const sizeKB = (backup.size / 1024).toFixed(2);

            html += `
                <div class="backup-item" data-backup-date="${backup.date}">
                    <div class="backup-info">
                        <div class="backup-date">
                            ${backup.date}
                            ${isToday ? '<span style="color: #4caf50; font-size: 12px; margin-left: 8px;">今天</span>' : ''}
                        </div>
                        <div class="backup-meta">大小: ${sizeKB} KB</div>
                    </div>
                    <div class="backup-actions">
                        <button type="button" class="btn btn-primary btn-restore-backup">恢复</button>
                        <button type="button" class="btn btn-danger btn-delete-backup">删除</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

        // 动态绑定事件监听器
        container.querySelectorAll('.btn-restore-backup').forEach((btn, index) => {
            const dateStr = backups[index].date;
            btn.onclick = () => this.restoreBackup(dateStr);
        });

        container.querySelectorAll('.btn-delete-backup').forEach((btn, index) => {
            const dateStr = backups[index].date;
            btn.onclick = () => this.deleteBackup(dateStr);
        });
    },

    async restoreBackup(dateStr) {
        if (confirm(`确定要恢复 ${dateStr} 的备份吗？当前数据将被覆盖！`)) {
            const DataManager = StockProfitCalculator.DataManager;
            const result = DataManager.restoreBackup ? DataManager.restoreBackup(dateStr) : { success: false, message: '备份功能已移除' };
            if (result.success) {
                ErrorHandler.showSuccess(result.message);
                this.data = await DataManager.load();
                this.updateAll();
                this.closeBackupModal();
            } else {
                ErrorHandler.showErrorSimple(result.message);
            }
        }
    },

    deleteBackup(dateStr) {
        if (confirm(`确定要删除 ${dateStr} 的备份吗？此操作不可恢复！`)) {
            const DataManager = StockProfitCalculator.DataManager;
            const result = DataManager.deleteBackup(dateStr);
            if (result.success) {
                ErrorHandler.showSuccess('备份删除成功！');
                this.loadBackupList();
            } else {
                ErrorHandler.showErrorSimple(result.message);
            }
        }
    }
};

// 挂载到命名空间
StockProfitCalculator.App = App;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

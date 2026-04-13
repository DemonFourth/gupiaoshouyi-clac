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

            // 订阅数据同步差异事件（localStorage vs D1）
            StockProfitCalculator.EventBus.on('data:sync_diff', ({ localData, d1Data, diff }) => {
                this._handleDataSyncDiff(localData, d1Data, diff);
            });
        }

        // 初始化路由（会触发 route:change）
        await Router.init();

        // 显示存储模式提示（首次打开时）
        this._showStorageModeTip();

        if (window.Perf) window.Perf.end(perfToken);

        console.log('[App] 初始化完成');
    },

    /**
     * 显示存储模式提示（首次打开时）
     */
    _showStorageModeTip() {
        const DataManager = StockProfitCalculator.DataManager;
        const storageMode = DataManager.getStorageMode();

        // 使用 info 级别提示，3秒后自动消失
        const message = storageMode.mode === 'local'
            ? '当前使用本地存储模式，数据仅保存在浏览器中'
            : '当前使用本地+云端混合存储模式，数据自动同步到云端';

        if (window.StockProfitCalculator && window.StockProfitCalculator.ErrorHandler) {
            window.StockProfitCalculator.ErrorHandler.showInfo(message);
        }
    },

    bindGlobalEvents() {
        const Router = StockProfitCalculator.Router;
        const StockManager = StockProfitCalculator.StockManager;
        const TradeManager = StockProfitCalculator.TradeManager;
        const Detail = StockProfitCalculator.Detail;

        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = async () => await Router.showOverview();
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

        // 备份管理按钮事件绑定已注释 - 功能未实现且不适用于 Cloudflare D1 数据库
        /*
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
        */

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

        // 悬浮刷新股价按钮事件绑定
        const refreshPriceBtn = document.getElementById('refreshPriceBtn');
        if (refreshPriceBtn) {
            refreshPriceBtn.onclick = async () => {
                // 添加加载动画
                refreshPriceBtn.classList.add('loading');

                try {
                    const currentPage = StockProfitCalculator.Router.getCurrentPage();

                    if (currentPage === 'overview') {
                        // 汇总页面：批量刷新所有持仓股票
                        await StockProfitCalculator.Overview.fetchAllStockPrices();
                    } else if (currentPage === 'detail') {
                        // 详情页面：刷新当前股票
                        await StockProfitCalculator.Detail.fetchStockPrice();
                    }
                } finally {
                    // 移除加载动画
                    refreshPriceBtn.classList.remove('loading');
                }
            };
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

        const clearedSortDescBtn = document.getElementById('clearedSortDescBtn');
        if (clearedSortDescBtn) {
            clearedSortDescBtn.onclick = () => Overview.setClearedSortDirection('desc');
        }

        const clearedSortAscBtn = document.getElementById('clearedSortAscBtn');
        if (clearedSortAscBtn) {
            clearedSortAscBtn.onclick = () => Overview.setClearedSortDirection('asc');
        }

        const viewModeBtnHolding = document.getElementById('viewModeBtnHolding');
        if (viewModeBtnHolding) {
            viewModeBtnHolding.onclick = () => Overview.toggleViewMode('holding');
        }

        const viewModeBtnCleared = document.getElementById('viewModeBtnCleared');
        if (viewModeBtnCleared) {
            viewModeBtnCleared.onclick = () => Overview.toggleViewMode('cleared');
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
            holdingDetailToggle.onchange = async () => {
                Config.set('ui.preferences.showHoldingDetail', holdingDetailToggle.checked);
                Config.save();
                await this.updateAll(); // 刷新当前页面
            };
        }

        // 持仓周期历史显示开关
        const cycleHistoryToggle = document.getElementById('cycleHistoryToggle');
        if (cycleHistoryToggle) {
            // 初始化 UI 状态
            cycleHistoryToggle.checked = Config.get('ui.preferences.showCycleHistory', true);
            // 绑定事件
            cycleHistoryToggle.onchange = async () => {
                Config.set('ui.preferences.showCycleHistory', cycleHistoryToggle.checked);
                Config.save();
                await this.updateAll(); // 刷新当前页面
            };
        }

        // 大数字转换阈值设置
        const largeNumberThreshold = document.getElementById('largeNumberThreshold');
        const saveDisplaySettingsBtn = document.getElementById('saveDisplaySettingsBtn');
        if (largeNumberThreshold) {
            largeNumberThreshold.value = Config.get('ui.preferences.largeNumberThreshold', 10000);
            largeNumberThreshold.onchange = () => {
                let value = parseInt(largeNumberThreshold.value, 10);
                if (isNaN(value) || value < 0) {
                    largeNumberThreshold.value = 0;
                    ErrorHandler.showWarning('阈值不能为负数，已自动调整为0');
                }
            };
        }

        // 显示设置保存按钮
        if (saveDisplaySettingsBtn) {
            saveDisplaySettingsBtn.onclick = async () => {
                // 保存持仓明细开关
                if (holdingDetailToggle) {
                    Config.set('ui.preferences.showHoldingDetail', holdingDetailToggle.checked);
                }
                // 保存持仓周期历史开关
                if (cycleHistoryToggle) {
                    Config.set('ui.preferences.showCycleHistory', cycleHistoryToggle.checked);
                }
                // 保存大数字转换阈值
                if (largeNumberThreshold) {
                    const thresholdValue = parseInt(largeNumberThreshold.value, 10);
                    Config.set('ui.preferences.largeNumberThreshold', isNaN(thresholdValue) ? 10000 : thresholdValue);
                }
                Config.save();
                ErrorHandler.showSuccess('显示设置已保存');
                await this.updateAll(); // 刷新当前页面
            };
        }

        // 分页设置
        const paginationThreshold = document.getElementById('paginationThreshold');
        const paginationItemsPerPage = document.getElementById('paginationItemsPerPage');
        const savePaginationSettingsBtn = document.getElementById('savePaginationSettingsBtn');
        const minValue = Config.get('ui.pagination.minValue', 5);

        // 输入框值变化时只验证，不保存
        if (paginationThreshold) {
            paginationThreshold.value = Config.get('ui.pagination.threshold', 50);
            paginationThreshold.onchange = () => {
                let value = parseInt(paginationThreshold.value, 10);
                if (isNaN(value) || value < minValue) {
                    paginationThreshold.value = minValue;
                    ErrorHandler.showWarning(`分页阈值最小为 ${minValue}，已自动调整为 ${minValue}`);
                }
            };
        }

        if (paginationItemsPerPage) {
            paginationItemsPerPage.value = Config.get('ui.pagination.itemsPerPage', 30);
            paginationItemsPerPage.onchange = () => {
                let value = parseInt(paginationItemsPerPage.value, 10);
                if (isNaN(value) || value < minValue) {
                    paginationItemsPerPage.value = minValue;
                    ErrorHandler.showWarning(`每页条数最小为 ${minValue}，已自动调整为 ${minValue}`);
                }
            };
        }

        // 保存按钮点击事件
        if (savePaginationSettingsBtn) {
            savePaginationSettingsBtn.onclick = async () => {
                const thresholdValue = parseInt(paginationThreshold.value, 10);
                const itemsPerPageValue = parseInt(paginationItemsPerPage.value, 10);

                Config.set('ui.pagination.threshold', thresholdValue);
                Config.set('ui.pagination.itemsPerPage', itemsPerPageValue);
                Config.save();

                ErrorHandler.showSuccess('分页设置已保存');
                await this.updateAll();
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
    async handleRouteChange(page, stockCode = null) {
        console.log('[handleRouteChange] 开始执行, page:', page, ', stockCode:', stockCode);
        
        const Overview = StockProfitCalculator.Overview;
        const Detail = StockProfitCalculator.Detail;
        const Router = StockProfitCalculator.Router;

        if (page === 'overview') {
            console.log('[handleRouteChange] 切换到汇总页');
            if (typeof Overview !== 'undefined') {
                Overview.init();
            }
            return;
        }

        if (page === 'detail' && stockCode) {
            console.log('[handleRouteChange] 切换到详情页, stockCode:', stockCode);
            if (typeof Detail !== 'undefined') {
                console.log('[handleRouteChange] 调用 Router.showDetail()');
                await Router.showDetail(stockCode);  // 先切换页面
                console.log('[handleRouteChange] Router.showDetail() 完成');
                console.log('[handleRouteChange] 调用 Detail.loadStock()');
                await Detail.loadStock(stockCode);  // 再加载股票数据
                console.log('[handleRouteChange] Detail.loadStock() 完成');
            }
            return;
        }

        // tradeRecords 页面：Router.showTradeRecords() 已经调用了 TradeRecords.load()，不需要再次调用
        console.log('[handleRouteChange] 其他页面:', page);
    },

    /**
     * 更新当前页面UI
     */
    async updateAll() {
        const Router = StockProfitCalculator.Router;
        const currentPage = Router.getCurrentPage();
        const stockCode = Router.getCurrentStockCode();
        await this.handleRouteChange(currentPage, stockCode);
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
        const storageMode = DataManager.getStorageMode();

        document.getElementById('settingsStockCount').textContent = stats.stockCount + '只';
        document.getElementById('settingsTradeCount').textContent = stats.tradeCount + '条';
        document.getElementById('settingsDataSize').textContent = stats.dataSize;
        document.getElementById('settingsStorageLocation').textContent = storageMode.label;
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

    _buildTradeTypeLabel(type) {
        const map = { buy: '买入', sell: '卖出', dividend: '分红', tax: '红利税' };
        const cls = { buy: 'ip-badge-buy', sell: 'ip-badge-sell', dividend: 'ip-badge-div', tax: 'ip-badge-tax' };
        const label = map[type] || type;
        const klass = cls[type] || '';
        return `<span class="ip-trade-badge ${klass}">${label}</span>`;
    },

    _buildTradeRows(items, isDuplicate) {
        if (!items || items.length === 0) return '';
        return items.map(t => {
            const rowClass = isDuplicate ? 'ip-row-dup' : '';
            const status = isDuplicate
                ? `<span class="ip-status-dup">⊘ 重复</span>`
                : `<span class="ip-status-new">✅ 新增</span>`;
            return `
                <tr class="${rowClass}">
                    <td>${t.date}</td>
                    <td>${this._buildTradeTypeLabel(t.type)}</td>
                    <td>¥${Number(t.price).toFixed(3)}</td>
                    <td>${t.amount} 股</td>
                    <td>${status}</td>
                </tr>`;
        }).join('');
    },

    showImportPreview(analysis) {
        if (!analysis || !Array.isArray(analysis.newStocks) || !Array.isArray(analysis.existingStocks)) {
            ErrorHandler.showError('导入数据分析结果格式异常', null, ErrorHandler.levels.WARN);
            return;
        }

        const modal = document.getElementById('importPreviewModal');
        const content = document.getElementById('importPreviewContent');

        // ── 统计卡片区 ──
        const statsHtml = `
            <div class="ip-stat-cards">
                <div class="ip-stat-card ip-stat-highlight">
                    <span class="ip-stat-icon">📦</span>
                    <div class="ip-stat-number">${analysis.newStocks.length}</div>
                    <div class="ip-stat-label">新增股票</div>
                </div>
                <div class="ip-stat-card ip-stat-muted">
                    <span class="ip-stat-icon">📋</span>
                    <div class="ip-stat-number ip-stat-number-neutral">${analysis.existingStocks.length}</div>
                    <div class="ip-stat-label">已存在股票</div>
                </div>
                <div class="ip-stat-card ip-stat-highlight">
                    <span class="ip-stat-icon">📝</span>
                    <div class="ip-stat-number">${analysis.newTrades}</div>
                    <div class="ip-stat-label">新增记录</div>
                </div>
                <div class="ip-stat-card ip-stat-muted">
                    <span class="ip-stat-icon">⏭</span>
                    <div class="ip-stat-number ip-stat-number-muted">${analysis.duplicateTrades}</div>
                    <div class="ip-stat-label">重复跳过</div>
                </div>
            </div>`;

        // ── 按"有新增记录 / 全部重复"重新分组 ──
        const stocksWithNew = [
            // 新股票全部算"有新增"
            ...analysis.newStocks.map(s => ({ ...s, stockType: 'new', newTrades: s.trades, duplicateTrades: 0 })),
            // 已存在股票中只取有新增记录的
            ...analysis.existingStocks.filter(s => s.newTrades > 0).map(s => ({ ...s, stockType: 'existing' }))
        ];
        const allDuplicateStocks = analysis.existingStocks.filter(s => s.newTrades === 0);

        // ── 有新增记录列表 ──
        let newRecordsSectionHtml = '';
        if (stocksWithNew.length > 0) {
            const rows = stocksWithNew.map((s, i) => {
                const isNew = s.stockType === 'new';
                const barClass = isNew ? 'ip-bar-new' : 'ip-bar-exists';
                let allRows, metaBadges;
                if (isNew) {
                    allRows = this._buildTradeRows(s.tradeItems, false);
                    metaBadges = `<span class="ip-meta-badge ip-meta-new">${s.trades}条记录</span>`;
                } else {
                    const newR = this._buildTradeRows(s.newItems, false);
                    const dupR = this._buildTradeRows(s.duplicateItems, true);
                    allRows = newR + dupR;
                    metaBadges = `<span class="ip-meta-badge ip-meta-new">新增 ${s.newTrades} 条</span>
                        <span class="ip-meta-badge ip-meta-dup">重复 ${s.duplicateTrades} 条</span>`;
                }
                const detailHtml = allRows ? `
                    <div class="ip-stock-detail" id="ip-detail-newrec-${i}">
                        <table class="ip-detail-table">
                            <thead><tr><th>日期</th><th>类型</th><th>价格</th><th>数量</th><th>状态</th></tr></thead>
                            <tbody>${allRows}</tbody>
                        </table>
                    </div>` : '';
                const hasDetail = !!allRows;
                return `
                    <div class="ip-stock-row">
                        <div class="ip-stock-row-header" onclick="App._toggleImportRow(this)" data-has-detail="${hasDetail}">
                            <div class="ip-stock-bar ${barClass}"></div>
                            <div class="ip-stock-name">${s.name} <span>(${s.code})</span></div>
                            <div class="ip-stock-meta">${metaBadges}</div>
                            ${hasDetail ? `<div class="ip-expand-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>` : ''}
                        </div>
                        ${detailHtml}
                    </div>`;
            }).join('');
            newRecordsSectionHtml = `
                <div class="ip-stock-section">
                    <div class="ip-section-label">有新增记录 (${stocksWithNew.length}只)</div>
                    ${rows}
                </div>`;
        }

        // ── 全部重复列表 ──
        let allDuplicateSectionHtml = '';
        if (allDuplicateStocks.length > 0) {
            const rows = allDuplicateStocks.map((s, i) => {
                const allRows = this._buildTradeRows(s.duplicateItems, true);
                const detailHtml = allRows ? `
                    <div class="ip-stock-detail" id="ip-detail-alldup-${i}">
                        <table class="ip-detail-table">
                            <thead><tr><th>日期</th><th>类型</th><th>价格</th><th>数量</th><th>状态</th></tr></thead>
                            <tbody>${allRows}</tbody>
                        </table>
                    </div>` : '';
                const hasDetail = !!allRows;
                return `
                    <div class="ip-stock-row">
                        <div class="ip-stock-row-header" onclick="App._toggleImportRow(this)" data-has-detail="${hasDetail}">
                            <div class="ip-stock-bar ip-bar-exists"></div>
                            <div class="ip-stock-name">${s.name} <span>(${s.code})</span></div>
                            <div class="ip-stock-meta">
                                <span class="ip-meta-badge ip-meta-dup">全部重复 (${s.duplicateTrades}条)</span>
                            </div>
                            ${hasDetail ? `<div class="ip-expand-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>` : ''}
                        </div>
                        ${detailHtml}
                    </div>`;
            }).join('');
            allDuplicateSectionHtml = `
                <div class="ip-stock-section">
                    <div class="ip-section-label">全部重复 (${allDuplicateStocks.length}只)</div>
                    ${rows}
                </div>`;
        }

        // ── 警告区 ──
        const warningHtml = `
            <div class="ip-warning-box">
                <svg class="ip-warning-icon" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span><strong>注意：</strong>覆盖数据将删除当前所有数据，请谨慎操作！</span>
            </div>`;

        content.innerHTML = statsHtml + newRecordsSectionHtml + allDuplicateSectionHtml + warningHtml;
        modal.style.display = 'block';
        this.closeSettingsModal();
    },

    _toggleImportRow(header) {
        if (header.dataset.hasDetail !== 'true') return;
        const icon = header.querySelector('.ip-expand-icon');
        const detail = header.nextElementSibling;
        if (!detail) return;
        const isOpen = detail.classList.contains('ip-open');
        if (isOpen) {
            detail.classList.remove('ip-open');
            if (icon) icon.classList.remove('ip-open');
        } else {
            detail.classList.add('ip-open');
            if (icon) icon.classList.add('ip-open');
        }
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
            await this.updateAll();
            ErrorHandler.showSuccess('数据合并成功！');
        } else if (action === 'overwrite') {
            if (confirm('确定要覆盖当前所有数据吗？此操作不可恢复！')) {
                await DataManager.save(this.pendingImportData);
                this.data = this.pendingImportData;

                // 刷新当前页面：统一入口（若当前详情股票已不存在，Router 会在加载失败后回到概览）
                await this.updateAll();
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

    // ==================== 备份管理功能已注释 - 功能未实现且不适用于 Cloudflare D1 数据库 ====================
    /*
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
                await this.updateAll();
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
    */

    // ==================== 数据同步差异处理 ====================

    /**
     * 处理数据同步差异
     * @param {Object} localData - 本地数据
     * @param {Object} d1Data - D1 数据
     * @param {Object} diff - 差异信息
     */
    async _handleDataSyncDiff(localData, d1Data, diff) {
        console.log('[App] 检测到数据同步差异:', diff);

        const DataManager = StockProfitCalculator.DataManager;
        const ErrorHandler = StockProfitCalculator.ErrorHandler;

        // 构建差异详情
        let detailsHtml = '';

        if (diff.newStocksInD1.length > 0) {
            detailsHtml += `<div class="sync-diff-section">
                <h4>D1 新增股票（${diff.newStocksInD1.length}只）</h4>
                <div class="sync-diff-list">
                    ${diff.newStocksInD1.map(s => `<span class="sync-tag">${s.name}(${s.code})</span>`).join('')}
                </div>
            </div>`;
        }

        if (diff.newStocksInLocal.length > 0) {
            detailsHtml += `<div class="sync-diff-section">
                <h4>本地新增股票（${diff.newStocksInLocal.length}只）</h4>
                <div class="sync-diff-list">
                    ${diff.newStocksInLocal.map(s => `<span class="sync-tag">${s.name}(${s.code})</span>`).join('')}
                </div>
            </div>`;
        }

        if (diff.newTradesInD1 > 0 || diff.newTradesInLocal > 0) {
            const tradeDetails = diff.details.filter(d => d.d1New > 0 || d.localNew > 0);
            detailsHtml += `<div class="sync-diff-section">
                <h4>交易记录差异</h4>
                <div class="sync-diff-list">
                    ${tradeDetails.map(d => `
                        <div class="sync-trade-item">
                            <span>${d.name}(${d.code})</span>
                            ${d.d1New > 0 ? `<span class="sync-tag d1">D1新增${d.d1New}条</span>` : ''}
                            ${d.localNew > 0 ? `<span class="sync-tag local">本地新增${d.localNew}条</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // 显示同步差异弹窗
        this._showSyncDiffModal(detailsHtml, localData, d1Data);
    },

    /**
     * 显示同步差异弹窗
     * @param {string} detailsHtml - 差异详情 HTML
     * @param {Object} localData - 本地数据
     * @param {Object} d1Data - D1 数据
     */
    _showSyncDiffModal(detailsHtml, localData, d1Data) {
        // 创建弹窗
        const modalHtml = `
            <div id="syncDiffModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>检测到数据差异</h3>
                        <span class="close" onclick="App._closeSyncDiffModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p class="sync-info">检测到本地数据与云端数据存在差异，请选择如何处理：</p>
                        <div class="sync-diff-details">
                            ${detailsHtml}
                        </div>
                        <div class="sync-warning">
                            <strong>提示：</strong>选择"使用云端数据"会用 D1 数据覆盖本地数据；选择"合并数据"会保留双方的所有数据。
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="App._useD1Data()">使用云端数据</button>
                        <button class="btn btn-secondary" onclick="App._mergeData()">合并数据</button>
                        <button class="btn btn-outline" onclick="App._closeSyncDiffModal()">保持本地数据</button>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        const existing = document.getElementById('syncDiffModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 保存数据供后续使用
        this._syncDiffData = { localData, d1Data };
    },

    /**
     * 关闭同步差异弹窗
     */
    _closeSyncDiffModal() {
        const modal = document.getElementById('syncDiffModal');
        if (modal) modal.remove();
        this._syncDiffData = null;
    },

    /**
     * 使用 D1 数据
     */
    async _useD1Data() {
        if (!this._syncDiffData) return;

        const DataManager = StockProfitCalculator.DataManager;
        const ErrorHandler = StockProfitCalculator.ErrorHandler;
        const { d1Data } = this._syncDiffData;

        const success = await DataManager.useD1Data(d1Data);
        if (success) {
            this.data = d1Data;
            await this.updateAll();
            ErrorHandler.showSuccess('已使用云端数据');
        }

        this._closeSyncDiffModal();
    },

    /**
     * 合并数据
     */
    async _mergeData() {
        if (!this._syncDiffData) return;

        const DataManager = StockProfitCalculator.DataManager;
        const ErrorHandler = StockProfitCalculator.ErrorHandler;
        const { localData, d1Data } = this._syncDiffData;

        const success = await DataManager.mergeAndUse(localData, d1Data);
        if (success) {
            this.data = await DataManager.load();
            await this.updateAll();
            ErrorHandler.showSuccess('数据已合并');
        }

        this._closeSyncDiffModal();
    }
};

// 挂载到命名空间
StockProfitCalculator.App = App;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

/**
 * 路由模块
 * 负责页面切换和状态管理
 */

const Router = {
    // 页面状态
    state: {
        currentPage: 'overview',  // 'overview' | 'detail'
        currentStockCode: null,
        scrollPositions: {  // 存储汇总页的滚动位置（仅在当前会话中）
            overview: 0
        }
    },

    // 页面容器ID
    pages: {
        overview: 'overviewPage',
        detail: 'detailPage',
        tradeRecords: 'tradeRecordsPage'
    },

    /**
     * 初始化路由
     */
    async init() {
        // 从 D1 数据库恢复页面状态
        await this.loadState();

        console.log('[Router.init] 准备显示页面:');
        console.log('  currentPage:', this.state.currentPage);
        console.log('  currentYear:', this.state.currentYear);
        console.log('  currentMonth:', this.state.currentMonth);
        console.log('  startDate:', this.state.startDate);
        console.log('  endDate:', this.state.endDate);

        // 清除保存的滚动位置（刷新页面时不再恢复滚动位置）
        this.state.scrollPositions = {
            overview: 0
        };

        // 根据状态显示对应页面
        if (this.state.currentPage === 'detail' && this.state.currentStockCode) {
            const Detail = StockProfitCalculator.Detail;
            if (typeof Detail !== 'undefined') {
                this.showDetail(this.state.currentStockCode, false);  // 切换页面显示
                Detail.loadStock(this.state.currentStockCode);  // 加载股票数据和显示返回按钮
                
                // 延迟重新绑定 tooltip，确保 DOM 完全稳定
                setTimeout(() => {
                    if (window.TooltipManager) {
                        TooltipManager.rebind();
                    }
                }, 100);
            }
        } else {
            // 默认显示汇总页面（包括交易记录页面刷新时）
            this.showOverview(false);
        }
    },

    /**
     * 切换到汇总页面
     * @param {boolean} saveState - 是否保存状态
     */
    async showOverview(saveState = true) {
        const perfToken = window.Perf ? window.Perf.start('Router.showOverview') : null;

        // 立即更新 UI 元素，确保用户界面立即响应
        // 隐藏返回按钮
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.style.display = 'none';
        }

        // 立即更新页面标题
        this.updateTitle('股票收益计算器');

        // 更新 stockInfo 副标题
        const stockInfo = document.getElementById('stockInfo');
        if (stockInfo) {
            stockInfo.textContent = '支持多股票管理 | FIFO先进先出计算';
        }

        if (typeof document !== 'undefined' && document && document.body && document.body.classList) {
            document.body.classList.remove('page-detail');
            document.body.classList.remove('page-trade-records');
        }

        // 显示悬浮刷新股价按钮（汇总页面）
        const refreshBtn = document.getElementById('refreshPriceBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('is-visible');
        }

        // 显示悬浮按钮（添加股票、切换视图）
        const addStockBtn = document.getElementById('addStockFloatBtn');
        const viewModeBtn = document.getElementById('viewModeFloatBtn');
        if (addStockBtn) addStockBtn.classList.add('is-visible');
        if (viewModeBtn) viewModeBtn.classList.add('is-visible');

        const headerQuote = document.getElementById('headerQuote');
        if (headerQuote) {
            headerQuote.style.display = 'none';
        }

        // 显示股票搜索框和设置按钮（汇总页面）
        const searchContainer = document.querySelector('.search-container');
        const settingsBtn = document.getElementById('settingsBtn');
        if (searchContainer) searchContainer.style.display = 'flex';
        if (settingsBtn) settingsBtn.style.display = 'inline-flex';

        // 隐藏交易记录筛选器
        const trFilters = document.querySelector('.header-tr-filters');
        if (trFilters) trFilters.style.display = 'none';

        const overviewPage = document.getElementById(this.pages.overview);
        const detailPage = document.getElementById(this.pages.detail);
        const tradeRecordsPage = document.getElementById(this.pages.tradeRecords);

        if (overviewPage) overviewPage.style.display = 'block';
        if (detailPage) detailPage.style.display = 'none';
        if (tradeRecordsPage) tradeRecordsPage.style.display = 'none';

        // 隐藏股票选择器区域
        const stockSelectorArea = document.getElementById('stockSelectorArea');
        if (stockSelectorArea) {
            stockSelectorArea.style.display = 'none';
        }

        this.state.currentPage = 'overview';
        this.state.currentStockCode = null;

        // 恢复汇总页的滚动位置（在 saveState 和 onPageChange 之前）
        const savedScrollPosition = this.state.scrollPositions?.overview || 0;
        console.log('[showOverview] 准备恢复滚动位置:', savedScrollPosition);
        console.log('[showOverview] scrollPositions:', this.state.scrollPositions);
        if (savedScrollPosition > 0) {
            console.log('[showOverview] 执行滚动恢复到:', savedScrollPosition);
            // 立即设置滚动位置（不使用 smooth，避免动画延迟）
            window.scrollTo(0, savedScrollPosition);
            // 标记滚动位置已恢复，避免 refresh() 再次恢复
            this._scrollPositionRestored = true;
        }

        if (saveState) {
            await this.saveState();
        }

        // 触发页面切换事件
        this.onPageChange('overview');

        if (window.Perf) window.Perf.end(perfToken, { saveState });
    },

    /**
     * 切换到详情页面
     * @param {string} stockCode - 股票代码
     * @param {boolean} saveState - 是否保存状态
     */
    async showDetail(stockCode, saveState = true) {
        console.log('[showDetail] 开始执行, stockCode:', stockCode, ', saveState:', saveState);
        
        const perfToken = window.Perf ? window.Perf.start('Router.showDetail') : null;
        
        // 保存当前页面（汇总页）的滚动位置
        const scrollPosition = window.scrollY || window.pageYOffset || 0;
        this.state.scrollPositions.overview = scrollPosition;
        console.log('[showDetail] 保存滚动位置:', scrollPosition);

        if (typeof document !== 'undefined' && document && document.body && document.body.classList) {
            document.body.classList.add('page-detail');
            document.body.classList.remove('page-trade-records');
            
            // 调试日志：检查 sticky 相关状态
            const headerBar = document.querySelector('.header-bar');
            if (headerBar) {
                const computedStyle = window.getComputedStyle(headerBar);
                console.log('[DetailPage Sticky Debug]', {
                    bodyClasses: document.body.className,
                    headerBarPosition: computedStyle.position,
                    headerBarTop: computedStyle.top,
                    headerBarZIndex: computedStyle.zIndex,
                    containerOverflow: window.getComputedStyle(document.querySelector('.container')).overflow,
                    bodyOverflow: window.getComputedStyle(document.body).overflow
                });
            }
        }

        // 显示悬浮刷新股价按钮（详情页面）
        const refreshBtn = document.getElementById('refreshPriceBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('is-visible');
        }

        // 隐藏悬浮按钮（添加股票、切换视图）
        const addStockBtn = document.getElementById('addStockFloatBtn');
        const viewModeBtn = document.getElementById('viewModeFloatBtn');
        if (addStockBtn) addStockBtn.classList.remove('is-visible');
        if (viewModeBtn) viewModeBtn.classList.remove('is-visible');

        const headerQuote = document.getElementById('headerQuote');
        if (headerQuote) {
            headerQuote.style.display = 'inline-flex';
        }

        // 显示返回按钮
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.style.display = 'inline-flex';
        }

        // 隐藏股票搜索框和设置按钮（详情页面）
        const searchContainer = document.querySelector('.search-container');
        const settingsBtn = document.getElementById('settingsBtn');
        if (searchContainer) searchContainer.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';

        // 隐藏交易记录筛选器
        const trFilters = document.querySelector('.header-tr-filters');
        if (trFilters) trFilters.style.display = 'none';

        const overviewPage = document.getElementById(this.pages.overview);
        const detailPage = document.getElementById(this.pages.detail);
        const tradeRecordsPage = document.getElementById(this.pages.tradeRecords);

        if (overviewPage) overviewPage.style.display = 'none';
        if (detailPage) detailPage.style.display = 'block';
        if (tradeRecordsPage) tradeRecordsPage.style.display = 'none';

        // 隐藏股票选择器区域
        const stockSelectorArea = document.getElementById('stockSelectorArea');
        if (stockSelectorArea) {
            stockSelectorArea.style.display = 'none';
        }

        this.state.currentPage = 'detail';
        this.state.currentStockCode = stockCode;

        if (saveState) {
            await this.saveState();
        }

        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 注意：不调用 onPageChange，因为 handleRouteChange 已经是路由变化的主要处理函数
        // 避免无限循环：handleRouteChange → showDetail → onPageChange → emit → handleRouteChange

        if (window.Perf) window.Perf.end(perfToken, { saveState, stockCode });
    },

    /**
     * 保存状态到 D1 数据库
     */
    async saveState() {
        try {
            const DataManager = StockProfitCalculator.DataManager;
            const data = await DataManager.load();
            if (data) {
                data.lastPage = this.state.currentPage;
                data.lastViewedStock = this.state.currentStockCode;
                // 保存滚动位置
                if (this.state.scrollPositions) {
                    data.scrollPositions = this.state.scrollPositions;
                }
                // 保存交易记录相关状态
                if (this.state.currentYear) {
                    data.currentYear = this.state.currentYear;
                }
                if (this.state.currentMonth !== null) {
                    data.currentMonth = this.state.currentMonth;
                }
                if (this.state.startDate) {
                    data.startDate = this.state.startDate;
                }
                if (this.state.endDate) {
                    data.endDate = this.state.endDate;
                }
                
                // 添加调试日志
                console.log('[Router.saveState] 保存状态到 D1 数据库:');
                console.log('  currentPage:', data.lastPage);
                console.log('  currentYear:', data.currentYear);
                console.log('  currentMonth:', data.currentMonth);
                console.log('  startDate:', data.startDate);
                console.log('  endDate:', data.endDate);
                
                await DataManager.save(data);
            }
        } catch (e) {
            console.error('保存页面状态失败:', e);
        }
    },

    /**
     * 从 D1 数据库加载状态
     */
    async loadState() {
        try {
            const DataManager = StockProfitCalculator.DataManager;
            const data = await DataManager.load();
            if (data) {
                if (data.lastPage) {
                    this.state.currentPage = data.lastPage;
                }
                if (data.lastViewedStock) {
                    this.state.currentStockCode = data.lastViewedStock;
                }
                // 加载滚动位置
                if (data.scrollPositions) {
                    if (!this.state.scrollPositions) {
                        this.state.scrollPositions = {};
                    }
                    Object.assign(this.state.scrollPositions, data.scrollPositions);
                }
                // 加载交易记录相关状态
                if (data.currentYear) {
                    this.state.currentYear = data.currentYear;
                }
                if (data.currentMonth !== null) {
                    this.state.currentMonth = data.currentMonth;
                }
                if (data.startDate) {
                    // 将字符串转换为 Date 对象
                    this.state.startDate = new Date(data.startDate);
                }
                if (data.endDate) {
                    // 将字符串转换为 Date 对象
                    this.state.endDate = new Date(data.endDate);
                }
                
                // 添加调试日志
                console.log('[Router.loadState] 从 D1 数据库加载状态:');
                console.log('  currentPage:', this.state.currentPage);
                console.log('  currentYear:', this.state.currentYear);
                console.log('  currentMonth:', this.state.currentMonth);
                console.log('  startDate:', this.state.startDate);
                console.log('  endDate:', this.state.endDate);
            }
        } catch (e) {
            console.error('加载页面状态失败:', e);
        }
    },

    /**
     * 更新页面标题
     * @param {string} title - 标题
     * @param {string} subtitle - 副标题（可选）
     */
    updateTitle(title, subtitle = '') {
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            if (subtitle) {
                titleElement.textContent = `${title} - ${subtitle}`;
            } else {
                titleElement.textContent = title;
            }
        }
    },

    /**
     * 页面切换回调
     * @param {string} page - 页面名称
     * @param {string} stockCode - 股票代码（详情页面时）
     */
    onPageChange(page, stockCode = null) {
        // 解耦：路由只负责状态变化，通过事件通知外部
        const EventBus = StockProfitCalculator.EventBus;
        if (EventBus && EventBus.emit) {
            EventBus.emit(EventBus.EventTypes.ROUTE_CHANGE, { page, stockCode });
        }
    },

    /**
     * 获取当前页面
     * @returns {string} 当前页面名称
     */
    getCurrentPage() {
        return this.state.currentPage;
    },

    /**
     * 获取当前股票代码
     * @returns {string|null} 股票代码
     */
    getCurrentStockCode() {
        return this.state.currentStockCode;
    },

    /**
     * 显示交易记录查询页面
     * @param {number} year - 年份
     * @param {number|null} month - 月份（null 表示全年）
     */
    async showTradeRecords(year, month = null, startDate = null, endDate = null) {
        console.log('[Router.showTradeRecords] 收到参数:');
        console.log('  year:', year);
        console.log('  month:', month);
        console.log('  startDate:', startDate);
        console.log('  endDate:', endDate);
        
        const perfToken = window.Perf ? window.Perf.start('Router.showTradeRecords') : null;

        // 保存当前页面的滚动位置（以便返回时恢复）
        const scrollPosition = window.scrollY || window.pageYOffset || 0;
        if (!this.state.scrollPositions) {
            this.state.scrollPositions = {};
        }
        // 保存旧页面的滚动位置（此时 currentPage 还没有更新）
        this.state.scrollPositions[this.state.currentPage] = scrollPosition;

        // 更新页面状态
        this.state.currentPage = 'tradeRecords';
        this.state.currentYear = year;
        this.state.currentMonth = month;
        this.state.startDate = startDate;
        this.state.endDate = endDate;

        // 添加页面类，用于CSS样式
        if (typeof document !== 'undefined' && document && document.body && document.body.classList) {
            document.body.classList.add('page-trade-records');
            document.body.classList.remove('page-detail');
            
            // 调试日志：检查 sticky 相关状态
            const headerBar = document.querySelector('.header-bar');
            if (headerBar) {
                const computedStyle = window.getComputedStyle(headerBar);
                console.log('[TradeRecords Sticky Debug]', {
                    bodyClasses: document.body.className,
                    headerBarPosition: computedStyle.position,
                    headerBarTop: computedStyle.top,
                    headerBarZIndex: computedStyle.zIndex,
                    containerOverflow: window.getComputedStyle(document.querySelector('.container')).overflow,
                    bodyOverflow: window.getComputedStyle(document.body).overflow
                });
            }
        }

        // 显示返回按钮
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.style.display = 'inline-flex';
        }

        // 隐藏悬浮刷新股价按钮（交易记录页面）
        const refreshBtn = document.getElementById('refreshPriceBtn');
        if (refreshBtn) {
            refreshBtn.classList.remove('is-visible');
        }

        // 隐藏悬浮按钮（添加股票、切换视图）
        const addStockBtn = document.getElementById('addStockFloatBtn');
        const viewModeBtn = document.getElementById('viewModeFloatBtn');
        if (addStockBtn) addStockBtn.classList.remove('is-visible');
        if (viewModeBtn) viewModeBtn.classList.remove('is-visible');

        // 隐藏行情信息
        const headerQuote = document.getElementById('headerQuote');
        if (headerQuote) {
            headerQuote.style.display = 'none';
        }

        // 隐藏股票搜索框和设置按钮（仅交易记录页面）
        const searchContainer = document.querySelector('.search-container');
        const settingsBtn = document.getElementById('settingsBtn');
        if (searchContainer) searchContainer.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';

        // 显示交易记录筛选器
        const trFilters = document.querySelector('.header-tr-filters');
        if (trFilters) trFilters.style.display = 'flex';

        // 修改页面标题为"交易记录"
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

        // 切换页面显示
        const overviewPage = document.getElementById(this.pages.overview);
        const detailPage = document.getElementById(this.pages.detail);
        const tradeRecordsPage = document.getElementById(this.pages.tradeRecords);

        if (overviewPage) overviewPage.style.display = 'none';
        if (detailPage) detailPage.style.display = 'none';
        if (tradeRecordsPage) tradeRecordsPage.style.display = 'block';

        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 加载交易记录
        const TradeRecords = StockProfitCalculator.TradeRecords;
        if (TradeRecords) {
            await TradeRecords.load(year, month, startDate, endDate);
        }

        // 触发页面切换事件
        this.onPageChange('tradeRecords');

        // 保存状态到 localStorage
        this.saveState();

        if (window.Perf) window.Perf.end(perfToken);
    }
};

// 挂载到命名空间
StockProfitCalculator.Router = Router;

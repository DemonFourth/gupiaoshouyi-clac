/**
 * 骨架屏模块
 * 用于在数据加载时显示占位符，提升用户体验
 */

const Skeleton = {
    /**
     * 生成汇总页骨架屏
     */
    generateOverviewSkeleton() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const skeletonClass = theme === 'dark' ? 'skeleton skeleton-dark' : 'skeleton';

        return `
            <div class="skeleton-overview">
                <!-- 统计卡片骨架屏 -->
                <div class="skeleton-overview-stats">
                    ${Array(4).fill('').map(() => `
                        <div class="skeleton-stat-card">
                            <div class="${skeletonClass} skeleton-stat-title"></div>
                            <div class="${skeletonClass} skeleton-stat-value"></div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 股票列表骨架屏 -->
                <div class="skeleton-stock-list">
                    ${Array(6).fill('').map(() => `
                        <div class="skeleton-stock-card">
                            <div class="skeleton-stock-header">
                                <div class="${skeletonClass} skeleton-stock-name"></div>
                                <div class="${skeletonClass} skeleton-stock-code"></div>
                            </div>
                            <div class="skeleton-stock-stats">
                                ${Array(4).fill('').map(() => `
                                    <div class="${skeletonClass} skeleton-stock-stat"></div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * 生成详情页骨架屏
     */
    generateDetailSkeleton() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const skeletonClass = theme === 'dark' ? 'skeleton skeleton-dark' : 'skeleton';

        return `
            <div class="skeleton-detail">
                <!-- 头部骨架屏 -->
                <div class="skeleton-detail-header">
                    <div class="${skeletonClass} skeleton-detail-title"></div>
                    <div class="${skeletonClass} skeleton-detail-info"></div>
                </div>
                
                <!-- 统计区域骨架屏 -->
                <div class="skeleton-section">
                    <div class="${skeletonClass} skeleton-section-title"></div>
                    <div class="skeleton-overview-stats">
                        ${Array(3).fill('').map(() => `
                            <div class="skeleton-stat-card">
                                <div class="${skeletonClass} skeleton-stat-title"></div>
                                <div class="${skeletonClass} skeleton-stat-value"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 交易记录表格骨架屏 -->
                <div class="skeleton-section">
                    <div class="${skeletonClass} skeleton-section-title"></div>
                    <div class="skeleton-table">
                        ${Array(5).fill('').map(() => `
                            <div class="skeleton-table-row">
                                ${Array(5).fill('').map(() => `
                                    <div class="${skeletonClass} skeleton-table-cell"></div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成交易记录页骨架屏
     */
    generateTradeRecordsSkeleton() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const skeletonClass = theme === 'dark' ? 'skeleton skeleton-dark' : 'skeleton';

        return `
            <div class="skeleton-trade-records">
                <!-- 筛选栏骨架屏 -->
                <div class="skeleton-filter-bar">
                    ${Array(3).fill('').map(() => `
                        <div class="${skeletonClass} skeleton-filter"></div>
                    `).join('')}
                </div>
                
                <!-- 汇总统计骨架屏 -->
                <div class="skeleton-summary">
                    ${Array(3).fill('').map(() => `
                        <div class="${skeletonClass} skeleton-summary-item"></div>
                    `).join('')}
                </div>
                
                <!-- 交易记录表格骨架屏 -->
                <div class="skeleton-section">
                    <div class="${skeletonClass} skeleton-section-title"></div>
                    <div class="skeleton-table">
                        ${Array(8).fill('').map(() => `
                            <div class="skeleton-table-row">
                                ${Array(6).fill('').map(() => `
                                    <div class="${skeletonClass} skeleton-table-cell"></div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 显示骨架屏
     * @param {string} page - 页面名称 ('overview', 'detail', 'tradeRecords')
     * @param {HTMLElement} container - 容器元素
     */
    show(page, container) {
        if (!container) return;

        let skeletonHtml = '';
        switch (page) {
            case 'overview':
                skeletonHtml = this.generateOverviewSkeleton();
                break;
            case 'detail':
                skeletonHtml = this.generateDetailSkeleton();
                break;
            case 'tradeRecords':
                skeletonHtml = this.generateTradeRecordsSkeleton();
                break;
        }

        if (skeletonHtml) {
            container.innerHTML = skeletonHtml;
        }
    },

    /**
     * 隐藏骨架屏（清空容器）
     * @param {HTMLElement} container - 容器元素
     */
    hide(container) {
        if (container) {
            container.innerHTML = '';
        }
    }
};

// 挂载到命名空间
if (typeof StockProfitCalculator === 'undefined') {
    window.StockProfitCalculator = {};
}
StockProfitCalculator.Skeleton = Skeleton;

/**
 * 通用分页模块
 * 提供分页计算、控件渲染和状态管理功能
 */

const Pagination = {
    /**
     * 计算总页数
     * @param {number} totalItems - 总数据条数
     * @param {number} itemsPerPage - 每页显示条数
     * @returns {number} 总页数
     */
    calculateTotalPages(totalItems, itemsPerPage) {
        return Math.ceil(totalItems / itemsPerPage);
    },

    /**
     * 获取分页后的数据
     * @param {Array} data - 原始数据数组
     * @param {number} currentPage - 当前页码（从1开始）
     * @param {number} itemsPerPage - 每页显示条数
     * @returns {Array} 分页后的数据
     */
    getPaginatedData(data, currentPage, itemsPerPage) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    },

    /**
     * 创建分页状态对象
     * @param {number} totalItems - 总数据条数
     * @param {number} itemsPerPage - 每页显示条数
     * @param {number} currentPage - 当前页码（默认为1）
     * @returns {Object} 分页状态对象
     */
    createState(totalItems, itemsPerPage, currentPage = 1) {
        const totalPages = this.calculateTotalPages(totalItems, itemsPerPage);
        const adjustedPage = Math.max(1, Math.min(currentPage, totalPages));
        
        return {
            totalItems,
            itemsPerPage,
            currentPage: adjustedPage,
            totalPages,
            startIndex: (adjustedPage - 1) * itemsPerPage,
            endIndex: Math.min(adjustedPage * itemsPerPage, totalItems),
            hasNextPage: adjustedPage < totalPages,
            hasPreviousPage: adjustedPage > 1
        };
    },

    /**
     * 渲染分页控件HTML
     * @param {Object} state - 分页状态对象
     * @param {string} containerId - 容器元素ID
     * @param {Function} onPageChange - 页码变化回调函数
     * @returns {string} 分页控件HTML字符串
     */
    renderControls(state, containerId, onPageChange) {
        const { currentPage, totalPages, totalItems, itemsPerPage, 
                hasNextPage, hasPreviousPage } = state;
        
        if (totalPages <= 1) {
            return ''; // 只有一页时不显示分页控件
        }

        const startRecord = (currentPage - 1) * itemsPerPage + 1;
        const endRecord = Math.min(currentPage * itemsPerPage, totalItems);

        return `
            <div class="pagination-controls" id="${containerId}">
                <div class="pagination-info">
                    <span class="pagination-text">
                        显示 ${startRecord} - ${endRecord} 条，共 ${totalItems} 条
                    </span>
                </div>
                <div class="pagination-buttons">
                    <button type="button" 
                            class="pagination-btn ${!hasPreviousPage ? 'disabled' : ''}" 
                            data-action="prev"
                            ${!hasPreviousPage ? 'disabled' : ''}>
                        上一页
                    </button>
                    <div class="pagination-page-info">
                        <span class="pagination-current">${currentPage}</span>
                        <span class="pagination-separator">/</span>
                        <span class="pagination-total">${totalPages}</span>
                    </div>
                    <button type="button" 
                            class="pagination-btn ${!hasNextPage ? 'disabled' : ''}" 
                            data-action="next"
                            ${!hasNextPage ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * 绑定分页控件事件
     * @param {string} containerId - 容器元素ID
     * @param {Function} onPageChange - 页码变化回调函数
     */
    bindEvents(containerId, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.pagination-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('disabled')) return;
                
                const action = button.dataset.action;
                if (action === 'prev') {
                    onPageChange('prev');
                } else if (action === 'next') {
                    onPageChange('next');
                }
            });
        });
    },

    /**
     * 更新分页控件
     * @param {string} containerId - 容器元素ID
     * @param {Object} state - 新的分页状态
     * @param {Function} onPageChange - 页码变化回调函数
     */
    updateControls(containerId, state, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = this.renderControls(state, containerId, onPageChange);
        container.innerHTML = html;
        this.bindEvents(containerId, onPageChange);
    }
};

// 挂载到命名空间
StockProfitCalculator.Pagination = Pagination;
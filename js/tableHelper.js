/**
 * 表格工具模块
 * 提供通用的表格渲染、排序、分页功能
 * 
 * 版本: 1.0.0
 * 创建日期: 2026-03-13
 */

const TableHelper = {
    /**
     * 渲染基础表格
     * @param {Object} options - 渲染选项
     * @param {Array} options.data - 数据数组
     * @param {Array} options.columns - 列配置数组
     * @param {string} options.tableId - 表格元素 ID
     * @param {number} options.pageSize - 每页数量
     * @param {number} options.currentPage - 当前页码
     * @param {Function} options.onPageChange - 分页变化回调
     * @param {boolean} options.useFragment - 是否使用 DocumentFragment（默认 true）
     * @returns {Object} 渲染结果 { data, total, totalPages, currentPage }
     */
    renderTable(options = {}) {
        const {
            data = [],
            columns = [],
            tableId = null,
            pageSize = 20,
            currentPage = 1,
            onPageChange = null,
            useFragment = true
        } = options;

        if (!tableId) {
            console.error('TableHelper: tableId is required');
            return null;
        }

        const table = document.getElementById(tableId);
        if (!table) {
            console.error(`TableHelper: table element with id "${tableId}" not found`);
            return null;
        }

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!thead || !tbody) {
            console.error(`TableHelper: table must have thead and tbody elements`);
            return null;
        }

        // 渲染表头
        thead.innerHTML = this.renderHeader(columns);

        // 计算分页数据
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const validPage = Math.max(1, Math.min(currentPage, totalPages));
        const pagedData = this.paginate(data, pageSize, validPage);

        // 渲染表体
        tbody.innerHTML = '';
        if (useFragment) {
            // 使用 DocumentFragment 批量插入
            const fragment = document.createDocumentFragment();
            pagedData.forEach(row => {
                const tr = this.createRow(row, columns);
                fragment.appendChild(tr);
            });
            tbody.appendChild(fragment);
        } else {
            // 直接插入
            pagedData.forEach(row => {
                const tr = this.createRow(row, columns);
                tbody.appendChild(tr);
            });
        }

        return {
            data: pagedData,
            total: totalItems,
            totalPages: totalPages,
            currentPage: validPage
        };
    },

    /**
     * 渲染表头
     * @param {Array} columns - 列配置数组
     * @returns {string} HTML 字符串
     */
    renderHeader(columns) {
        const headerHTML = columns.map(col => {
            const width = col.width ? `width="${col.width}"` : '';
            const align = col.align ? `align="${col.align}"` : '';
            const sortable = col.sortable ? 'class="sortable"' : '';
            const sortClass = col.sortDirection ? `sort-${col.sortDirection}` : '';
            
            return `<th ${width} ${align} ${sortable} ${sortClass} data-key="${col.key}">${col.label}</th>`;
        }).join('');

        return `<tr>${headerHTML}</tr>`;
    },

    /**
     * 创建表格行元素
     * @param {Object} row - 行数据
     * @param {Array} columns - 列配置数组
     * @returns {HTMLElement} tr 元素
     */
    createRow(row, columns) {
        const tr = document.createElement('tr');
        
        columns.forEach(col => {
            const td = document.createElement('td');
            
            if (col.render) {
                // 使用自定义渲染函数
                td.innerHTML = col.render(row[col.key], row);
            } else {
                // 使用默认渲染
                td.textContent = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
            }
            
            // 添加单元格样式
            if (col.className) {
                td.className = col.className;
            }
            
            tr.appendChild(td);
        });
        
        return tr;
    },

    /**
     * 渲染表体（返回 HTML 字符串）
     * @param {Array} data - 数据数组
     * @param {Array} columns - 列配置数组
     * @returns {string} HTML 字符串
     */
    renderBody(data, columns) {
        return data.map(row => `
            <tr>
                ${columns.map(col => {
                    const value = row[col.key];
                    const content = col.render ? col.render(value, row) : (value !== undefined && value !== null ? value : '');
                    const className = col.className ? `class="${col.className}"` : '';
                    return `<td ${className}>${content}</td>`;
                }).join('')}
            </tr>
        `).join('');
    },

    /**
     * 分页数据
     * @param {Array} data - 原始数据
     * @param {number} pageSize - 每页数量
     * @param {number} currentPage - 当前页码
     * @returns {Array} 分页后的数据
     */
    paginate(data, pageSize, currentPage) {
        if (!Array.isArray(data)) return [];
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return data.slice(startIndex, endIndex);
    },

    /**
     * 计算总页数
     * @param {number} totalItems - 总项目数
     * @param {number} pageSize - 每页数量
     * @returns {number} 总页数
     */
    calculateTotalPages(totalItems, pageSize) {
        if (totalItems <= 0) return 1;
        return Math.ceil(totalItems / pageSize);
    },

    /**
     * 排序数据
     * @param {Array} data - 原始数据
     * @param {string} column - 排序字段
     * @param {string} direction - 排序方向 'asc' 或 'desc'
     * @param {Function} customSortFn - 自定义排序函数（可选）
     * @returns {Array} 排序后的数据
     */
    sortData(data, column, direction = 'asc', customSortFn = null) {
        if (!Array.isArray(data) || data.length === 0) return data;

        const sortedData = [...data];

        if (customSortFn) {
            // 使用自定义排序函数
            sortedData.sort((a, b) => {
                const result = customSortFn(a[column], b[column], a, b);
                return direction === 'desc' ? -result : result;
            });
        } else {
            // 使用默认排序
            sortedData.sort((a, b) => {
                const aVal = a[column];
                const bVal = b[column];

                // 处理空值
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                // 数字排序
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal;
                }

                // 字符串排序
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                
                if (aStr < bStr) return direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sortedData;
    },

    /**
     * 切换排序方向
     * @param {string} currentDirection - 当前排序方向
     * @returns {string} 新的排序方向
     */
    toggleSortDirection(currentDirection) {
        if (currentDirection === 'asc') return 'desc';
        if (currentDirection === 'desc') return 'asc';
        return 'asc';
    },

    /**
     * 创建列配置对象
     * @param {Object} config - 列配置
     * @param {string} config.key - 数据字段名
     * @param {string} config.label - 列标题
     * @param {Function} config.render - 自定义渲染函数
     * @param {string} config.className - 列样式类名
     * @param {boolean} config.sortable - 是否可排序
     * @param {string} config.align - 对齐方式 'left', 'center', 'right'
     * @param {number} config.width - 列宽度
     * @returns {Object} 列配置对象
     */
    createColumn(config) {
        return {
            key: config.key || '',
            label: config.label || '',
            render: config.render || null,
            className: config.className || '',
            sortable: config.sortable || false,
            align: config.align || 'left',
            width: config.width || null,
            sortDirection: null
        };
    },

    /**
     * 绑定表头排序事件
     * @param {string} tableId - 表格元素 ID
     * @param {Array} columns - 列配置数组
     * @param {Function} onSort - 排序回调函数 (column, direction) => {}
     */
    bindSortEvents(tableId, columns, onSort) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead');
        if (!thead) return;

        thead.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th || !th.classList.contains('sortable')) return;

            const columnKey = th.dataset.key;
            const column = columns.find(col => col.key === columnKey);
            if (!column) return;

            // 切换排序方向
            column.sortDirection = this.toggleSortDirection(column.sortDirection);

            // 更新表头样式
            thead.querySelectorAll('th').forEach(header => {
                if (header !== th) {
                    header.classList.remove('sort-asc', 'sort-desc');
                }
            });
            th.classList.remove('sort-asc', 'sort-desc');
            th.classList.add(`sort-${column.sortDirection}`);

            // 触发排序回调
            if (onSort) {
                onSort(columnKey, column.sortDirection);
            }
        });
    },

    /**
     * 清空表格
     * @param {string} tableId - 表格元素 ID
     */
    clearTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }
    },

    /**
     * 显示空状态
     * @param {string} tableId - 表格元素 ID
     * @param {number} colspan - 列数
     * @param {string} message - 空状态消息
     */
    showEmptyState(tableId, colspan, message = '暂无数据') {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-state">
                    ${message}
                </td>
            </tr>
        `;
    }
};

// 挂载到命名空间
StockProfitCalculator.TableHelper = TableHelper;
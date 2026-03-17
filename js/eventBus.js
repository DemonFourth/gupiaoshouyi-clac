/**
 * 事件总线模块（发布/订阅模式）
 * 目标：降低模块之间的直接调用耦合
 *
 * 版本: 1.1.0
 * 更新日期: 2026-03-12
 * 修改内容: 添加事件类型定义、事件日志、事件订阅管理、链式调用
 */
const EventBus = (function() {
    /** @type {Map<string, Set<Function>>} */
    const listeners = new Map();

    /** @type {Array<{eventName: string, handler: Function}>} */
    const subscriptions = [];

    /** @type {boolean} */
    let logEnabled = false;

    /**
     * 事件类型定义
     */
    const EventTypes = {
        // 路由事件
        ROUTE_CHANGE: 'route:change',

        // 数据事件
        DATA_CHANGED: 'data:changed',

        // 股票事件
        STOCK_ADDED: 'stock:added',
        STOCK_DELETED: 'stock:deleted',
        STOCK_UPDATED: 'stock:updated',

        // 交易事件
        TRADE_ADDED: 'trade:added',
        TRADE_UPDATED: 'trade:updated',
        TRADE_DELETED: 'trade:deleted',

        // 页面事件
        PAGE_LOADED: 'page:loaded',

        // 错误事件
        ERROR_OCCURRED: 'error:occurred'
    };

    /**
     * 启用事件日志
     * @param {boolean} enabled - 是否启用
     */
    function enableLog(enabled) {
        logEnabled = enabled;
    }

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} context - 上下文对象（可选）
     * @returns {Function} 取消订阅函数
     */
    function on(eventName, handler, context) {
        if (typeof handler !== 'function') {
            throw new Error('EventBus.on: handler must be a function');
        }

        if (!listeners.has(eventName)) {
            listeners.set(eventName, new Set());
        }

        const wrappedHandler = context ? handler.bind(context) : handler;
        listeners.get(eventName).add(wrappedHandler);

        // 记录订阅
        subscriptions.push({ eventName, handler: wrappedHandler });

        if (logEnabled) {
            console.log(`[EventBus] Subscribe: ${eventName}`, { context: context?.constructor?.name });
        }

        // 返回自身，支持链式调用
        return this;
    }

    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {EventBus} 返回自身，支持链式调用
     */
    function off(eventName, handler) {
        const set = listeners.get(eventName);
        if (!set) return this;

        set.delete(handler);
        if (set.size === 0) {
            listeners.delete(eventName);
        }

        // 从订阅记录中移除
        const index = subscriptions.findIndex(sub => sub.eventName === eventName && sub.handler === handler);
        if (index !== -1) {
            subscriptions.splice(index, 1);
        }

        if (logEnabled) {
            console.log(`[EventBus] Unsubscribe: ${eventName}`);
        }

        return this;
    }

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {*} payload - 事件数据
     * @returns {EventBus} 返回自身，支持链式调用
     */
    function emit(eventName, payload) {
        const set = listeners.get(eventName);
        if (!set || set.size === 0) {
            if (logEnabled) {
                console.log(`[EventBus] Emit: ${eventName} (no listeners)`, payload);
            }
            return this;
        }

        if (logEnabled) {
            console.log(`[EventBus] Emit: ${eventName}`, payload);
        }

        // 为 ROUTE_CHANGE 事件添加调试日志
        if (eventName === EventTypes.ROUTE_CHANGE) {
            console.log(`[EventBus] ROUTE_CHANGE emitted:`, payload);
        }

        // 拷贝一份，避免 handler 内 on/off 影响本次遍历
        Array.from(set).forEach(handler => {
            try {
                handler(payload);
            } catch (e) {
                console.error(`[EventBus] Handler error for ${eventName}:`, e);
                // 触发错误事件
                if (eventName !== EventTypes.ERROR_OCCURRED) {
                    emit(EventTypes.ERROR_OCCURRED, {
                        originalEvent: eventName,
                        error: e,
                        payload
                    });
                }
            }
        });

        return this;
    }

    /**
     * 取消指定事件的所有订阅
     * @param {string} eventName - 事件名称
     * @returns {EventBus} 返回自身，支持链式调用
     */
    function offAll(eventName) {
        const set = listeners.get(eventName);
        if (!set) return this;

        // 从订阅记录中移除
        const index = subscriptions.findIndex(sub => sub.eventName === eventName);
        while (index !== -1) {
            subscriptions.splice(index, 1);
            const newIndex = subscriptions.findIndex(sub => sub.eventName === eventName);
            if (newIndex === -1) break;
        }

        listeners.delete(eventName);

        if (logEnabled) {
            console.log(`[EventBus] Unsubscribe all: ${eventName}`);
        }

        return this;
    }

    /**
     * 清除所有订阅
     * @returns {EventBus} 返回自身，支持链式调用
     */
    function clear() {
        listeners.clear();
        subscriptions.length = 0;

        if (logEnabled) {
            console.log('[EventBus] Clear all subscriptions');
        }

        return this;
    }

    /**
     * 获取事件监听器数量
     * @param {string} eventName - 事件名称（可选）
     * @returns {number|Object} 监听器数量或各事件的监听器数量
     */
    function getListenerCount(eventName) {
        if (eventName) {
            const set = listeners.get(eventName);
            return set ? set.size : 0;
        }

        // 返回所有事件的监听器数量
        const counts = {};
        listeners.forEach((set, name) => {
            counts[name] = set.size;
        });
        return counts;
    }

    /**
     * 获取订阅数量
     * @returns {number} 订阅数量
     */
    function getSubscriptionCount() {
        return subscriptions.length;
    }

    return {
        EventTypes,
        on,
        off,
        offAll,
        emit,
        clear,
        enableLog,
        getListenerCount,
        getSubscriptionCount
    };
})();

// 挂载到命名空间
if (StockProfitCalculator) {
    StockProfitCalculator.EventBus = EventBus;
} else {
    // 向后兼容：如果命名空间未初始化，暴露到全局
    window.EventBus = EventBus;
}

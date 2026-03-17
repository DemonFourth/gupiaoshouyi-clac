/**
 * Perf: 轻量性能计时工具
 * - 默认关闭：window.__PERF_ENABLED__ === true 时才输出
 * - 使用 performance.now()，没有则退化为 Date.now()
 */

const Perf = (() => {
    function now() {
        if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    function enabled() {
        return typeof window !== 'undefined' && window.__PERF_ENABLED__ === true;
    }

    function start(label) {
        if (!enabled()) return null;
        return { label, t0: now() };
    }

    function end(token, extra = {}) {
        if (!enabled() || !token) return;
        const ms = now() - token.t0;
        // 保持日志紧凑
        console.log(`[perf] ${token.label}: ${ms.toFixed(2)}ms`, extra);
    }

    return { start, end };
})();

// 挂载到命名空间
StockProfitCalculator.Perf = Perf;

// 默认启用（可在设置中关闭；后续开发完成再把默认值改为 false）
if (typeof window !== 'undefined' && typeof window.__PERF_ENABLED__ === 'undefined') {
    window.__PERF_ENABLED__ = true;
}

/**
 * Perf: 轻量性能计时工具
 * - 使用 Logger 模块输出，统一日志管理
 * - 通过 Logger 的 perf 模块开关控制
 * - 使用 performance.now()，没有则退化为 Date.now()
 */

const Perf = (() => {
    function now() {
        if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    function start(label) {
        // 返回 token，不管是否启用（由 Logger 控制输出）
        return { label, t0: now() };
    }

    function end(token, extra = {}) {
        if (!token) return;
        const ms = now() - token.t0;
        // 使用 Logger 输出，由 perf 模块开关控制
        StockProfitCalculator.Logger?.debug?.(`[Perf] ${token.label}: ${ms.toFixed(2)}ms`, extra);
    }

    return { start, end };
})();

// 挂载到命名空间
StockProfitCalculator.Perf = Perf;

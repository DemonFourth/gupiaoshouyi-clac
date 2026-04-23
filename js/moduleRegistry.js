/**
 * 模块注册中心
 * 负责将所有模块注册到 StockProfitCalculator 命名空间
 * 必须在所有模块加载之后执行
 *
 * 版本: 1.0.0
 * 创建日期: 2026-03-12
 */

// 模块列表
const modules = [
    'Config',
    'Logger',
    'Utils',
    'ErrorHandler',
    'Validator',
    'Loading',
    'Calculator',
    'DataManager',
    'FileStorage',
    'Pagination',
    'StockManager',
    'TradeManager',
    'StockSnapshot',
    'Router',
    'Overview',
    'Detail',
    'ChartManager',
    'Perf'
];

// 注册所有模块到命名空间
modules.forEach(moduleName => {
    if (typeof window[moduleName] !== 'undefined') {
        // 先注册到命名空间
        if (StockProfitCalculator) {
            StockProfitCalculator[moduleName] = window[moduleName];
        }
        
        // 保持向后兼容：window.ModuleName 仍然可用
        // 但新增代码应该使用 StockProfitCalculator.ModuleName
    }
});

// 向后兼容：如果 StockProfitCalculator 未初始化，则不执行
if (typeof StockProfitCalculator === 'undefined') {
    // 命名空间未初始化
}
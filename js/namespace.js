/**
 * 命名空间模块
 * 将所有模块统一挂载到 StockProfitCalculator 命名空间下
 * 避免全局命名空间污染
 *
 * 版本: 1.0.0
 * 创建日期: 2026-03-12
 */

// 创建命名空间对象
const StockProfitCalculator = Object.create(null);

// 命名空间信息
StockProfitCalculator._namespace = {
    name: 'StockProfitCalculator',
    version: '1.0.0',
    description: '股票收益计算器命名空间'
};

// 命名空间工具方法
StockProfitCalculator.register = function(moduleName, module) {
    if (typeof moduleName !== 'string') {
        throw new Error('模块名必须是字符串');
    }
    if (typeof module !== 'object') {
        throw new Error('模块必须是对象');
    }
    this[moduleName] = module;
    return module;
};

// 冻结命名空间，防止被意外修改
Object.freeze(StockProfitCalculator._namespace);

// 暴露到全局 window 对象
window.StockProfitCalculator = StockProfitCalculator;

// 命名空间初始化完成
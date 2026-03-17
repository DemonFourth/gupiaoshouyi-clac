/**
 * 股价 API 模块
 * 统一股价获取逻辑，支持多个数据源
 *
 * 版本: 1.0.0
 * 创建日期: 2026-03-13
 */

const StockPriceAPI = {
    /**
     * API 数据源提供商
     */
    providers: {
        /**
         * 腾讯股票 API
         */
        tencent: {
            /**
             * 获取市场标识
             * @param {string} code - 股票代码
             * @returns {string} 市场标识（sh/sz）
             */
            getMarket(code) {
                if (!code) return 'sz';

                // 上海市场：6开头（股票）、5开头（ETF）
                if (code.startsWith('6') || code.startsWith('5')) {
                    return 'sh';
                }
                // 深圳市场：0/3开头（股票）、15/16开头（ETF）
                else if (code.startsWith('0') || code.startsWith('3') ||
                         code.startsWith('15') || code.startsWith('16')) {
                    return 'sz';
                }
                // 默认深圳市场
                else {
                    return 'sz';
                }
            },

            /**
             * 获取股价
             * @param {string} code - 股票代码
             * @returns {Promise<Object|null>} 股价数据
             */
            async fetch(code) {
                if (!code) return null;

                const market = this.getMarket(code);
                const url = `https://qt.gtimg.cn/q=s_${market}${code}`;

                try {
                    const response = await fetch(url);
                    const buffer = await response.arrayBuffer();
                    const decoder = new TextDecoder('gbk');
                    const text = decoder.decode(buffer);

                    // 解析返回数据
                    const data = this._parseTencentData(text);
                    return data;
                } catch (error) {
                    throw new Error(`获取股价失败 [${code}]: ${error.message}`);
                }
            },

            /**
             * 解析腾讯 API 返回的数据
             * @private
             * @param {string} text - API 返回的文本
             * @returns {Object|null} 解析后的股价数据
             */
            _parseTencentData(text) {
                // 腾讯 API 返回格式: v_s_SH600000="10.00~9.90~10.00~..."
                const match = text.match(/v_s_\w+="(.+)"/);
                if (!match || !match[1]) return null;

                const parts = match[1].split('~');
                if (parts.length < 6) return null;

                return {
                    name: parts[1] || '',              // 股票名称
                    price: parseFloat(parts[3]) || 0,  // 当前价
                    change: parseFloat(parts[4]) || 0, // 涨跌额
                    changePercent: parseFloat(parts[5]) || 0, // 涨跌幅
                    volume: parseInt(parts[6]) || 0,   // 成交量
                    amount: parseFloat(parts[37]) || 0 // 成交额
                };
            }
        },

        /**
         * 东方财富 API（预留）
         */
        eastmoney: {
            // TODO: 实现东方财富 API
            async fetch(code) {
                throw new Error('东方财富 API 暂未实现');
            }
        }
    },

    /**
     * 获取股价
     * @param {string} code - 股票代码
     * @param {string} provider - 数据源提供商（默认：tencent）
     * @returns {Promise<Object|null>} 股价数据
     */
    async fetchPrice(code, provider = 'tencent') {
        const api = this.providers[provider];
        if (!api) {
            throw new Error(`不支持的数据源: ${provider}`);
        }

        return await api.fetch(code);
    },

    /**
     * 获取市场标识
     * @param {string} code - 股票代码
     * @param {string} provider - 数据源提供商（默认：tencent）
     * @returns {string} 市场标识（sh/sz）
     */
    getMarket(code, provider = 'tencent') {
        const api = this.providers[provider];
        if (!api) {
            throw new Error(`不支持的数据源: ${provider}`);
        }

        return api.getMarket(code);
    },

    /**
     * 获取股票名称
     * @param {string} code - 股票代码
     * @param {string} provider - 数据源提供商（默认：tencent）
     * @returns {Promise<string|null>} 股票名称
     */
    async fetchStockName(code, provider = 'tencent') {
        const data = await this.fetchPrice(code, provider);
        return data ? data.name : null;
    }
};

// 挂载到命名空间
StockProfitCalculator.StockPriceAPI = StockPriceAPI;
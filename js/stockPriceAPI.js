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
             * 批量获取股价
             * @param {string[]} codes - 股票代码数组
             * @returns {Promise<Map<string, Object>>} 股价数据 Map (code -> quote)
             */
            async fetchBatch(codes) {
                if (!codes || codes.length === 0) return new Map();

                try {
                    // 构建批量请求 URL（简化版）: q=s_sh510300,s_sz159915,s_sz159326
                    // 使用 s_ 前缀获取简化版数据，字段位置与单个请求一致
                    const params = codes.map(code => {
                        const market = this.getMarket(code);
                        return `s_${market}${code}`;
                    }).join(',');
                    const url = `https://qt.gtimg.cn/q=${params}`;

                    const response = await fetch(url);
                    const buffer = await response.arrayBuffer();
                    const decoder = new TextDecoder('gbk');
                    const text = decoder.decode(buffer);

                    // 解析返回的多股票数据
                    return this._parseTencentBatchData(text, codes);
                } catch (error) {
                    throw new Error(`批量获取股价失败: ${error.message}`);
                }
            },

            /**
             * 解析腾讯 API 返回的数据（单个股票）
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
                    amount: parseFloat(parts[7]) || 0  // 成交额（简化版字段位置）
                };
            },

            /**
             * 解析腾讯 API 返回的数据（多个股票，简化版）
             * @private
             * @param {string} text - API 返回的文本
             * @param {string[]} codes - 请求的股票代码数组
             * @returns {Map<string, Object>} 股价数据 Map (code -> quote)
             */
            _parseTencentBatchData(text, codes) {
                const result = new Map();

                // 简化版批量请求返回格式（与单个请求一致）:
                // v_s_sh510300="1~沪深300ETF华泰柏瑞~510300~4.463~-0.037~-0.82~...";
                // v_s_sz159915="51~创业板ETF易方达~159915~3.182~-0.082~-2.51~...";
                // 使用正则匹配每行数据（注意 v_s_ 前缀）
                const regex = /v_s_(sh|sz)(\d{6})="(.+?)";/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const code = match[2];  // 股票代码
                    const dataStr = match[3];
                    const parts = dataStr.split('~');

                    if (parts.length >= 6) {
                        result.set(code, {
                            name: parts[1] || '',              // 股票名称
                            price: parseFloat(parts[3]) || 0,  // 当前价
                            change: parseFloat(parts[4]) || 0, // 涨跌额
                            changePercent: parseFloat(parts[5]) || 0, // 涨跌幅
                            volume: parseInt(parts[6]) || 0,   // 成交量
                            amount: parseFloat(parts[7]) || 0  // 成交额（简化版字段位置）
                        });
                    }
                }

                return result;
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
     * 批量获取股价
     * @param {string[]} codes - 股票代码数组
     * @param {string} provider - 数据源提供商（默认：tencent）
     * @returns {Promise<Map<string, Object>>} 股价数据 Map (code -> quote)
     */
    async fetchPrices(codes, provider = 'tencent') {
        const api = this.providers[provider];
        if (!api) {
            throw new Error(`不支持的数据源: ${provider}`);
        }

        if (!api.fetchBatch) {
            throw new Error(`该数据源不支持批量获取: ${provider}`);
        }

        return await api.fetchBatch(codes);
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
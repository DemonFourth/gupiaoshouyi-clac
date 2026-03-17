/**
 * Cloudflare Pages Functions API
 * 股票收益计算器 - 数据存储 API
 *
 * 功能：
 * - GET  /api/data       - 获取所有数据
 * - PUT  /api/data       - 保存所有数据
 * - POST /api/import     - 导入JSON数据
 * - GET  /api/health     - 健康检查
 *
 * 数据库：Cloudflare D1
 * 表结构：app_data (key, value, last_updated)
 * 自动初始化：首次访问时自动创建数据库表
 */

// 全局变量：数据库初始化状态
let isInitialized = false;

/**
 * 自动初始化数据库表
 */
async function initializeDatabase(env) {
    if (isInitialized) {
        return;
    }

    try {
        // 检查表是否存在
        const result = await env.D1.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='app_data'"
        ).first();

        if (!result) {
            // 创建表
            await env.D1.prepare(`
                CREATE TABLE app_data (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT NOT NULL,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // 创建索引
            await env.D1.prepare(`
                CREATE INDEX IF NOT EXISTS idx_app_data_updated ON app_data(last_updated)
            `).run();

            console.log('Database initialized: app_data table created');
        }

        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * 主请求处理函数
 */
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 解析路径
    const pathParts = path.split('/').filter(Boolean);
    const apiPart = pathParts[0]; // 'api'
    const resourcePart = pathParts[1]; // 'data', 'import', 'health'

    // 只处理 /api/* 请求
    if (apiPart !== 'api') {
        return new Response('Not Found', { status: 404 });
    }

    // CORS 头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 自动初始化数据库
        await initializeDatabase(env);

        // 路由分发
        switch (resourcePart) {
            case 'data':
                return handleDataRequest(request, env, corsHeaders);
            case 'import':
                return handleImportRequest(request, env, corsHeaders);
            case 'health':
                return handleHealthRequest(env, corsHeaders);
            default:
                return jsonResponse({ error: 'Invalid endpoint' }, 404, corsHeaders);
        }
    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
}

/**
 * 处理数据请求（GET /api/data 或 PUT /api/data）
 */
async function handleDataRequest(request, env, corsHeaders) {
    if (request.method === 'GET') {
        return getData(env, corsHeaders);
    } else if (request.method === 'PUT') {
        const body = await request.json();
        return saveData(env, body, corsHeaders);
    } else {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }
}

/**
 * 获取所有数据
 */
async function getData(env, corsHeaders) {
    try {
        // 查询所有数据
        const results = await env.D1.prepare(
            'SELECT key, value FROM app_data ORDER BY key'
        ).all();

        if (!results.results || results.results.length === 0) {
            // 数据库为空，返回空数据
            return jsonResponse({
                stocks: [],
                currentStockCode: null,
                version: '1.0.0',
                last_updated: null
            }, 200, corsHeaders);
        }

        // 解析数据
        const dataMap = {};
        results.results.forEach(row => {
            try {
                if (row.key === 'stocks') {
                    dataMap[row.key] = JSON.parse(row.value);
                } else {
                    dataMap[row.key] = row.value;
                }
            } catch (error) {
                console.error(`Failed to parse data for key ${row.key}:`, error);
            }
        });

        // 返回完整数据
        return jsonResponse({
            stocks: dataMap.stocks || [],
            currentStockCode: dataMap.currentStockCode || null,
            version: '1.0.0',
            last_updated: new Date().toISOString()
        }, 200, corsHeaders);
    } catch (error) {
        console.error('Failed to get data:', error);
        throw error;
    }
}

/**
 * 保存所有数据
 */
async function saveData(env, data, corsHeaders) {
    try {
        const { stocks, currentStockCode } = data;

        if (!stocks || !Array.isArray(stocks)) {
            return jsonResponse({ error: 'Invalid data: stocks is required' }, 400, corsHeaders);
        }

        // 添加时间戳
        const last_updated = new Date().toISOString();

        // 保存股票数据
        await env.D1.prepare(
            'INSERT OR REPLACE INTO app_data (key, value, last_updated) VALUES (?, ?, ?)'
        ).bind('stocks', JSON.stringify(stocks), last_updated).run();

        // 保存当前股票代码
        if (currentStockCode) {
            await env.D1.prepare(
                'INSERT OR REPLACE INTO app_data (key, value, last_updated) VALUES (?, ?, ?)'
            ).bind('currentStockCode', currentStockCode, last_updated).run();
        }

        return jsonResponse({
            success: true,
            last_updated: last_updated
        }, 200, corsHeaders);
    } catch (error) {
        console.error('Failed to save data:', error);
        throw error;
    }
}

/**
 * 处理导入请求（POST /api/import）
 */
async function handleImportRequest(request, env, corsHeaders) {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    try {
        const body = await request.json();
        const { data } = body;

        if (!data || !data.stocks || !Array.isArray(data.stocks)) {
            return jsonResponse({ error: 'Invalid data: stocks is required' }, 400, corsHeaders);
        }

        // 添加时间戳
        const last_updated = new Date().toISOString();

        // 保存股票数据
        await env.D1.prepare(
            'INSERT OR REPLACE INTO app_data (key, value, last_updated) VALUES (?, ?, ?)'
        ).bind('stocks', JSON.stringify(data.stocks), last_updated).run();

        // 保存当前股票代码
        if (data.currentStockCode) {
            await env.D1.prepare(
                'INSERT OR REPLACE INTO app_data (key, value, last_updated) VALUES (?, ?, ?)'
            ).bind('currentStockCode', data.currentStockCode, last_updated).run();
        }

        return jsonResponse({
            success: true,
            message: 'Data imported successfully',
            last_updated: last_updated
        }, 200, corsHeaders);
    } catch (error) {
        console.error('Failed to import data:', error);
        throw error;
    }
}

/**
 * 健康检查
 */
async function handleHealthRequest(env, corsHeaders) {
    try {
        // 检查数据库连接
        await env.D1.prepare('SELECT 1').first();

        // 检查表是否存在
        const tableExists = await env.D1.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='app_data'"
        ).first();

        return jsonResponse({
            status: 'healthy',
            database: 'connected',
            table_initialized: !!tableExists,
            timestamp: new Date().toISOString()
        }, 200, corsHeaders);
    } catch (error) {
        console.error('Health check failed:', error);
        return jsonResponse({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        }, 503, corsHeaders);
    }
}

/**
 * 返回 JSON 响应
 */
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
}
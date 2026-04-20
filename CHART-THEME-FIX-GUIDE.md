# 图表主题修复指南

## 问题分析

### 1. 代码回退问题
**现象**：a2ff613的修改（移除legend）被回退到529ca2c的状态（有legend）

**根本原因**：
- Edit工具的old_string匹配失败
- 多个图表函数有相似的代码结构
- Edit匹配到了错误的函数位置

**解决方案**：
```bash
# 恢复到正确的提交
git restore js/detail.js index.html
```

### 2. 字体颜色不变化问题
**现象**：dark/light模式下图表字体都是黑色

**根本原因**：
- ChartManager设置了默认主题配置
- 但ECharts的默认主题可能覆盖了这些配置
- 需要确保所有图表元素都显式设置颜色

## 完整解决方案

### 方案1：修改ChartManager（推荐）

在`js/chartManager.js`中，确保默认配置正确：

```javascript
init(chartId, chartDom, option, options = {}) {
    try {
        this.dispose(chartId);

        // Get current theme
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        const chart = echarts.init(chartDom);
        this.charts[chartId] = chart;
        
        // Set default theme options
        const textColor = theme === 'dark' ? '#e8eaf6' : '#1e293b';
        const axisLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const splitLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        
        // Apply default theme configuration
        chart.setOption({
            textStyle: {
                color: textColor
            },
            xAxis: {
                axisLine: { lineStyle: { color: axisLineColor } },
                axisLabel: { color: textColor },
                splitLine: { lineStyle: { color: splitLineColor } }
            },
            yAxis: {
                axisLine: { lineStyle: { color: axisLineColor } },
                axisLabel: { color: textColor },
                splitLine: { lineStyle: { color: splitLineColor } }
            },
            legend: {
                textStyle: { color: textColor }
            }
        });
        
        if (option != null) {
            this.charts[chartId].setOption(option);
        }
        
        if (options.bindResize !== false) {
            this._bindResize(chartId);
        }
        return this.charts[chartId];
    } catch (error) {
        console.error(`初始化图表失败 [${chartId}]:`, error);
        return null;
    }
}
```

### 方案2：在每个图表函数中显式设置颜色

在`js/detail.js`的每个图表函数中：

```javascript
renderSomeChart(data) {
    // 1. 获取主题颜色
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const textColor = theme === 'dark' ? '#e8eaf6' : '#1e293b';
    const axisLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const splitLineColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const option = {
        title: {
            text: '图表标题',
            textStyle: { 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: textColor  // 显式设置
            }
        },
        xAxis: {
            axisLabel: { 
                color: textColor  // 显式设置
            },
            axisLine: { 
                lineStyle: { color: axisLineColor }  // 显式设置
            },
            splitLine: { 
                lineStyle: { color: splitLineColor }  // 显式设置
            }
        },
        yAxis: {
            nameTextStyle: { 
                color: textColor  // 显式设置
            },
            axisLabel: { 
                color: textColor  // 显式设置
            },
            axisLine: { 
                lineStyle: { color: axisLineColor }  // 显式设置
            },
            splitLine: { 
                lineStyle: { color: splitLineColor }  // 显式设置
            }
        },
        // 不设置legend，移除图例控制功能
        series: [
            // ...
        ]
    };
}
```

## 应用到所有图表

### 需要修改的图表函数

1. **renderHoldingTrendChart** - 持仓数量变化趋势
2. **renderCumulativeProfitChart** - 累计收益变化趋势
3. **renderProfitTrendChart** - 单笔交易收益
4. **renderReturnRateTrendChart** - 累计收益率变化趋势
5. **renderPerShareCostTrendChart** - 每股成本趋势

### 统一修改模板

```javascript
// 1. 移除legend配置
// 删除：
legend: {
    data: ['...'],
    top: 30,
    textStyle: { color: textColor }
}

// 2. 添加坐标轴颜色
xAxis: {
    axisLabel: { color: textColor },
    axisLine: { lineStyle: { color: textColor } }
},
yAxis: {
    nameTextStyle: { color: textColor },
    axisLabel: { color: textColor },
    axisLine: { lineStyle: { color: textColor } },
    splitLine: { 
        lineStyle: { 
            color: theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)' 
        } 
    }
}

// 3. 调整grid.top（如果移除了legend）
// 减少20px，因为不需要为legend留空间
```

## 验证步骤

1. **检查代码状态**
```bash
git status
git diff js/detail.js
```

2. **测试dark模式**
- 切换到dark模式
- 检查图表标题是否为白色
- 检查坐标轴标签是否为白色
- 检查坐标轴线是否可见

3. **测试light模式**
- 切换到light模式
- 检查图表标题是否为深色
- 检查坐标轴标签是否为深色
- 检查坐标轴线是否可见

4. **测试图例**
- 确认图例控制开关已移除
- 确认图表标题和内容不重叠

## 注意事项

1. **Edit工具使用**
   - 确保old_string完全匹配
   - 包含足够的上下文避免匹配错误
   - 一次只修改一个函数

2. **Git操作**
   - 修改前先检查git status
   - 使用git restore恢复错误修改
   - 提交前验证修改正确

3. **测试**
   - 每次修改后都要测试
   - 测试dark和light两种模式
   - 确认所有图表都正确显示

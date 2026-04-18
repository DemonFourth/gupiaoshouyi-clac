# Dark主题优化日志

## 版本：v2.19.1 (2026-04-18)

### 概述
本次更新全面优化了股票详情页的dark主题，包括持仓周期历史栏、加仓对比记录、卖出预测等区域，统一使用CSS变量管理样式，移除所有内联样式和硬编码颜色。

---

## 主要改进

### 1. 持仓周期历史栏优化

#### 1.1 修复内联样式问题
- **问题**：`js/utils.js`中使用内联样式，导致CSS样式不生效
- **修复**：移除内联样式，使用CSS类`.cycle-history-total`
- **文件**：`js/utils.js:1416`

#### 1.2 字体颜色优化
- `.cycle-history-total`：灰色 → 白色 (`var(--text-primary)`)
- `.cycle-number`：黑色 → 白色 (`var(--text-primary)`)
- `.cycle-item-dates`：灰色 → 半透明白色 (`var(--text-muted)`)
- `.cycle-date`：灰色 → 半透明白色 (`var(--text-muted)`)
- `.cycle-stats-labels`：灰色 → 半透明白色 (`var(--text-muted)`)
- `.cycle-stats-values`：黑色 → 白色 (`var(--text-primary)`)
- `.profit-label`：灰色 → 半透明白色 (`var(--text-muted)`)
- `.profit-value`：黑色 → 白色 (`var(--text-primary)`)

#### 1.3 背景色优化
- `.cycle-history-item`：浅灰色 → 深色背景 (`var(--bg-secondary)`)
- `.cycle-item-active`：浅绿色 → 半透明绿色 (`rgba(16, 185, 129, 0.1)`)
- `.cycle-item-closed`：浅灰色 → 深色背景 (`var(--bg-secondary)`)

#### 1.4 边框颜色优化
- `.cycle-item-profit`：浅灰色边框 → 主题边框 (`var(--border-color)`)
- `.cycle-item-stats`：浅灰色边框 → 主题边框 (`var(--border-color)`)

---

### 2. 加仓对比记录区域优化

#### 2.1 容器背景优化
- `.addition-comparison-table`：白色背景 → 深色背景 (`var(--bg-card)`)
- `.ac-cycle-group`：白色背景 → 深色背景 (`var(--bg-secondary)`)

#### 2.2 标题栏优化
- `.ac-section-header`：紫色渐变 → 深色背景 (`var(--bg-primary)`)
- `.ac-section-title`：白色文字 → 主题文字 (`var(--text-primary)`)
- `.ac-section-toggle`：白色半透明 → 紫色半透明 (`rgba(102, 126, 234, 0.2)`)

#### 2.3 轮次标题栏优化
- `.ac-cycle-header`：浅灰色 → 深色背景 (`var(--bg-primary)`)
- `.ac-cycle-title`：黑色 → 白色 (`var(--text-primary)`)
- `.ac-cycle-toggle`：灰色 → 半透明白色 (`var(--text-muted)`)

#### 2.4 表格优化
- `.ac-table`：白色背景 → 深色背景 (`var(--bg-card)`)
- `.ac-table th`：紫色渐变 → 深色背景 (`var(--bg-primary)`)
- `.ac-table td`：黑色文字 → 白色文字 (`var(--text-primary)`)

#### 2.5 表格行背景优化
- 普通行hover：浅灰色 → 紫色半透明 (`rgba(102, 126, 234, 0.1)`)
- 最新行：浅蓝色 → 蓝色半透明 (`rgba(33, 150, 243, 0.1)`)
- 建仓行：浅绿色 → 绿色半透明 (`rgba(16, 185, 129, 0.1)`)
- 预测行：浅红色 → 红色半透明 (`rgba(239, 68, 68, 0.1)`)

#### 2.6 输入框优化
- `.ac-predict-input`：
  - 边框：浅红色 → 主题边框 (`var(--border-color)`)
  - 背景：无 → 深色背景 (`var(--bg-secondary)`)
  - 文字：无 → 白色文字 (`var(--text-primary)`)
  - placeholder：浅灰色 → 半透明白色 (`var(--text-muted)`)

#### 2.7 修复重复定义
- **问题**：CSS文件中有重复定义的样式（7266-7330行），覆盖了之前的修改
- **修复**：统一修复所有重复定义，使用CSS变量

---

### 3. 卖出预测区域优化

#### 3.1 容器背景优化
- `.sp-container`：蓝色渐变 → 深色背景 (`var(--bg-card)`)

#### 3.2 标题栏优化
- `.sp-header`：蓝色渐变 → 蓝色半透明 (`rgba(33, 150, 243, 0.15)`)
- `.sp-title`：白色文字 → 主题文字 (`var(--text-primary)`)
- `.sp-toggle-btn`：白色半透明 → 蓝色半透明 (`rgba(33, 150, 243, 0.2)`)

#### 3.3 持仓信息优化
- `.sp-holding-row`：白色半透明 → 深色背景 (`var(--bg-secondary)`)
- `.sp-holding-value`：黑色 → 白色 (`var(--text-primary)`)
- `.sp-holding-cost`：灰色 → 半透明白色 (`var(--text-muted)`)

#### 3.4 输入框优化
- `.sp-input`：
  - 边框：浅蓝色 → 主题边框 (`var(--border-color)`)
  - 背景：白色 → 深色背景 (`var(--bg-secondary)`)
  - 文字：黑色 → 白色文字 (`var(--text-primary)`)
  - placeholder：浅灰色 → 半透明白色 (`var(--text-muted)`)

#### 3.5 快捷按钮优化
- `.sp-quick-btn`：浅蓝色边框 → 蓝色半透明边框 (`rgba(33, 150, 243, 0.3)`)

#### 3.6 结果显示优化
- `.sp-result-value`：
  - 文字：黑色 → 白色 (`var(--text-primary)`)
  - 背景：白色半透明 → 深色背景 (`var(--bg-secondary)`)

---

### 4. 详情页表格标题栏优化

#### 4.1 修复优先级问题
- **问题**：`#detailPage table th`优先级高于`.ac-table th`，导致样式不生效
- **修复**：修改`#detailPage table th`使用CSS变量

#### 4.2 背景色优化
- **之前**：紫色渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **现在**：深色背景 `var(--bg-primary)`，形成层次感

#### 4.3 字体优化
- 颜色：白色 → 主题文字 (`var(--text-primary)`)
- 字重：正常 → 加粗 (`font-weight: 600`)

---

## 技术要点

### 1. CSS变量使用
所有颜色都使用CSS变量，支持主题切换：
- `var(--bg-primary)`：最深背景
- `var(--bg-secondary)`：次深背景
- `var(--bg-card)`：卡片背景
- `var(--text-primary)`：主要文字
- `var(--text-muted)`：次要文字
- `var(--border-color)`：边框颜色
- `var(--shadow-sm)`：阴影

### 2. 半透明背景
使用半透明背景保持视觉层次：
- 紫色半透明：`rgba(102, 126, 234, 0.1)`
- 蓝色半透明：`rgba(33, 150, 243, 0.1)`
- 绿色半透明：`rgba(16, 185, 129, 0.1)`
- 红色半透明：`rgba(239, 68, 68, 0.1)`

### 3. 移除内联样式
- `js/utils.js`中的内联样式改为CSS类
- 所有样式统一在CSS文件中管理

### 4. 修复重复定义
- 检查并修复CSS文件中的重复定义
- 确保样式优先级正确

---

## 文件修改清单

### CSS文件
- `css/style.css`：主要样式文件，修改约200+处

### JavaScript文件
- `js/utils.js`：移除内联样式，使用CSS类
- `js/overview.js`：图表标题颜色适配主题

### HTML文件
- `index.html`：更新CSS版本号（v2.19.1）

---

## 版本历史

### v2.19.1 (2026-04-18)
- 修复表格标题栏层次感问题
- 使用`var(--bg-primary)`形成视觉层次

### v2.19.0 (2026-04-18)
- 修复`#detailPage table th`优先级问题
- 移除紫色渐变，使用CSS变量

### v2.18.4 (2026-04-18)
- 表格标题栏使用`var(--bg-secondary)`

### v2.18.3 (2026-04-18)
- 表格标题栏使用`var(--bg-primary)`

### v2.18.2 (2026-04-18)
- 修复ac-cycle-header紫色半透明背景问题
- 改为深色背景

### v2.18.1 (2026-04-18)
- 修复重复定义的ac-cycle-group样式

### v2.18.0 (2026-04-18)
- 修复渐变背景色问题
- ac-section-header、ac-table th、sp-header使用深色背景

### v2.17.0 (2026-04-18)
- 加仓对比记录区域全面优化
- 卖出预测区域全面优化

### v2.16.1 (2026-04-18)
- 修复cycle-stats-row字体颜色

### v2.16.0 (2026-04-18)
- 修复内联样式问题
- cycle-history-total使用CSS类

### v2.15.4 (2026-04-18)
- 修复cycle-history-total、cycle-number等字体颜色

### v2.15.3 (2026-04-18)
- 修复cycle-history-item背景色

---

## 测试建议

1. **主题切换测试**
   - 切换dark/light主题，检查所有区域颜色是否正确变化
   - 检查表格标题栏是否有层次感

2. **浏览器兼容性测试**
   - Chrome、Firefox、Edge、Safari
   - 检查CSS变量是否正常工作

3. **响应式测试**
   - 不同屏幕尺寸下的显示效果
   - 移动端显示效果

4. **性能测试**
   - 页面加载速度
   - 主题切换流畅度

---

## 注意事项

1. **CSS变量兼容性**
   - 现代浏览器都支持CSS变量
   - 如需支持IE11，需要使用polyfill

2. **缓存问题**
   - 每次更新后，CSS版本号会变化
   - 用户需要硬刷新才能看到最新效果

3. **主题切换**
   - 所有颜色都使用CSS变量
   - 切换主题时，所有区域会自动更新

---

## 贡献者

- CodeArts代码智能体
- 用户反馈和测试

---

## 许可证

本项目遵循MIT许可证。

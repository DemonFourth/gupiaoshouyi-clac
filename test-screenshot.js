const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 先注入测试数据到 localStorage（使用正确的键名）
  await page.addInitScript(() => {
    const testData = {
      stocks: [
        {
          code: '002460',
          name: '赣锋锂业',
          group: 'holding',
          trades: [
            { id: 1, date: '2025-10-29', type: 'buy', price: 66.09, amount: 200, fee: 5, totalAmount: 13223 },
            { id: 2, date: '2025-11-15', type: 'buy', price: 58.50, amount: 300, fee: 8, totalAmount: 17558 },
            { id: 3, date: '2025-12-01', type: 'sell', price: 70.00, amount: 100, fee: 5, totalAmount: 6995 }
          ]
        },
        {
          code: '600519',
          name: '贵州茅台',
          group: 'holding',
          trades: [
            { id: 1, date: '2025-11-01', type: 'buy', price: 1500.00, amount: 100, fee: 50, totalAmount: 150050 }
          ]
        }
      ],
      currentStockCode: '002460',
      version: '1.0.0'
    };
    localStorage.setItem('stockProfitCalculator_local', JSON.stringify(testData));
    console.log('测试数据已注入 localStorage (stockProfitCalculator_local)');
  });
  
  // 打开页面
  await page.goto('http://localhost:8888/index.html');
  await page.waitForTimeout(3000);
  
  // 滚动到股票列表区域
  await page.evaluate(() => {
    const stockList = document.querySelector('#holdingStocksList');
    if (stockList) {
      stockList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await page.waitForTimeout(1000);
  
  // 截图汇总页面
  await page.screenshot({ path: 'screenshot-overview.png', fullPage: false });
  console.log('汇总页面截图已保存: screenshot-overview.png');
  
  // 等待股票列表加载
  await page.waitForTimeout(2000);
  
  // 点击第一个股票卡片进入详情页
  const stockCard = await page.locator('.stock-card-v2').first();
  console.log('找到股票卡片:', await stockCard.isVisible());
  
  if (await stockCard.isVisible()) {
    await stockCard.click();
    await page.waitForTimeout(3000);
    
    // 检查是否进入详情页
    const detailPage = await page.locator('#detailPage');
    const isDetailVisible = await detailPage.isVisible();
    console.log('详情页可见:', isDetailVisible);
    
    // 检查标题栏行情区域
    const headerQuote = await page.locator('#headerQuote');
    const isHeaderQuoteVisible = await headerQuote.isVisible();
    console.log('标题栏行情区域可见:', isHeaderQuoteVisible);
    
    // 截取整个页面顶部区域（标题栏）
    await page.screenshot({ path: 'screenshot-detail-header.png', fullPage: false });
    console.log('详情页截图已保存: screenshot-detail-header.png');
    
    // 专门截取标题栏行情区域
    if (isHeaderQuoteVisible) {
      await headerQuote.screenshot({ path: 'screenshot-header-quote.png' });
      console.log('标题栏行情区域截图已保存: screenshot-header-quote.png');
    }
  } else {
    console.log('未找到股票卡片');
  }
  
  // 等待用户查看
  console.log('测试完成，5秒后关闭浏览器');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();

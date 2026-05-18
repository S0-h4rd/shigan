import { test } from '@playwright/test'

test('screenshot key flows', async ({ page }) => {
  await page.goto('http://localhost:5174')
  await page.waitForLoadState('networkidle')
  
  // 1. 首页时间线
  await page.screenshot({ path: 'e2e/screenshots/01-timeline.png', fullPage: true })
  
  // 2. 报告视图
  await page.getByText('报告').click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'e2e/screenshots/02-report.png', fullPage: true })
  
  // 3. 返回时间线，开始任务
  await page.getByText('时间线').click()
  await page.getByRole('button', { name: '深度工作' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'e2e/screenshots/03-active-task.png', fullPage: true })
  
  // 4. 打断流程
  await page.getByRole('button', { name: '有事插入' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'e2e/screenshots/04-interrupt-input.png', fullPage: true })
  
  // 5. 添加计划面板
  await page.getByRole('button', { name: '取消打断' }).click()
  await page.getByRole('button', { name: '完成' }).click()
  await page.getByRole('button', { name: '+ 添加计划' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'e2e/screenshots/05-plan-panel.png', fullPage: true })
})

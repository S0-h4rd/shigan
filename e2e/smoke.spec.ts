import { test, expect } from '@playwright/test'

test.describe('端到端验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174')
    await page.waitForLoadState('networkidle')
  })

  test('首页加载正常', async ({ page }) => {
    await expect(page).toHaveTitle('时间感知')
    await expect(page.getByText('今天')).toBeVisible()
    await expect(page.getByText('报告')).toBeVisible()
  })

  test('时间线视图渲染正常', async ({ page }) => {
    await expect(page.getByText('今日时间线')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ 添加计划' })).toBeVisible()
    // mockSchedule 中有任务，应该显示任务块
    await expect(page.getByText('晨会')).toBeVisible()
  })

  test('快捷预设开始任务', async ({ page }) => {
    await page.getByRole('button', { name: '深度工作' }).click()
    // 任务开始后 ActiveTaskBar 显示（底部固定栏）
    const taskBar = page.locator('.fixed').filter({ hasText: '深度工作' }).first()
    await expect(taskBar).toBeVisible()
    await expect(taskBar.getByText('剩余')).toBeVisible()
    await expect(taskBar.getByText('已用')).toBeVisible()
    await expect(taskBar.getByRole('button', { name: '有事插入' })).toBeVisible()
    await expect(taskBar.getByRole('button', { name: '完成' })).toBeVisible()
  })

  test('完成任务', async ({ page }) => {
    await page.getByRole('button', { name: '深度工作' }).click()
    await page.getByRole('button', { name: '完成' }).click()
    // 完成后 ActiveTaskBar 消失，回到 QuickStart
    await expect(page.getByPlaceholder('在做什么？')).toBeVisible()
  })

  test('添加计划任务面板', async ({ page }) => {
    await page.getByRole('button', { name: '+ 添加计划' }).click()
    await expect(page.getByPlaceholder('计划做什么？')).toBeVisible()
    await expect(page.getByRole('button', { name: '添加计划任务' })).toBeVisible()
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible()
  })

  test('视图切换到报告', async ({ page }) => {
    await page.getByText('报告').click()
    // mockSchedule 有任务，报告页显示数据
    await expect(page.getByText('计划时长')).toBeVisible()
    await expect(page.getByText('实际时长')).toBeVisible()
    await page.getByText('时间线').click()
    await expect(page.getByText('今日时间线')).toBeVisible()
  })

  test('自定义任务输入', async ({ page }) => {
    await page.getByPlaceholder('在做什么？').fill('测试任务')
    await page.getByRole('button', { name: '开始', exact: true }).click()
    // ActiveTaskBar 应显示新任务
    const taskBar = page.locator('.fixed').filter({ hasText: '测试任务' }).first()
    await expect(taskBar).toBeVisible()
  })

  test('打断流程', async ({ page }) => {
    await page.getByRole('button', { name: '深度工作' }).click()
    await page.getByRole('button', { name: '有事插入' }).click()
    await expect(page.getByPlaceholder('发生了什么？')).toBeVisible()
    await page.getByPlaceholder('发生了什么？').fill('紧急会议')
    // 打断面板的"开始"按钮（使用 aria-label）
    await page.getByRole('button', { name: '开始打断任务' }).click()
    // ActiveTaskBar 应显示打断任务
    const taskBar = page.locator('.fixed').filter({ hasText: '紧急会议' }).first()
    await expect(taskBar).toBeVisible()
  })

  test('事后补录空白时间段', async ({ page }) => {
    // Click on a blank slot (first one around 6:00)
    const blankSlot = page.locator('[aria-label^="未记录时间段"]').first()
    await blankSlot.click()
    await expect(page.getByPlaceholder('这段时间在做什么？')).toBeVisible()
    await page.getByPlaceholder('这段时间在做什么？').fill('晨跑')
    await page.getByRole('button', { name: '记录任务' }).click()
    await expect(page.getByText('晨跑')).toBeVisible()
  })
})

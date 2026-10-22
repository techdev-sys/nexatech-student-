const { chromium } = require('../frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../deliverables/sales-kit/screenshots');
fs.mkdirSync(outDir, { recursive: true });

async function screenshot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

async function clickNav(page, label) {
  const button = page.getByRole('button', { name: label, exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForTimeout(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' });
  const access = page.locator('#approved-demo');
  await access.locator('input[type="email"]').fill('admin@greenwood.ac.zw');
  await access.locator('input[type="password"]').fill('password');
  await access.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByText('System Online').waitFor({ timeout: 15000 });

  await page.getByText('Total Students', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '01-dashboard.png');

  await clickNav(page, 'Students');
  await page.getByText('Takudzwa Moyo', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '02-student-register.png');

  await clickNav(page, 'Fast Marks');
  await page.getByRole('heading', { name: 'Marks Entry', exact: true }).last().waitFor();
  const selects = page.locator('main select');
  await selects.nth(0).selectOption({ label: 'Form 3A' });
  await selects.nth(2).selectOption('1');
  await page.locator('main input[type="text"]').fill('2026');
  await selects.nth(1).selectOption({ label: 'Mathematics' });
  await page.waitForFunction(() => {
    const all = document.querySelectorAll('main select');
    return all.length > 3 && all[3].options.length > 1;
  });
  await selects.nth(3).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Load Students', exact: true }).click();
  await page.locator('main input[type="number"]').first().waitFor({ timeout: 10000 });
  await screenshot(page, '03-fast-marks.png');

  await clickNav(page, 'Class Results');
  const resultControls = page.locator('main select');
  await resultControls.nth(0).selectOption({ label: 'Form 3A' });
  await resultControls.nth(1).selectOption('1');
  await page.locator('main input[type="text"]').fill('2026');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await page.getByText('Takudzwa Moyo', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '04-class-results.png');

  await clickNav(page, 'Report Cards');
  const reportControls = page.locator('main select');
  await reportControls.nth(0).selectOption({ label: 'Takudzwa Moyo' });
  await reportControls.nth(1).selectOption('1');
  await page.locator('main input[type="text"]').fill('2026');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByText('Official Academic Report Card', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '05-report-card.png');

  await clickNav(page, 'Finance Dashboard');
  await page.getByRole('heading', { name: 'Financial Dashboard', exact: true }).waitFor({ timeout: 15000 });
  await page.getByText('Net Cash Position', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '05-finance-dashboard.png');

  await clickNav(page, 'Attendance');
  const attendanceSelects = page.locator('main select');
  await page.locator('main input[type="date"]').fill('2026-05-19');
  await attendanceSelects.nth(0).selectOption({ label: 'Form 3A' });
  await page.waitForFunction(() => {
    const all = document.querySelectorAll('main select');
    return all.length > 1 && all[1].options.length > 1;
  });
  await attendanceSelects.nth(1).selectOption({ label: 'Mathematics' });
  await page.getByText('Takudzwa Moyo', { exact: true }).waitFor({ timeout: 15000 });
  await screenshot(page, '06-attendance.png');

  await browser.close();
  console.log(outDir);
})().catch(error => {
  console.error(error);
  process.exit(1);
});

const { chromium } = require('../frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../deliverables/sales-kit/screenshots');
fs.mkdirSync(outDir, { recursive: true });

async function save(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

async function nav(page, label) {
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

  await nav(page, 'Report Cards');
  const reportControls = page.locator('main select');
  await reportControls.nth(0).selectOption({ label: 'Takudzwa Moyo' });
  await reportControls.nth(1).selectOption('1');
  await page.locator('main input[type="text"]').fill('2026');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByText('Official Academic Report Card', { exact: true }).waitFor({ timeout: 15000 });
  await save(page, '05-report-card.png');

  await nav(page, 'Comms Dashboard');
  await page.getByRole('heading', { name: 'Communications Dashboard', exact: true }).waitFor({ timeout: 15000 });
  await save(page, '07-communications-dashboard.png');

  await nav(page, 'SMS Broadcast');
  await page.getByRole('heading', { name: 'SMS Broadcast', exact: true }).last().waitFor({ timeout: 15000 });
  await page.getByRole('radio', { name: /All Parents Parents with/ }).check();
  await page.locator('main textarea').fill('Sports update: The U17 football match starts Friday at 15:00. Players should report by 14:15. Exam reminders and urgent notices can use the same approved channel.');
  await save(page, '09-sms-broadcast.png');

  await nav(page, 'Announcements');
  await page.getByRole('heading', { name: 'Announcements', exact: true }).last().waitFor({ timeout: 15000 });
  await save(page, '08-announcements.png');

  await page.getByRole('button', { name: '+ New Announcement', exact: true }).click();
  await page.getByRole('heading', { name: 'New Announcement', exact: true }).waitFor({ timeout: 15000 });
  const announcementModal = page.getByRole('heading', { name: 'New Announcement', exact: true })
    .locator('xpath=ancestor::div[contains(@class,"fixed")]');
  await announcementModal.locator('input[type="text"]').first().fill('Inter-school athletics programme');
  await announcementModal.locator('textarea').fill('The athletics programme, transport times, team lists and any weather changes will be published here for staff, learners and parents.');
  await announcementModal.locator('select').selectOption('all');
  await save(page, '10-school-news-draft.png');

  await browser.close();
  console.log(outDir);
})().catch(error => {
  console.error(error);
  process.exit(1);
});

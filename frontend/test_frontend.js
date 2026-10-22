const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const SS_DIR = '/tmp/screenshots';
fs.mkdirSync(SS_DIR, { recursive: true });

async function ss(page, name) {
  const p = path.join(SS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));

  const results = [];
  const pass = (msg) => { console.log(`  ✅ ${msg}`); results.push({ ok: true, msg }); };
  const fail = (msg) => { console.log(`  ❌ ${msg}`); results.push({ ok: false, msg }); };
  const probe = (msg) => { console.log(`  🔍 ${msg}`); results.push({ ok: null, msg }); };

  // ── 1. Login page loads ────────────────────────────────────────────────────
  console.log('\n[1] Login page');
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await ss(page, '01-login');
  const loginHeading = await page.locator('h1, h2').first().textContent();
  loginHeading.includes('School Operations Platform') ? pass(`Heading: "${loginHeading}"`) : fail(`Bad heading: "${loginHeading}"`);

  // ── 2. Login with bad credentials ─────────────────────────────────────────
  console.log('\n[2] Bad credentials probe');
  await page.fill('input[type="email"]', 'wrong@test.com');
  await page.fill('input[type="password"]', 'badpass');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await ss(page, '02-bad-login');
  const errVisible = await page.locator('text=/incorrect|failed|invalid/i').isVisible().catch(() => false);
  errVisible ? probe('Bad-login error shown') : probe('No visible error (may be toast)');

  // ── 3. Successful login → Dashboard ───────────────────────────────────────
  console.log('\n[3] Successful login');
  await page.fill('input[type="email"]', 'admin@greenwood.ac.zw');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await ss(page, '03-dashboard');
  const hasSidebar = await page.locator('text=/Students|Dashboard/').first().isVisible().catch(() => false);
  hasSidebar ? pass('Dashboard rendered with sidebar nav') : fail('Sidebar not found after login');
  const hasStatCard = await page.locator('text=/Students|Billed|Collected|Outstanding/i').first().isVisible().catch(() => false);
  hasStatCard ? pass('Stat cards visible') : fail('Stat cards missing');

  // ── 4. Navigate to Students ────────────────────────────────────────────────
  console.log('\n[4] Students page');
  await page.locator('button:has-text("Students")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '04-students');
  const tableVisible = await page.locator('table').isVisible().catch(() => false);
  tableVisible ? pass('Students table rendered') : fail('Students table not found');
  const studentCount = await page.locator('tbody tr').count();
  studentCount > 0 ? pass(`${studentCount} student rows visible`) : fail('No student rows');

  // ── 5. Search students ─────────────────────────────────────────────────────
  console.log('\n[5] Student search');
  const searchInput = page.locator('input[type="search"]');
  await searchInput.fill('Rudo');
  await page.waitForTimeout(700); // debounce
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await ss(page, '05-student-search');
  const searchRows = await page.locator('tbody tr').count();
  probe(`Search "Rudo" → ${searchRows} row(s)`);
  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(500);

  // ── 6. Open student profile drawer ────────────────────────────────────────
  console.log('\n[6] Student profile drawer');
  await page.locator('tbody tr').first().click();
  await page.waitForTimeout(1000);
  await ss(page, '06-student-drawer');
  const drawerOpen = await page.locator('text=/Profile|Grades|Attendance|Invoices/').isVisible().catch(() => false);
  drawerOpen ? pass('Profile drawer opened with tabs') : fail('Drawer did not open');
  // Close drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ── 7. Navigate to Attendance ──────────────────────────────────────────────
  console.log('\n[7] Attendance page');
  await page.locator('button:has-text("Attendance")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '07-attendance');
  const classDropdown = await page.locator('select').first().isVisible().catch(() => false);
  classDropdown ? pass('Attendance filter dropdowns visible') : fail('Attendance dropdowns missing');
  // Select a class
  const classOptions = await page.locator('select').first().locator('option').count();
  probe(`Class dropdown has ${classOptions} option(s)`);
  if (classOptions > 1) {
    await page.locator('select').first().selectOption({ index: 1 });
    await page.waitForTimeout(600);
    const subjectOptions = await page.locator('select').nth(1).locator('option').count();
    probe(`Subject dropdown has ${subjectOptions} option(s) after class select`);
    if (subjectOptions > 1) {
      await page.locator('select').nth(1).selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await ss(page, '07b-attendance-register');
      const registerRows = await page.locator('tbody tr').count();
      registerRows > 0 ? pass(`Register loaded: ${registerRows} student rows`) : fail('No students in register');
    }
  }

  // ── 8. Grade Matrix ────────────────────────────────────────────────────────
  console.log('\n[8] Grade Matrix');
  await page.locator('button:has-text("Grade Matrix")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '08-grade-matrix');
  const matrixFilters = await page.locator('text=/Class|Subject|Term|Year/').first().isVisible().catch(() => false);
  matrixFilters ? pass('Grade matrix filter bar visible') : fail('Grade matrix filters missing');

  // ── 9. Invoice / Billing ───────────────────────────────────────────────────
  console.log('\n[9] Invoices');
  await page.locator('button:has-text("Invoices")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '09-invoices');
  const summaryCards = await page.locator('text=/Billed|Paid|Outstanding/i').count();
  summaryCards >= 2 ? pass(`${summaryCards} billing summary cards visible`) : fail(`Only ${summaryCards} summary cards`);

  // ── 10. Fee Structures ─────────────────────────────────────────────────────
  console.log('\n[10] Fee Structures');
  await page.locator('button:has-text("Fee Structures")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '10-fee-structures');
  const feeTable = await page.locator('table, text=/No fee structures/').first().isVisible().catch(() => false);
  feeTable ? pass('Fee structures page loaded') : fail('Fee structures page failed');

  // ── 11. Users page ─────────────────────────────────────────────────────────
  console.log('\n[11] Users page');
  await page.locator('button:has-text("Staff")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '11-users');
  const usersTable = await page.locator('table, text=/No users/').first().isVisible().catch(() => false);
  usersTable ? pass('Users page loaded') : fail('Users page failed');

  // ── 12. Grading Systems ────────────────────────────────────────────────────
  console.log('\n[12] Grading Systems');
  await page.locator('button:has-text("Grading")').last().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '12-grading-systems');
  const gsVisible = await page.locator('text=/Grading System|Default/i').first().isVisible().catch(() => false);
  gsVisible ? pass('Grading systems page loaded') : fail('Grading systems page failed');

  // ── 13. Subjects ────────────────────────────────────────────────────────────
  console.log('\n[13] Subjects');
  await page.locator('button:has-text("Subjects")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '13-subjects');
  const subjectsLoaded = await page.locator('table, text=/No subjects/').first().isVisible().catch(() => false);
  subjectsLoaded ? pass('Subjects page loaded') : fail('Subjects page failed');

  // ── 14. Assessments ─────────────────────────────────────────────────────────
  console.log('\n[14] Assessments');
  await page.locator('button:has-text("Assessments")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await ss(page, '14-assessments');
  const assessmentsLoaded = await page.locator('table, text=/No assessments/').first().isVisible().catch(() => false);
  assessmentsLoaded ? pass('Assessments page loaded') : fail('Assessments page failed');

  // ── 15. Add student modal ───────────────────────────────────────────────────
  console.log('\n[15] Add Student modal');
  await page.locator('button:has-text("Students")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Add Student")').click();
  await page.waitForTimeout(600);
  await ss(page, '15-add-student-modal');
  const modalOpen = await page.locator('text=/Add Student|First name/').first().isVisible().catch(() => false);
  modalOpen ? pass('Add student modal opens') : fail('Add student modal did not open');
  // Close it
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ── 16. Logout ──────────────────────────────────────────────────────────────
  console.log('\n[16] Logout');
  await page.locator('button:has-text("Sign out")').click();
  await page.waitForTimeout(1000);
  await ss(page, '16-logout');
  const backToLogin = await page.locator('input[type="email"]').isVisible().catch(() => false);
  backToLogin ? pass('Logout returns to login page') : fail('Login page not shown after logout');

  // ── Summary ─────────────────────────────────────────────────────────────────
  await browser.close();

  console.log('\n' + '─'.repeat(60));
  const passed = results.filter(r => r.ok === true).length;
  const failed = results.filter(r => r.ok === false).length;
  const probes = results.filter(r => r.ok === null).length;
  console.log(`Results: ${passed} passed, ${failed} failed, ${probes} probes`);

  if (errors.length) {
    console.log('\nConsole errors captured:');
    errors.slice(0, 10).forEach(e => console.log('  ⚠️', e.substring(0, 120)));
  } else {
    console.log('\nNo console errors.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

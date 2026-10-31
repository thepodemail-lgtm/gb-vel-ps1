import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = 'https://thepodemail-lgtm.github.io/gb-vel-ps1/';
const shots = '/workspace/ps1/shots';
fs.mkdirSync(shots, { recursive: true });

const errors = [];
const logs = [];

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
  ],
});

const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
page.on('console', msg => {
  const t = msg.type();
  const text = msg.text();
  logs.push(`[${t}] ${text}`);
  if (t === 'error') errors.push(text);
});
page.on('pageerror', err => errors.push(String(err)));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(shots, '01-title.png') });

// Start game
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(shots, '02-play.png') });

// Walk forward/back/strafe and attack
for (const key of ['KeyW', 'KeyW', 'KeyA', 'KeyD', 'KeyS']) {
  await page.keyboard.down(key);
  await page.waitForTimeout(400);
  await page.keyboard.up(key);
}
await page.keyboard.press('KeyZ');
await page.waitForTimeout(200);
await page.keyboard.press('KeyZ');
await page.waitForTimeout(500);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyW');
await page.keyboard.press('KeyJ');
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(shots, '03-walk-attack.png') });

// Block briefly
await page.keyboard.down('KeyX');
await page.waitForTimeout(400);
await page.keyboard.up('KeyX');

const canvasOk = await page.evaluate(() => {
  const c = document.getElementById('game');
  if (!c) return { ok: false, reason: 'no canvas' };
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  // canvas already used by three; just check size and that THREE exists
  return {
    ok: typeof THREE !== 'undefined',
    w: c.width,
    h: c.height,
    three: typeof THREE !== 'undefined',
    titleHidden: getComputedStyle(document.getElementById('title-overlay')).display === 'none',
    hud: document.getElementById('hud')?.textContent || '',
  };
});

await browser.close();

const report = { url: URL, errors, canvasOk, logCount: logs.length, sampleLogs: logs.slice(0, 30) };
fs.writeFileSync('/workspace/ps1/verify-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 2;

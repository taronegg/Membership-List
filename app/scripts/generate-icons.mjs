// Erzeugt die PWA-Icons aus scripts/icon-template.html neu.
// Ausführen mit: node scripts/generate-icons.mjs
// Braucht Playwright (bereits als devDependency vorhanden).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(__dirname, 'icon-template.html');
const outDir = path.join(__dirname, '..', 'public', 'icons');

const TARGETS = [
  { file: 'icon-192.png', size: 192, fontRatio: 0.62 },
  { file: 'icon-512.png', size: 512, fontRatio: 0.62 },
  { file: 'icon-512-maskable.png', size: 512, fontRatio: 0.42 },
  { file: 'apple-touch-icon.png', size: 180, fontRatio: 0.62 },
];

// Auf manchen Sandboxes (z.B. dieser Entwicklungsumgebung) liegt der
// vorinstallierte Chromium unter einem festen Pfad statt dem von Playwright
// selbst verwalteten Standardpfad -- dort explizit darauf zeigen, sonst den
// normalen `npx playwright install`-Browser nutzen.
const sandboxChromium = '/opt/pw-browsers/chromium';
const launchOptions = { args: ['--no-proxy-server', '--proxy-bypass-list=*'] };
if (fs.existsSync(sandboxChromium)) launchOptions.executablePath = sandboxChromium;

const browser = await chromium.launch(launchOptions);

for (const { file, size, fontRatio } of TARGETS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.goto(`file://${templatePath}`, { waitUntil: 'load' });
  await page.evaluate(
    ({ size, fontRatio }) => {
      const canvas = document.getElementById('canvas');
      const mark = document.getElementById('mark');
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      mark.style.fontSize = `${Math.round(size * fontRatio)}px`;
    },
    { size, fontRatio },
  );
  await page.waitForTimeout(150); // Google Font laden lassen
  const canvas = await page.$('#canvas');
  await canvas.screenshot({ path: path.join(outDir, file) });
  await page.close();
  console.log(`geschrieben: public/icons/${file}`);
}

await browser.close();

// Render the front page (index.html) to the entry PNG.
//
// The page is laid out at exactly 1024x1024 CSS pixels. It is captured in
// headless Chromium at deviceScaleFactor 2 (a 2048x2048 raster), then
// downscaled to 1024x1024 with the browser's own canvas resampler — the
// 2x capture keeps the small print smooth instead of aliased. A 300px
// preview is written beside it: that is roughly the size the judge reads
// the page at, so it is the honest legibility check.
//
//   node render.mjs            writes entry-2x.png, entry.png, entry-300.png
//
// Puppeteer is borrowed from the workspace's shared screenshot tooling;
// the entry itself (main.ts) needs nothing but Node's standard library.

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire('/home/hatch/workspace/shot-tools/');
const puppeteer = require('puppeteer');

const here = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + join(here, 'index.html');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});

async function downscale(page, pngBuffer, width, height) {
  const dataUrl = 'data:image/png;base64,' + pngBuffer.toString('base64');
  const out = await page.evaluate(
    async (src, w, h) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    dataUrl,
    width,
    height,
  );
  return Buffer.from(out, 'base64');
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 2 });
  await page.goto(PAGE, { waitUntil: 'networkidle0' });
  const full = await page.screenshot({ type: 'png' });
  writeFileSync(join(here, 'entry-2x.png'), full);
  writeFileSync(join(here, 'entry.png'), await downscale(page, full, 1024, 1024));
  writeFileSync(join(here, 'entry-300.png'), await downscale(page, full, 300, 300));
  console.log('rendered entry-2x.png, entry.png (1024x1024), entry-300.png');
} finally {
  await browser.close();
}

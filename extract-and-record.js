#!/usr/bin/env node
// extract-and-record.js
//
// 1. Abre la página de mitelefe.com/telefe-en-vivo en un browser
//    headless (Playwright) — hace falta porque el player se arma con
//    JavaScript del lado del cliente, no está en el HTML crudo.
// 2. Encuentra el iframe del player (proveedor: mdstrm.com)
// 3. Pide la configuración del player (con el Referer correcto) para
//    conseguir la URL real del stream HLS (.m3u8)
// 4. Cierra el browser y graba con ffmpeg esa URL durante
//    DURATION_MINUTES, directo a un .mp4 — solo el video de la
//    transmisión, no la pantalla ni el browser.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PAGE_URL = process.env.PAGE_URL || 'https://www.mitelefe.com/telefe-en-vivo';
const DURATION_MINUTES = parseFloat(process.env.DURATION_MINUTES || '90');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'grabaciones');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

async function encontrarIframeUrl() {
  console.log(`Abriendo ${PAGE_URL} en un browser headless para encontrar el player...`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // El iframe de mdstrm se inyecta con JS después de la carga inicial.
    const frameHandle = await page.waitForSelector('iframe[src*="mdstrm.com/live-stream/"]', {
      timeout: 30000,
    });
    const iframeUrl = await frameHandle.getAttribute('src');
    if (!iframeUrl) {
      throw new Error('Encontré el iframe pero no tiene atributo src.');
    }
    return iframeUrl;
  } finally {
    await browser.close();
  }
}

async function main() {
  const iframeUrl = await encontrarIframeUrl();
  console.log(`Iframe del player: ${iframeUrl}`);

  const jsonUrl = iframeUrl.replace(/(\/live-stream\/[a-z0-9]+)(\?)/i, '$1.json$2');
  console.log(`Pidiendo configuración: ${jsonUrl}`);

  const cfgRes = await fetch(jsonUrl, {
    headers: { Referer: PAGE_URL, 'User-Agent': UA },
  });
  if (!cfgRes.ok) {
    throw new Error(
      `mdstrm.com rechazó el pedido de configuración (HTTP ${cfgRes.status}). Puede ser un bloqueo geográfico, de IP, o que cambió el esquema del token.`
    );
  }
  const cfg = await cfgRes.json();
  const hlsUrl = cfg && cfg.src && cfg.src.hls;
  if (!hlsUrl) {
    throw new Error('La configuración de mdstrm no trae una URL "hls". Puede haber cambiado el formato de respuesta.');
  }
  console.log(`HLS URL: ${hlsUrl}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(OUT_DIR, `telefe-vivo-${timestamp}.mp4`);
  const durationSeconds = Math.max(1, Math.round(DURATION_MINUTES * 60));

  console.log(`Grabando ${DURATION_MINUTES} minutos → ${outFile}`);

  const ffmpegArgs = [
    '-y',
    '-headers', `Referer: ${PAGE_URL}\r\n`,
    '-i', hlsUrl,
    '-t', String(durationSeconds),
    '-c', 'copy',
    '-bsf:a', 'aac_adtstoasc',
    outFile,
  ];

  const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
  if (result.status !== 0 || !fs.existsSync(outFile)) {
    throw new Error(`ffmpeg terminó con error (código ${result.status}). Revisar si el stream es accesible desde acá.`);
  }

  const sizeMB = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
  console.log(`Listo: ${outFile} (${sizeMB} MB)`);
  console.log(`OUT_FILE=${outFile}`);

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(
      summaryFile,
      `\n### ✅ Grabación OK\n\n- HLS: \`${hlsUrl}\`\n- Archivo: \`${path.basename(outFile)}\` (${sizeMB} MB)\n`
    );
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(
      summaryFile,
      `\n### ❌ Error en la grabación\n\n\`\`\`\n${err.message}\n\`\`\`\n`
    );
  }
  process.exit(1);
});

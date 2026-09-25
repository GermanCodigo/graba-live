#!/usr/bin/env node
// extract-and-record.js
//
// 1. Descarga la página de mitelefe.com/telefe-en-vivo
// 2. Encuentra el iframe del player (proveedor: mdstrm.com)
// 3. Pide la configuración del player (con el Referer correcto) para
//    conseguir la URL real del stream HLS (.m3u8)
// 4. Graba con ffmpeg esa URL durante DURATION_MINUTES, directo a un
//    .mp4 — solo el video de la transmisión, sin browser ni pantalla.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PAGE_URL = process.env.PAGE_URL || 'https://www.mitelefe.com/telefe-en-vivo';
const DURATION_MINUTES = parseFloat(process.env.DURATION_MINUTES || '90');
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'grabaciones');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

async function main() {
  console.log(`Descargando página: ${PAGE_URL}`);
  const pageRes = await fetch(PAGE_URL, { headers: { 'User-Agent': UA } });
  if (!pageRes.ok) {
    throw new Error(`No pude descargar la página (HTTP ${pageRes.status})`);
  }
  const html = await pageRes.text();

  const iframeMatch = html.match(/https:\/\/mdstrm\.com\/live-stream\/[a-z0-9]+\?[^"'<>\s]+/i);
  if (!iframeMatch) {
    throw new Error(
      'No encontré el iframe de mdstrm.com en la página. Puede que Telefe haya cambiado el sitio o el proveedor de streaming.'
    );
  }
  const iframeUrl = iframeMatch[0];
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
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});

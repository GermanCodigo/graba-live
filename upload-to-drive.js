#!/usr/bin/env node
// upload-to-drive.js
// Sube los .mp4 grabados a una carpeta de Google Drive usando una
// cuenta de servicio (sin login interactivo). Si no está configurada
// todavía (faltan los secrets), no falla el workflow: solo avisa y
// deja los archivos disponibles como "artifact" de la corrida.

const fs = require('fs');
const path = require('path');

async function main() {
  const keyBase64 = process.env.DRIVE_SA_KEY_B64;
  const folderId = process.env.DRIVE_FOLDER_ID;

  if (!keyBase64 || !folderId) {
    console.log(
      'Google Drive todavía no está configurado (faltan los secrets DRIVE_SA_KEY_B64 / DRIVE_FOLDER_ID) — se omite la subida. La grabación queda como "artifact" de esta corrida en GitHub Actions.'
    );
    return;
  }

  // Import diferido: si googleapis no está instalado y Drive no está
  // configurado, no queremos que falle igual por una dependencia faltante.
  const { google } = require('googleapis');

  const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const dir = path.join(__dirname, 'grabaciones');
  if (!fs.existsSync(dir)) {
    console.log('No hay carpeta de grabaciones, nada para subir.');
    return;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mp4'));
  if (files.length === 0) {
    console.log('No hay archivos .mp4 para subir.');
    return;
  }

  for (const f of files) {
    const filePath = path.join(dir, f);
    console.log(`Subiendo ${f} a Drive...`);
    const res = await drive.files.create({
      requestBody: { name: f, parents: [folderId] },
      media: { mimeType: 'video/mp4', body: fs.createReadStream(filePath) },
      fields: 'id, webViewLink',
    });
    console.log(`Subido: ${res.data.webViewLink}`);
  }
}

main().catch((err) => {
  console.error('Error subiendo a Drive:', err.message);
  process.exit(1);
});

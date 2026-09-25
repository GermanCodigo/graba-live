# graba-live

Graba automáticamente la transmisión en vivo de [Telefe](https://www.mitelefe.com/telefe-en-vivo)
y la sube a Google Drive. Corre 100% en GitHub Actions — no depende de
que ninguna computadora esté prendida.

## Cómo funciona

1. Un workflow de GitHub Actions (`.github/workflows/graba-live.yml`)
   corre cada 5 minutos.
2. En cada corrida, mira `config.json`: si `enabled` es `true`, hoy
   está en `daysOfWeek`, y la hora actual en Argentina coincide con
   `hour`/`minute`, arranca a grabar. Si no, no hace nada (corrida
   gratis e instantánea).
3. `extract-and-record.js` entra a la página de Telefe, encuentra la
   URL real del video (no la página completa, solo el stream) y lo
   graba con `ffmpeg` durante `durationMinutes`.
4. `upload-to-drive.js` sube el `.mp4` resultante a la carpeta de
   Google Drive configurada. La grabación también queda como
   "artifact" de la corrida en GitHub Actions por 14 días, como
   respaldo.

## `config.json`

```json
{
  "pageUrl": "https://www.mitelefe.com/telefe-en-vivo",
  "durationMinutes": 90,
  "hour": 22,
  "minute": 0,
  "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
  "enabled": true
}
```

- `hour` / `minute`: hora de Argentina (24hs) a la que arranca.
- `daysOfWeek`: `0` domingo, `1` lunes, ... `6` sábado. Sacá los días
  que no querés grabar.
- `enabled`: `false` desactiva todo sin borrar la configuración.

Se puede editar a mano acá en GitHub, o desde el panel de control (ver
más abajo) sin tocar código.

## Grabar ahora, sin esperar el horario

Pestaña **Actions** del repo → "Grabar Telefe en vivo" → **Run
workflow**. Por default fuerza la grabación aunque `config.json` diga
que no corresponde en este momento.

## Configurar Google Drive (opcional, recomendado)

Sin esto, las grabaciones igual se guardan como "artifact" de cada
corrida en GitHub Actions (se pueden descargar desde ahí), pero se
borran a los 14 días. Con Drive configurado, quedan para siempre.

1. Andá a [Google Cloud Console](https://console.cloud.google.com/) →
   creá un proyecto nuevo (gratis).
2. Activá la **Google Drive API** (buscala en el buscador de APIs).
3. **APIs & Services → Credentials → Create Credentials → Service
   account**. Dale cualquier nombre.
4. Entrá a la cuenta de servicio creada → pestaña **Keys** → **Add
   key → Create new key → JSON**. Se descarga un archivo `.json`.
5. Copiá el **email** de la cuenta de servicio (termina en
   `.iam.gserviceaccount.com`).
6. En Google Drive, creá (o elegí) la carpeta donde querés que se
   guarden las grabaciones, compartila con ese email (como si fuera
   una persona más), dándole permiso de **Editor**.
7. Copiá el **ID de esa carpeta** (está en la URL:
   `drive.google.com/drive/folders/ESTE-ES-EL-ID`).
8. En el repo de GitHub: **Settings → Secrets and variables → Actions
   → New repository secret**, creá dos:
   - `DRIVE_SA_KEY_B64`: el contenido del `.json` del paso 4,
     convertido a base64 (`base64 -i archivo.json` en Mac/Linux, o
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes("archivo.json"))`
     en PowerShell).
   - `DRIVE_FOLDER_ID`: el ID del paso 7.

Listo — la próxima grabación ya sube sola a esa carpeta.

## Panel de control

Hay un panel web (fuera de este repo, en un artifact de Claude) para
cambiar el link/horario/días/duración y disparar "grabar ahora" sin
entrar a GitHub directamente. Pide un token de acceso personal de
GitHub con permisos de `Contents` y `Actions` sobre este repo.

# Runner en tu Windows 10

Igual que en la Mac: esto deja tu PC con Windows lista para hacer las
grabaciones reales cuando GitHub Actions se lo pida (programado, o con
"grabar ahora"), sin que necesites dejar nada abierto — corre como
Servicio de Windows, incluso sin usuario logueado.

## 0. Requisitos previos (una sola vez)

1. **Git for Windows**: si no lo tenés, descargalo de
   https://git-scm.com/download/win e instalalo con las opciones por
   defecto. Esto le da al workflow el `bash` que necesita para correr.
2. **PowerShell como Administrador**: los pasos de abajo necesitan
   permisos de administrador (para instalar el Servicio de Windows).
   Buscá "PowerShell", click derecho → "Ejecutar como administrador".

## 1. Conseguir el token de registro (una sola vez por máquina)

1. Andá a: https://github.com/GermanCodigo/graba-live/settings/actions/runners/new
2. Elegí **Windows** y arquitectura **x64**.
3. GitHub te muestra un comando con `--token AXXXXX...`. Copiá solo ese
   valor. Vence en ~1 hora, así que copialo justo antes de correr el
   script del paso 2.

## 2. Instalar y registrar el runner

En la PowerShell de administrador, andá a la carpeta del repo (donde
está este archivo) y corré:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install-runner-windows.ps1 -Token "TU_TOKEN_AQUI"
```

El script:

- Revisa si tenés `ffmpeg` en el PATH; si no, intenta instalarlo con
  `winget` (viene con Windows 10/11 actualizado). Si tu PC no tiene
  `winget`, te va a avisar y tenés que instalarlo a mano (ver abajo).
- Descarga la última versión del runner de GitHub Actions para
  Windows x64.
- Lo registra contra este repo con el nombre `windows-de-german`.
- Lo instala como **Servicio de Windows**, para que arranque solo con
  la PC (sin necesitar que ningún usuario esté logueado) y siga
  corriendo en segundo plano.

Al terminar, deberías ver el runner como **Idle** (en verde) en:
https://github.com/GermanCodigo/graba-live/settings/actions/runners

### Si `winget` no puede instalar ffmpeg

1. Descargá un build "release full" desde https://www.gyan.dev/ffmpeg/builds/
   (archivo `ffmpeg-release-full.7z`).
2. Descomprimilo, por ejemplo en `C:\ffmpeg`.
3. Agregá `C:\ffmpeg\bin` a la variable de entorno `PATH` (Panel de
   Control → Sistema → Configuración avanzada → Variables de entorno).
4. Abrí una PowerShell nueva y confirmá con `ffmpeg -version`.
5. Volvé a correr `.\install-runner-windows.ps1 -Token "..."`.

## 3. Qué necesita tu PC para que esto funcione siempre

- Tiene que estar **prendida** (no hace falta usuario logueado, porque
  quedó instalado como Servicio de Windows). Desactivá la suspensión
  automática si la usás sin supervisión (Configuración → Sistema →
  Energía y suspensión → "Nunca").
- Necesita internet.

## Comandos útiles

Ver estado del servicio (desde el Administrador de servicios, `services.msc`,
buscá algo como "GitHub Actions Runner (...)")  o por PowerShell:

```powershell
Get-Service actions.runner.*
```

Reiniciarlo:

```powershell
Restart-Service actions.runner.*
```

Desinstalarlo (si algún día querés sacarlo), desde la carpeta del runner:

```powershell
.\svc.cmd stop
.\svc.cmd uninstall
.\config.cmd remove --token TU_TOKEN_DE_REMOCION
```
(el token de remoción se pide de la misma pantalla de GitHub del paso 1,
botón "Remove").

## Probar que todo funciona

Con el runner en verde ("Idle"), andá a:
https://github.com/GermanCodigo/graba-live/actions/workflows/graba-live.yml
→ "Run workflow" → dejá "forzar" en `true` y "duración" en `20`
(20 segundos, solo para probar) → **Run workflow**.

En un minuto debería aparecer una corrida nueva y tu PC se pone a
trabajar; al terminar queda un archivo `.mp4` corto como "artifact" de
esa corrida, y actualizado `estado.txt` en el repo.

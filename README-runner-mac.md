# Runner en tu Mac (M5)

Esto deja tu Mac lista para hacer las grabaciones reales (el paso que
GitHub no puede hacer porque el stream bloquea sus servidores). Una vez
instalado, tu Mac queda "escuchando" órdenes de GitHub Actions —cuando
llega la hora programada, o apretás "grabar ahora" en el panel/GitHub—
y hace la grabación localmente, sube a Drive, y avisa. No hace falta
dejar una Terminal abierta ni nada corriendo a la vista: queda como un
servicio en segundo plano.

## 1. Conseguir el token de registro (una sola vez por máquina)

1. Andá a: https://github.com/GermanCodigo/graba-live/settings/actions/runners/new
2. Elegí **macOS** y arquitectura **ARM64**.
3. GitHub te muestra un comando `./config.sh --url ... --token AXXXXX...`.
   Solo necesitás copiar el valor que sigue a `--token` (algo como
   `AXXXX3Y7ABCDEFG...`). Ese token vence en ~1 hora, así que copialo
   recién cuando vayas a correr el script del paso 2.

## 2. Instalar y registrar el runner

Abrí la Terminal en tu Mac, andá a la carpeta del repo, y corré:

```bash
./install-runner-mac.sh TU_TOKEN_AQUI
```

El script:

- Instala `ffmpeg` con Homebrew si no lo tenías.
- Descarga la última versión del runner de GitHub Actions para
  macOS ARM64 (Apple Silicon, como tu M5).
- Lo registra contra este repo con el nombre `mac-de-german` (podés
  cambiarlo editando la variable `RUNNER_NAME` al principio del script).
- Lo instala como servicio (`launchd`) para que arranque solo y siga
  corriendo en segundo plano.

Al terminar, deberías ver el runner como **Idle** (en verde) en:
https://github.com/GermanCodigo/graba-live/settings/actions/runners

## 3. Qué necesita tu Mac para que esto funcione siempre

- Tiene que estar **prendida** y con sesión iniciada (no hace falta
  Terminal abierta, pero sí que la Mac no esté completamente apagada).
  Si la usás con tapa cerrada, activá "Power Nap" o similar en Ajustes
  del Sistema → Batería, para que no se duerma del todo a la hora
  programada. Lo más simple: dejarla enchufada y con la tapa abierta,
  o configurarla para que no se duerma automáticamente.
- Necesita internet.
- Google Chrome no hace falta tenerlo abierto — la grabación no usa tu
  navegador, usa un Chromium invisible que instala el propio runner.

## Comandos útiles

Ver estado del servicio:

```bash
cd actions-runner && ./svc.sh status
```

Reiniciarlo:

```bash
cd actions-runner && ./svc.sh stop && ./svc.sh start
```

Desinstalarlo (si algún día querés sacarlo):

```bash
cd actions-runner && ./svc.sh uninstall
./config.sh remove --token TU_TOKEN_DE_REMOCION
```
(el token de remoción se pide de la misma pantalla de GitHub del paso 1,
botón "Remove").

## Probar que todo funciona

Con el runner en verde ("Idle"), andá a:
https://github.com/GermanCodigo/graba-live/actions/workflows/graba-live.yml
→ "Run workflow" → dejá "forzar" en `true` y "duración" en `20`
(20 segundos, solo para probar) → **Run workflow**.

En un minuto debería aparecer una corrida nueva, tu Mac se pone a
trabajar (vas a ver actividad si abrís el Monitor de Actividad y
buscás `ffmpeg` o `node`), y al terminar queda un archivo `.mp4` corto
como "artifact" de esa corrida, y actualizado `estado.txt` en el repo.

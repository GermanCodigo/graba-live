#!/usr/bin/env node
// check-schedule.js
// Decide si corresponde grabar AHORA, según config.json y la hora
// actual en Argentina (America/Argentina/Buenos_Aires, sin horario
// de verano). Escribe debe_grabar=true/false en $GITHUB_OUTPUT.

const fs = require('fs');
const path = require('path');

const cfg = require(path.join(__dirname, 'config.json'));
const forced = process.env.FORZAR === 'true';

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const parts = fmt.formatToParts(new Date());
const get = (type) => parts.find((p) => p.type === type).value;

const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const today = weekdayMap[get('weekday')];
let hour = parseInt(get('hour'), 10);
if (hour === 24) hour = 0;
const minute = parseInt(get('minute'), 10);

// El workflow corre cada 5 minutos, así que redondeamos a bloques de 5
// para no depender de que el cron dispare justo en el minuto exacto.
const minuteBlock = Math.floor(minute / 5) * 5;
const targetMinuteBlock = Math.floor(cfg.minute / 5) * 5;

const dayMatches = Array.isArray(cfg.daysOfWeek) && cfg.daysOfWeek.includes(today);
const timeMatches = hour === cfg.hour && minuteBlock === targetMinuteBlock;
const debeGrabar = forced || (cfg.enabled && dayMatches && timeMatches);

console.log(
  `Ahora (ART): ${get('weekday')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} | ` +
    `objetivo: días=${JSON.stringify(cfg.daysOfWeek)} hora=${cfg.hour}:${String(cfg.minute).padStart(2, '0')} enabled=${cfg.enabled} | ` +
    `forzado=${forced} -> debe_grabar=${debeGrabar}`
);

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  fs.appendFileSync(githubOutput, `debe_grabar=${debeGrabar}\n`);
}

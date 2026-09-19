// Replays every Network_*.log in logs/ through the parser + combat timer and
// prints a summary. Sanity check that real session data produces sane fights:
// starts ~= ends, no sub-second "fights".
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseLogLine } from '../src/logParser.js';
import { CombatTimer, formatElapsed } from '../src/combatTimer.js';

const logsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'logs');
const files = readdirSync(logsDir).filter((f) => /^Network_.*\.log$/.test(f));
if (files.length === 0) {
  console.log('no Network_*.log found in logs/, skipping');
  process.exit(0);
}

let badDurations = 0;
for (const file of files) {
  const text = readFileSync(path.join(logsDir, file), 'utf8');
  let now = 0;
  const timer = new CombatTimer(() => now);
    let starts = 0;
    let defeats = 0;
    let victories = 0;
    let resets = 0;

  for (const raw of text.split('\n')) {
    if (!raw) continue;
    const p = parseLogLine(raw);
    if (!p || Number.isNaN(p.timestampMs)) continue;
    now = p.timestampMs;

    const ev = timer.handleLine(p);
    if (ev?.kind === 'start') {
      starts++;
    } else if (ev?.kind === 'end') {
      if (ev.result === 'defeat') defeats++;
      else victories++;
      if (ev.elapsedMs < 10_000) badDurations++; // a real pull lasts longer than 10s
    } else if (ev?.kind === 'zone-reset') {
      resets++;
    }
  }

  const stillRunning = timer.running ? ' (fight open at EOF)' : '';
  console.log(
    `${file}: ${starts} starts, ${defeats} wipes, ${victories} victories, ${resets} zone-resets${stillRunning}`,
  );
}

if (badDurations > 0) {
  console.error(`FAIL: ${badDurations} implausibly short fights detected`);
  process.exit(1);
}
console.log('replay check passed');

// Replays every Network_*.log in logs/ through the parser + combat timer and
// prints a summary. Sanity check that real session data produces sane fights:
// starts ~= ends, no near-zero-length "fights" (real pulls always span seconds).
import { createReadStream, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseLogLine } from '../src/logParser.js';
import { CombatTimer, formatElapsed } from '../src/combatTimer.js';

const logsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'logs');
// Fresh clones have no logs/ dir (git does not track empty directories).
let files = [];
try {
  files = readdirSync(logsDir);
} catch { /* no local captures */ }
files = files.filter((f) => /^Network_.*\.log$/.test(f));
if (files.length === 0) {
  console.log('no Network_*.log found in logs/, skipping');
  process.exit(0);
}

let badDurations = 0;
for (const file of files) {
  // Stream line-by-line: session logs can exceed Node's max string length.
  const rl = createInterface({ input: createReadStream(path.join(logsDir, file)) });
  let now = 0;
  const timer = new CombatTimer(() => now);
    let starts = 0;
    let defeats = 0;
    let victories = 0;
    let resets = 0;

  for await (const raw of rl) {
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
      // Even an instant-wipe pull in extreme raids spans several seconds (pull,
      // first hit, party death, fade-out); only sub-second "fights" indicate a
      // parser/timer bug.
      if (ev.elapsedMs < 2_000) badDurations++;
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

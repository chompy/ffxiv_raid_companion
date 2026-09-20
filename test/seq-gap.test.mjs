// Unit tests for the ability-stream gap detector (src/seqGap.js).
// The base line is a real Ultima Blaster cast from logs/Network_30301_20260919.log.
import { strict as assert } from 'node:assert';
import { parseLogLine, LineType } from '../src/logParser.js';
import { createSeqGapTracker } from '../src/seqGap.js';

const BASE =
  '22|2026-09-19T23:58:04.1600000-04:00|40017B70|Kefka|BAE3|Ultima Blaster|1009D34B|Mis Click|750003|0|1B|BAE38000|0|0|0|0|0|0|0|0|0|0|0|0|226458|226458|10000|10000|||86.73|113.02|-0.02|2.41|9415000|9415000|10000|10000|||100.00|100.00|0.00|-0.00|0000CFCC|0|8|00||01|BAE3|BAE3|1.800|FFFF|c7dfafb1fc42c90a';

const parts = BASE.split('|');
assert.equal(parts.length, 55, 'base line has the full ability layout');

// Swap code (index 0) and counter field (index 44), keep everything else real.
function abilityLine(code, seqHex) {
  const p = [...parts];
  p[0] = code;
  p[44] = seqHex;
  return parseLogLine(p.join('|'));
}

const hex = (n) => n.toString(16).padStart(8, '0');

// --- Happy path: counter advances by exactly one per distinct cast ----------
let check = createSeqGapTracker();
assert.equal(check(abilityLine('21', hex(100))), null); // first line baselines
assert.equal(check(abilityLine('22', hex(101))), null);

// Multi-target lines of one cast repeat the counter: no gap, and the next +1
// step is measured from that shared value.
assert.equal(check(abilityLine('22', hex(101))), null);
assert.equal(check(abilityLine('22', hex(102))), null);

// --- Gaps --------------------------------------------------------------------
// Two cast lines missing: reported with exact from/to values.
const small = check(abilityLine('21', hex(105))); // +3 over 102
assert.deepEqual(small, { kind: 'gap', from: 102, to: 105, jump: 3, timestampMs: abilityLine('21', hex(105)).timestampMs });

// Two full limit-cut rounds missing (8 casts each): the incident signature.
const big = check(abilityLine('22', hex(105 + 16)));
assert.equal(big.kind, 'gap');
assert.equal(big.jump, 16);
assert.equal(big.from, 105);

// --- Combat start: a huge upward jump is a counter base reset, not a gap ------
const baseReset = check(abilityLine('21', hex(121 + 42817))); // observed real value
assert.equal(baseReset.kind, 'base-reset');
assert.equal(baseReset.jump, 42817);

// --- Combat reset: a regression re-baselines silently -------------------------
assert.equal(check(abilityLine('21', hex(7))), null); // new combat starts low
assert.equal(check(abilityLine('22', hex(8))), null);
const afterReset = check(abilityLine('22', hex(9 + 4)));
assert.deepEqual(afterReset, { kind: 'gap', from: 8, to: 13, jump: 5, timestampMs: abilityLine('22', hex(13)).timestampMs });

// --- Non-ability lines are ignored entirely -----------------------------------
check = createSeqGapTracker();
const DAMAGE = '00|2026-09-14T21:14:48.5360000-04:00|0029||  Kefka takes 21842 damage.|a1de00ade3e84e45';
const WIPE = '33|2026-09-14T21:23:31.9370000-04:00|800375D2|40000005|00|00|00|00|abcdef0123456789';
assert.equal(check(parseLogLine(DAMAGE)), null);
assert.equal(check(parseLogLine(WIPE)), null);
assert.equal(check(abilityLine('21', hex(1))), null);
// The ignored lines did not disturb the baseline.
assert.equal(check(abilityLine('22', hex(2))), null);

// --- Layout guard: short or malformed counter fields are skipped --------------
check = createSeqGapTracker();
const pShort = [...parts];
pShort.length = 40; // not today's full layout
assert.equal(check(parseLogLine(pShort.join('|'))), null);
const pBadSeq = [...parts];
pBadSeq[44] = '86.73'; // a coordinate, not the hex counter
check(abilityLine('21', hex(50)));
assert.equal(check(parseLogLine(pBadSeq.join('|'))), null);

console.log('seq-gap: all tests passed');

// Unit tests for the log parser and combat timer state machine.
// Sample lines are real data from logs/Network_30300_20260914.log (abridged).
import { strict as assert } from 'node:assert';
import { parseLogLine, combatEndKind, LineType, isDamageLine } from '../src/logParser.js';
import { CombatTimer, formatElapsed, TimerState } from '../src/combatTimer.js';

// Real line 21 (NetworkAbility). Used to prove that ability use alone no longer starts combat.
const ABILITY =
  '21|2026-09-14T21:12:53.9220000-04:00|1003AAEE|Enri Haze|5F43|Soulsow|1003AAEE|Enri Haze|F|A228000|0|0|0|0|0|0|0|0|0|0|0|0|0|0|218611|218611|10000|10000|||100.60|114.79|0.00|3.14|218611|218611|10000|10000|||100.60|114.79|0.00|3.14|0000C694|0|1|00||01|5F43|5F43|0.600|FFFE|4c14b1613c7eee52';
// Real line 00 subcode-0x29 damage message (combat text). This now starts combat.
const DAMAGE = '00|2026-09-14T21:14:48.5360000-04:00|0029||  Kefka takes 21842 damage.|a1de00ade3e84e45';
// Real line 33 actor controls.
const WIPE_FADE_OUT = '33|2026-09-14T21:23:31.9370000-04:00|800375D2|40000005|00|00|00|00|abcdef0123456789';
const WIPE_FADE_IN = '33|2026-09-14T21:23:35.1510000-04:00|800375D2|4000000F|00|00|00|00|abcdef0123456789';
const VICTORY = '33|2026-09-14T21:23:31.9370000-04:00|800375D2|40000003|00|00|00|00|abcdef0123456789';
const NOISE_ACTOR_CONTROL = '33|2026-09-14T21:14:12.7670000-04:00|800375D2|80000027|01|02|1BDB|400167E1|d28eef71191e0b0e';
const ZONE_CHANGE = '01|2026-09-14T20:56:09.7570000-04:00|B3|The Roost|3052b13cc41dd971';
const CHATTER = 'This is IINACT 2.10.3.7 (API 1.6.0) based on FFXIV_ACT_Plugin 3.0.3.0';

let now = 1_000_000;
const timer = new CombatTimer(() => now);

// --- Parser ---------------------------------------------------------------
assert.equal(parseLogLine(CHATTER), null, 'plugin chatter is rejected');

const pAbility = parseLogLine(ABILITY);
assert.equal(pAbility.type, LineType.NetworkAbility);
assert.ok(!Number.isNaN(pAbility.timestampMs));
assert.equal(new Date(pAbility.timestampMs).toISOString().slice(0, 19), '2026-09-15T01:12:53'); // -04:00 offset

const pZone = parseLogLine(ZONE_CHANGE);
assert.equal(pZone.type, LineType.ChangeZone);
assert.deepEqual(pZone.fields.slice(0, 2), ['B3', 'The Roost']);

assert.equal(combatEndKind(parseLogLine(WIPE_FADE_OUT)), 'defeat');
assert.equal(combatEndKind(parseLogLine(WIPE_FADE_IN)), 'defeat');
assert.equal(combatEndKind(parseLogLine(VICTORY)), 'victory');
assert.equal(combatEndKind(parseLogLine(NOISE_ACTOR_CONTROL)), null);

const pDamage = parseLogLine(DAMAGE);
assert.ok(isDamageLine(pDamage), 'damage message detected');
assert.ok(!isDamageLine(pAbility), 'ability use is not a damage message');
assert.ok(!isDamageLine(pZone));

// --- State machine ----------------------------------------------------------
assert.equal(timer.state, TimerState.Idle);
assert.equal(timer.handleLine(parseLogLine(WIPE_FADE_OUT)), null, 'end event while idle is ignored');

// An ability that lands no hit (buff/heal) must not start combat.
now += 5_000;
assert.equal(timer.handleLine(parseLogLine(ABILITY)), null, 'ability use alone does not start combat');
assert.ok(!timer.running);

now += 1_000;
assert.deepEqual(timer.handleLine(parseLogLine(DAMAGE)), { kind: 'start' });
assert.ok(timer.running);

now += 42_300;
assert.equal(timer.elapsedMs(), 42_300, 'elapsed ticks with the clock');
assert.equal(formatElapsed(42_300), '0:42.3');

const end = timer.handleLine(parseLogLine(WIPE_FADE_OUT));
assert.deepEqual(end, { kind: 'end', result: 'defeat', elapsedMs: 42_300 });
assert.equal(timer.state, TimerState.Defeated);
assert.equal(timer.elapsedMs(), 42_300, 'final value held after defeat');

// Late hit text right after a wipe must not restart the timer.
now += 1_000;
assert.equal(timer.handleLine(parseLogLine(DAMAGE)), null, 'damage within grace period ignored');

now += 5_000; // past RESTART_GRACE_MS
assert.deepEqual(timer.handleLine(parseLogLine(DAMAGE)), { kind: 'start' });
assert.ok(timer.running);

// Unrelated actor controls during combat are no-ops.
assert.equal(timer.handleLine(parseLogLine(NOISE_ACTOR_CONTROL)), null);
assert.ok(timer.running);

now += 65_400;
const victory = timer.handleLine(parseLogLine(VICTORY));
assert.deepEqual(victory, { kind: 'end', result: 'victory', elapsedMs: 65_400 });
assert.equal(timer.state, TimerState.Victory);

// --- Zone-change reset --------------------------------------------------------
// After victory, zoning out clears the held final time and returns to idle.
assert.deepEqual(timer.handleLine(parseLogLine(ZONE_CHANGE)), { kind: 'zone-reset' });
assert.equal(timer.state, TimerState.Idle);
assert.equal(timer.elapsedMs(), 0, 'held final time cleared by zone reset');

// A zone change while already idle is a no-op (no spurious event).
assert.equal(timer.handleLine(parseLogLine(ZONE_CHANGE)), null);

// Wipe then immediately zone out: the restart grace window must not carry over.
now += 5_000; // past any previous grace window
timer.handleLine(parseLogLine(DAMAGE));
assert.ok(timer.running);
now += 10_000;
timer.handleLine(parseLogLine(WIPE_FADE_OUT));
assert.equal(timer.state, TimerState.Defeated);
now += 2_000; // still inside RESTART_GRACE_MS of the wipe
timer.handleLine(parseLogLine(ZONE_CHANGE)); // zone out -> reset + grace cleared
assert.equal(timer.state, TimerState.Idle);
assert.deepEqual(
  timer.handleLine(parseLogLine(DAMAGE)),
  { kind: 'start' },
  'damage right after zoning starts combat (grace lifted)'
);

// Zoning out mid-fight abandons it.
now += 1_000;
assert.deepEqual(timer.handleLine(parseLogLine(ZONE_CHANGE)), { kind: 'zone-reset' });
assert.equal(timer.state, TimerState.Idle);
assert.ok(!timer.running);

// --- Formatting -------------------------------------------------------------
assert.equal(formatElapsed(0), '0:00.0');
assert.equal(formatElapsed(90_500), '1:30.5');
assert.equal(formatElapsed(3_661_400), '61:01.4');

console.log('combat-timer tests passed');

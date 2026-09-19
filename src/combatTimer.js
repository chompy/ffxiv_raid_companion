// Combat timer state machine driven by parsed log lines.
//
// Rules (per the project spec):
//   - Line 01 (ChangeZone)                                    -> any fight is abandoned; state resets to idle.
//   - Line 00 subcode 29 damage message while stopped         -> combat (re)starts, timer begins.
//     (Ability uses that land no hit — buffs, heals, misses — do not count.)
//   - Line 33 (0x21) Actor Control defeat/victory   -> combat ends, timer stops & resets.

import { LineType, combatEndKind, isDamageLine } from './logParser.js';

export const TimerState = {
  Idle: 'idle',
  Combat: 'combat',
  Defeated: 'defeat',
  Victory: 'victory',
};

// Ability packets from the final moments of a fight (and its paired fade-in /
// fade-out actor controls) can arrive right after an end event and would
// otherwise restart the timer for a couple of seconds. Ignore start signals
// that land within this window after combat ended.
const RESTART_GRACE_MS = 5000;

export class CombatTimer {
  constructor(nowFn = () => Date.now()) {
    this._now = nowFn;
    this.reset();
  }

  reset() {
    this.state = TimerState.Idle;
    this.startTimeMs = null;
    this.endTimeMs = null;
    this.finalElapsedMs = 0;
    this.lastEndMs = null;
  }

  get running() {
    return this.state === TimerState.Combat;
  }

  /** Elapsed combat time in ms, ticking live while a fight is in progress. */
  elapsedMs(nowMs) {
    if (this.running) {
      const now = nowMs ?? this._now();
      return Math.max(0, now - this.startTimeMs);
    }
    // After defeat/victory the timer holds its final value until reset.
    return this.finalElapsedMs;
  }

  /**
   * Feed a parsed log line into the state machine.
   * Returns an event object when the state changed, otherwise null:
   *   { kind: 'start' }
   * | { kind: 'end', result: 'defeat' | 'victory', elapsedMs }
   * | { kind: 'zone-reset' }
   */
  handleLine(parsed) {
    if (!parsed) return null;

    // Leaving an instance abandons whatever fight was in progress. This also
    // clears lastEndMs, lifting the restart grace window for the new zone so a
    // fresh pull can start immediately.
    if (parsed.type === LineType.ChangeZone && this.state !== TimerState.Idle) {
      this.reset();
      return { kind: 'zone-reset' };
    }

    if (this.running) {
      const end = combatEndKind(parsed);
      if (end) {
        const now = this._now();
        this.state = end === 'defeat' ? TimerState.Defeated : TimerState.Victory;
        this.endTimeMs = now;
        this.finalElapsedMs = Math.max(0, now - this.startTimeMs);
        this.lastEndMs = now;
        return { kind: 'end', result: end, elapsedMs: this.finalElapsedMs };
      }
      return null;
    }

    // Stopped: combatants taking damage from an ability means combat (re)started.
    if (isDamageLine(parsed)) {
      const now = this._now();
      if (this.lastEndMs !== null && now - this.lastEndMs < RESTART_GRACE_MS) return null;
      this.startTimeMs = now;
      this.state = TimerState.Combat;
      return { kind: 'start' };
    }

    return null;
  }
}

/** Format ms as m:ss.t (tenths of a second). */
export function formatElapsed(ms) {
  const clamped = Math.max(0, ms);
  const totalTenths = Math.floor(clamped / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

// Detects missing lines in the ability stream using its per-combat action counter.
//
// Full-layout ability lines (21 single-target / 22 AoE, exactly 55 pipe fields)
// carry a hex counter near the end of the line that advances by one for every
// cast. Audits of two full session logs show consecutive distinct casts always
// advance it by exactly 1 in a healthy stream; a larger jump means cast lines
// never arrived — the signature of a websocket drop or an i6nv stall (e.g. a
// limit-cut tracker anchoring on a late round and reporting the wrong north).
// The counter resets for each combat, so any regression re-baselines silently.

import { LineType } from './logParser.js';

const HEX_SEQ = /^[0-9a-fA-F]{4,8}$/i;
// At combat start i6nv switches the counter to a new base far above the last
// pre-combat value (observed: +42k). A jump of this size is a boundary, not a
// drop — real stream gaps are at most hundreds of casts even for long stalls.
const BASE_RESET_JUMP = 1000;

export function createSeqGapTracker() {
  let last = null;

  // Returns { kind: 'gap' | 'base-reset', from, to, jump, timestampMs } when
  // the counter advances by more than one between distinct casts, else null.
  return function check(parsed) {
    if (parsed.type !== LineType.NetworkAbility && parsed.type !== LineType.NetworkAOEAbility) return null;
    const f = parsed.fields;
    // Exactly today's layout (55 tokens); a patch that changes it disables the
    // check rather than misreading an unrelated field.
    if (f.length !== 53) return null;
    // Counter is the 45th token of 55 (Lua: f[nf-10]); fields drop type+ts.
    const rawSeq = f[f.length - 11];
    if (!HEX_SEQ.test(rawSeq)) return null;
    const seq = Number.parseInt(rawSeq, 16);
    if (last === null || seq <= last) {
      // Same-cast multi-target lines repeat the counter; a lower value means a
      // new combat started. Both just re-baseline.
      last = seq;
      return null;
    }
    const jump = seq - last;
    last = seq;
    if (jump <= 1) return null;
    return {
      kind: jump >= BASE_RESET_JUMP ? 'base-reset' : 'gap',
      from: last - jump,
      to: seq,
      jump,
      timestampMs: parsed.timestampMs,
    };
  };
}

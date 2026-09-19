// Parses IINACT / FFXIV_ACT network log lines.
//
// A raw line is pipe-delimited:  <type>|<timestamp>|<field...>
// e.g.
//   21|2026-09-14T21:12:53.9220000-04:00|1003AAEE|Enri Haze|5F43|Soulsow|...
//   33|2026-09-14T21:12:56.5060000-04:00|800375D2|4000000C|00|00|00|00|<hash>
//
// The type is a decimal integer (see cactbot LogGuide). Timestamps are ISO-8601.

export const LineType = {
  LogMessage: 0x00, // "00" — in-game log message; the message code is fields[0]
  ChangeZone: 0x01, // "01"
  NetworkAbility: 0x15, // "21"
  NetworkAOEAbility: 0x16, // "22"
  NetworkDeath: 0x19, // "25"
  ActorControl: 0x21, // "33" (Network6D)
};

// Line-00 message subcodes. These are decimal in the log ("0029" = 29).
export const MessageSubcode = {
  // Combat text for every landed hit in either direction, e.g.
  //   "Kefka takes 21842 damage." / "Critical direct hit! X hits Kefka for N damage."
  Damage: 29,
};

/** True when a parsed line reports that combatants took damage (line 00, subcode "0029"). */
export function isDamageLine(parsed) {
  if (!parsed || parsed.type !== LineType.LogMessage) return false;
  const code = Number(parsed.fields[0]);
  return !Number.isNaN(code) && code === MessageSubcode.Damage;
}

// Actor Control commands on line 33 that mark the end of combat.
export const EndOfCombat = {
  // Defeat / wipe. cactbot uses "fade in" (4000000F, post-6.2; 40000010 pre-6.2)
  // and "fade out" (40000005) as the wipe signal.
  defeat: new Set(['40000005', '4000000F', '40000010']),
  // Victory.
  victory: new Set(['40000002', '40000003']),
};

/**
 * Parse a single raw log line into a structured object, or return null when the
 * line is not a well-formed network log line (e.g. plugin chatter like "This is
 * IINACT ...", which has no leading numeric type).
 */
export function parseLogLine(raw) {
  if (typeof raw !== 'string') return null;

  const pipe = raw.indexOf('|');
  if (pipe <= 0) return null;

  const typeStr = raw.slice(0, pipe);
  if (!/^\d+$/.test(typeStr)) return null;

  const parts = raw.split('|');
  // Minimum shape: type|timestamp. Timestamp is the second field for all
  // network log lines.
  if (parts.length < 2) return null;

  const timestampMs = parseTimestamp(parts[1]);

  return {
    type: Number(typeStr),
    typeStr,
    timestampMs,
    fields: parts.slice(2), // everything after the timestamp
    raw,
  };
}

/**
 * Parse an ISO-8601 timestamp such as "2026-09-14T21:12:53.9220000-04:00" into
 * epoch milliseconds. Returns NaN when unparseable.
 */
export function parseTimestamp(ts) {
  if (typeof ts !== 'string') return NaN;

  // Fast path: the built-in parser handles standard ISO strings, but it is picky
  // about >3 fractional digits on some engines, so normalize first.
  const normalized = ts.replace(/(\.\d{3})\d+/, '$1');
  const ms = Date.parse(normalized);
  if (!Number.isNaN(ms)) return ms;

  return NaN;
}

/** Extract the Actor Control command (4th field) from a line-33 object. */
export function actorControlCommand(parsed) {
  if (!parsed || parsed.type !== LineType.ActorControl) return null;
  // fields[0] = instance, fields[1] = command
  return parsed.fields[1] ?? null;
}

/** Classify a line-33 command as 'defeat', 'victory' or null. */
export function combatEndKind(parsed) {
  const cmd = actorControlCommand(parsed);
  if (!cmd) return null;
  if (EndOfCombat.defeat.has(cmd)) return 'defeat';
  if (EndOfCombat.victory.has(cmd)) return 'victory';
  return null;
}

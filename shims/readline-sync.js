// Browser stand-in for readline-sync. fengari's debug library requires it, but
// only inside a `typeof process !== 'undefined'` guard (Node REPL support), so
// these bodies never run in the browser; they exist to keep the real module
// (and its Node-only crypto/readline deps) out of the bundle.

export function setDefaultOptions() {}

export function prompt() {
  throw new Error('readline-sync is unavailable in the browser');
}

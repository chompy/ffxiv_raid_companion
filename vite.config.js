import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// fengari decides "Node or browser?" with `typeof process` checks. A page that
// leaks a `process` global (e.g. some browser extensions) sends it down the
// Node-only branches, which then call externalized builtins like `os`. Force
// the browser branches for every fengari module in both dev and build.
function patchFengariForBrowser(code) {
  return code
    .replace(/typeof process === "undefined"/g, '(true)')
    .replace(/typeof process !== "undefined"/g, '(false)');
}

const isFengariSrc = (id) => id.includes('node_modules/fengari/src/');

// Rollup-side plugin: covers the production build.
function forceFengariBrowserBranches() {
  return {
    name: 'force-fengari-browser-branches',
    enforce: 'pre',
    transform(code, id) {
      if (!isFengariSrc(id)) return null;
      const out = patchFengariForBrowser(code);
      return out === code ? null : { code: out, map: null };
    },
  };
}

// esbuild-side plugin: covers dev-mode dependency pre-bundling (Vite plugins do
// not run there).
const fengariEsbuildPlugin = {
  name: 'force-fengari-browser-branches',
  setup(build) {
    build.onLoad(
      { filter: /node_modules[\/\\]fengari[\/\\]src[\/\\].*\.js$/ },
      (args) => ({
        contents: patchFengariForBrowser(fs.readFileSync(args.path, 'utf8')),
        loader: 'js',
      })
    );
  },
};

export default defineConfig({
  // GitHub Pages serves this project page under /ffxiv_raid_companion/.
  base: '/ffxiv_raid_companion/',
  plugins: [forceFengariBrowserBranches()],
  resolve: {
    alias: {
      // fengari's debug library requires readline-sync (Node-only); point it at
      // a stub so the browser bundle stays free of Node builtins.
      'readline-sync': path.join(here, 'shims', 'readline-sync.js'),
    },
  },
  define: {
    // fengari also has two *unguarded* top-level probes that run at module load;
    // neutralize them so the browser never touches `process` there.
    'process.env.FENGARICONF': '""',
    'process.versions.node': '20',
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fengariEsbuildPlugin],
      // The top-level define above is not forwarded to esbuild's dependency
      // pre-bundling in dev mode, so repeat it here.
      define: {
        'process.env.FENGARICONF': '""',
        'process.versions.node': '20',
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

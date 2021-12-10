import preprocess from 'svelte-preprocess';
import adapter_ipfs from 'sveltejs-adapter-ipfs';
import {execSync} from 'child_process';

const VERSION = execSync('git rev-parse --short HEAD').toString().trim();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess({
    sourceMap: true,
  }),

  kit: {
    adapter: adapter_ipfs({
      removeBuiltInServiceWorkerRegistration: true,
      injectPagesInServiceWorker: true,
      injectDebugConsole: true,
    }),
    target: '#svelte',
    trailingSlash: 'ignore',
    vite: {
      build: {
        sourcemap: true,
      },
      define: {
        __VERSION__: JSON.stringify(VERSION),
      },
    },
  },
};

export default config;

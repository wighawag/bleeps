const fs = require('fs');
require('esbuild')
  .build({
    entryPoints: ['src/index.ts'],
    format: 'esm',
    sourcemap: true,
    bundle: true,
    outfile: 'dist/index.mjs',
  })
  .then(() => {
    // fix ethers for cloudflare worker
    let content = fs.readFileSync('dist/index.mjs').toString();
    content = content.replace('mode: "cors"', '//mode: "cors"');
    content = content.replace('cache: "no-cache"', '//cache: "no-cache"');
    content = content.replace('credentials: "same-origin"', '//credentials: "same-origin"');
    content = content.replace('referrer: "client"', '//referrer: "client"');
    fs.writeFileSync('dist/index.mjs', content);
  })
  .catch(() => process.exit(1));

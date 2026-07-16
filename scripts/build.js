import { build } from 'esbuild';
import { exec } from '@yao-pkg/pkg';
import path from 'node:path';
import fsp from 'node:fs/promises';
import process from 'node:process';

async function main() {
  console.log('Starting build process...');

  const distDir = path.join(process.cwd(), 'dist');
  await fsp.mkdir(distDir, { recursive: true });

  const bundlePath = path.join(distDir, 'bundle.cjs');
  const exePath = path.join(distDir, 'paymore-kiosk-log-agent.exe');

  console.log('Bundling application with esbuild...');
  await build({
    entryPoints: ['src/index.js'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    outfile: bundlePath,
    format: 'cjs',
    // We bundle everything. If any native modules exist, they would go in external.
    external: []
  });

  console.log('Packaging with @yao-pkg/pkg...');
  // Package the bundled file into a standalone Windows executable
  await exec([bundlePath, '--target', 'node24-win-x64', '--output', exePath]);

  console.log(`Build complete! Executable generated at: ${exePath}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

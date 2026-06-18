const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const hasLocation = pkg.dependencies && pkg.dependencies['expo-location'];
const isFOSS = process.env.EXPO_PUBLIC_FOSS_BUILD === 'true' || !hasLocation;

const tsconfig = isFOSS ? 'tsconfig.foss.json' : 'tsconfig.json';
console.log(`Running typecheck using ${tsconfig}...`);

const result = spawnSync('tsc', ['-p', tsconfig, '--noEmit'], {
    stdio: 'inherit',
    shell: true,
});

process.exit(result.status ?? 0);

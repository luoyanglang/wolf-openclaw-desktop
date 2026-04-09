const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [
  path.join(root, 'release', 'win-unpacked'),
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;

  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed stale packaging output: ${path.relative(root, target)}`);
}

console.log('Release output is ready for packaging.');

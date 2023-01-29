const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

try {
	fs.mkdirSync(path.join(ROOT_DIR, 'dist'));
} catch {}

fs.writeFileSync(
	path.join(ROOT_DIR, 'dist/index.mjs'),
	fs.readFileSync(path.join(ROOT_DIR, 'src/_esm/index.mjs'), 'utf8'),
	'utf8'
);

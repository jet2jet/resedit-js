const fs = require('fs');
const packageJson = require('../package.json');

fs.writeFileSync(
	process.argv[2],
	`export default '${packageJson.version}';\n`,
	'utf8'
);

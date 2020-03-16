const fs = require('fs');

const target = process.argv[2];
const json = JSON.parse(fs.readFileSync(target, { encoding: 'utf-8' }));
console.log(JSON.stringify(json));

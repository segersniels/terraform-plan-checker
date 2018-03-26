#!/usr/bin/env node
const program = require('commander');
const data = require('./lib/data.js');
const package = require('./package.json');

program
    .version(package.version)
    .option('-c, --clean', 'only output the lines that are different')
    .parse(process.argv);

if (program.args.length > 0) {
    const file = process.argv[2];
    data.grabDefinitions(file, program.clean)
        .then(data.prepareForAction)
        .then(data.processDefinitions)
        .catch(err => console.error(err));
} else {
    program.help();
}

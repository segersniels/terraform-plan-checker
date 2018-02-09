#!/usr/bin/env node
const program = require('commander');
const data = require('./lib/data.js');
const package = require('./package.json');

program
    .version(package.version)
    .parse(process.argv);

if (program.args.length > 0) {
    script = async () => {
        console.log('- Grabbing the container definitions');
        data.grabDefinitions()
            .then(data.prepareForAction)
            .then(data.calculateDifferences);
    }
    script().catch(err => {
        console.error(err);
    });
} else {
    program.help();
}

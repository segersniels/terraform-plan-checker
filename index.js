#!/usr/bin/env node
const program = require('commander');
const data = require('./lib/data.js');
const package = require('./package.json');
const colors = require('colors/safe');
const _ = require('lodash');

let file;
const stdin = process.stdin;
const input = [];

program.version(package.version)
    .option('-c, --clean', 'only output the lines that are different')
    .parse(process.argv);
    
const exec = (content, clean) => {
    data.grabDefinitions(content, clean)
        .then(data.prepareForAction)
        .then(data.processDefinitions)
        .catch(err => console.error(colors.red('    × Grabbing unsuccessful')));
}

if (!process.stdin.isTTY) {
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', content => {
        const grep = (string, patternToSearch) => {
            var regexPatternToSearch = new RegExp("^.*(" + patternToSearch + ").*$", "mg");
            return string.match(regexPatternToSearch);
        }
        input.push(grep(content, 'container_definitions:'));
    });
    stdin.on('end', () => {
        exec(_.compact(input).join("\n"), program.clean);
    });
} else {
    if (program.args.length === 0) {
        console.error('ERR: no file specified');
        process.exit();
    }
    exec(program.args[0], program.clean);
}
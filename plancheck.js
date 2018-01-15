#!/usr/bin/env node
const fs = require('fs');
const _ = require('lodash');
const program = require('commander');
const exec = require('child_process').exec;

const convertFileToArray = (file) => {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, text) => {
            if (err) reject(err);
            else {
                resolve(text.toString('utf-8').split('\n'));
            }
        });
    });
}

const grabContainerDefinition = (type) => {
    return new Promise((resolve, reject) => {
        fs.stat(__dirname + '/' + process.argv[2], err => {
            if (err) reject(err);
            else {
                if (type === 'old') {
                    exec("terraform show " + process.argv[2] + " |grep container_definitions |awk '{print $2}'", (err, stdout, stderr) => {
                        if (err) reject(err);
                        else resolve(JSON.parse(stdout.replace(/\\"/g,'"').slice(1, -1).slice(0, -1)));
                    });
                } else {
                    exec("terraform show " + process.argv[2] + " |grep container_definitions |awk '{print $4}'", (err, stdout, stderr) => {
                        if (err) reject(err);
                        else resolve(JSON.parse(stdout.replace(/\\"/g,'"').slice(1, -1).slice(0, -1)));
                    });
                }
            }
        });
    });
}

program
    .version('1.0.0')
    .usage('<plan>')
    .parse(process.argv);

if (program.args.length) {
    const script = async () => {
        // Get container definitions from the plan
        const oldFile = await grabContainerDefinition('old');
        const newFile = await grabContainerDefinition('new');

        console.log('- Comparing the old container definitions with the new one');
        console.log();

        // Write the separate container definitions to temporary files
        fs.writeFile('old.json', JSON.stringify(oldFile, null, 4), err => {
            if (err) throw err;
        });

        fs.writeFile('new.json', JSON.stringify(newFile, null, 4), err => {
            if (err) throw err;
        });

        // Convert the temporary files to arrays
        const oldJson = await convertFileToArray('old.json');
        const newJson = await convertFileToArray('new.json');

        // Remove the ',' character from the JSON files to prevent showing unneeded changes to a file
        _.forEach(oldJson, (item, index) => {
            oldJson[index] = item.replace(',','');
        });

        _.forEach(newJson, (item, index) => {
            newJson[index] = item.replace(',','');
        });

        // Calculate and log the differences between the two files
        const differences = _.reduce(newJson, (result, line, index) => {
            if (oldJson.indexOf(line) === -1) {
                console.log('    + %s | %i: %s', process.argv[2], index, line);
                return result + 1;
            }
            return result;
        }, 0);

        console.log();

        if (differences === 0) console.log('- No differences found');
        else console.log('- %i differences were found', differences);

        // Remove the temporary files
        fs.unlink('old.json', err => {
            if (err) throw err;
        });

        fs.unlink('new.json', err => {
            if (err) throw err;
        });
    }

    script().catch(err => {
        console.log(err);
    });
} else {
    program.help();
}

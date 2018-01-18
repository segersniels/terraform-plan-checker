const fs = require('fs');
const _ = require('lodash');
const program = require('commander');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stripAnsi = require('strip-ansi');

// Basic CLI setup
program
    .version('1.0.0')
    .option('-g, --grab', 'Grab the container definitions')
    .option('-c, --calculate', 'Calculate the differences between both definitions')
    .parse(process.argv);

// Custom functions
const convertFileToArray = (file) => {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, text) => {
            if (err) reject(err);
            else resolve(text.toString('utf-8').split('\n'));
        });
    });
}

const grabContainerDefinition = (type) => {
    return new Promise((resolve, reject) => {
        fs.stat('./' + process.argv[3], err => {
            if (err) reject(err);
            else {
                const print = ((type === 'old') ? '$2$3' : '$4$5');
                exec(`terraform show ${process.argv[3]} |grep container_definitions |awk '{print ${print}}' |sed '/^\s*$/d' |sed 's/(forces//g'`, (err, stdout, stderr) => {
                    const json = stripAnsi(stdout).replace(/=>/g,'')
                        .replace(/\]"/g,']')
                        .replace(/"\[/g,'[')
                        .replace(/\s+/g, '')
                        .replace(/\]\[/g,'],[')
                        .replace(/\\"/g,'"');

                    if (err) reject(err);
                    else resolve(JSON.stringify(`[${json}]`, null, 4));
                });
            }
        });
    });
}

// CLI logic
if (program.args.length) {
    let script;
    if (program.grab) {
        script = async () => {
            console.log('- Grabbing the container definitions');

            // Get container definitions from the plan
            const oldFile = await grabContainerDefinition('old');
            const newFile = await grabContainerDefinition('new');

            fs.writeFile('old.json', JSON.parse(oldFile), err => {
                if (err) throw err;
            });

            fs.writeFile('new.json', JSON.parse(newFile), err => {
                if (err) throw err;
            });

            console.log(colors.green('    √ Grabbing successful'));
        }
    }

    if (program.calculate) {
        script = async () => {
            console.log('- Comparing the old container definitions with the new definitions');

            // Convert the temporary files to arrays
            const oldJson = await convertFileToArray('old');
            const newJson = await convertFileToArray('new');

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
                    console.log(colors.yellow('    + ' + process.argv[3] + ' | ' + index + ': ' + line));
                    return result + 1;
                }
                return result;
            }, 0);

            if (differences === 0) console.log('- No differences found');
            else console.log('- Differences found: ', differences);
        }
    }

    script().catch(err => {
        console.log(err);
    });
} else {
    program.help();
}

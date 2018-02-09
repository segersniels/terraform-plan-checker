const fs = require('fs');
const _ = require('lodash');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stripAnsi = require('strip-ansi');

exports.convertToArray = (file) => {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, text) => {
            if (err) reject(err);
            else resolve(text.toString('utf-8').split('\n'));
        });
    });
}

exports.grabDefinitions = () => {
    return new Promise(async (resolve, reject) => {
        const oldest = await grabContainerDefinition('oldest');
        const latest = await grabContainerDefinition('latest');
        resolve({ oldest, latest });
    });
}

const grabContainerDefinition = (type) => {
    return new Promise((resolve, reject) => {
        fs.stat('./' + process.argv[2], err => {
            if (err) reject(err);
            else {
                const print = ((type === 'oldest') ? '$2$3' : '$4$5$6');
                exec(`terraform show ${process.argv[2]} |grep container_definitions |awk '{print ${print}}' |sed '/^\s*$/d' |sed 's/(forces//g' |sed 's/new//g' |sed 's/resource)//g' |sed`, (err, stdout, stderr) => {
                    const outReplaced = stripAnsi(stdout).replace(/=>/g,'')
                        .replace(/\]"/g,']')
                        .replace(/"\[/g,'[')
                        .replace(/\s+/g, '')
                        .replace(/\]\[/g,'],[')
                        .replace(/\\"/g,'"');

                    if (err) reject(err);
                    else {
                        const json = JSON.parse(`[${outReplaced}]`);
                        const human = JSON.stringify(_.flatten(json), null, 4);
                        resolve(human);
                    }
                });
            }
        });
    });
}

exports.prepareForAction = definitions => {
    return new Promise((resolve, reject) => {
        console.log(colors.green('    √ Grabbing successful'));
        console.log('- Comparing the old container definitions with the new definitions');
        const oldest = definitions.oldest.split('\n');
        const latest = definitions.latest.split('\n');
        _.forEach(oldest, (item, index) => {
            oldest[index] = item.replace(',','');
        });
        _.forEach(latest, (item, index) => {
            latest[index] = item.replace(',','');
        });
        resolve({ oldest, latest });
    });
};

exports.calculateDifferences = definitions => {
    const differences = _.reduce(definitions.latest, (result, line, index) => {
        if (definitions.oldest.indexOf(line) <= -1) {
            console.log(colors.yellow('    + ' + process.argv[2] + ' | ' + index + ': ' + line));
            return result + 1;
        }
        return result;
    }, 0);
    if (differences === 0) console.log('- No differences found');
    else console.log('- Differences found: ', differences);
}

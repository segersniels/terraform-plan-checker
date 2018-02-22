const fs = require('fs');
const _ = require('lodash');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stripAnsi = require('strip-ansi');

const grabContainerDefinition = type => {
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

exports.grabDefinitions = clean => {
    return new Promise(async (resolve, reject) => {
        if (!clean) console.log('- Grabbing the container definitions');
        const oldest = await grabContainerDefinition('oldest');
        const latest = await grabContainerDefinition('latest');
        resolve({ oldest, latest, clean });
    });
}

exports.prepareForAction = definitions => {
    return new Promise((resolve, reject) => {
        if (!definitions.clean) {
            console.log(colors.green('    √ Grabbing successful'));
            console.log('- Comparing the old container definitions with the new definitions');
        }
        const oldest = definitions.oldest.split('\n');
        const latest = definitions.latest.split('\n');
        _.forEach(oldest, (item, index) => {
            oldest[index] = item.replace(',','').trim();
        });
        _.forEach(latest, (item, index) => {
            latest[index] = item.replace(',','').trim();
        });
        resolve({ oldest, latest, clean: definitions.clean });
    });
};

exports.calculateDifferences = definitions => {
    if (definitions.clean) {
        let json = [];
        _.forEach(definitions.latest, (line, index) => {
            if (definitions.oldest.indexOf(line) <= -1) {
                const array = _.trim(line).replace(/"/g,'').split(':');
                const key = array.shift();
                const value = _.trim(array.join(':'));
                json.push({ key, value });
            }
        });
        console.log(JSON.stringify(json, null, 4));
    } else {
        const differences = _.reduce(definitions.latest, (result, line, index) => {
            if (definitions.oldest.indexOf(line) <= -1) {
                console.log(colors.yellow(`    + ${process.argv[2]} | ${index}: ${line}`));
                return result + 1;
            }
            return result;
        }, 0);
        if (differences === 0) console.log('- No differences found');
        else console.log(`- Differences found: ${differences}`);
    }
}

const fs = require('fs');
const _ = require('lodash');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stripAnsi = require('strip-ansi');
const stringSimilarity = require('string-similarity');

const data = {};

const grabContainerDefinition = type => {
    return new Promise((resolve, reject) => {
        fs.stat('./' + process.argv[2], err => {
            if (err) reject(err);
            else {
                const print = ((type === 'oldest') ? '$2$3' : '$4$5$6');
                exec(`terraform show ${process.argv[2]} |grep container_definitions |awk '{print ${print}}' |sed '/^\s*$/d' |sed 's/(forces//g' |sed 's/new//g' |sed 's/resource)//g'`, (err, stdout, stderr) => {
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
        data.oldest = await grabContainerDefinition('oldest');
        data.latest = await grabContainerDefinition('latest');
        resolve({ oldest: data.oldest, latest: data.latest, clean });
    });
}

exports.prepareForAction = definitions => {
    return new Promise((resolve, reject) => {
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

const removeUnwanted = lines => {
    return new Promise((resolve, reject) => {
        let adjusted = [];
        let similar = [];
        // Check if small changes to a name don't show up in the deleted lines
        // They only need to be shown in the changed lines
        _.forEach(lines, (line, index) => {
            const separated = separateKeysAndValues(line);
            _.forEach(data.changes, change => {
                const similarity = stringSimilarity.compareTwoStrings(change, separated.value);
                if (similarity > 0.7) similar.push(line);
                if (!line.match(/(\[\]|essential|protocol)/)) adjusted.push(line);
            });
        });
        adjusted = _.filter(adjusted, item => similar.indexOf(item) < 0);
        resolve(_.uniq(adjusted));
    });
}

const calculateChanges = (check, iterate) => {
    return new Promise((resolve, reject) => {
        let lines = [];
        _.forEach(iterate, line => {
            if (check.indexOf(line) <= -1) lines.push(line);
        });
        resolve(lines);
    });
}

const separateKeysAndValues = line => {
    const array = _.trim(line).replace(/"/g,'').split(':');
    const key = array.shift();
    const value = _.trim(array.join(':'));
    return { key, value };
}

const generateOutput = (json, lines, type) => {
    return new Promise((resolve, reject) => {
        if (type === 'changes') data.changes = lines;
        let changes = [];
        _.forEach(lines, line => {
            const latest = JSON.parse(json);
            const separated = separateKeysAndValues(line);
            _.forEach(latest, object => {
                const keys = _.keys(object);
                _.forEach(keys, key => {
                    if (key === separated.key && _.toString(object[key]) === separated.value) {
                        changes.push(`    ${process.argv[2]} | (${object.name})  ${line}`);
                    }
                    _.forEach(object[key], sub => {
                        if (typeof sub[separated.key] !== 'undefined' && sub[separated.key] === separated.value) {
                            changes.push(`    ${process.argv[2]} | (${object.name})  ${line}`);
                        }
                    });
                });
            });
        });
        resolve(changes);
    });
}

exports.processDefinitions = async definitions => {
    if (definitions.clean) {
        let json = [];
        _.forEach(definitions.latest, (line, index) => {
            if (definitions.oldest.indexOf(line) <= -1) {
                const separated = separateKeysAndValues(line);
                json.push({ key: separated.key, value: separated.value });
            }
        });
        console.log(JSON.stringify(json, null, 4));
    } else {
        console.log(colors.yellow('    √ Grabbing successful'));
        console.log('- Comparing the old container definitions with the new definitions');
        console.log('   Lines that were changed or added:')
        await calculateChanges(definitions.oldest, definitions.latest)
        .then(lines => generateOutput(data.latest, lines, 'changes'))
        .then(output => _.forEach(output, change => console.log(colors.green(change))));
        console.log('   Lines that were deleted:')
        await calculateChanges(definitions.latest, definitions.oldest)
        .then(removeUnwanted)
        .then(lines => generateOutput(data.oldest, lines, 'deleted'))
        .then(output => _.forEach(output, change => console.log(colors.red(change))));
    }
}

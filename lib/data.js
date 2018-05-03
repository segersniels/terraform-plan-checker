const fs = require('fs');
const _ = require('lodash');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stringSimilarity = require('string-similarity');
const stripAnsi = require('strip-ansi');
const util = require('./util.js')

const data = {};

const checkForNewServices = (oldest, latest) => {
    const detected = [];
    const oldestNames = _.map(oldest, i => i.name);
    const latestNames = _.map(latest, i => i.name);
    if (oldest.length > latest.length) {
        let similarities = [];
        _.forEach(oldestNames, (oldName, index) => {
            _.forEach(latestNames, lateName => {
                const similarity = typeof lateName !== 'undefined' ? stringSimilarity.compareTwoStrings(oldName, lateName) : 0;
                similarities.push(similarity);
            });
            if (similarities.indexOf(1) < 0) detected.push(oldName);
            similarities = [];
        });
    }
    data.new = detected;
    return detected;
}

const extractDefinition = (content, type) => {
    return new Promise((resolve, reject) => {
        const trimmed = stripAnsi(content).trim().split('container_definitions:');
        const services = _.compact(trimmed);
        const object = [];
        _.forEach(services, service => {
            const trim = service.trim().replace("(forces new resource)", "").replace(/\s/g, "");
            const split = trim.split('=>');
            const select = ((type === 'oldest') ? split[0] : split[1]);
            if (typeof select !== 'undefined') {
                let outReplaced = select.replace(/\]"/g, ']')
                    .replace(/"\[/g, '[')
                    .replace(/\]\[/g, '],[')
                    .replace(/\\"/g, '"');
                if (outReplaced.slice(-1) === ",") {
                    outReplaced = outReplaced.substring(0, outReplaced.length - 1)
                }
                object.push(JSON.parse(outReplaced)[0]);
            }
        });
        resolve(object);
    });
}

const grabContainerDefinition = (file, type) => {
    return new Promise(async (resolve, reject) => {
        if (typeof process.argv[2] === 'undefined') {
            resolve(JSON.stringify(await extractDefinition(file, type), null, 4));
        } else {
            fs.stat('./' + file, err => {
                if (err) reject(err);
                else {
                    exec(`terraform show ${file} -no-color |grep container_definitions`, async (err, stdout, stderr) => {
                        if (util.grep(stdout, 'container_definitions') === null) {
                            if (typeof data.clean === 'undefined' || !data.clean) console.error(colors.red("    × No container definitions found in plan"));
                            process.exit();
                        }
                        resolve(JSON.stringify(await extractDefinition(stdout, type), null, 4));
                    });
                }
            });
        }
    });
}

exports.grabDefinitions = (file, clean) => {
    return new Promise(async (resolve, reject) => {
        data.clean = clean;
        data.file = file;
        const oldest = await grabContainerDefinition(file, 'oldest');
        const latest = await grabContainerDefinition(file, 'latest');
        await checkForNewServices(JSON.parse(oldest), JSON.parse(latest));
        resolve({ oldest, latest });
    });
}

exports.prepareForAction = definitions => {
    return new Promise((resolve, reject) => {
        const oldest = definitions.oldest.split('\n');
        const latest = definitions.latest.split('\n');
        _.forEach(oldest, (item, index) => {
            oldest[index] = item.replace(',', '').trim();
        });
        _.forEach(latest, (item, index) => {
            latest[index] = item.replace(',', '').trim();
        });
        resolve({ oldest, latest });
    });
};

const removeUnwanted = lines => {
    return new Promise((resolve, reject) => {
        let adjusted = [];
        let similar = [];
        let similarity = 0;
        _.forEach(lines, (line, index) => {
            if (data.changes.length > 0) {
                _.forEach(data.changes, change => {
                    similarity = stringSimilarity.compareTwoStrings(change, line);
                    if (similarity > 0.6) similar.push(line);
                });
            }
            if (!line.match(/(\[\]|essential|protocol)/)) adjusted.push(line);
        });
        adjusted = _.filter(adjusted, item => similar.indexOf(item) < 0);
        resolve(_.uniq(adjusted));
    });
}

const separateKeysAndValues = line => {
    const array = _.trim(line).replace(/"/g, '').split(':');
    const key = array.shift();
    const value = _.trim(array.join(':'));
    return { key, value };
}

const generateOutput = (json, lines, type) => {
    return new Promise((resolve, reject) => {
        const file = ((typeof process.argv[2] !== 'undefined') ? process.argv[2] : "stdin");
        const changes = [];
        const check = [];

        if (type === 'changes') data.changes = lines;
        else data.deletes = lines;

        _.forEach(lines, line => {
            const latest = JSON.parse(json);
            const separated = separateKeysAndValues(line);
            _.forEach(latest, object => {
                const keys = _.keys(object);
                _.forEach(keys, key => {
                    if (key === "command" && _.toString(object[key]) !== "") {
                        if (!_.includes(check, _.toString(object[key]))) {
                            changes.push(`    - ${file} | (${object.name})  "${key}": ${_.toString(object[key])}`);
                            check.push(_.toString(object[key]));
                        }
                    }
                    if (key === separated.key && _.toString(object[key]) === separated.value && data.new.indexOf(object.name) < 0) {
                        changes.push(`    - ${file} | (${object.name})  ${line}`);
                    }
                    _.forEach(object[key], sub => {
                        if (typeof sub[separated.key] !== 'undefined' && sub[separated.key] === separated.value && data.new.indexOf(object.name) < 0) {
                            changes.push(`    - ${file} | (${object.name})  ${line}`);
                        }
                    });
                });
            });
        });
        resolve(changes);
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

const outputChangedLines = async (oldest, latest, collect) => {
    await calculateChanges(oldest, latest)
        .then(async lines => generateOutput(await grabContainerDefinition(data.file, 'latest'), lines, 'changes'))
        .then(output => {
            if (output.length > 0) console.log('   Lines that were changed or added:');
            _.forEach(_.uniq(output), change => console.log(colors.yellow(change)));
            collect();
        });
}

const outputDeletedLines = async (latest, oldest, collect) => {
    await calculateChanges(latest, oldest)
        .then(removeUnwanted)
        .then(async lines => generateOutput(await grabContainerDefinition(data.file, 'oldest'), lines, 'deleted'))
        .then(output => {
            if (output.length > 0) console.log('   Lines that were deleted:');
            _.forEach(output, change => console.log(colors.red(change)));
            collect();
        });
}

exports.processDefinitions = async definitions => {
    if (typeof data.clean !== 'undefined' && data.clean) {
        let json = [];
        _.forEach(definitions.latest, (line, index) => {
            if (definitions.oldest.indexOf(line) <= -1) {
                const separated = separateKeysAndValues(line);
                json.push({ key: separated.key, value: separated.value });
            }
        });
        console.log(JSON.stringify(json, null, 4));
    } else {
        console.log(colors.green('    √ Grabbing successful'));
        console.log('- Comparing the old container definitions with the new definitions');
        
        _.forEach(data.new, service => {
            console.log(colors.green(`    + New service (${service}) found`));
        });

        const collect = _.after(2, () => {
            if ((data.changes.length + data.deletes.length === 0)) console.log('- No differences found');
        });

        await outputChangedLines(definitions.oldest, definitions.latest, collect);
        await outputDeletedLines(definitions.latest, definitions.oldest, collect);
    }
}

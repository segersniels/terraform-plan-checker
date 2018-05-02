const fs = require('fs');
const _ = require('lodash');
const exec = require('child_process').exec;
const colors = require('colors/safe');
const stringSimilarity = require('string-similarity');

const data = {};

const checkForNewServices = (oldest, latest) => {
    return new Promise((resolve, reject) => {
        const detected = [];
        const oldestNames = _.map(JSON.parse(oldest), i => i.name);
        const latestNames = _.map(JSON.parse(latest), i => i.name);
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
        resolve(detected);
    });
}

const grabContainerDefinition = type => {
    return new Promise((resolve, reject) => {
        fs.stat('./' + process.argv[2], err => {
            if (err) reject(err);
            else {
                exec(`terraform show ${process.argv[2]} -no-color |grep container_definitions`, (err, stdout, stderr) => {
                    if (stdout === "") {
                        console.error("ERR: this plan does nothing.");
                        process.exit();
                    }
                    const trimmed = stdout.trim().split('container_definitions:');
                    const services = _.compact(trimmed);
                    const object = [];
                    _.forEach(services, service => {
                        const trim = service.trim().replace("(forces new resource)", "").replace(/\s/g, "");
                        const split = trim.split('=>');
                        const select = type === 'oldest' ? split[0] : split[1];
                        const outReplaced = select.replace(/\]"/g, ']')
                            .replace(/"\[/g, '[')
                            .replace(/\]\[/g, '],[')
                            .replace(/\\"/g, '"');
                        object.push(JSON.parse(outReplaced)[0]);
                    });
                    if (stderr) console.log(stderr);
                    else {
                        resolve(JSON.stringify(object, null, 4));
                    }
                });
            }
        });
    });
}

exports.grabDefinitions = (file, clean) => {
    return new Promise(async (resolve, reject) => {
        data.clean = clean;
        if (!fs.existsSync(file)) return reject(`ERR: can't open file ${file}`);
        if (!clean) console.log('- Grabbing the container definitions');
        const oldest = await grabContainerDefinition('oldest');
        const latest = await grabContainerDefinition('latest');
        await checkForNewServices(oldest, latest);
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
        if (type === 'changes') data.changes = lines;
        else data.deletes = lines;
        let changes = [];
        _.forEach(lines, line => {
            const latest = JSON.parse(json);
            const separated = separateKeysAndValues(line);
            _.forEach(latest, object => {
                const keys = _.keys(object);
                _.forEach(keys, key => {
                    if (key === separated.key && _.toString(object[key]) === separated.value && data.new.indexOf(object.name) < 0) {
                        changes.push(`    - ${process.argv[2]} | (${object.name})  ${line}`);
                    }
                    _.forEach(object[key], sub => {
                        if (typeof sub[separated.key] !== 'undefined' && sub[separated.key] === separated.value && data.new.indexOf(object.name) < 0) {
                            changes.push(`    - ${process.argv[2]} | (${object.name})  ${line}`);
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
        .then(async lines => generateOutput(await grabContainerDefinition('latest'), lines, 'changes'))
        .then(output => {
            if (output.length > 0) console.log('   Lines that were changed or added:');
            _.forEach(_.uniq(output), change => console.log(colors.yellow(change)));
            collect();
        });
}

const outputDeletedLines = async (latest, oldest, collect) => {
    await calculateChanges(latest, oldest)
        .then(removeUnwanted)
        .then(async lines => generateOutput(await grabContainerDefinition('oldest'), lines, 'deleted'))
        .then(output => {
            if (output.length > 0) console.log('   Lines that were deleted:');
            _.forEach(output, change => console.log(colors.red(change)));
            collect();
        });
}

exports.processDefinitions = async definitions => {
    if (data.clean) {
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
            if (data.changes.length + data.deletes.length === 0) console.log('- No differences found');
        });
        await outputChangedLines(definitions.oldest, definitions.latest, collect);
        await outputDeletedLines(definitions.latest, definitions.oldest, collect);
    }
}

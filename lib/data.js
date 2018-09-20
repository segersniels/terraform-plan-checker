const fs = require("fs");
const _ = require("lodash");
const { exec } = require("child_process");
const colors = require("colors/safe");
const stringSimilarity = require("string-similarity");
const stripAnsi = require("strip-ansi");
const {
    grep,
    fixBracketsAndCommas,
    parseJsonForTTY,
    stringifyJsonForTTY
} = require("./util");

const data = {
    changes: [],
    deletes: [],
    new: []
};

const prepareForAction = definitions => {
    const oldest = _.map(
        stringifyJsonForTTY(definitions.oldest).split("\n"),
        item => item.replace(",", "").trim()
    );
    const latest = _.map(
        stringifyJsonForTTY(definitions.latest).split("\n"),
        item => item.replace(",", "").trim()
    );
    return Promise.resolve({ oldest, latest });
};

/**
 * Process and output the definitions
 *
 * @param {Object} definitions
 */
const processDefinitions = async definitions => {
    if (!_.isUndefined(data.clean) || data.clean) {
        const json = _.compact(
            _.map(definitions.latest, line => {
                if (!_.includes(definitions.oldest, line)) {
                    const separated = separateKeysAndValues(line);
                    return { key: separated.key, value: separated.value };
                }
            })
        );
        if (json.length > 0) console.log(JSON.stringify(json, null, 4));
    } else {
        console.log(colors.green("    √ Grabbing successful"));
        console.log(
            "- Comparing the old container definitions with the new definitions"
        );

        _.forEach(data.new, service => {
            console.log(colors.green(`    + New service (${service}) found`));
        });

        const collect = _.after(2, () => {
            if (data.changes.length + data.deletes.length === 0)
                console.log("- No differences found");
        });

        await outputChangedLines(
            definitions.oldest,
            definitions.latest,
            collect
        );
        await outputDeletedLines(
            definitions.latest,
            definitions.oldest,
            collect
        );
    }
};

/**
 * Returns the correct definition in case the definition contains more than one (eg. links)
 *
 * @param {Array} definition
 * @returns
 */
const determineCorrectDefinition = definition => {
    return definition.length > 1
        ? _.filter(definition, i => !_.isUndefined(i.links))[0]
        : definition[0];
};

/**
 * Converts the terraform plan output to valid JSON
 *
 * @param {String} content
 * @param {String} type
 * @returns {Object}
 */
const extractDefinition = (content, type) => {
    const trimmed = stripAnsi(content)
        .trim()
        .split("container_definitions:");
    const services = _.compact(trimmed);
    if (services.length === 0) return Promise.resolve([]);
    const promises = _.map(services, service => {
        return new Promise((resolve, reject) => {
            const trim = service
                .trim()
                .replace("(forces new resource)", "")
                .replace(/\s/g, "");
            const split = trim.split("=>");
            const newService = split.length === 1 ? true : false;
            const select = type === "oldest" ? split[0] : split[1];
            if (!newService) {
                const fixed = fixBracketsAndCommas(select);
                resolve(determineCorrectDefinition(JSON.parse(fixed)));
            } else {
                const fixed = JSON.parse(fixBracketsAndCommas(split[0]));
                if (!_.includes(data.new, fixed[0].name))
                    data.new.push(fixed[0].name);
                resolve({});
            }
        });
    });
    return Promise.all(promises);
};

/**
 * Extract the container_definitions from the terraform command output
 *
 * @param {String} file
 * @param {String} type
 * @returns {String}
 */
const grabContainerDefinition = (file, type) => {
    if (!_.isUndefined(data.clean) || data.clean)
        return Promise.resolve(JSON.stringify([], null, 4));
    if (_.isUndefined(process.argv[2]))
        return Promise.resolve(extractDefinition(file, type), null, 4);
    return new Promise((resolve, reject) => {
        fs.stat("./" + file, err => {
            if (err) reject(err);
            else {
                exec(
                    `terraform show ${file} -no-color`,
                    async (err, stdout, stderr) => {
                        if (grep(stdout, "container_definitions") === null) {
                            if (_.isUndefined(data.clean) || !data.clean) {
                                const error = new Error(
                                    "    × No container definitions found in plan"
                                );
                                console.error(
                                    colors.red(
                                        "    × No container definitions found in plan"
                                    )
                                );
                                return reject(error);
                            }
                        }
                        const definitions = grep(
                            stdout,
                            "container_definitions"
                        ).join("\n");
                        resolve(
                            JSON.stringify(
                                await extractDefinition(definitions, type),
                                null,
                                4
                            )
                        );
                    }
                );
            }
        });
    });
};

const initDefinitions = async (file, clean) => {
    data.clean = clean;
    data.file = file;
    const oldest = await grabContainerDefinition(file, "oldest");
    const latest = await grabContainerDefinition(file, "latest");
    return Promise.resolve({ oldest, latest });
};

const removeUnwantedChangedLines = lines => {
    return new Promise((resolve, reject) => {
        const adjusted = [];
        _.forEach(lines, (line, index) => {
            if (!line.match(/(\[\]|essential|protocol|memory|image)/))
                adjusted.push(line);
        });
        resolve(_.uniq(adjusted));
    });
};

const removeUnwantedDeletedLines = lines => {
    return new Promise((resolve, reject) => {
        let adjusted = [];
        let similar = [];
        let similarity = 0;
        _.forEach(lines, (line, index) => {
            if (data.changes.length > 0) {
                _.forEach(data.changes, change => {
                    similarity = stringSimilarity.compareTwoStrings(
                        change,
                        line
                    );
                    if (similarity > 0.6) similar.push(line);
                });
            }
            if (!line.match(/(\[\]|essential|protocol|memory|image)/))
                adjusted.push(line);
        });
        adjusted = _.filter(adjusted, item => similar.indexOf(item) < 0);
        resolve(_.uniq(adjusted));
    });
};

const separateKeysAndValues = line => {
    const array = _.trim(line)
        .replace(/"/g, "")
        .split(":");
    const key = array.shift();
    const value = _.trim(array.join(":"));
    return { key, value };
};

const generateOutput = (json, lines, type) => {
    return new Promise((resolve, reject) => {
        const file =
            typeof process.argv[2] !== "undefined" ? process.argv[2] : "stdin";
        if (lines.length > 0) {
            if (type === "changes") data.changes.push(lines);
            else data.deletes.push(lines);
        }
        const changes = [];
        _.forEach(lines, async line => {
            const latest = parseJsonForTTY(json);
            const separated = separateKeysAndValues(line);
            _.forEach(latest, object => {
                const keys = _.keys(object);
                _.forEach(keys, key => {
                    if (
                        key === separated.key &&
                        _.toString(object[key]) === separated.value &&
                        data.new.indexOf(object.name) < 0
                    ) {
                        changes.push(
                            `    - ${file} | (${object.name})  ${line}`
                        );
                    }
                    _.forEach(object[key], sub => {
                        if (
                            typeof sub[separated.key] !== "undefined" &&
                            sub[separated.key] === separated.value &&
                            data.new.indexOf(object.name) < 0
                        ) {
                            changes.push(
                                `    - ${file} | (${object.name})  ${line}`
                            );
                        }
                    });
                });
            });
        });
        resolve(changes);
    });
};

const addTopLevelChanges = async output => {
    const oldest = !process.stdin.isTTY
        ? await grabContainerDefinition(data.file, "oldest")
        : JSON.parse(await grabContainerDefinition(data.file, "oldest"));
    const latest = !process.stdin.isTTY
        ? await grabContainerDefinition(data.file, "latest")
        : JSON.parse(await grabContainerDefinition(data.file, "latest"));
    const file =
        typeof process.argv[2] !== "undefined" ? process.argv[2] : "stdin";
    _.forEach(latest, late => {
        const name = late.name;
        if (!_.includes(data.new, name)) {
            const old = _.filter(oldest, i => i.name === name)[0];
            _.forEach(_.keys(late), key => {
                if (late[key] !== old[key] && typeof late[key] !== "object") {
                    output.push(
                        `    - ${file} | (${name})  "${key}": "${late[key]}"`
                    );
                }
                if (typeof late[key] === "object" && key !== "environment") {
                    if (_.join(late[key], " ") !== _.join(old[key], " ")) {
                        output.push(
                            `    - ${file} | (${name})  "${key}": "${_.join(
                                late[key],
                                ", "
                            )}"`
                        );
                    }
                }
            });
        }
    });
    data.changes = output;
    return new Promise((resolve, reject) => resolve(output));
};

const calculateChanges = (check, iterate) => {
    return new Promise((resolve, reject) => {
        let lines = [];
        _.forEach(iterate, line => {
            if (check.indexOf(line) <= -1) lines.push(line);
        });
        resolve(lines);
    });
};

const outputChangedLines = async (oldest, latest, collect) => {
    const json = await grabContainerDefinition(data.file, "latest");
    await calculateChanges(oldest, latest)
        .then(removeUnwantedChangedLines)
        .then(lines => generateOutput(json, lines, "changes"))
        .then(async output => {
            output = await addTopLevelChanges(output);
            if (output.length > 0)
                console.log("   Lines that were changed or added:");
            _.forEach(_.uniq(output), change =>
                console.log(colors.yellow(change))
            );
            collect();
        });
};

const outputDeletedLines = async (latest, oldest, collect) => {
    const json = await grabContainerDefinition(data.file, "oldest");
    await calculateChanges(latest, oldest)
        .then(removeUnwantedDeletedLines)
        .then(lines => generateOutput(json, lines, "deleted"))
        .then(output => {
            if (output.length > 0) console.log("   Lines that were deleted:");
            _.forEach(output, change => console.log(colors.red(change)));
            collect();
        });
};

module.exports = {
    initDefinitions,
    prepareForAction,
    processDefinitions
};

#!/usr/bin/env node
const program = require("commander");
const package = require("./package.json");
const colors = require("colors/safe");
const _ = require("lodash");
const fs = require("fs");

const data = require("./lib/data.js");
const { grep } = require("./lib/util");

let file;
const stdin = process.stdin;
const input = [];

program
    .version(package.version)
    .option("-c, --clean", "only output the lines that are different")
    .parse(process.argv);

const exec = (input, clean) => {
    if (typeof clean === "undefined" || !clean)
        console.log("- Grabbing the container definitions");
    if (input.length === 0) {
        // when stdin has no container definitions
        if (typeof clean === "undefined" || !clean)
            console.error(
                colors.red("    × No container definitions found in plan")
            );
        process.exit();
    }
    data.initDefinitions(input, clean)
        .then(data.prepareForAction)
        .then(data.processDefinitions)
        .catch(err => console.error(colors.red("    × Grabbing unsuccessful")));
};

if (!process.stdin.isTTY) {
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", content => {
        input.push(grep(content, "container_definitions:"));
    });
    stdin.on("end", () => {
        if (program.args.length !== 0) {
            console.error(colors.red("ERR: received both stdin and file"));
            process.exit();
        }
        exec(_.compact(input).join("\n"), program.clean);
    });
} else {
    if (program.args.length === 0 || !fs.existsSync(program.args[0])) {
        console.error(colors.red("ERR: no file specified or doesn't exist"));
        process.exit();
    }
    exec(program.args[0], program.clean);
}

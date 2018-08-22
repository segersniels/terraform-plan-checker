const grep = (string, patternToSearch) => {
    var regexPatternToSearch = new RegExp(
        "^.*(" + patternToSearch + ").*$",
        "mg"
    );
    return string.match(regexPatternToSearch);
};

const parseJsonForTTY = json => {
    return !process.stdin.isTTY ? json : JSON.parse(json);
};

const stringifyJsonForTTY = json => {
    return !process.stdin.isTTY ? JSON.stringify(json, null, 4) : json;
};

const fixBracketsAndCommas = json => {
    let replaced = json
        .replace(/\]"/g, "]")
        .replace(/"\[/g, "[")
        .replace(/\]\[/g, "],[")
        .replace(/\\"/g, '"');
    if (replaced.slice(-1) === ",") {
        replaced = replaced.substring(0, replaced.length - 1);
    }
    return replaced;
};

module.exports = {
    grep,
    parseJsonForTTY,
    stringifyJsonForTTY,
    fixBracketsAndCommas
};

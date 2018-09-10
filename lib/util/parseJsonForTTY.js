/**
 * See if the input is coming through STDIN to determine whether to parse the json string or not
 *
 * @param {*} json
 * @returns
 */
const parseJsonForTTY = json => {
    return !process.stdin.isTTY ? json : JSON.parse(json);
};

module.exports = parseJsonForTTY;

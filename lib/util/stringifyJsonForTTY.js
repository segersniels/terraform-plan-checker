/**
 * See if the input is coming through STDIN to determine whether to stringify the json or not
 *
 * @param {*} json
 * @returns
 */
const stringifyJsonForTTY = json => {
    return !process.stdin.isTTY ? JSON.stringify(json, null, 4) : json;
};

module.exports = stringifyJsonForTTY;

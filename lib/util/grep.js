/**
 * Mimics linux grep
 *
 * @param {String} string
 * @param {String} patternToSearch
 * @returns {Array}
 */
const grep = (string, patternToSearch) => {
    var regexPatternToSearch = new RegExp(
        "^.*(" + patternToSearch + ").*$",
        "mg"
    );
    return string.match(regexPatternToSearch);
};

module.exports = grep;

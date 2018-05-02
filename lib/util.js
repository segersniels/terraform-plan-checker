exports.grep = (string, patternToSearch) => {
    var regexPatternToSearch = new RegExp("^.*(" + patternToSearch + ").*$", "mg");
    return string.match(regexPatternToSearch);
}
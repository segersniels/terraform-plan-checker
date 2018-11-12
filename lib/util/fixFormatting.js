/**
 * Fixes the incoming Terraform output so we can later format it as a correct JSON object
 *
 * @param {String} json
 * @returns {String}
 */
const fixFormatting = json => {
    let replaced = json
        .replace(/\]"/g, "]")
        .replace(/"\[/g, "[")
        .replace(/\]\[/g, "],[")
        .replace(/\\"/g, '"')
        .replace(/\\\\\"/g, "'");
    if (replaced.slice(-1) === ",") {
        replaced = replaced.substring(0, replaced.length - 1);
    }
    return replaced;
};

module.exports = fixFormatting;

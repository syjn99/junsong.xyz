// @tryghost/helpers readingTime, shared by the site and the Ghost importer.

// countWords: CJK/Hangul runs count one word per character.
function countWords(html) {
    const text = html.replace(/<(.|\n)*?>/g, ' ');
    const pattern =
        /[a-zA-ZÀ-ÿ0-9_Β-ωА-ӹ]+|[一-鿿㐀-䶿豈-﫿぀-ゟ가-힯]+/g;
    let count = 0;
    for (const m of text.match(pattern) ?? []) {
        count += m.charCodeAt(0) >= 0x4e00 ? m.length : 1;
    }
    return count;
}

/**
 * @param {string} html
 * @param {boolean} hasFeatureImage
 * @returns {string}
 */
export function readingTime(html, hasFeatureImage) {
    const imageCount = (html.match(/<img(.|\n)*?>/g) ?? []).length + (hasFeatureImage ? 1 : 0);
    let seconds = countWords(html) / (275 / 60);
    for (let i = 12; i > 12 - imageCount; i -= 1) seconds += Math.max(i, 3);
    const minutes = Math.round(seconds / 60);
    return minutes <= 1 ? '1 min read' : `${minutes} min read`;
}

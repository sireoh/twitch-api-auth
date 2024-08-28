const proxy = "http://localhost:3000";

function buildLinks(...args) {
    let str = "<ul>";
    args.forEach((link) => {
        str += `
            <li>
                <a href=${link}>${proxy + link}</a>
            </li>
        `;
    });
    str += "</ul>"
    return str;
}

module.exports = {
    buildLinks,
}
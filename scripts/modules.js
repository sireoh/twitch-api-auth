const proxy = "http://localhost:3000";

function buildLinks(...args) {
    let str = "<ul>";
    args.forEach((link) => {
        str += `
            <li>
                <a href="${link}">${proxy + link}</a>
            </li>
        `;
    });
    str += "</ul>"
    return str;
}

async function getID(username, OPTIONS) {
    const url = `https://api.twitch.tv/helix/users?login=${username}`;
    try {
        const response = await fetch(url, OPTIONS);
        const result = await response.json();
        if (result && result.data && result.data.length > 0) {
            return result.data[0].id;
        } else {
            console.log("No user data found.");
            return undefined;
        }
    } catch (error) {
        console.log("Error: " + error);
        return undefined;
    }
}

function verifySignature(messageSignature, messageID, messageTimestamp, body) {
    let message = messageID + messageTimestamp + body
    let signature = crypto.createHmac('sha256', "keepItSecretKeepItSafe").update(message) // Remember to use the same secret set at creation
    let expectedSignatureHeader = "sha256=" + signature.digest("hex")

    return expectedSignatureHeader === messageSignature
}

module.exports = {
    buildLinks,
    getID,
    verifySignature
}
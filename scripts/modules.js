const proxy = "http://localhost:3000";

function buildLinks(...args) {
    let str = `<ul
        style='
            list-style: none;
            padding-left: 0;
            margin-left: 0;
        '
    >`;
    args.forEach((link) => {
        str += `
            <li>
                <a href="${link}">${link.includes("/api/") ? link.split("/api/")[1] : link.substring(1)}</a>
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
            return undefined;
        }
    } catch (error) {
        console.log("Error: " + error);
        return undefined;
    }
}

async function getGame(username, OPTIONS) {
  let id;

  try {
    id = await getID(username, OPTIONS);
  } catch (error) {
    console.log("id not found", error);
  }

  if (id) {
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${id}`;
    try {
        const response = await fetch(url, OPTIONS);
        const result = await response.json();
        if (result && result.data && result.data.length > 0) {
            return result.data[0].game_name;
        } else {
            return undefined;
        }
    } catch (error) {
      console.error(error.message);
    }
  }
}

async function shoutOut(username, OPTIONS) {
    const game = await getGame(username, OPTIONS);
    return `You should checkout ${username}! They stream ${ game }.`;
}

module.exports = {
    buildLinks,
    getID,
    shoutOut
}
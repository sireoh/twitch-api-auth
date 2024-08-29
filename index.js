// Define our dependencies
var express=require('express');
var session=require('express-session');
var passport=require('passport');
var OAuth2Strategy=require('passport-oauth').OAuth2Strategy;
var request=require('request');
require('dotenv').config();
const port = 3000;
const proxy = `http://localhost:${port}`;
const { 
  buildLinks,
  getID,
  verifySignature
 } = require("./scripts/modules");
let OPTIONS = {};

// Define our constants, you will change these with your own
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_SECRET = process.env.TWITCH_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CALLBACK_URL = proxy + "/auth/twitch/callback";

// Initialize Express and middlewares
var app = express();
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read channel:read:redemptions' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    // console.log(req.session.passport);
    OPTIONS = {
      method: "GET",
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        'Authorization': "Bearer " + req.session.passport.user.accessToken
      }
    };
    req
    res.send(buildLinks(
      "/api/channel_info",
      "/api/streams",
      "/api/redeemlist"
    ));
  } else {
    res.send(`
      <a href="/auth/twitch">${proxy + "/auth/twitch"}</a>
      `);
  }
});

app.get('/api/channel_info', async function (req, res) {
  const username = req.query.username ? req.query.username : "sireoh";
  let id;

  try {
    id = await getID(username, OPTIONS);
  } catch (error) {
    console.log("id not found", error);
  }

  if (id) {
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${id}`;
    try {
      await fetch(url, OPTIONS)
        .then(async (response) => {
          data = await response.json();
          res.send(data);
        })
        .catch((error) => {
          console.log("Error: " + error);
        })
    } catch (error) {
      console.error(error.message);
    }
  }
});

app.get('/api/streams', async function (req, res) {
  const usernames = [
    "sireoh",
    "froggythighs",
    "is_my_nan_0",
    "meeshchannel",
    "DemonRebuilt"
  ];

  try {
    let ids = await Promise.all(
      usernames.map(async (user) => {
        try {
          const id = await getID(user, OPTIONS);
          return { username: user, id: id };
        } catch (error) {
          console.error("Error fetching ID for user:", user, error);
          return null;
        }
      })
    );
    res.send(ids);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});

app.get('/api/redeemlist', async function (req, res) {
  const username = req.query.username ? req.query.username : "sireoh";
  let id;

  try {
    id = await getID(username, OPTIONS);
  } catch (error) {
    console.log("id not found", error);
  }

  if (id) {
    const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${id}`;
    try {
      const response = await fetch(url, OPTIONS);
      const result = await response.json();

      if (!result.data) {
        return res.status(404).send("No data found");
      }

      const rewards = result.data.map((item) => ({
        reward: [item.title, item.prompt],
        id: item.id
      }));

      res.send(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error.message);
      res.status(500).send("Error fetching rewards");
    }
  } else {
    res.status(404).send("User ID not found");
  }
});

app.listen(port, function () {
  console.log(`Server running on: ${proxy}!`)
});

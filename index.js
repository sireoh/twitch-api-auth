// Define our dependencies
var express=require('express');
var session=require('express-session');
var passport=require('passport');
var OAuth2Strategy=require('passport-oauth').OAuth2Strategy;
var request=require('request');
require('dotenv').config();
const port = 3000;
const proxy = "http://localhost:3000";
const { buildLinks } = require("./scripts/modules");

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
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    console.log(req.session.passport);
    res.send(buildLinks([
      "/channel_info",
    ]));
  } else {
    res.send(`
      <a href="/auth/twitch">${proxy + "/auth/twitch"}</a>
      `);
  }
});

app.get('/channel_info', async function (req, res) {
  const accessToken = req.session.passport.user.accessToken;
  const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${process.env.BROADCASTER_ID}`;
  try {
    await fetch(url, {
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        'Authorization': "Bearer " + accessToken
      }
    })
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
});

app.listen(port, function () {
  console.log(`Server running on port: ${port}!`)
});

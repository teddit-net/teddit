const config = require('./config');

global.client_id_b64 = Buffer.from(`${config.reddit_app_id}:`).toString(
  'base64'
);
global.reddit_access_token = null;
global.reddit_refresh_token = null;
global.ratelimit_counts = {};
global.ratelimit_timestamps = {};

const pug = require('pug');
const compression = require('compression');
const express = require('express');
const cookieParser = require('cookie-parser');
const { redis } = require('./inc/redis');

const nodeFetch = require('node-fetch');
const fetch = config.http_proxy
  ? (() => {
      const agent = require('https-proxy-agent')(config.http_proxy);
      return (url, options) => {
        const instanceOptions = {
          agent,
          ...options,
        };
        return nodeFetch(url, instanceOptions);
      };
    })()
  : nodeFetch;

const helmet = require('helmet');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const request = require('postman-request');
const commons = require('./inc/commons.js')(request, fs);
const dlAndSave = require('./inc/downloadAndSave.js')(commons);

['pics/thumbs', 'pics/flairs', 'pics/icons', 'vids']
  .map((d) => `./static/${d}`)
  .filter((d) => !fs.existsSync(d))
  .forEach((d) => fs.mkdirSync(d, { recursive: true }));

if (!config.https_enabled && config.redirect_http_to_https) {
  console.error(`Cannot redirect HTTP=>HTTPS while "https_enabled" is false.`);
}

let https = null;
if (config.https_enabled) {
  const privateKey = fs.readFileSync(`${config.cert_dir}/privkey.pem`, 'utf8');
  const certificate = fs.readFileSync(`${config.cert_dir}/cert.pem`, 'utf8');
  const ca = fs.readFileSync(`${config.cert_dir}/fullchain.pem`, 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };
  https = require('https').Server(credentials, app);
  global.protocol = 'https://';
} else {
  global.protocol = 'http://';
}

const http = require('http').Server(app);

if (config.redirect_www) {
  app.use((req, res, next) => {
    if (req.headers.host) {
      if (req.headers.host.slice(0, 4) === 'www.') {
        let newhost = req.headers.host.slice(4);
        return res.redirect(
          301,
          `${req.protocol}://${newhost}${req.originalUrl}`
        );
      }
    }
    next();
  });
}

if (config.use_helmet && config.https_enabled) {
  app.use(helmet());
  if (config.use_helmet_hsts) {
    app.use(helmet.hsts({ maxAge: 31536000, preload: true }));
  }
}

if (config.use_compression) {
  app.use(compression());
}

app.use(cookieParser());

if (config.use_view_cache) {
  app.set('view cache', true);
}

if (config.trust_proxy) {
  app.set('trust proxy', config.trust_proxy_address);
}

app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(`${__dirname}/static`));

app.set('views', './views');
app.set('view engine', 'pug');

if (config.redirect_http_to_https) {
  app.use((req, res, next) => {
    if (req.secure) next();
    else res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

const redditAPI = require('./inc/initRedditApi.js')(fetch);

/*
This is temporary. It's needed for the routes to work.
It can be removed once these functions are made more modular.
*/
module.exports = { redis, fetch, RedditAPI: redditAPI };

const allRoutes = require('./routes/index');

app.use('/', allRoutes);

// The old routes
//require('./routes')(app, redis, fetch, redditAPI);

const cacheControl = require('./cacheControl.js');
cacheControl.removeCacheFiles();

if (config.https_enabled) {
  https.listen(config.ssl_port, config.listen_address, () =>
    console.log(`Teddit running on https://${config.domain}:${config.ssl_port}`)
  );
}
http.listen(config.nonssl_port, config.listen_address, () =>
  console.log(`Teddit running on http://${config.domain}:${config.nonssl_port}`)
);

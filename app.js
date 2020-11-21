/**
 These you need to change:
*/
global.domain = 'teddit.net'
global.reddit_app_id = 'H6-HjZ5pUPjaFQ' // app ID in Reddit (type: "installed app")
/**
* You don't necessarily need to configure anything else if you are following the
* README installation guide.
*/
global.video_enabled = true // If true, we download videos from [valid_media_domains] domains
const SSL_PORT = 8088
const NONSSL_PORT = 8080
const LISTEN_ADDRESS = '0.0.0.0' // aka localhost
const cert_dir = `/home/teddit/letsencrypt/live/${domain}/`
const https_enabled = true
const redirect_http_to_https = true
const use_compression = true
const use_view_cache = false
const use_helmet = true
const use_helmet_hsts = true
const trust_proxy = false // Enable trust_proxy if you are using reverse proxy like nginx
const trust_proxy_address = '127.0.0.1'
global.setexs = {
  /**
  * Redis cache expiration values (in seconds).
  * When the cache expires, new content is fetched from Reddit's API (when
  * the given URL is revisited).
  */
  frontpage: 600,
  subreddit: 600,
  posts: 600,
  user: 600,
  searches: 600
}
global.client_id_b64 = Buffer.from(`${reddit_app_id}:`).toString('base64')
global.reddit_access_token = null
global.reddit_refresh_token = null
global.valid_media_domains = ['preview.redd.it', 'external-preview.redd.it', 'i.redd.it', 'v.redd.it', 'a.thumbs.redditmedia.com', 'b.thumbs.redditmedia.com', 'thumbs.gfycat.com', 'i.ytimg.com']
global.reddit_api_error_text = `Seems like your instance is either blocked (e.g. due to API rate limiting), reddit is currently down, or your API key is expired and not renewd properly. This can also happen for other reasons.`

const pug = require('pug')
const path = require('path')
const compression = require('compression')
const express = require('express')
const cookieParser = require('cookie-parser')
const r = require('redis')
const redis = r.createClient()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const fs = require('fs')
const app = express()
const request = require('postman-request')
const commons = require('./inc/commons.js')(request, fs)
const dlAndSave = require('./inc/downloadAndSave.js')(commons)

if(!https_enabled && redirect_http_to_https) {
  console.error(`Cannot redirect HTTP=>HTTPS while "https_enabled" is false.`)
}

let https = null
if(https_enabled) {
  const privateKey = fs.readFileSync(`${cert_dir}/privkey.pem`, 'utf8')
  const certificate = fs.readFileSync(`${cert_dir}/cert.pem`, 'utf8')
  const ca = fs.readFileSync(`${cert_dir}/chain.pem`, 'utf8')
  const credentials = {
	  key: privateKey,
	  cert: certificate,
	  ca: ca
  }
  https = require('https').Server(credentials, app)
  global.protocol = 'https://'
} else {
  global.protocol = 'http://'
}

const http = require('http').Server(app)

if(use_helmet && https_enabled) {
  app.use(helmet())
  if(use_helmet_hsts) {
    app.use(helmet.hsts({ maxAge: 31536000, preload: true }))
  }
}

if(use_compression) {
  app.use(compression())
}

app.use(cookieParser())

if(use_view_cache) {
  app.set('view cache', true)
}

if(trust_proxy) {
  app.set('trust proxy', trust_proxy_address)
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(`${__dirname}/dist`))

app.set('views', './views')
app.set('view engine', 'pug')

if(redirect_http_to_https) {
  app.use((req, res, next) => {
    if(req.secure)
      next()
    else
      res.redirect(`https://${req.headers.host}${req.url}`)
  })
}

const redditAPI = require('./inc/initRedditApi.js')(fetch)
require('./routes')(app, redis, fetch, redditAPI)

redis.on('error', (error) => {
  if(error) {
    console.error(`Redis error: ${error}`)
  }
})

if(https_enabled) {
  https.listen(SSL_PORT, LISTEN_ADDRESS, () => console.log(`Teddit running on https://${domain}`))
}
http.listen(NONSSL_PORT, LISTEN_ADDRESS, () => console.log(`Teddit running on http://${domain}`))

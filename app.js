const config = require('./config')

global.client_id_b64 = Buffer.from(`${config.reddit_app_id}:`).toString('base64')
global.reddit_access_token = null
global.reddit_refresh_token = null

const pug = require('pug')
const path = require('path')
const compression = require('compression')
const express = require('express')
const cookieParser = require('cookie-parser')
const r = require('redis')


const redis = (() => {
  if (!config.redis_enabled) {
    // Stub Redis if disabled
    return {
      get: (_, callback) => callback(null, null),
      setex: (_, _1, _2, callback) => callback(null),
      on: () => {}
    }
  }

  const redisOptions = {
    host: '127.0.0.1',
    port: 6379
  }
  
  if (config.redis_host) {
    redisOptions.host = config.redis_host
  }
  
  if (config.redis_port && config.redis_port > 0) {
    redisOptions.port = config.redis_port
  }  

  return r.createClient(redisOptions)
})()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const fs = require('fs')
const app = express()
const request = require('postman-request')
const commons = require('./inc/commons.js')(request, fs)
const dlAndSave = require('./inc/downloadAndSave.js')(commons)

if(!config.https_enabled && config.redirect_http_to_https) {
  console.error(`Cannot redirect HTTP=>HTTPS while "https_enabled" is false.`)
}

let https = null
if(config.https_enabled) {
  const privateKey = fs.readFileSync(`${config.cert_dir}/privkey.pem`, 'utf8')
  const certificate = fs.readFileSync(`${config.cert_dir}/cert.pem`, 'utf8')
  const ca = fs.readFileSync(`${config.cert_dir}/chain.pem`, 'utf8')
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

if(config.redirect_www) {
  app.use((req, res, next) => {
    if(req.headers.host) {
      if(req.headers.host.slice(0, 4) === 'www.') {
        let newhost = req.headers.host.slice(4)
        return res.redirect(301, `${req.protocol}://${newhost}${req.originalUrl}`)
      }
    }
    next()
  })
}

if(config.use_helmet && config.https_enabled) {
  app.use(helmet())
  if(config.use_helmet_hsts) {
    app.use(helmet.hsts({ maxAge: 31536000, preload: true }))
  }
}

if(config.use_compression) {
  app.use(compression())
}

app.use(cookieParser())

const preferencesMiddleware = (req, res, next) => {
  let themeOverride = req.query.theme
  if(themeOverride) {
    // Convert Dark to dark since the stylesheet has it lower case
    themeOverride = themeOverride.toLowerCase()
    // This override here will set it for the current request
    req.cookies.theme = themeOverride
    // this will set it for future requests
    res.cookie('theme', themeOverride, { maxAge: 31536000, httpOnly: true })
  } else if(!req.cookies.theme && req.cookies.theme !== '') {
    req.cookies.theme = config.theme
  }
  
  let flairsOverride = req.query.flairs
  if(flairsOverride) {
    req.cookies.flairs = flairsOverride
    res.cookie('flairs', flairsOverride, { maxAge: 31536000, httpOnly: true })
  }
  
  let nsfwEnabledOverride = req.query.nsfw_enabled
  if(nsfwEnabledOverride) {
    req.cookies.nsfw_enabled = nsfwEnabledOverride
    res.cookie('nsfw_enabled', nsfwEnabledOverride, { maxAge: 31536000, httpOnly: true })
  }
  
  next()
}

app.use(preferencesMiddleware)

if(config.use_view_cache) {
  app.set('view cache', true)
}

if(config.trust_proxy) {
  app.set('trust proxy', config.trust_proxy_address)
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(`${__dirname}/static`))

app.set('views', './views')
app.set('view engine', 'pug')

if(config.redirect_http_to_https) {
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

if(config.https_enabled) {
  https.listen(config.ssl_port, '::', () => console.log(`Teddit running on https://${config.domain}:${config.ssl_port}`))
}
http.listen(config.nonssl_port, '::', () => console.log(`Teddit running on http://${config.domain}:${config.nonssl_port}`))

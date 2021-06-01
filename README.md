# teddit

[teddit.net](https://teddit.net)

A free and open source alternative Reddit front-end focused on privacy.
Inspired by the [Nitter](https://github.com/zedeus/nitter) project.

* No JavaScript or ads
* All requests go through the backend, client never talks to Reddit
* Prevents Reddit from tracking your IP or JavaScript fingerprint
* [Unofficial API](https://codeberg.org/teddit/teddit/wiki#teddit-api) (RSS & JSON support, no rate limits or Reddit account required)
* Lightweight (teddit frontpage: ~30 HTTP requests with ~270 KB of data downloaded vs. Reddit frontpage: ~190 requests with ~24 MB)
* Self-hostable. Anyone can setup an instance. An instance can either use Reddit's API with or without OAuth (so Reddit API key is not necessarily needed).

Join the teddit discussion room on Matrix: [#teddit:matrix.org](https://matrix.to/#/#teddit:matrix.org)

XMR: 832ogRwuoSs2JGYg7wJTqshidK7dErgNdfpenQ9dzMghNXQTJRby1xGbqC3gW3GAifRM9E84J91VdMZRjoSJ32nkAZnaCEj

## Instances

[https://teddit.net](https://teddit.net) - Official instance

Community instances:

* [https://teddit.ggc-project.de](https://teddit.ggc-project.de)
* [https://teddit.kavin.rocks](https://teddit.kavin.rocks)
* [https://teddit.zaggy.nl](https://teddit.zaggy.nl)
* [https://teddit.namazso.eu](https://teddit.namazso.eu)
* [https://teddit.nautolan.racing](https://teddit.nautolan.racing)
* [https://teddit.tinfoil-hat.net](https://teddit.tinfoil-hat.net)
* [https://teddit.domain.glass](https://teddit.domain.glass)
* [ibarajztopxnuhabfu7f...onion](http://ibarajztopxnuhabfu7fg6gbudynxofbnmvis3ltj6lfx47b6fhrd5qd.onion) (not working since 06/2021)
* [xugoqcf2pftm76vbznx4...i2p](http://xugoqcf2pftm76vbznx4xuhrzyb5b6zwpizpnw2hysexjdn5l2tq.b32.i2p)

## Changelog

See ```CHANGELOG.md```
## Installation

### Docker-compose method

```console
wget https://codeberg.org/teddit/teddit/raw/branch/main/docker-compose.yml
docker-compose build
docker-compose up
```

Teddit should now be running at <http://localhost:8080>.

Docker image is available at [https://hub.docker.com/r/teddit/teddit](https://hub.docker.com/r/teddit/teddit).

#### Environment Variables

The following variables may be set to customize your deployment at runtime.

| Variable | Description |
|-|-|
| domain | Defines URL for Teddit to use (i.e. teddit.domain.com). Defaults to **127.0.0.1** |
| use_reddit_oauth | *Boolean* If true, "reddit_app_id" must be set with your own Reddit app ID. If false, Teddit uses Reddit's public API. Defaults to **false** |
| cert_dir | Defines location of certificates if using HTTPS (i.e. /home/teddit/le/live/teddit.net). No trailing slash. |
| theme | Automatically theme the user's browser experience. Options are *auto*, *dark*, *sepia*, or you can set *white* by setting the variable to empty ( '' ). Defaults to **auto** |
| flairs_enabled | Enables the rendering of user and link flairs on Teddit. Defaults to **true** |
| highlight_controversial | Enables controversial comments to be indicated by a typographical dagger (†). Defaults to **true** |
| api_enabled | Teddit API feature. Might increase loads significantly on your instance. Defaults to **true** |
| video_enabled | Enables video playback within Teddit. Defaults to **true** |
| redis_enabled | Enables Redis caching. If disabled, does not allow for any caching of Reddit API calls. Defaults to **true** |
| redis_db | Sets the redis DB name, if required |
| redis_host | Sets the redis host location, if required. Defaults to **127.0.0.1** |
| redis_password | Sets the redis password, if required |
| redis_port | Sets the redis port, if required. Defaults to **6379** |
| ssl_port | Sets the SSL port Teddit listens on. Defaults to **8088** |
| nonssl_port | Sets the non-SSL port Teddit listens on. Defaults to **8080** |
| listen_address | Sets the address Teddit listens for requests on. Defaults to **0.0.0.0** |
| https_enabled | *Boolean* Sets whether or not to enable HTTPS for Teddit. Defaults to **false** |
| redirect_http_to_https | *Boolean* Sets whether to force redirection from HTTP to HTTPS. Defaults to **false** |
| redirect_www | *Boolean* Redirects from www to non-www URL. For example, if true, Teddit will redirect https://www.teddit.com to https://teddit.com. Defaults to **false** |
| use_compression | *Boolean* If set to true, Teddit will use the [https://github.com/expressjs/compression](Node.js compression middleware) to compress HTTP requests with deflate/gzip. Defaults to **true** |
| use_view_cache | *Boolean* If this is set to true, view template compilation caching is enabled. Defaults to **false** |
| use_helmet | *Boolean* Recommended to be true when using https. Defaults to **false** |
| use_helmet_hsts | *Boolean* Recommended to be true when using https. Defaults to **false** |
| trust_proxy | *Boolean* Enable trust_proxy if you are using a reverse proxy like nginx or traefik. Defaults to **false** |
| trust_proxy_address | Location of trust_proxy. Defaults to **127.0.0.1** |
| nsfw_enabled | *Boolean* Enable NSFW (over 18) content. If false, a warning is shown to the user before opening any NSFW post. When the NFSW content is disabled, NSFW posts are hidden from subreddits and from user page feeds. Note: Users can set this to true or false from their preferences. Defaults to **true** |
| post_comments_sort | Defines default sort preference. Options are *confidence* (default sorting option in Reddit), *top*, *new*, *controversal*, *old*, *random*, *qa*, *live*. Defaults to **confidence** |
| reddit_app_id | If "use_reddit_oauth" config key is set to true, you have to obtain your Reddit app ID. For testing purposes it's okay to use this project's default app ID. Create your Reddit app here: https://old.reddit.com/prefs/apps/. Make sure to create an "installed app" type of app. Default is **ABfYqdDc9qPh1w** |

### Manual

1. Install [Node.js](https://nodejs.org).

1. (Optional) Install [redis-server](https://redis.io).

   Highly recommended – it works as a cache for Reddit API calls.

1. (Optional) Install [ffmpeg](https://ffmpeg.org).

   It's needed if you want to support videos.

   ```console
   # Linux
   apt install redis-server ffmpeg

   # macOS
   brew install redis
   ```

1. Clone and set up the repository.

   ```console
   git clone https://codeberg.org/teddit/teddit
   cd teddit
   npm install --no-optional
   cp config.js.template config.js # edit the file to suit your environment
   redis-server
   npm start
   ```

Teddit should now be running at <http://localhost:8080>.

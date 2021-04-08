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
* [https://teddit.namazso.eu/](https://teddit.namazso.eu/)
* [https://teddit.nautolan.racing](https://teddit.nautolan.racing)
* [https://teddit.tinfoil-hat.net](https://teddit.tinfoil-hat.net)
* [ibarajztopxnuhabfu7f...onion](http://ibarajztopxnuhabfu7fg6gbudynxofbnmvis3ltj6lfx47b6fhrd5qd.onion)
* [xugoqcf2pftm76vbznx4...i2p](http://xugoqcf2pftm76vbznx4xuhrzyb5b6zwpizpnw2hysexjdn5l2tq.b32.i2p)

## TODO

* User trophies
* "other discussions" feature
* "Open on reddit" links
* ... and lot of other small stuff

## Roadmap

* HLS video streaming? (Would require browser JavaScript)
* User login, so people can use their Reddit account through teddit to comment and up/downvote posts etc.
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

| Variable                | Description                                                                                                                                                                  |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| domain                  | Defines URL for Teddit to use (i.e. teddit.domain.com). Defaults to **127.0.0.1**                                                                                            |
| use_reddit_oauth        | *Boolean* If true, "reddit_app_id" must be set with your own Reddit app ID. If false, Teddit uses Reddit's public API. Defaults to **false**                                 |
| cert_dir                | Defines location of certificates if using HTTPS (i.e. /home/teddit/le/live/teddit.net). No trailing slash.                                                                   |
| theme                   | Automatically theme the user's browser experience. Options are *auto*, *dark*, *sepia*, or you can set *white* by setting the variable to empty ( '' ). Defaults to **auto** |
| flairs_enabled          | Enables the rendering of user and link flairs on Teddit. Defaults to **true**                                                                                                |
| highlight_controversial | Enables controversial comments to be indicated by a typographical dagger (†). Defaults to **true**                                                                           |
| api_enabled             | Teddit API feature. Might increase loads significantly on your instance. Defaults to **true**                                                                                |
| video_enabled           | Enables video playback within Teddit. Defaults to **true**                                                                                                                   |
| redis_enabled           | Enables Redis caching. If disabled, does not allow for any caching of Reddit API calls. Defaults to **true**                                                                 |
| redis_db                | Sets the redis DB name, if required                                                                                                                                          |
| redis_host              | Sets the redis host location, if required. Defaults to **127.0.0.1**                                                                                                         |
| redis_password          | Sets the redis password, if required                                                                                                                                         |
| redis_port              | Sets the redis port, if required. Defaults to **6379**                                                                                                                       |
| ssl_port                | Sets the SSL port Teddit listens on. Defaults to **8088**                                                                                                                    |
| nonssl_port             | Sets the non-SSL port Teddit listens on. Defaults to **8080**                                                                                                                |
| listen_address          | Sets the address Teddit listens for requests on. Defaults to **0.0.0.0**                                                                                                     |
| https_enabled           | *Boolean* Sets whether or not to enable HTTPS for Teddit. Defaults to **false**                                                                                              |
| redirect_http_to_https  | *Boolean* Sets whether to force redirection from HTTP to HTTPS. Defaults to **false**                                                                                        |
| redirect_www            |                                                                                                                                                                              |
| use_compression         |                                                                                                                                                                              |
| use_view_cache          |                                                                                                                                                                              |
| use_helmet              |                                                                                                                                                                              |
| use_helmet_hsts         |                                                                                                                                                                              |
| trust_proxy             |                                                                                                                                                                              |
| trust_proxy_address     |                                                                                                                                                                              |
| nsfw_enabled            |                                                                                                                                                                              |
| post_comments_sort      |                                                                                                                                                                              |
| reddit_app_id           |                                                                                                                                                                              |

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

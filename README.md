# teddit

[teddit.net](https://teddit.net)

A free and open source alternative Reddit front-end focused on privacy.
Inspired by the [Nitter](https://github.com/zedeus/nitter) project.

* No JavaScript or ads
* All requests go through the backend, client never talks to Reddit
* Prevents Reddit from tracking your IP or JavaScript fingerprint
* Lightweight (teddit frontpage: ~30 HTTP requests with ~270 KB of data downloaded vs. Reddit frontpage: ~190 requests with ~24 MB)

Join the teddit discussion room on Matrix: [#teddit:matrix.org](https://matrix.to/#/#teddit:matrix.org)

XMR: 832ogRwuoSs2JGYg7wJTqshidK7dErgNdfpenQ9dzMghNXQTJRby1xGbqC3gW3GAifRM9E84J91VdMZRjoSJ32nkAZnaCEj

BTC: bc1qlcrmt2pvlh4eq69l3l4h6z5jg74z2m2q3pasan

## Instances

[https://teddit.net](https://teddit.net) - Official instance

Community instances:

* [https://teddit.ggc-project.de](https://teddit.ggc-project.de)

## TODO

* Sort comments in post
* User attributes
* Comment and post attributes (e.g. stickies)
* Subreddit flairs and wikis
* User trophies
* "other discussions" feature
* "Open on reddit" links
* ... and lot of other small stuff

## Roadmap

* Unofficial reddit API through teddit
* Themes
* User settings
* HLS video streaming? (Would require browser JavaScript)
* Onion site
* User login, so people can use their Reddit account through teddit to comment and up/downvote posts etc.

## Installation

### Docker

Using [Docker and `docker-compose`](https://github.com/docker/compose):

```console
docker-compose build
docker-compose up
```

Teddit should now be running at <https://localhost:8080>.

### Manual

1. Install [Node.js](https://nodejs.org).
1. (Optional) Install [redis-server](https://redis.io).

   Highly recommended – it works as a cache for Reddit API calls.

1. (Optional) If you want to support videos, install [ffmpeg](https://ffmpeg.org)

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

Teddit should now be running at <https://localhost:8080>.

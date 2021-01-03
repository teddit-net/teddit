# THIS IS ONLY A MIRROR REPO! Main repository: https://codeberg.org/teddit/teddit

Please submit issues and PRs there, if possible. Thanks.

Not using GitHub because of privacy issues. See for example: https://github.com/Eloston/ungoogled-chromium/issues/795

# teddit

[teddit.net](https://teddit.net)

A free and open source alternative Reddit front-end focused on privacy.
Inspired by the [Nitter](https://github.com/zedeus/nitter) project.

* No JavaScript or ads
* All requests go through the backend, client never talks to Reddit
* Prevents Reddit from tracking your IP or JavaScript fingerprint
* [Unofficial API](https://codeberg.org/teddit/teddit/wiki#teddit-api) (no rate limits or Reddit account required)
* Lightweight (teddit frontpage: ~30 HTTP requests with ~270 KB of data downloaded vs. Reddit frontpage: ~190 requests with ~24 MB)
* Self-hostable. Anyone can setup an instance. An instance can either use Reddit's API with or without OAuth (so Reddit API key is not necessarily needed).

Join the teddit discussion room on Matrix: [#teddit:matrix.org](https://matrix.to/#/#teddit:matrix.org)

XMR: 832ogRwuoSs2JGYg7wJTqshidK7dErgNdfpenQ9dzMghNXQTJRby1xGbqC3gW3GAifRM9E84J91VdMZRjoSJ32nkAZnaCEj

BTC: bc1qlcrmt2pvlh4eq69l3l4h6z5jg74z2m2q3pasan

## Instances

[https://teddit.net](https://teddit.net) - Official instance

Community instances:

* [https://teddit.ggc-project.de](https://teddit.ggc-project.de)
* [https://teddit.kavin.rocks](https://teddit.kavin.rocks)

## TODO

* Subreddit wikis
* User trophies
* "other discussions" feature
* "Open on reddit" links
* ... and lot of other small stuff

## Roadmap

* More themes, not just white or dark
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

Teddit should now be running at <http://localhost:8080>.

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

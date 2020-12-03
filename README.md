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
* ... and lot of other small stuff

## Roadmap

* Unofficial reddit API through teddit
* Themes
* User settings
* HLS video streaming? (Would require browser JavaScript)
* Onion site
* User login, so people can use their Reddit account through teddit to comment and up/downvote posts etc.

## Installation

1. Install [node.js](https://nodejs.org/en/)\
For example:\
`# curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs`
1. Install [redis-server](https://redis.io/) and [ffmpeg](https://ffmpeg.org/)\
For example:\
`# apt install redis-server ffmpeg`\
Leave ffmpeg out if you don't want video support.
1. `$ git clone https://codeberg.org/teddit/teddit`
1. `$ cd teddit`
1. `$ npm install --no-optional`
1. Edit `config.js.template` to suit your environment. After done, rename it to `config.js`.
1. `$ node app.js`

Teddit should be now running on.


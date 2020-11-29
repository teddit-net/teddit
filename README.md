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

## TODO

* Subreddit sidebars
* Sort comments in post
* User attributes
* Comment and post attributes (e.g. stickies)
* Subreddit flairs
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
This is a quick guide how to run teddit on your own server. Tested on fresh install of Debian 10. You can install teddit also locally without certificates and so on, but there's no guide for it (not yet).

Run as root:

`# apt update && apt upgrade`

`# curl -sL https://deb.nodesource.com/setup_14.x | bash -`

`# apt install -y nodejs redis-server ffmpeg git curl certbot` *leave ffmpeg out if you don't want video support*

`# adduser teddit`

`# mkdir -p /home/teddit/letsencrypt/ /home/teddit/letsencrypt/logs/ /home/teddit/letsencrypt/lib/`

`# chown teddit:teddit -R /home/teddit/letsencrypt/`

`# iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080` *route port 8080 to 80*

`# iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8088` *route port 8088 to 443*

`# apt install iptables-persistent` *save iptables configuration to be persistent*

Edit redis.conf file and set **maxmemory** value suitable for your server (e.g. 75% of your total RAM):

`# nano /etc/redis/redis.conf`

Add this to the end of the file:

`maxmemory 2gb`

Also add maxmemory-policy:

`maxmemory-policy volatile-ttl`

Save and exit.

Restart redis:

`# systemctl restart redis`

Let's log in for teddit user.

`# su - teddit`

`$ git clone https://codeberg.org/teddit/teddit`

`$ cd teddit`

`$ npm install && npm update`

Let's obtain certificates. Run HTTP server:

`$ nohup node setup_server.js </dev/null &>/dev/null &`

Then run certbot. Change "teddit.net" to your domain, and also change the "ADD_YOUR_EMAIL_ADDRESS@SOMETHING.ORG" email.

`$ certbot certonly --webroot -w /home/teddit/teddit/dist/ -d teddit.net --agree-tos --no-eff-email --manual-public-ip-logging-ok --config-dir /home/teddit/letsencrypt/ --logs-dir /home/teddit/letsencrypt/logs/ --work-dir /home/teddit/letsencrypt/lib/ --email ADD_YOUR_EMAIL_ADDRESS@SOMETHING.ORG`

Kill the node HTTP server:

`$ ps aux | grep node`

`$ kill -9 [PID HERE]`

Change config variables in app.js for domain and Reddit app ID. Note: It's recommended that you get your own Reddit app ID. For testing purposes it's okay to use this project's default app ID. Create your Reddit app here: [https://old.reddit.com/prefs/apps/](https://old.reddit.com/prefs/apps/). Make sure to create an "installed app" type of app.

`$ nano app.js`

Save and exit.

Now let's start teddit:

`$ nohup node app.js > output.log &`

If everything went okay, you should have teddit instance running on your domain with a valid SSL certificate.
Tailing output.log:

`$ tail -f output.log`

You should see something like:

```
Teddit running on https://teddit.net
Teddit running on http://teddit.net
Successfully obtained a reddit API key.
```


### Other

* Using nohup for starting and killing the node process might be a bit of a hassle, but this project aims to be as minimalistic as possible. If you want to use process managers like [pm2](https://www.npmjs.com/package/pm2) it's perfectly fine.
* Teddit doesn't have any fancy logging built in. There's no IP address or even timestamp logging.

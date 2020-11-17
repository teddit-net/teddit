# teddit


[teddit.net](https://teddit.net)


A free and open source alternative Reddit front-end focused on privacy.
Inspired by the [Nitter](https://github.com/zedeus/nitter) project.

* No JavaScript or ads
* All requests go through the backend, client never talks to Reddit
* Prevents Reddit from tracking your IP or JavaScript fingerprint
* Lightweight (teddit frontpage: ~30 HTTP requests with ~270 KB of data downloaded vs. Reddit frontpage: ~190 requests with ~24 MB)

XMR: 832ogRwuoSs2JGYg7wJTqshidK7dErgNdfpenQ9dzMghNXQTJRby1xGbqC3gW3GAifRM9E84J91VdMZRjoSJ32nkAZnaCEj

BTC: bc1qlcrmt2pvlh4eq69l3l4h6z5jg74z2m2q3pasan

## Installation
This is a quick guide how to run teddit on your own server with domain teddit.net. Change teddit.net to your own domain in the following steps. Tested on fresh install of Debian 10. Run as root:

`# apt update && apt upgrade`

`# curl -sL https://deb.nodesource.com/setup_14.x | bash -`

`# apt install -y nodejs redis-server ffmpeg git curl certbot` *leave ffmpeg out if you don't want video support*

`# adduser teddit`

`# mkdir -p /home/teddit/letsencrypt/`

`# mkdir -p /home/teddit/letsencrypt/`

`# mkdir -p /home/teddit/letsencrypt/logs/`

`# mkdir -p /home/teddit/letsencrypt/lib/`

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

Save and exit the file.

Restart redis:

`# systemctl restart redis`

Let's log in for teddit user.

`# su - teddit`

`$ git clone https://codeberg.org/teddit/teddit`

`$ cd teddit`

`$ npm install && npm update`

Let's obtain certificates. Run HTTP server:

`$ nohup node setup_server.js </dev/null &>/dev/null &`

Then run certbot. Change your email ("ADD_YOUR_EMAIL_ADDRESS@SOMETHING.ORG") and domain.

`$ certbot certonly --webroot -w /home/teddit/teddit/dist/ -d teddit.net --agree-tos --no-eff-email --manual-public-ip-logging-ok --config-dir /home/teddit/letsencrypt/ --logs-dir /home/teddit/letsencrypt/logs/ --work-dir /home/teddit/letsencrypt/lib/ --email ADD_YOUR_EMAIL_ADDRESS@SOMETHING.ORG`

Kill the node HTTP server:

`$ ps aux | grep node`

`$ kill -9 [PID HERE]`

Change config variables in app.js, domain and Reddit app ID. Note: It's recommended that you get your own Reddit app ID. For testing purposes it's okay to use this project's default app ID. Create your Reddit app here: [https://old.reddit.com/prefs/apps/](https://old.reddit.com/prefs/apps/) and update its ID to the app.js. Make sure to create an "installed app" type of app.

`$ nano app.js`

Save and exit.

Now let's start teddit:

`$ nohup node app.js > output.log &`

If everything went okay, you should have teddit instance running on your domain with a valid SSL certificate.
If you see the output.log:

`$ tail -f output.log`

You should see something like:

```
Teddit running on https://teddit.net
Teddit running on http://teddit.net
Successfully obtained a reddit API key.
```

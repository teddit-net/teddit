const config = require('../config');
const { redis, fetch } = require('../app');
const homeRoute = require('express').Router();

const processJsonSubreddit = require('../inc/processJsonSubreddit.js');
const tedditApiSubreddit = require('../inc/teddit_api/handleSubreddit.js')();
const processMoreComments = require('../inc/processMoreComments.js')();

homeRoute.get('/', (req, res, next) => {
  if (
      (config.clean_homepage && req.cookies.prefer_frontpage !== 'true') ||
      (!config.clean_homepage && req.cookies.prefer_frontpage == 'undefined')
  ) {
    return res.render('homepage', {
      user_preferences: req.cookies,
      instance_config: config,
    });
  }

  next();
});

homeRoute.get([`/:sort?`, '/frontpage'], async (req, res, next) => {
  let past = req.query.t;
  let before = req.query.before;
  let after = req.query.after;
  let sortby = req.params.sort || '';
  let api_req = req.query.api;
  let api_type = req.query.type;
  let api_target = req.query.target;

  let proxyable =
    sortby.includes('.jpg') ||
    sortby.includes('.png') ||
    sortby.includes('.jpeg') ||
    sortby.includes('.mp4') ||
    sortby.includes('.gif') ||
    sortby.includes('.gifv')
      ? true
      : false;
  if (proxyable) {
    let media_url = '';
    const replacable_media_domains = ['i.redd.it', 'v.redd.it', 'external-preview.redd.it', 'preview.redd.it']
    if (req.query.teddit_proxy) {
      if (replacable_media_domains.includes(req.query.teddit_proxy)) {
        let full_url = req.protocol + '://' + req.get('host') + req.originalUrl;
        let u = new URL(full_url);
        let filename = u.pathname || '';
        let query = u.search || '';
        if (query != '') {
          let params = new URLSearchParams(query);
          params.delete('teddit_proxy');
          query = '?' + params.toString();
        }
        media_url = `https://${req.query.teddit_proxy}${filename}${query}`;
      }
    } else {
      let params = new URLSearchParams(req.query).toString();
      media_url = `https://preview.redd.it/${sortby}?${params}`;
      if (media_url.includes('teddit_proxy')) {
        // if the URL includes teddit_proxy query param, remove everything after it
        media_url = media_url.split('%3Fteddit_proxy')[0];
      }
    }

    let proxied_media = await downloadAndSave(media_url);
    if (proxied_media) {
      return res.redirect(proxied_media);
    } else {
      return res.redirect('/');
    }
  }

  let is_comment =
    (sortby.length == 6 || sortby.length == 7) &&
    sortby != "rising"
      ? true
      : false;
  
  if (is_comment) {
    return res.redirect('/comments/' + sortby);
  }

  let d = `&after=${after}`;
  if (before) {
    d = `&before=${before}`;
  }

  if (sortby == '' || sortby == 'frontpage') {
    sortby = 'hot';
  }

  if (
    [
      'apple-touch-icon.png',
      'apple-touch-icon-precomposed.png',
      'apple-touch-icon-120x120.png',
      'apple-touch-icon-120x120-precomposed.png',
    ].includes(sortby)
  ) {
    return res.sendStatus(404); // return 404 on shitty apple favicon stuff
  }

  if (
    !['new', 'rising', 'controversial', 'top', 'gilded', 'hot'].includes(sortby)
  ) {
    console.log(`Got invalid sort.`, req.originalUrl);
    return res.redirect('/');
  }

  if (past) {
    if (sortby === 'controversial' || sortby === 'top') {
      if (!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
        console.error(`Got invalid past.`, req.originalUrl);
        return res.redirect(`/`);
      }
    } else {
      past = undefined;
    }
  } else {
    if (sortby === 'controversial' || sortby === 'top') {
      past = 'day';
    }
  }

  if (req.query.hasOwnProperty('api')) api_req = true;
  else api_req = false;

  let raw_json = api_req && req.query.raw_json == '1' ? 1 : 0;

  let key = `/after:${after}:before:${before}:sort:${sortby}:past:${past}:raw_json:${raw_json}`;

  let subbed_subreddits = req.cookies.subbed_subreddits;
  let get_subbed_subreddits = false;
  if (subbed_subreddits && Array.isArray(subbed_subreddits)) {
    get_subbed_subreddits = true;
    subbed_subreddits = subbed_subreddits.join('+');
    key = `${subbed_subreddits.toLowerCase()}:${after}:${before}:sort:${sortby}:past:${past}:raw_json:${raw_json}`;
  }

  redis.get(key, (error, json) => {
    if (error) {
      console.error('Error getting the frontpage key from redis.', error);
      return res.render('frontpage', {
        json: null,
        user_preferences: req.cookies,
        instance_config: config,
      });
    }
    if (json) {
      console.log('Got frontpage key from redis.');
      (async () => {
        if (api_req) {
          return handleTedditApiSubreddit(
            json,
            req,
            res,
            'redis',
            api_type,
            api_target,
            '/',
            'full'
          );
        } else {
          let processed_json = await processJsonSubreddit(
            json,
            'redis',
            null,
            req.cookies
          );
          return res.render('frontpage', {
            json: processed_json,
            sortby: sortby,
            past: past,
            user_preferences: req.cookies,
            redis_key: key,
            instance_config: config,
          });
        }
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth) {
        if (get_subbed_subreddits)
          url = `https://oauth.reddit.com/r/${subbed_subreddits}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
        else
          url = `https://oauth.reddit.com/${sortby}?api_type=json&g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
      } else {
        if (get_subbed_subreddits)
          url = `https://reddit.com/r/${subbed_subreddits}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
        else
          url = `https://reddit.com/${sortby}.json?g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
      }
      fetch(encodeURI(url), redditApiGETHeaders())
        .then((result) => {
          if (result.status === 200) {
            result.json().then((json) => {
              redis.setex(
                key,
                config.setexs.frontpage,
                JSON.stringify(json),
                (error) => {
                  if (error) {
                    console.error(
                      'Error setting the frontpage key to redis.',
                      error
                    );
                    return res.render('frontpage', {
                      json: null,
                      user_preferences: req.cookies,
                      instance_config: config,
                    });
                  } else {
                    console.log('Fetched the frontpage from Reddit.');
                    (async () => {
                      if (api_req) {
                        return handleTedditApiSubreddit(
                          json,
                          req,
                          res,
                          'from_online',
                          api_type,
                          api_target,
                          '/',
                          'full'
                        );
                      } else {
                        let processed_json = await processJsonSubreddit(
                          json,
                          'from_online',
                          null,
                          req.cookies
                        );
                        return res.render('frontpage', {
                          json: processed_json,
                          sortby: sortby,
                          past: past,
                          user_preferences: req.cookies,
                          redis_key: key,
                          instance_config: config,
                        });
                      }
                    })();
                  }
                }
              );
            });
          } else {
            console.error(
              `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
            );
            console.error(config.reddit_api_error_text);
            return res.render('frontpage', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies,
              instance_config: config,
            });
          }
        })
        .catch((error) => {
          console.error('Error fetching the frontpage JSON file.', error);
        });
    }
  });
});

module.exports = homeRoute;

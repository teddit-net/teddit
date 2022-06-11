const config = require('../config');
const { redis, fetch } = require('../app');
const userRoutes = require('express').Router();

const processJsonUser = require('../inc/processJsonUser.js');
const tedditApiUser = require('../inc/teddit_api/handleUser.js')();
const processJsonSubreddit = require('../inc/processJsonSubreddit.js');
const tedditApiSubreddit = require('../inc/teddit_api/handleSubreddit.js')();
const processMoreComments = require('../inc/processMoreComments.js')();

userRoutes.get('/user/:user/:kind?', (req, res, next) => {
  let kind = '';
  if (req.params.kind) kind = `/${req.params.kind}`;
  let q = '';
  if (req.query.sort) q += `?sort=${req.query.sort}&`;
  if (req.query.t) q += `t=${req.query.t}`;

  res.redirect(`/u/${req.params.user}${kind}${q}`);
});

userRoutes.get('/u/:user/:kind?', (req, res, next) => {
  let user = req.params.user;
  let after = req.query.after;
  let before = req.query.before;
  let post_type = req.params.kind;
  let kind = post_type;
  let user_data = {};
  let api_req = req.query.api;
  let api_type = req.query.type;
  let api_target = req.query.target;

  if (req.query.hasOwnProperty('api')) api_req = true;
  else api_req = false;

  let raw_json = api_req && req.query.raw_json == '1' ? 1 : 0;

  if (!after) {
    after = '';
  }
  if (!before) {
    before = '';
  }
  let d = `&after=${after}`;
  if (before) {
    d = `&before=${before}`;
  }

  post_type = `/${post_type}`;
  switch (post_type) {
    case '/comments':
      kind = 't1';
      break;
    case '/submitted':
      kind = 't3';
      break;
    default:
      post_type = '';
      kind = '';
  }

  let sortby = req.query.sort;
  let past = req.query.t;

  if (!sortby) {
    sortby = 'new';
  }

  if (!['hot', 'new', 'controversial', 'top'].includes(sortby)) {
    console.log(`Got invalid sort.`, req.originalUrl);
    return res.redirect(`/u/${user}`);
  }

  if (past) {
    if (sortby === 'controversial' || sortby === 'top') {
      if (!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
        console.error(`Got invalid past.`, req.originalUrl);
        return res.redirect(`/u/${user}/${sortby}`);
      }
    } else {
      past = '';
    }
  } else {
    if (sortby === 'controversial' || sortby === 'top') {
      past = 'all';
    } else {
      past = '';
    }
  }

  let key = `${user}:${after}:${before}:sort:${sortby}:past:${past}:post_type:${post_type}:raw_json:${raw_json}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(`Error getting the user ${key} key from redis.`, error);
      return res.render('frontpage', {
        json: null,
        user_preferences: req.cookies,
        instance_config: config,
      });
    }
    if (json) {
      console.log(`Got user ${user} key from redis.`);
      (async () => {
        if (api_req) {
          return handleTedditApiUser(
            json,
            req,
            res,
            'redis',
            api_type,
            api_target,
            user,
            after,
            before
          );
        } else {
          let processed_json = await processJsonUser(
            json,
            false,
            after,
            before,
            req.cookies,
            kind,
            post_type
          );
          return res.render('user', {
            data: processed_json,
            sortby: sortby,
            past: past,
            user_preferences: req.cookies,
            instance_config: config,
          });
        }
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth)
        url = `https://oauth.reddit.com/user/${user}/about?raw_json=${raw_json}`;
      else
        url = `https://reddit.com/user/${user}/about.json?raw_json=${raw_json}`;
      fetch(encodeURI(url), redditApiGETHeaders())
        .then((result) => {
          if (result.status === 200) {
            result.json().then((json) => {
              user_data.about = json;
              let url = '';
              if (config.use_reddit_oauth) {
                let endpoint = '/overview';
                if (post_type !== '') endpoint = post_type;
                url = `https://oauth.reddit.com/user/${user}${post_type}?limit=26${d}&sort=${sortby}&t=${past}&raw_json=${raw_json}`;
              } else {
                url = `https://reddit.com/user/${user}${post_type}.json?limit=26${d}&sort=${sortby}&t=${past}&raw_json=${raw_json}`;
              }
              fetch(encodeURI(url), redditApiGETHeaders())
                .then((result) => {
                  if (result.status === 200) {
                    result.json().then((json) => {
                      user_data.overview = json;
                      redis.setex(
                        key,
                        config.setexs.user,
                        JSON.stringify(user_data),
                        (error) => {
                          if (error) {
                            console.error(
                              `Error setting the user ${key} key to redis.`,
                              error
                            );
                            return res.render('frontpage', {
                              post: null,
                              user_preferences: req.cookies,
                              instance_config: config,
                            });
                          } else {
                            (async () => {
                              if (api_req) {
                                return handleTedditApiUser(
                                  user_data,
                                  req,
                                  res,
                                  'online',
                                  api_type,
                                  api_target,
                                  user,
                                  after,
                                  before
                                );
                              } else {
                                let processed_json = await processJsonUser(
                                  user_data,
                                  true,
                                  after,
                                  before,
                                  req.cookies,
                                  kind,
                                  post_type
                                );
                                return res.render('user', {
                                  data: processed_json,
                                  sortby: sortby,
                                  past: past,
                                  user_preferences: req.cookies,
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
                  console.error(
                    `Error fetching the overview JSON file from reddit.com/u/${user}`,
                    error
                  );
                  return res.render('frontpage', {
                    json: null,
                    http_status_code: result.status,
                    user_preferences: req.cookies,
                    instance_config: config,
                  });
                });
            });
          } else {
            if (result.status === 404) {
              console.log('404 – User not found');
            } else {
              console.error(
                `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
              );
              console.error(config.reddit_api_error_text);
            }
            return res.render('frontpage', {
              json: null,
              http_status_code: result.status,
              http_statustext: result.statusText,
              user_preferences: req.cookies,
              instance_config: config,
            });
          }
        })
        .catch((error) => {
          console.error(
            `Error fetching the about JSON file from reddit.com/u/${user}`,
            error
          );
        });
    }
  });
});

userRoutes.get('/user/:user/m/:custom_feed', (req, res, next) => {
  res.redirect(`/u/${req.params.user}/m/${req.params.custom_feed}`);
});

userRoutes.get('/u/:user/m/:custom_feed/:sort?', (req, res, next) => {
  let user = req.params.user;
  let custom_feed = req.params.custom_feed;
  let subreddit = `u/${user}/m/${custom_feed}`;
  let sortby = req.params.sort;
  let past = req.query.t;
  let before = req.query.before;
  let after = req.query.after;
  let api_req = req.query.api;
  let api_type = req.query.type;
  let api_target = req.query.target;

  if (req.query.hasOwnProperty('api')) api_req = true;
  else api_req = false;

  let d = `&after=${after}`;
  if (before) {
    d = `&before=${before}`;
  }

  if (!sortby) {
    sortby = 'hot';
  }

  if (
    !['new', 'rising', 'controversial', 'top', 'gilded', 'hot'].includes(sortby)
  ) {
    console.log(`Got invalid sort.`, req.originalUrl);
    return res.redirect(`/u/${user}`);
  }

  if (past) {
    if (sortby === 'controversial' || sortby === 'top') {
      if (!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
        console.error(`Got invalid past.`, req.originalUrl);
        return res.redirect(`/u/${user}/${sortby}`);
      }
    } else {
      past = undefined;
    }
  } else {
    if (sortby === 'controversial' || sortby === 'top') {
      past = 'day';
    }
  }

  let key = `${user.toLowerCase()}:m:${custom_feed}:${after}:${before}:sort:${sortby}:past:${past}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(
        `Error getting the ${user} custom_feed key from redis.`,
        error
      );
      return res.render('frontpage', {
        json: null,
        user_preferences: req.cookies,
        instance_config: config,
      });
    }
    if (json) {
      console.log(`Got /u/${user} custom_feed key from redis.`);
      (async () => {
        if (api_req) {
          return handleTedditApiSubreddit(
            json,
            req,
            res,
            'redis',
            api_type,
            api_target,
            subreddit,
            'full'
          );
        } else {
          let processed_json = await processJsonSubreddit(
            json,
            'redis',
            null,
            req.cookies
          );
          if (!processed_json.error) {
            return res.render('subreddit', {
              json: processed_json,
              subreddit: '../' + subreddit,
              subreddit_about: null,
              subreddit_front: !before && !after ? true : false,
              sortby: sortby,
              past: past,
              user_preferences: req.cookies,
              instance_nsfw_enabled: config.nsfw_enabled,
              redis_key: key,
              after: req.query.after,
              before: req.query.before,
              instance_config: config,
            });
          } else {
            return res.render('subreddit', {
              json: null,
              error: true,
              data: processed_json,
              user_preferences: req.cookies,
              instance_config: config,
            });
          }
        }
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth)
        url = `https://oauth.reddit.com/${subreddit}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}`;
      else
        url = `https://reddit.com/${subreddit}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}`;
      fetch(encodeURI(url), redditApiGETHeaders())
        .then((result) => {
          if (result.status === 200) {
            result.json().then((json) => {
              redis.setex(
                key,
                config.setexs.subreddit,
                JSON.stringify(json),
                (error) => {
                  if (error) {
                    console.error(
                      `Error setting the ${subreddit} key to redis.`,
                      error
                    );
                    return res.render('subreddit', {
                      json: null,
                      user_preferences: req.cookies,
                      instance_config: config,
                    });
                  } else {
                    console.log(
                      `Fetched the JSON from reddit.com/r/${subreddit}.`
                    );
                    (async () => {
                      if (api_req) {
                        return handleTedditApiSubreddit(
                          json,
                          req,
                          res,
                          'from_online',
                          api_type,
                          api_target,
                          subreddit,
                          'full'
                        );
                      } else {
                        let processed_json = await processJsonSubreddit(
                          json,
                          'from_online',
                          null,
                          req.cookies
                        );
                        return res.render('subreddit', {
                          json: processed_json,
                          subreddit: '../' + subreddit,
                          subreddit_about: null,
                          subreddit_front: !before && !after ? true : false,
                          sortby: sortby,
                          past: past,
                          user_preferences: req.cookies,
                          instance_nsfw_enabled: config.nsfw_enabled,
                          redis_key: key,
                          after: req.query.after,
                          before: req.query.before,
                          instance_config: config,
                        });
                      }
                    })();
                  }
                }
              );
            });
          } else {
            if (result.status === 404) {
              console.log('404 – Subreddit not found');
            } else {
              console.error(
                `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
              );
              console.error(config.reddit_api_error_text);
            }
            return res.render('frontpage', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies,
              instance_config: config,
            });
          }
        })
        .catch((error) => {
          console.error(
            `Error fetching the JSON file from reddit.com/${subreddit}.`,
            error
          );
        });
    }
  });
});

module.exports = userRoutes;

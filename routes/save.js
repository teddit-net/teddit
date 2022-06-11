const config = require('../config');
const { redis, fetch } = require('../app');
const saveRoutes = require('express').Router();

const processJsonSubreddit = require('../inc/processJsonSubreddit.js');
const tedditApiSubreddit = require('../inc/teddit_api/handleSubreddit.js')();
const processMoreComments = require('../inc/processMoreComments.js')();

saveRoutes.get('/saved', (req, res, next) => {
  let saved = req.cookies.saved;

  if (!saved || !Array.isArray(saved)) {
    return res.render('saved', {
      json: null,
      user_preferences: req.cookies,
      instance_config: config,
    });
  }

  let key = `saved_posts:${saved.join(',')}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(
        `Error getting saved_post ${saved_post} key from redis.`,
        error
      );
      return res.redirect('/');
    }
    if (json) {
      (async () => {
        let processed_json = await processJsonSubreddit(
          json,
          'redis',
          null,
          req.cookies,
          true
        );
        if (!processed_json.error) {
          return res.render('saved', {
            json: processed_json,
            user_preferences: req.cookies,
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
      })();
    }
  });
});

saveRoutes.get('/save/:id', (req, res, next) => {
  let post_id = req.params.id;
  let redis_key = req.query.rk;
  let back = req.query.b;
  let saved = req.cookies.saved;
  let fetched = req.query.f;

  if (!post_id || !redis_key) return res.redirect('/saved');

  if (!saved || !Array.isArray(saved)) saved = [];

  if (saved.length > 100)
    return res.send('You can not save more than 100 posts.');

  redis.get(redis_key, (error, json) => {
    if (error) {
      console.error(
        `Error getting the ${redis_key} key from redis (via /save/).`,
        error
      );
      return res.redirect('/');
    }
    if (json) {
      json = JSON.parse(json);
      if (fetched === 'true' || redis_key.includes('/comments/'))
        json = json[0];

      let post_to_save = false;
      for (var i = 0; i < json.data.children.length; i++) {
        let post = json.data.children[i];
        if (post.data.id === post_id) {
          post_to_save = post;
          break;
        }
      }

      if (post_to_save) {
        if (!saved || !Array.isArray(saved)) saved = [];

        for (var i = 0; i < saved.length; i++) {
          if (post_to_save.data.id === saved[i]) return res.redirect('/saved');
        }

        let key = `saved_posts:${saved.join(',')}`;
        redis.get(key, (error, json) => {
          if (error) {
            console.error(
              `Error getting saved_posts ${key} key from redis.`,
              error
            );
            return res.redirect('/');
          }
          links = JSON.parse(json);
          if (!links) links = [];

          links.unshift(post_to_save);
          saved.unshift(post_to_save.data.id);
          res.cookie('saved', saved, {
            maxAge: 3 * 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
          });

          let new_key = `saved_posts:${saved.join(',')}`;
          redis.set(new_key, JSON.stringify(links), (error) => {
            if (error)
              console.error(`Error saving ${new_key} to redis.`, error);

            if (!back) return res.redirect('/saved');
            else {
              back = back.replace(/§2/g, '?').replace(/§1/g, '&');
              return res.redirect(back);
            }
          });
        });
      } else {
        return res.redirect(`/comments/${post_id}/?save=true&b=${back}`);
      }
    } else {
      return res.redirect(`/comments/${post_id}/?save=true&b=${back}`);
    }
  });
});

saveRoutes.get('/unsave/:id', (req, res, next) => {
  let post_id = req.params.id;
  let back = req.query.b;
  let saved = req.cookies.saved;

  if (!post_id) return res.redirect('/saved');

  if (!saved || !Array.isArray(saved)) return res.redirect('/saved');

  let key = `saved_posts:${saved.join(',')}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(
        `Error getting the ${key} key from redis (via /save/).`,
        error
      );
      return res.redirect('/');
    }
    if (json) {
      json = JSON.parse(json);
      let post_found = false;
      for (var i = 0; i < json.length; i++) {
        if (json[i].data.id === post_id) {
          post_found = true;
          json.splice(i, 1);
          for (var j = 0; j < saved.length; j++) {
            if (saved[j] === post_id) saved.splice(j, 1);
          }
        }
      }
      if (post_found) {
        res.cookie('saved', saved, {
          maxAge: 3 * 365 * 24 * 60 * 60 * 1000,
          httpOnly: true,
        });

        let new_key = `saved_posts:${saved.join(',')}`;
        redis.set(new_key, JSON.stringify(json), (error) => {
          if (error) console.error(`Error saving ${new_key} to redis.`, error);

          if (!back) return res.redirect('/saved');
          else {
            back = back.replace(/§2/g, '?').replace(/§1/g, '&');
            return res.redirect(back);
          }
        });
      } else {
        return res.redirect(`/saved`);
      }
    } else {
      return res.redirect(`/saved`);
    }
  });
});

saveRoutes.get(
  '/comments/:post_id/:comment?/:comment_id?',
  (req, res, next) => {
    let post_id = req.params.post_id;
    let comment = req.params.comment;
    let comment_id = req.params.comment_id;
    let back = req.query.b;
    let save = req.query.save;
    let post_url = false;
    let comment_url = false;

    if (comment)
      if (comment !== 'comment' || !comment_id) return res.redirect('/');

    if (comment) comment_url = true;
    else post_url = true;

    let key = `/shorturl:post:${post_id}:comment:${comment_id}`;
    redis.get(key, (error, json) => {
      if (error) {
        console.error(
          'Error getting the short URL for post key from redis.',
          error
        );
        return res.render('frontpage', {
          json: null,
          user_preferences: req.cookies,
          instance_config: config,
        });
      }
      if (json) {
        console.log('Got short URL for post key from redis.');
        json = JSON.parse(json);
        if (post_url) {
          if (save === 'true')
            return res.redirect(`/save/${post_id}/?rk=${key}&b=${back}&f=true`);
          return res.redirect(json[0].data.children[0].data.permalink);
        } else {
          return res.redirect(json[1].data.children[0].data.permalink);
        }
      } else {
        let url = '';
        if (config.use_reddit_oauth) {
          if (post_url)
            url = `https://oauth.reddit.com/comments/${post_id}?api_type=json`;
          else
            url = `https://oauth.reddit.com/comments/${post_id}/comment/${comment_id}?api_type=json`;
        } else {
          if (post_url)
            url = `https://reddit.com/comments/${post_id}.json?api_type=json`;
          else
            url = `https://reddit.com/comments/${post_id}/comment/${comment_id}.json?api_type=json`;
        }

        fetch(encodeURI(url), redditApiGETHeaders())
          .then((result) => {
            if (result.status === 200) {
              result.json().then((json) => {
                redis.setex(
                  key,
                  config.setexs.shorts,
                  JSON.stringify(json),
                  (error) => {
                    if (error) {
                      console.error(
                        'Error setting the short URL for post key to redis.',
                        error
                      );
                      return res.render('frontpage', {
                        json: null,
                        user_preferences: req.cookies,
                        instance_config: config,
                      });
                    } else {
                      console.log(
                        'Fetched the short URL for post from Reddit.'
                      );
                      if (post_url) {
                        if (save === 'true')
                          return res.redirect(
                            `/save/${post_id}/?rk=${key}&b=${back}&f=true`
                          );
                        return res.redirect(
                          json[0].data.children[0].data.permalink
                        );
                      } else {
                        return res.redirect(
                          json[1].data.children[0].data.permalink
                        );
                      }
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
              'Error fetching the short URL for post with sortby JSON file.',
              error
            );
          });
      }
    });
  }
);

module.exports = saveRoutes;

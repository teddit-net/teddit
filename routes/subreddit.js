const config = require('../config');
const { redis, fetch, RedditAPI } = require('../app');
const subredditRoutes = require('express').Router();

const {
  processJsonPost,
  finalizeJsonPost,
} = require('../inc/processJsonPost.js');
const processSubredditAbout = require('../inc/processSubredditAbout.js');
const tedditApiUser = require('../inc/teddit_api/handleUser.js')();
const processSearches = require('../inc/processSearchResults.js')();
const processSubreddit = require('../inc/processJsonSubreddit.js')();
const tedditApiSubreddit = require('../inc/teddit_api/handleSubreddit.js')();
const processMoreComments = require('../inc/processMoreComments.js')();
const processSubredditsExplore =
  require('../inc/processSubredditsExplore.js')();

subredditRoutes.get('/r/:subreddit/search', (req, res, next) => {
  let subreddit = req.params.subreddit;
  let q = req.query.q;

  if (typeof q === 'undefined') {
    return res.render('search', {
      json: { posts: [] },
      no_query: true,
      q: '',
      restrict_sr: undefined,
      nsfw: undefined,
      subreddit: subreddit,
      sortby: undefined,
      past: undefined,
      user_preferences: req.cookies,
    });
  }

  let restrict_sr = req.query.restrict_sr;
  let nsfw = req.query.nsfw;
  let sortby = req.query.sort;
  let past = req.query.t;
  let after = req.query.after;
  let before = req.query.before;
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

  if (restrict_sr !== 'on') {
    restrict_sr = 'off';
  }

  if (nsfw !== 'on') {
    nsfw = 'off';
  }

  let key = `search:${subreddit}:${q}:${restrict_sr}:${sortby}:${past}:${after}:${before}:${nsfw}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error('Error getting the search key from redis.', error);
      return res.render('index', {
        json: null,
        user_preferences: req.cookies,
      });
    }
    if (json) {
      console.log('Got search key from redis.');
      (async () => {
        let processed_json = await processSearchResults(
          json,
          false,
          after,
          before,
          req.cookies
        );
        return res.render('search', {
          json: processed_json,
          no_query: false,
          q: q,
          restrict_sr: restrict_sr,
          nsfw: nsfw,
          subreddit: subreddit,
          sortby: sortby,
          past: past,
          user_preferences: req.cookies,
        });
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth)
        url = `https://oauth.reddit.com/r/${subreddit}/search?api_type=json&q=${q}&restrict_sr=${restrict_sr}&include_over_18=${nsfw}&sort=${sortby}&t=${past}${d}`;
      else
        url = `https://reddit.com/r/${subreddit}/search.json?api_type=json&q=${q}&restrict_sr=${restrict_sr}&include_over_18=${nsfw}&sort=${sortby}&t=${past}${d}`;
      fetch(encodeURI(url), redditApiGETHeaders())
        .then((result) => {
          if (result.status === 200) {
            result.json().then((json) => {
              (async () => {
                /**
                 * Fetch suggested subreddits when the restrict_sr option is
                 * turned off ("limit my search to") and we are on the first search
                 * page (just like in Reddit).
                 */
                json.suggested_subreddits = {};
                if (restrict_sr === 'off' && before == '' && after == '') {
                  let url = `https://reddit.com/subreddits/search.json?q=${q}&include_over_18=${nsfw}&limit=3`;
                  const response = await fetch(encodeURI(url));
                  const data = await response.json();
                  json.suggested_subreddits = data;
                }

                redis.setex(
                  key,
                  config.setexs.searches,
                  JSON.stringify(json),
                  (error) => {
                    if (error) {
                      console.error(
                        'Error setting the searches key to redis.',
                        error
                      );
                      return res.render('index', {
                        json: null,
                        user_preferences: req.cookies,
                      });
                    } else {
                      console.log('Fetched search results from Reddit.');
                      (async () => {
                        let processed_json = await processSearchResults(
                          json,
                          true,
                          after,
                          before,
                          req.cookies
                        );
                        return res.render('search', {
                          no_query: false,
                          json: processed_json,
                          q: q,
                          restrict_sr: restrict_sr,
                          nsfw: nsfw,
                          subreddit: subreddit,
                          sortby: sortby,
                          past: past,
                          user_preferences: req.cookies,
                        });
                      })();
                    }
                  }
                );
              })();
            });
          } else {
            console.error(
              `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
            );
            console.error(config.reddit_api_error_text);
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies,
            });
          }
        })
        .catch((error) => {
          console.error('Error fetching the frontpage JSON file.', error);
        });
    }
  });
});

subredditRoutes.get(
  '/r/:subreddit/wiki/:page?/:sub_page?',
  (req, res, next) => {
    let subreddit = req.params.subreddit;
    let page = req.params.page;
    let sub_page = req.params.sub_page || '';

    if (!page) page = 'index';

    if (sub_page != '') sub_page = `/${sub_page}`;

    function formatWikipagelisting(json, subreddit) {
      let html = '<ul class="wikipagelisting">';
      if (json.kind === 'wikipagelisting' && json.data) {
        for (var i = 0; i < json.data.length; i++) {
          let d = json.data[i];
          html += `<li><a href="/r/${subreddit}/wiki/${d}">${d}</a></li>`;
        }
      }
      html += '</ul>';
      return html;
    }

    let key = `${subreddit.toLowerCase()}:wiki:page:${page}:sub_page:${sub_page}`;
    redis.get(key, (error, json) => {
      if (error) {
        console.error(
          `Error getting the ${subreddit} wiki key from redis.`,
          error
        );
        return res.render('index', {
          json: null,
          user_preferences: req.cookies,
        });
      }
      if (json) {
        console.log(`Got /r/${subreddit} wiki key from redis.`);
        json = JSON.parse(json);
        return res.render('subreddit_wiki', {
          content_html:
            page !== 'pages'
              ? unescape(json.data.content_html)
              : formatWikipagelisting(json, subreddit),
          subreddit: subreddit,
          user_preferences: req.cookies,
        });
      } else {
        let url = '';
        if (config.use_reddit_oauth)
          url = `https://oauth.reddit.com/r/${subreddit}/wiki/${page}${sub_page}?api_type=json`;
        else
          url = `https://reddit.com/r/${subreddit}/wiki/${page}${sub_page}.json?api_type=json`;
        fetch(encodeURI(url), redditApiGETHeaders())
          .then((result) => {
            if (result.status === 200) {
              result.json().then((json) => {
                redis.setex(
                  key,
                  config.setexs.wikis,
                  JSON.stringify(json),
                  (error) => {
                    if (error) {
                      console.error(
                        `Error setting the ${subreddit} wiki key to redis.`,
                        error
                      );
                      return res.render('subreddit', {
                        json: null,
                        user_preferences: req.cookies,
                      });
                    } else {
                      console.log(
                        `Fetched the JSON from reddit.com/r/${subreddit}/wiki.`
                      );
                      return res.render('subreddit_wiki', {
                        content_html:
                          page !== 'pages'
                            ? unescape(json.data.content_html)
                            : formatWikipagelisting(json, subreddit),
                        subreddit: subreddit,
                        user_preferences: req.cookies,
                      });
                    }
                  }
                );
              });
            } else {
              if (result.status === 404) {
                console.log('404 – Subreddit wiki not found');
              } else {
                console.error(
                  `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
                );
                console.error(config.reddit_api_error_text);
              }
              return res.render('index', {
                json: null,
                http_status_code: result.status,
                user_preferences: req.cookies,
              });
            }
          })
          .catch((error) => {
            console.error(
              `Error fetching the JSON file from reddit.com/r/${subreddit}/wiki.`,
              error
            );
          });
      }
    });
  }
);

subredditRoutes.get('/r/:subreddit/w/:page?/:sub_page?', (req, res, next) => {
  /* "w" is a shorturl for wikis for example https://old.reddit.com/r/privacytoolsIO/w/index */
  let subreddit = req.params.subreddit;
  let page = req.params.page;
  let sub_page = req.params.sub_page || '';

  if (!page) page = 'index';

  if (sub_page != '') sub_page = `/${sub_page}`;

  return res.redirect(`/r/${subreddit}/wiki/${page}${sub_page}`);
});

subredditRoutes.get('/r/random', (req, res, next) => {
  let url = '';
  if (config.use_reddit_oauth)
    url = `https://oauth.reddit.com/r/random?api_type=json&count=25&g=GLOBAL`;
  else url = `https://reddit.com/r/random.json?api_type=json&count=25&g=GLOBAL`;

  fetch(encodeURI(url), redditApiGETHeaders())
    .then((result) => {
      if (result.status === 200) {
        result.json().then((json) => {
          let subreddit = json.data.children[0].data.subreddit;
          if (subreddit) {
            let key = `${subreddit.toLowerCase()}:undefined:undefined:sort:hot:past:undefined`;
            redis.setex(
              key,
              config.setexs.subreddit,
              JSON.stringify(json),
              (error) => {
                if (error) {
                  console.error(
                    `Error setting the random subreddit key to redis.`,
                    error
                  );
                  return res.render('subreddit', {
                    json: null,
                    user_preferences: req.cookies,
                  });
                } else {
                  console.log(
                    `Fetched the JSON from reddit.com/r/${subreddit}.`
                  );
                  return res.redirect(`/r/${subreddit}`);
                }
              }
            );
          } else {
            console.error(`Fetching random subreddit failed.`, json);
            return res.render('index', {
              json: null,
              user_preferences: req.cookies,
            });
          }
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
        return res.render('index', {
          json: null,
          http_status_code: result.status,
          user_preferences: req.cookies,
        });
      }
    })
    .catch((error) => {
      console.error(
        `Error fetching the JSON file from reddit.com/r/random.`,
        error
      );
    });
});

subredditRoutes.get('/r/:subreddit/:sort?', (req, res, next) => {
  let subreddit = req.params.subreddit;
  let sortby = req.params.sort;
  let past = req.query.t;
  let before = req.query.before;
  let after = req.query.after;
  let api_req = req.query.api;
  let api_type = req.query.type;
  let api_target = req.query.target;

  if (req.query.hasOwnProperty('api')) api_req = true;
  else api_req = false;

  let raw_json = api_req && req.query.raw_json == '1' ? 1 : 0;

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
    return res.redirect(`/r/${subreddit}`);
  }

  if (past) {
    if (sortby === 'controversial' || sortby === 'top') {
      if (!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
        console.error(`Got invalid past.`, req.originalUrl);
        return res.redirect(`/r/${subreddit}/${sortby}`);
      }
    } else {
      past = undefined;
    }
  } else {
    if (sortby === 'controversial' || sortby === 'top') {
      past = 'day';
    }
  }

  let key = `${subreddit.toLowerCase()}:${after}:${before}:sort:${sortby}:past:${past}:raw_json:${raw_json}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(`Error getting the ${subreddit} key from redis.`, error);
      return res.render('index', {
        json: null,
        user_preferences: req.cookies,
      });
    }
    if (json) {
      console.log(`Got /r/${subreddit} key from redis.`);
      (async () => {
        if (api_req) {
          return handleTedditApiSubreddit(
            json,
            req,
            res,
            'redis',
            api_type,
            api_target,
            subreddit
          );
        } else {
          let processed_json = await processJsonSubreddit(
            json,
            'redis',
            null,
            req.cookies
          );
          let subreddit_about = await processSubredditAbout(
            subreddit,
            redis,
            fetch,
            RedditAPI
          );
          if (!processed_json.error) {
            return res.render('subreddit', {
              json: processed_json,
              subreddit: subreddit,
              subreddit_about: subreddit_about,
              subreddit_front: !before && !after ? true : false,
              sortby: sortby,
              past: past,
              user_preferences: req.cookies,
              instance_nsfw_enabled: config.nsfw_enabled,
              redis_key: key,
              after: req.query.after,
              before: req.query.before,
            });
          } else {
            return res.render('subreddit', {
              json: null,
              error: true,
              data: processed_json,
              user_preferences: req.cookies,
            });
          }
        }
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth)
        url = `https://oauth.reddit.com/r/${subreddit}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
      else
        url = `https://reddit.com/r/${subreddit}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}&raw_json=${raw_json}`;
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
                          subreddit
                        );
                      } else {
                        let processed_json = await processJsonSubreddit(
                          json,
                          'from_online',
                          null,
                          req.cookies
                        );
                        let subreddit_about = await processSubredditAbout(
                          subreddit,
                          redis,
                          fetch,
                          RedditAPI
                        );
                        return res.render('subreddit', {
                          json: processed_json,
                          subreddit: subreddit,
                          subreddit_about: subreddit_about,
                          subreddit_front: !before && !after ? true : false,
                          sortby: sortby,
                          past: past,
                          user_preferences: req.cookies,
                          instance_nsfw_enabled: config.nsfw_enabled,
                          redis_key: key,
                          after: req.query.after,
                          before: req.query.before,
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
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies,
            });
          }
        })
        .catch((error) => {
          console.error(
            `Error fetching the JSON file from reddit.com/r/${subreddit}.`,
            error
          );
        });
    }
  });
});

subredditRoutes.get(
  '/r/:subreddit/comments/:id/:snippet?/:comment_id?',
  (req, res, next) => {
    let subreddit = req.params.subreddit;
    let id = req.params.id;
    let snippet = encodeURIComponent(req.params.snippet);
    let sortby = req.query.sort;
    let comment_id = '';
    let viewing_comment = false;
    let comment_ids = req.query.comment_ids;
    let context = parseInt(req.query.context);

    if (req.params.comment_id) {
      comment_id = `${req.params.comment_id}/`;
      viewing_comment = true;
    }

    if (!sortby) {
      sortby = config.post_comments_sort;
    }

    if (
      ![
        'confidence',
        'top',
        'new',
        'controversial',
        'old',
        'qa',
        'random',
      ].includes(sortby)
    ) {
      console.log(`Got invalid sort.`, req.originalUrl);
      return res.redirect('/');
    }

    let comments_url = `/r/${subreddit}/comments/${id}/${snippet}/${comment_id}`;
    let post_url = `/r/${subreddit}/comments/${id}/${snippet}/`;
    let comments_key = `${comments_url}:sort:${sortby}`;

    redis.get(comments_key, (error, json) => {
      if (error) {
        console.error(
          `Error getting the ${comments_url} key from redis.`,
          error
        );
        return res.render('index', {
          post: null,
          user_preferences: req.cookies,
        });
      }
      if (json) {
        console.log(`Got ${comments_url} key from redis.`);
        (async () => {
          let parsed = false;
          let more_comments = null;
          if (comment_ids) {
            let key = `${post_url}:morechildren:comment_ids:${comment_ids}`;
            more_comments = await moreComments(
              fetch,
              redis,
              post_url,
              comment_ids,
              id
            );

            if (more_comments === false) {
              return res.redirect(post_url);
            } else {
              json = JSON.parse(json);
              json[1].data.children = more_comments;
              parsed = true;
            }
          }

          let processed_json = await processJsonPost(json, parsed, req.cookies);
          let finalized_json = await finalizeJsonPost(
            processed_json,
            id,
            post_url,
            more_comments,
            viewing_comment,
            req.cookies
          );
          return res.render('post', {
            post: finalized_json.post_data,
            comments: finalized_json.comments,
            viewing_comment: viewing_comment,
            post_url: post_url,
            subreddit: subreddit,
            sortby: sortby,
            user_preferences: req.cookies,
            instance_nsfw_enabled: config.nsfw_enabled,
            instance_videos_muted: config.videos_muted,
            post_media_max_heights: config.post_media_max_heights,
            redis_key: comments_key,
          });
        })();
      } else {
        let url = '';
        if (config.use_reddit_oauth)
          url = `https://oauth.reddit.com${comments_url}?api_type=json&sort=${sortby}&context=${context}`;
        else
          url = `https://reddit.com${comments_url}.json?api_type=json&sort=${sortby}&context=${context}`;

        fetch(encodeURI(url), redditApiGETHeaders())
          .then((result) => {
            if (result.status === 200) {
              result.json().then((json) => {
                redis.setex(
                  comments_key,
                  config.setexs.posts,
                  JSON.stringify(json),
                  (error) => {
                    if (error) {
                      console.error(
                        `Error setting the ${comments_url} key to redis.`,
                        error
                      );
                      return res.render('post', {
                        post: null,
                        user_preferences: req.cookies,
                      });
                    } else {
                      console.log(
                        `Fetched the JSON from reddit.com${comments_url}.`
                      );
                      (async () => {
                        let more_comments = null;
                        if (comment_ids) {
                          let key = `${post_url}:morechildren:comment_ids:${comment_ids}`;
                          more_comments = await moreComments(
                            fetch,
                            redis,
                            post_url,
                            comment_ids,
                            id
                          );

                          if (more_comments === false) {
                            return res.redirect(post_url);
                          } else {
                            json[1].data.children = more_comments;
                          }
                        }

                        let processed_json = await processJsonPost(
                          json,
                          true,
                          req.cookies
                        );
                        let finalized_json = await finalizeJsonPost(
                          processed_json,
                          id,
                          post_url,
                          more_comments,
                          viewing_comment
                        );
                        return res.render('post', {
                          post: finalized_json.post_data,
                          comments: finalized_json.comments,
                          viewing_comment: viewing_comment,
                          post_url: post_url,
                          subreddit: subreddit,
                          sortby: sortby,
                          user_preferences: req.cookies,
                          instance_nsfw_enabled: config.nsfw_enabled,
                          instance_videos_muted: config.videos_muted,
                          post_media_max_heights: config.post_media_max_heights,
                          redis_key: comments_key,
                        });
                      })();
                    }
                  }
                );
              });
            } else {
              if (result.status === 404) {
                console.log('404 – Post not found');
              } else {
                console.error(
                  `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
                );
                console.error(config.reddit_api_error_text);
              }
              return res.render('index', {
                json: null,
                http_status_code: result.status,
                http_statustext: result.statusText,
                user_preferences: req.cookies,
              });
            }
          })
          .catch((error) => {
            console.error(
              `Error fetching the JSON file from reddit.com${comments_url}.`,
              error
            );
          });
      }
    });
  }
);

subredditRoutes.post(
  '/r/:subreddit/comments/:id/:snippet',
  (req, res, next) => {
    /**
     * This is the "morechildren" route. This route is called when the
     * "load more comments" button at the bottom of some post is clicked.
     */
    if (!config.use_reddit_oauth)
      return res.send(
        `This instance is using Reddit's public API (non-OAuth), and therefore this endpoint is not supported. In other words, this feature is only available if the instance is using Reddit OAuth API.`
      );

    let subreddit = req.params.subreddit;
    let id = req.params.id;
    let snippet = encodeURIComponent(req.params.snippet);
    let post_url = `/r/${subreddit}/comments/${id}/${snippet}/`;
    let page = req.query.page;
    let comment_ids = req.body.comment_ids;

    return res.redirect(`${post_url}?comment_ids=${comment_ids}&page=1`);
  }
);

subredditRoutes.get('/subreddits/:sort?', (req, res, next) => {
  let q = req.query.q;
  let nsfw = req.query.nsfw;
  let after = req.query.after;
  let before = req.query.before;
  let sortby = req.params.sort;
  let searching = false;

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

  if (nsfw !== 'on') {
    nsfw = 'off';
  }

  if (!sortby) {
    sortby = '';
  }

  let key = `subreddits:sort:${sortby}${d}`;

  if (sortby === 'search') {
    if (typeof q == 'undefined' || q == '') return res.redirect('/subreddits');

    key = `subreddits:search:q:${q}:nsfw:${nsfw}${d}`;
    searching = true;
  }

  redis.get(key, (error, json) => {
    if (error) {
      console.error(`Error getting the subreddits key from redis.`, error);
      return res.render('index', {
        json: null,
        user_preferences: req.cookies,
      });
    }
    if (json) {
      console.log(`Got subreddits key from redis.`);
      (async () => {
        let processed_json = await processJsonSubredditsExplore(
          json,
          'redis',
          null,
          req.cookies
        );
        if (!processed_json.error) {
          return res.render('subreddits_explore', {
            json: processed_json,
            sortby: sortby,
            after: after,
            before: before,
            q: q,
            nsfw: nsfw,
            searching: searching,
            subreddits_front: !before && !after ? true : false,
            user_preferences: req.cookies,
            instance_nsfw_enabled: config.nsfw_enabled,
          });
        } else {
          return res.render('subreddits_explore', {
            json: null,
            error: true,
            data: processed_json,
            user_preferences: req.cookies,
          });
        }
      })();
    } else {
      let url = '';
      if (config.use_reddit_oauth) {
        if (!searching)
          url = `https://oauth.reddit.com/subreddits/${sortby}?api_type=json&count=25&g=GLOBAL&t=${d}`;
        else
          url = `https://oauth.reddit.com/subreddits/search?api_type=json&q=${q}&include_over_18=${nsfw}${d}`;
      } else {
        if (!searching)
          url = `https://reddit.com/subreddits/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${d}`;
        else
          url = `https://reddit.com/subreddits/search.json?api_type=json&q=${q}&include_over_18=${nsfw}${d}`;
      }

      fetch(encodeURI(url), redditApiGETHeaders())
        .then((result) => {
          if (result.status === 200) {
            result.json().then((json) => {
              let ex = config.setexs.subreddits_explore.front;
              if (sortby === 'new')
                ex = config.setexs.subreddits_explore.new_page;
              redis.setex(key, ex, JSON.stringify(json), (error) => {
                if (error) {
                  console.error(
                    `Error setting the subreddits key to redis.`,
                    error
                  );
                  return res.render('subreddits_explore', {
                    json: null,
                    user_preferences: req.cookies,
                  });
                } else {
                  console.log(`Fetched the JSON from reddit.com/subreddits.`);
                  (async () => {
                    let processed_json = await processJsonSubredditsExplore(
                      json,
                      'from_online',
                      null,
                      req.cookies
                    );
                    return res.render('subreddits_explore', {
                      json: processed_json,
                      sortby: sortby,
                      after: after,
                      before: before,
                      q: q,
                      nsfw: nsfw,
                      searching: searching,
                      subreddits_front: !before && !after ? true : false,
                      user_preferences: req.cookies,
                      instance_nsfw_enabled: config.nsfw_enabled,
                    });
                  })();
                }
              });
            });
          } else {
            if (result.status === 404) {
              console.log('404 – Subreddits not found');
            } else {
              console.error(
                `Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`
              );
              console.error(config.reddit_api_error_text);
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies,
            });
          }
        })
        .catch((error) => {
          console.error(
            `Error fetching the JSON file from reddit.com/subreddits.`,
            error
          );
        });
    }
  });
});

module.exports = subredditRoutes;

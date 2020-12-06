/**
* Lots of routes.. would be good idea to do some separation I guess.
*/
module.exports = (app, redis, fetch, RedditAPI) => {
  const config = require('./config');
  let processSubreddit = require('./inc/processJsonSubreddit.js')();
  let processPost = require('./inc/processJsonPost.js')();
  let processUser = require('./inc/processJsonUser.js')();
  let processSearches = require('./inc/processSearchResults.js')();
  let processSidebar = require('./inc/processSubredditSidebar.js')();

  app.get('/', (req, res, next) => {
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    if(past) {
      if(!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
        console.error(`Got invalid past.`, req.originalUrl)
        return res.redirect('/')
      }
    } else {
      past = 'day'
    }
    
    let key = `/after:${after}:before:${before}:sort:hot:past:${past}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error('Error getting the frontpage key from redis.', error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log('Got frontpage key from redis.');
        (async () => {
          let processed_json = await processJsonSubreddit(json, 'redis')
          return res.render('index', {
            json: processed_json,
            sortby: 'hot',
            past: past,
            user_preferences: req.cookies
          })
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com/hot?api_type=json&g=GLOBAL&t=${past}${d}`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.frontpage, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the frontpage key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched the frontpage from reddit API.');
                  (async () => {
                    let processed_json = await processJsonSubreddit(json, 'from_online')
                    return res.render('index', {
                      json: processed_json,
                      sortby: 'hot',
                      past: past,
                      user_preferences: req.cookies
                    })
                  })()
                }
              })
            })
          } else {
            console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
            console.error(config.reddit_api_error_text)
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error('Error fetching the frontpage JSON file.', error)
        })
      }
    })
  })

  app.get('/about', (req, res, next) => {
    return res.render('about', { user_preferences: req.cookies })
  })

  app.get('/preferences', (req, res, next) => {
    return res.render('preferences', { user_preferences: req.cookies })
  })

  app.get('/resetprefs', (req, res, next) => {
    res.clearCookie('theme')
    return res.redirect('/preferences')
  })

  app.get('/privacy', (req, res, next) => {
    return res.render('privacypolicy', { user_preferences: req.cookies })
  })
  
  app.get('/search', (req, res, next) => {
    let q = req.query.q
    let restrict_sr = req.query.restrict_sr
    let nsfw = req.query.nsfw
    let sortby = req.query.sort
    let past = req.query.t
    let after = req.query.after
    let before = req.query.before
    if(!after) {
      after = ''
    }
    if(!before) {
      before = ''
    }
    if(restrict_sr !== 'on') {
      restrict_sr = 'off'
    }
    
    if(nsfw !== 'on') {
      nsfw = 'off'
    }
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    return res.redirect(`/r/all/search?q=${q}&restrict_sr=${restrict_sr}&nsfw=${nsfw}&sort=${sortby}&t=${past}${d}`)
  })

  app.get('/:sort', (req, res, next) => {
    let sortby = req.params.sort
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    if(!sortby) {
      sortby = 'hot'
    }
    
    if(!['new', 'rising', 'controversial', 'top', 'gilded', 'hot'].includes(sortby)) {
      console.error(`Got invalid sort.`, req.originalUrl)
      return res.redirect('/')
    }
    
    if(past) {
      if(sortby === 'controversial' || sortby === 'top') {
        if(!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
          console.error(`Got invalid past.`, req.originalUrl)
          return res.redirect(`/`)
        }
      } else {
        past = undefined
      }
    } else {
      if(sortby === 'controversial' || sortby === 'top') {
        past = 'day'
      }
    }
    
    let key = `/after:${after}:before:${before}:sort:${sortby}:past:${past}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error('Error getting the frontpage with sortby key from redis.', error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log('Got frontpage with sortyby key from redis.');
        (async () => {
          let processed_json = await processJsonSubreddit(json, 'redis')
          return res.render('index', {
            json: processed_json,
            sortby: sortby,
            past: past,
            user_preferences: req.cookies
          })
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com/${sortby}?api_type=json&g=GLOBAL&t=${past}${d}`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.frontpage, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the frontpage with sortby key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched the frontpage with sortby from reddit API.');
                  (async () => {
                    let processed_json = await processJsonSubreddit(json, 'from_online')
                    return res.render('index', {
                      json: processed_json,
                      sortby: sortby,
                      past: past,
                      user_preferences: req.cookies
                    })
                  })()
                }
              })
            })
          } else {
            console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
            console.error(config.reddit_api_error_text)
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error('Error fetching the frontpage with sortby JSON file.', error)
        })
      }
    })
  })
  
  app.get('/r/:subreddit/search', (req, res, next) => {
    let subreddit = req.params.subreddit
    let q = req.query.q
    let restrict_sr = req.query.restrict_sr
    let nsfw = req.query.nsfw
    let sortby = req.query.sort
    let past = req.query.t
    let after = req.query.after
    let before = req.query.before
    if(!after) {
      after = ''
    }
    if(!before) {
      before = ''
    }
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    if(restrict_sr !== 'on') {
      restrict_sr = 'off'
    }
    
    if(nsfw !== 'on') {
      nsfw = 'off'
    }
    
    let key = `search:${q}:${restrict_sr}:${sortby}:${past}:${after}:${before}:${nsfw}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error('Error getting the search key from redis.', error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log('Got search key from redis.');
        (async () => {
          let processed_json = await processSearchResults(json, false, after, before)
          return res.render('search', {
            json: processed_json,
            q: q,
            restrict_sr: restrict_sr,
            nsfw: nsfw,
            subreddit: subreddit,
            sortby: sortby,
            past: past,
            user_preferences: req.cookies
          })
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com/r/${subreddit}/search?api_type=json&q=${q}&restrict_sr=${restrict_sr}&include_over_18=${nsfw}&sort=${sortby}&t=${past}${d}`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.searches, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the searches key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched search results from reddit API.');
                  (async () => {
                    let processed_json = await processSearchResults(json, true, after, before)
                    return res.render('search', {
                      json: processed_json,
                      q: q,
                      restrict_sr: restrict_sr,
                      nsfw: nsfw,
                      subreddit: subreddit,
                      sortby: sortby,
                      past: past,
                      user_preferences: req.cookies
                    })
                  })()
                }
              })
            })
          } else {
            console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
            console.error(config.reddit_api_error_text)
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error('Error fetching the frontpage JSON file.', error)
        })
      }
    })
  })
  
  app.get('/r/:subreddit/:sort?', (req, res, next) => {
    let subreddit = req.params.subreddit
    let sortby = req.params.sort
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    if(!sortby) {
      sortby = 'hot'
    }
    
    if(!['new', 'rising', 'controversial', 'top', 'gilded', 'hot'].includes(sortby)) {
      console.error(`Got invalid sort.`, req.originalUrl)
      return res.redirect(`/r/${subreddit}`)
    }
    
    if(past) {
      if(sortby === 'controversial' || sortby === 'top') {
        if(!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
          console.error(`Got invalid past.`, req.originalUrl)
          return res.redirect(`/r/${subreddit}/${sortby}`)
        }
      } else {
        past = undefined
      }
    } else {
      if(sortby === 'controversial' || sortby === 'top') {
        past = 'day'
      }
    }
    
    let key = `${subreddit.toLowerCase()}:${after}:${before}:sort:${sortby}:past:${past}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${subreddit} key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got /r/${subreddit} key from redis.`);
        (async () => {
          let processed_json = await processJsonSubreddit(json, 'redis')
          let sidebar_data = await processSubredditSidebar(subreddit, redis, fetch, RedditAPI)
          if(!processed_json.error) {
            return res.render('subreddit', {
              json: processed_json,
              subreddit: subreddit,
              sidebar_data: sidebar_data,
              subreddit_front: (!before && !after) ? true : false,
              sortby: sortby,
              past: past,
              user_preferences: req.cookies
            })
          } else {
            return res.render('subreddit', {
              json: null,
              error: true,
              data: processed_json,
              user_preferences: req.cookies
            })
          }
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com/r/${subreddit}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.subreddit, JSON.stringify(json), (error) => {
                if(error) {
                  console.error(`Error setting the ${subreddit} key to redis.`, error)
                  return res.render('subreddit', { json: null, user_preferences: req.cookies })
                } else {
                  console.log(`Fetched the JSON from reddit.com/r/${subreddit}.`);
                  (async () => {
                    let processed_json = await processJsonSubreddit(json, 'from_online')
                    let sidebar_data = await processSubredditSidebar(subreddit, redis, fetch, RedditAPI)
                    return res.render('subreddit', {
                      json: processed_json,
                      subreddit: subreddit,
                      sidebar_data: sidebar_data,
                      subreddit_front: (!before && !after) ? true : false,
                      sortby: sortby,
                      past: past,
                      user_preferences: req.cookies
                    })
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Subreddit not found')
            } else {
              console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the JSON file from reddit.com/r/${subreddit}.`, error)
        })
      }
    })
  })

  app.get('/r/:subreddit/comments/:id/:snippet/:comment_id?', (req, res, next) => {
    let subreddit = req.params.subreddit
    let id = req.params.id
    let snippet = encodeURIComponent(req.params.snippet)
    let comment_id = ''
    let viewing_comment = false
    let more_comments_cursor = req.query.cursor
    let context = parseInt(req.query.context)
    
    if(req.params.comment_id) {
      comment_id = `${req.params.comment_id}/`
      viewing_comment = true
    }
    
    let comments_url = `/r/${subreddit}/comments/${id}/${snippet}/${comment_id}`
    let post_url = `/r/${subreddit}/comments/${id}/${snippet}/`

    redis.get(comments_url, (error, json) => {
      if(error) {
        console.error(`Error getting the ${comments_url} key from redis.`, error)
        return res.render('index', { post: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got ${comments_url} key from redis.`);
        (async () => {
          if(!more_comments_cursor) {
            let processed_json = await processJsonPost(json, false)
            let finalized_json = await finalizeJsonPost(processed_json, id, post_url)
            return res.render('post', {
              post: finalized_json.post_data,
              comments: finalized_json.comments,
              viewing_comment: viewing_comment,
              post_url: post_url,
              subreddit: subreddit,
              user_preferences: req.cookies
            })
          } else {
              let key = `morechildren:${post_url};1`
              redis.get(key, (error, json) => {
                if(error) {
                  console.error(`Error getting the ${key} key from redis.`, error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                }
                if(json) {
                  console.log(`Got ${key} key from redis.`);
                  redis.get(post_url, (error, post_json) => {
                    if(error) {
                      console.error(`Error getting the ${post_url} key from redis.`, error)
                      return res.render('index', { json: null, user_preferences: req.cookies })
                    }
                    if(post_json) {
                      redis.get(`morechildren_ids:${post_url}`, (error, morechildren_ids) => {
                        (async () => {
                          post_json = JSON.parse(post_json)
                          json = JSON.parse(json)
                          post_json[1].data.children = json
                          let processed_json = await processJsonPost(post_json, true)
                          let finalized_json = await finalizeJsonPost(processed_json, id, post_url, morechildren_ids)
                          
                          return res.render('post', {
                            post: finalized_json.post_data,
                            comments: finalized_json.comments,
                            viewing_comment: false,
                            post_url: post_url,
                            subreddit: req.params.subreddit,
                            more_comments_page: 1,
                            user_preferences: req.cookies
                          })
                        })()
                      })
                    }
                  })
                }
              })
          }
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com${comments_url}?api_type=json&sort=${config.post_comments_sort}&context=${context}`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(comments_url, config.setexs.posts, JSON.stringify(json), (error) => {
                if(error) {
                  console.error(`Error setting the ${comments_url} key to redis.`, error)
                  return res.render('post', { post: null, user_preferences: req.cookies })
                } else {
                  console.log(`Fetched the JSON from reddit.com${comments_url}.`);
                  (async () => {
                    let processed_json = await processJsonPost(json, true)
                    let finalized_json = await finalizeJsonPost(processed_json, id, post_url)
                    return res.render('post', {
                      post: finalized_json.post_data,
                      comments: finalized_json.comments,
                      viewing_comment: viewing_comment,
                      post_url: post_url,
                      subreddit: subreddit,
                      user_preferences: req.cookies
                    })
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Post not found')
            } else {
              console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              http_statustext: result.statusText,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the JSON file from reddit.com${comments_url}.`, error)
        })
      }
    })
  })

  app.get('/user/:user', (req, res, next) => {
    res.redirect(`/u/${req.params.user}`)
  })

  app.get('/u/:user/:sort?', (req, res, next) => {
    let user = req.params.user
    let after = req.query.after
    let before = req.query.before
    let user_data = {}
    if(!after) {
      after = ''
    }
    if(!before) {
      before = ''
    }
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    let sortby = req.query.sort
    let past = req.query.t
    
    if(!sortby) {
      sortby = 'new'
    }
    
    if(!['hot', 'new', 'controversial', 'top'].includes(sortby)) {
      console.error(`Got invalid sort.`, req.originalUrl)
      return res.redirect(`/u/${user}`)
    }
    
    if(past) {
      if(sortby === 'controversial' || sortby === 'top') {
        if(!['hour', 'day', 'week', 'month', 'year', 'all'].includes(past)) {
          console.error(`Got invalid past.`, req.originalUrl)
          return res.redirect(`/u/${user}/${sortby}`)
        }
      } else {
        past = ''
      }
    } else {
      if(sortby === 'controversial' || sortby === 'top') {
        past = 'all'
      } else {
        past = ''
      }
    }
    
    let key = `${user}:${after}:${before}:sort:${sortby}:past:${past}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the user ${key} key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got user ${user} key from redis.`);
        (async () => {
          let processed_json = await processJsonUser(json, false, after, before)
          return res.render('user', {
            data: processed_json,
            sortby: sortby,
            past: past,
            user_preferences: req.cookies
          })
        })()
      } else {
        fetch(encodeURI(`https://oauth.reddit.com/user/${user}/about`), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              user_data.about = json
              fetch(encodeURI(`https://oauth.reddit.com/user/${user}/overview?limit=26${d}&sort=${sortby}&t=${past}`), redditApiGETHeaders())
              .then(result => {
                if(result.status === 200) {
                  result.json()
                  .then(json => {
                    user_data.overview = json
                    redis.setex(key, config.setexs.user, JSON.stringify(user_data), (error) => {
                      if(error) {
                        console.error(`Error setting the user ${key} key to redis.`, error)
                        return res.render('index', { post: null, user_preferences: req.cookies })
                      } else {
                        (async () => {
                          let processed_json = await processJsonUser(user_data, true, after, before)
                          return res.render('user', {
                            data: processed_json,
                            sortby: sortby,
                            past: past,
                            user_preferences: req.cookies
                          })
                        })()
                      }
                    })
                  })
                } else {
                  console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
                  console.error(config.reddit_api_error_text)
                  return res.render('index', {
                    json: null,
                    http_status_code: result.status,
                    user_preferences: req.cookies
                  })
                }
              }).catch(error => {
                console.error(`Error fetching the overview JSON file from reddit.com/u/${user}`, error)
                return res.render('index', {
                  json: null,
                  http_status_code: result.status,
                  user_preferences: req.cookies
                })
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – User not found')
            } else {
              console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              http_statustext: result.statusText,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the about JSON file from reddit.com/u/${user}`, error)
        })
      }
    })
  })


  /**
  * POSTS
  */
  
  app.post('/saveprefs', (req, res, next) => {
    let theme = req.body.theme
    res.cookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    return res.redirect('/preferences')
  })

  app.post('/r/:subreddit/comments/:id/:snippet', (req, res, next) => {
    /* morechildren route */
    let all_ids = req.body.all_ids
    let post_url = req.body.url
    
    if(!all_ids || !post_url || !post_url.startsWith('/r/')) {
      return res.render('index', { json: null, user_preferences: req.cookies })
    } else {
      let post_id = post_url.split('/')[4]
      let ids_to_show = ''
      all_ids = all_ids.split(',')
      // TODO: paging
      let page = 1
      if(all_ids.length > 100) {
        ids_to_show = all_ids.slice(0,100)
        ids_to_show = ids_to_show.join()
      }
      
      let key = `morechildren:${post_url};1`
      redis.get(key, (error, json) => {
        if(error) {
          console.error(`Error getting the ${key} key from redis.`, error)
          return res.render('index', { json: null, user_preferences: req.cookies })
        }
        if(json) {
          console.log(`Redirecting to ${post_url} with cursor...`);
          return res.redirect(`${post_url}?cursor=${page}&page=${page}`)
        } else {
          let url = `https://oauth.reddit.com/api/morechildren?api_type=json&children=${ids_to_show}&limit_children=false&link_id=t3_${post_id}&sort=${config.post_comments_sort}`
          fetch(encodeURI(url), redditApiGETHeaders())
          .then(result => {
            if(result.status === 200) {
              result.json()
              .then(json => {
                if(json.json.data) {
                  if(json.json.data.things) {
                    let comments = json.json.data.things
                    redis.setex(key, config.setexs.posts, JSON.stringify(comments), (error) => {
                      if(error) {
                        console.error(`Error setting the ${key} key to redis.`, error)
                        return res.render('post', { post: null, user_preferences: req.cookies })
                      } else {
                        redis.setex(`morechildren_ids:${post_url}`, config.setexs.posts, JSON.stringify(all_ids))
                        console.log(`Fetched the JSON from reddit API (endpoint "morechildren") with url: ${url}.`)
                        console.log(`Redirecting to ${post_url} with cursor...`)
                        return res.redirect(`${post_url}?cursor=${page}&page=${page}`)
                      }
                    })
                  } else {
                    return res.redirect(post_url)
                  }
                } else {
                  return res.redirect(post_url)
                }
              })
            } else {
              console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
              return res.render('index', {
                json: null,
                http_status_code: result.status,
                user_preferences: req.cookies
              })
            }
          }).catch(error => {
            console.log(`Error fetching the JSON from reddit API (endpoint "morechildren") with url: ${url}.`, error)
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          })
        }
      })
    }
  })
}

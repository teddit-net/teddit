/**
* Lots of routes.. would be good idea to do some separation I guess.
*/
module.exports = (app, redis, fetch, RedditAPI) => {
  const config = require('./config');
  let processSubreddit = require('./inc/processJsonSubreddit.js')();
  let processPost = require('./inc/processJsonPost.js')();
  let processUser = require('./inc/processJsonUser.js')();
  let processSearches = require('./inc/processSearchResults.js')();
  let processAbout = require('./inc/processSubredditAbout.js')();
  let tedditApiSubreddit = require('./inc/teddit_api/handleSubreddit.js')();
  let tedditApiUser = require('./inc/teddit_api/handleUser.js')();
  let processSubredditsExplore = require('./inc/processSubredditsExplore.js')();

  app.get('/about', (req, res, next) => {
    return res.render('about', { user_preferences: req.cookies })
  })

  app.get('/preferences', (req, res, next) => {
    return res.render('preferences', { user_preferences: req.cookies, instance_config: config })
  })

  app.get('/resetprefs', (req, res, next) => {
    res.clearCookie('theme')
    res.clearCookie('flairs')
    res.clearCookie('nsfw_enabled')
    res.clearCookie('highlight_controversial')
    res.clearCookie('subbed_subreddits')
    return res.redirect('/preferences')
  })
  
  app.get('/import_prefs/:key', (req, res, next) => {
    let key = req.params.key
    if(!key)
      return res.redirect('/')
    if(key.length !== 10)
      return res.redirect('/')
    
    key = `prefs_key:${key}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the preferences import key ${key} from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        try {
          let prefs = JSON.parse(json)
          let subbed_subreddits_is_set = false
          for(var setting in prefs) {
            if(prefs.hasOwnProperty(setting)) {
              res.cookie(setting, prefs[setting], { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
              if(setting === 'subbed_subreddits')
                subbed_subreddits_is_set = true
            }
          }
          if(!subbed_subreddits_is_set)
            res.clearCookie('subbed_subreddits')
          return res.redirect('/')
        } catch(e) {
          console.error(`Error setting imported preferences to the cookies. Key: ${key}.`, error)
        }
      } else {
        return res.redirect('/preferences')
      }
    })
  })

  app.get('/privacy', (req, res, next) => {
    return res.render('privacypolicy', { user_preferences: req.cookies })
  })

  app.get('/gallery/:id', (req, res, next) => {
    return res.redirect(`/comments/${req.params.id}`)
  })

  app.get('/saved', (req, res, next) => {
    let saved = req.cookies.saved
    
    if(!saved || !Array.isArray(saved)) {
      return res.render('saved', {
        json: null,
        user_preferences: req.cookies,
      })
    }
    
    let key = `saved_posts:${saved.join(',')}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting saved_post ${saved_post} key from redis.`, error)
        return res.redirect('/')
      }
      if(json) {
        (async () => {
          let processed_json = await processJsonSubreddit(json, 'redis', null, req.cookies, true)
          if(!processed_json.error) {
            return res.render('saved', {
              json: processed_json,
              user_preferences: req.cookies,
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
      }
    })
  })

  app.get('/save/:id', (req, res, next) => {
    let post_id = req.params.id
    let redis_key = req.query.rk
    let back = req.query.b
    let saved = req.cookies.saved
    let fetched = req.query.f
    
    if(!post_id || !redis_key)
      return res.redirect('/saved')
      
    if(!saved || !Array.isArray(saved))
      saved = []
    
    if(saved.length > 100)
      return res.send('You can not save more than 100 posts.')
    
    redis.get(redis_key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${redis_key} key from redis (via /save/).`, error)
        return res.redirect('/')
      }
      if(json) {
        json = JSON.parse(json)
        if(fetched === 'true' || redis_key.includes('/comments/'))
          json = json[0]
        
        let post_to_save = false
        for(var i = 0; i < json.data.children.length; i++) {
          let post = json.data.children[i]
          if(post.data.id === post_id) {
            post_to_save = post
            break
          }
        }
        
        if(post_to_save) {
          if(!saved || !Array.isArray(saved))
            saved = []
          
          for(var i = 0; i < saved.length; i++) {
            if(post_to_save.data.id === saved[i])
              return res.redirect('/saved')
          }
          
          let key = `saved_posts:${saved.join(',')}`
          redis.get(key, (error, json) => {
            if(error) {
              console.error(`Error getting saved_posts ${key} key from redis.`, error)
              return res.redirect('/')
            }
            links = JSON.parse(json)
            if(!links)
              links = []
              
            links.unshift(post_to_save)
            saved.unshift(post_to_save.data.id)
            res.cookie('saved', saved, { maxAge: 3 * 365 * 24 * 60 * 60 * 1000, httpOnly: true })
            
            let new_key = `saved_posts:${saved.join(',')}`
            redis.set(new_key, JSON.stringify(links), (error) => {
              if(error)
                console.error(`Error saving ${new_key} to redis.`, error)
              
              if(!back)
                return res.redirect('/saved')
              else {
                back = back.replace(/§2/g, '?').replace(/§1/g, '&')
                return res.redirect(back)
              }
            })
          })
        } else {
          return res.redirect(`/comments/${post_id}/?save=true&b=${back}`)
        }
      } else {
        return res.redirect(`/comments/${post_id}/?save=true&b=${back}`)
      }
    })
  })
  
  app.get('/unsave/:id', (req, res, next) => {
    let post_id = req.params.id
    let back = req.query.b
    let saved = req.cookies.saved
    
    if(!post_id)
      return res.redirect('/saved')
      
    if(!saved || !Array.isArray(saved))
      return res.redirect('/saved')
    
    let key = `saved_posts:${saved.join(',')}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${key} key from redis (via /save/).`, error)
        return res.redirect('/')
      }
      if(json) {
        json = JSON.parse(json)
        let post_found = false
        for(var i = 0; i < json.length; i++) {
          if(json[i].data.id === post_id) {
            post_found = true
            json.splice(i, 1)
            for(var j = 0; j < saved.length; j++) {
              if(saved[j] === post_id)
                saved.splice(j, 1)
            }
          }
        }
        if(post_found) {
          res.cookie('saved', saved, { maxAge: 3 * 365 * 24 * 60 * 60 * 1000, httpOnly: true })
          
          let new_key = `saved_posts:${saved.join(',')}`
          redis.set(new_key, JSON.stringify(json), (error) => {
            if(error)
              console.error(`Error saving ${new_key} to redis.`, error)
            
            if(!back)
              return res.redirect('/saved')
            else {
              back = back.replace(/§2/g, '?').replace(/§1/g, '&')
              return res.redirect(back)
            }
          })
        } else {
          return res.redirect(`/saved`)
        }
      } else {
        return res.redirect(`/saved`)
      }
    })
  })
  
  app.get('/subreddits/:sort?', (req, res, next) => {
    let q = req.query.q
    let nsfw = req.query.nsfw
    let after = req.query.after
    let before = req.query.before
    let sortby = req.params.sort
    let searching = false
    
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
    
    if(nsfw !== 'on') {
      nsfw = 'off'
    }
    
    if(!sortby) {
      sortby = ''
    }
    
    let key = `subreddits:sort:${sortby}${d}`
    
    if(sortby === 'search') {
      if(typeof(q) == 'undefined' || q == '')
        return res.redirect('/subreddits')
      
      key = `subreddits:search:q:${q}:nsfw:${nsfw}${d}`
      searching = true
    }

    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the subreddits key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got subreddits key from redis.`);
        (async () => {
          let processed_json = await processJsonSubredditsExplore(json, 'redis', null, req.cookies)
          if(!processed_json.error) {
            return res.render('subreddits_explore', {
              json: processed_json,
              sortby: sortby,
              after: after,
              before: before,
              q: q,
              nsfw: nsfw,
              searching: searching,
              subreddits_front: (!before && !after) ? true : false,
              user_preferences: req.cookies,
              instance_nsfw_enabled: config.nsfw_enabled
            })
          } else {
            return res.render('subreddits_explore', {
              json: null,
              error: true,
              data: processed_json,
              user_preferences: req.cookies
            })
          }
        })()
      } else {
        let url = ''
        if(config.use_reddit_oauth) {
          if(!searching)
            url = `https://oauth.reddit.com/subreddits/${sortby}?api_type=json&count=25&g=GLOBAL&t=${d}`
          else
            url = `https://oauth.reddit.com/subreddits/search?api_type=json&q=${q}&include_over_18=${nsfw}${d}`
        } else {
          if(!searching)
            url = `https://reddit.com/subreddits/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${d}`
          else
            url = `https://reddit.com/subreddits/search.json?api_type=json&q=${q}&include_over_18=${nsfw}${d}`
        }

        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              let ex = config.setexs.subreddits_explore.front
              if(sortby === 'new')
                ex = config.setexs.subreddits_explore.new_page
              redis.setex(key, ex, JSON.stringify(json), (error) => {
                if(error) {
                  console.error(`Error setting the subreddits key to redis.`, error)
                  return res.render('subreddits_explore', { json: null, user_preferences: req.cookies })
                } else {
                  console.log(`Fetched the JSON from reddit.com/subreddits.`);
                  (async () => {
                    let processed_json = await processJsonSubredditsExplore(json, 'from_online', null, req.cookies)
                    return res.render('subreddits_explore', {
                      json: processed_json,
                      sortby: sortby,
                      after: after,
                      before: before,
                      q: q,
                      nsfw: nsfw,
                      searching: searching,
                      subreddits_front: (!before && !after) ? true : false,
                      user_preferences: req.cookies,
                      instance_nsfw_enabled: config.nsfw_enabled
                    })
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Subreddits not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the JSON file from reddit.com/subreddits.`, error)
        })
      }
    })
  })

  app.get('/subscribe/:subreddit', (req, res, next) => {
    let subreddit = req.params.subreddit
    let subbed = req.cookies.subbed_subreddits
    let back = req.query.b
    
    if(!subreddit)
      return res.redirect('/')
    
    if(!subbed || !Array.isArray(subbed))
      subbed = []
      
    if(!subbed.includes(subreddit))
      subbed.push(subreddit)

    res.cookie('subbed_subreddits', subbed, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if(!back)
      return res.redirect('/r/' + subreddit)
    else {
      back = back.replace(/,/g, '+').replace(/§1/g, '&')
      return res.redirect(back)
    }
  })
  
  app.get('/import_subscriptions/:subreddits', (req, res, next) => {
    let subreddits = req.params.subreddits
    let subbed = req.cookies.subbed_subreddits
    let back = req.query.b
    
    if(!subreddits)
      return res.redirect('/')
    
    if(!subbed || !Array.isArray(subbed))
      subbed = []
      
    subreddits = subreddits.split('+')
    for(var i = 0; i < subreddits.length; i++) {
      if(!subbed.includes(subreddits[i]))
        subbed.push(subreddits[i])
    }
    
    res.cookie('subbed_subreddits', subbed, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    if(!back)
      return res.redirect('/r/' + subreddits)
    else {
      back = back.replace(/,/g, '+').replace(/ /g, '+')
      return res.redirect(back)
    }
  })
  
  app.get('/unsubscribe/:subreddit', (req, res, next) => {
    let subreddit = req.params.subreddit
    let subbed = req.cookies.subbed_subreddits
    let back = req.query.b
    
    if(!subreddit || !subbed || !Array.isArray(subbed)) {
      res.clearCookie('subbed_subreddits')
      return res.redirect('/')
    }
    
    var index = subbed.indexOf(subreddit)
    if(index !== -1)
      subbed.splice(index, 1)

    if(subbed.length <= 0)
      res.clearCookie('subbed_subreddits')
    else
      res.cookie('subbed_subreddits', subbed, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if(!back)
      return res.redirect('/r/' + subreddit)
    else {
      back = back.replace(/,/g, '+').replace(/§1/g, '&')
      return res.redirect(back)
    }
  })
  
  app.get('/search', (req, res, next) => {
    let q = req.query.q

    if (typeof q === "undefined") {
      return res.render('search', {
        json: { posts: [] },
        no_query: true,
        q: '',
        restrict_sr: undefined,
        nsfw: undefined,
        subreddit: 'all',
        sortby: undefined,
        past: undefined,
        user_preferences: req.cookies 
      })
    }

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
    if(restrict_sr !== 'on') {
      restrict_sr = 'off'
    }
    
    if(nsfw !== 'on') {
      nsfw = 'off'
    }
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    return res.redirect(`/r/all/search?q=${q}&restrict_sr=${restrict_sr}&nsfw=${nsfw}&sort=${sortby}&t=${past}${d}`)
  })

  app.get('/:sort?', (req, res, next) => {
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let sortby = req.params.sort
    let api_req = req.query.api
    let api_type = req.query.type
    let api_target = req.query.target
    
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
    
    if(req.query.hasOwnProperty('api'))
      api_req = true
    else
      api_req = false
     
    let key = `/after:${after}:before:${before}:sort:${sortby}:past:${past}`
    
    let subbed_subreddits = req.cookies.subbed_subreddits
    let get_subbed_subreddits = false
    if(subbed_subreddits && Array.isArray(subbed_subreddits)) {
      get_subbed_subreddits = true
      subbed_subreddits = subbed_subreddits.join('+')
      key = `${subbed_subreddits.toLowerCase()}:${after}:${before}:sort:${sortby}:past:${past}`
    }
    
    redis.get(key, (error, json) => {
      if(error) {
        console.error('Error getting the frontpage key from redis.', error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log('Got frontpage key from redis.');
        (async () => {
          if(api_req) {
            return handleTedditApiSubreddit(json, req, res, 'redis', api_type, api_target, '/')
          } else {
            let processed_json = await processJsonSubreddit(json, 'redis', null, req.cookies)
            return res.render('index', {
              json: processed_json,
              sortby: sortby,
              past: past,
              user_preferences: req.cookies,
              redis_key: key
            })
          }
        })()
      } else {
        let url = ''
        if(config.use_reddit_oauth) {
          if(get_subbed_subreddits)
            url = `https://oauth.reddit.com/r/${subbed_subreddits}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
          else
            url = `https://oauth.reddit.com/${sortby}?api_type=json&g=GLOBAL&t=${past}${d}`
        } else {
          if(get_subbed_subreddits)
            url = `https://reddit.com/r/${subbed_subreddits}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
          else
            url = `https://reddit.com/${sortby}.json?g=GLOBAL&t=${past}${d}`
        }
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.frontpage, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the frontpage key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched the frontpage from Reddit.');
                  (async () => {
                    if(api_req) {
                      return handleTedditApiSubreddit(json, req, res, 'from_online', api_type, api_target, '/')
                    } else {
                      let processed_json = await processJsonSubreddit(json, 'from_online', null, req.cookies)
                      return res.render('index', {
                        json: processed_json,
                        sortby: sortby,
                        past: past,
                        user_preferences: req.cookies,
                        redis_key: key
                      })
                    }
                  })()
                }
              })
            })
          } else {
            console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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

  app.get('/comments/:post_id/:comment?/:comment_id?', (req, res, next) => {
    let post_id = req.params.post_id
    let comment = req.params.comment
    let comment_id = req.params.comment_id
    let back = req.query.b
    let save = req.query.save
    let post_url = false
    let comment_url = false
    
    if(comment)
      if(comment !== 'comment' || !comment_id)
        return res.redirect('/')
    
    if(comment)
      comment_url = true
    else
      post_url = true
    
    let key = `/shorturl:post:${post_id}:comment:${comment_id}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error('Error getting the short URL for post key from redis.', error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log('Got short URL for post key from redis.')
        json = JSON.parse(json)
        if(post_url) {
          if(save === 'true')
            return res.redirect(`/save/${post_id}/?rk=${key}&b=${back}&f=true`)
          return res.redirect(json[0].data.children[0].data.permalink)
        } else {
          return res.redirect(json[1].data.children[0].data.permalink)
        }
      } else {
        let url = ''
        if(config.use_reddit_oauth) {
          if(post_url)
            url = `https://oauth.reddit.com/comments/${post_id}?api_type=json`
          else
            url = `https://oauth.reddit.com/comments/${post_id}/comment/${comment_id}?api_type=json`
        } else {
          if(post_url)
            url = `https://reddit.com/comments/${post_id}.json?api_type=json`
          else
            url = `https://reddit.com/comments/${post_id}/comment/${comment_id}.json?api_type=json`
        }
        
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.shorts, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the short URL for post key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched the short URL for post from Reddit.')
                  if(post_url) {
                    if(save === 'true')
                      return res.redirect(`/save/${post_id}/?rk=${key}&b=${back}&f=true`)
                    return res.redirect(json[0].data.children[0].data.permalink)
                  } else {
                    return res.redirect(json[1].data.children[0].data.permalink)
                  }
                }
              })
            })
          } else {
            console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
            console.error(config.reddit_api_error_text)
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error('Error fetching the short URL for post with sortby JSON file.', error)
        })
      }
    })
  })
  
  app.get('/r/:subreddit/search', (req, res, next) => {
    let subreddit = req.params.subreddit
    let q = req.query.q

    if (typeof q === "undefined") {
      return res.render('search', {
        json: { posts: [] },
        no_query: true,
        q: '',
        restrict_sr: undefined,
        nsfw: undefined,
        subreddit: subreddit,
        sortby: undefined,
        past: undefined,
        user_preferences: req.cookies
      })
    }

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
    
    if(restrict_sr !== 'on') {
      restrict_sr = 'off'
    }
    
    if(nsfw !== 'on') {
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
          let processed_json = await processSearchResults(json, false, after, before, req.cookies)
          return res.render('search', {
            json: processed_json,
            no_query: false,
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
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com/r/${subreddit}/search?api_type=json&q=${q}&restrict_sr=${restrict_sr}&include_over_18=${nsfw}&sort=${sortby}&t=${past}${d}`
        else
          url = `https://reddit.com/r/${subreddit}/search.json?api_type=json&q=${q}&restrict_sr=${restrict_sr}&include_over_18=${nsfw}&sort=${sortby}&t=${past}${d}`
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.searches, JSON.stringify(json), (error) => {
                if(error) {
                  console.error('Error setting the searches key to redis.', error)
                  return res.render('index', { json: null, user_preferences: req.cookies })
                } else {
                  console.log('Fetched search results from Reddit.');
                  (async () => {
                    let processed_json = await processSearchResults(json, true, after, before, req.cookies)
                    return res.render('search', {
                      no_query: false,
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
            console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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
  
  app.get('/r/:subreddit/wiki/:page?', (req, res, next) => {
    let subreddit = req.params.subreddit
    let page = req.params.page
    
    if(!page)
      page = 'index'
    
    let key = `${subreddit.toLowerCase()}:wiki:page:${page}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${subreddit} wiki key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got /r/${subreddit} wiki key from redis.`)
        json = JSON.parse(json)
        return res.render('subreddit_wiki', {
          content_html: unescape(json.data.content_html),
          subreddit: subreddit,
          user_preferences: req.cookies
        })
      } else {
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com/r/${subreddit}/wiki/${page}?api_type=json`
        else
          url = `https://reddit.com/r/${subreddit}/wiki/${page}.json?api_type=json`
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(key, config.setexs.wikis, JSON.stringify(json), (error) => {
                if(error) {
                  console.error(`Error setting the ${subreddit} wiki key to redis.`, error)
                  return res.render('subreddit', { json: null, user_preferences: req.cookies })
                } else {
                  console.log(`Fetched the JSON from reddit.com/r/${subreddit}/wiki.`)
                  return res.render('subreddit_wiki', {
                    content_html: unescape(json.data.content_html),
                    subreddit: subreddit,
                    user_preferences: req.cookies
                  })
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Subreddit wiki not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the JSON file from reddit.com/r/${subreddit}/wiki.`, error)
        })
      }
    })
  })
  
  app.get('/r/:subreddit/w/:page?', (req, res, next) => {
    /* "w" is a shorturl for wikis for example https://old.reddit.com/r/privacytoolsIO/w/index */
    let subreddit = req.params.subreddit
    let page = req.params.page
    if(!page)
      page = 'index'
    return res.redirect(`/r/${subreddit}/wiki/${page}`)
  })
  
  app.get('/r/random', (req, res, next) => {
    let url = ''
    if(config.use_reddit_oauth)
      url = `https://oauth.reddit.com/r/random?api_type=json&count=25&g=GLOBAL`
    else
      url = `https://reddit.com/r/random.json?api_type=json&count=25&g=GLOBAL`
    
    fetch(encodeURI(url), redditApiGETHeaders())
    .then(result => {
      if(result.status === 200) {
        result.json()
        .then(json => {
          let subreddit = json.data.children[0].data.subreddit
          if(subreddit) {
            let key = `${subreddit.toLowerCase()}:undefined:undefined:sort:hot:past:undefined`
            redis.setex(key, config.setexs.subreddit, JSON.stringify(json), (error) => {
              if(error) {
                console.error(`Error setting the random subreddit key to redis.`, error)
                return res.render('subreddit', { json: null, user_preferences: req.cookies })
              } else {
                console.log(`Fetched the JSON from reddit.com/r/${subreddit}.`);
                return res.redirect(`/r/${subreddit}`)
              }
            })
          } else {
            console.error(`Fetching random subreddit failed.`, json)
            return res.render('index', { json: null, user_preferences: req.cookies })
          }
        })
      } else {
        if(result.status === 404) {
          console.log('404 – Subreddit not found')
        } else {
          console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
          console.error(config.reddit_api_error_text)
        }
        return res.render('index', {
          json: null,
          http_status_code: result.status,
          user_preferences: req.cookies
        })
      }
    }).catch(error => {
      console.error(`Error fetching the JSON file from reddit.com/r/random.`, error)
    })
  })
  
  app.get('/r/:subreddit/:sort?', (req, res, next) => {
    let subreddit = req.params.subreddit
    let sortby = req.params.sort
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let api_req = req.query.api
    let api_type = req.query.type
    let api_target = req.query.target
    
    if(req.query.hasOwnProperty('api'))
      api_req = true
    else
      api_req = false
      
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
          if(api_req) {
            return handleTedditApiSubreddit(json, req, res, 'redis', api_type, api_target, subreddit)
          } else {
            let processed_json = await processJsonSubreddit(json, 'redis', null, req.cookies)
            let subreddit_about = await processSubredditAbout(subreddit, redis, fetch, RedditAPI)
            if(!processed_json.error) {
              return res.render('subreddit', {
                json: processed_json,
                subreddit: subreddit,
                subreddit_about: subreddit_about,
                subreddit_front: (!before && !after) ? true : false,
                sortby: sortby,
                past: past,
                user_preferences: req.cookies,
                instance_nsfw_enabled: config.nsfw_enabled,
                redis_key: key,
                after: req.query.after,
                before: req.query.before
              })
            } else {
              return res.render('subreddit', {
                json: null,
                error: true,
                data: processed_json,
                user_preferences: req.cookies
              })
            }
          }
        })()
      } else {
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com/r/${subreddit}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
        else
          url = `https://reddit.com/r/${subreddit}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
        fetch(encodeURI(url), redditApiGETHeaders())
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
                    if(api_req) {
                      return handleTedditApiSubreddit(json, req, res, 'from_online', api_type, api_target, subreddit)
                    } else {
                      let processed_json = await processJsonSubreddit(json, 'from_online', null, req.cookies)
                      let subreddit_about = await processSubredditAbout(subreddit, redis, fetch, RedditAPI)
                      return res.render('subreddit', {
                        json: processed_json,
                        subreddit: subreddit,
                        subreddit_about: subreddit_about,
                        subreddit_front: (!before && !after) ? true : false,
                        sortby: sortby,
                        past: past,
                        user_preferences: req.cookies,
                        instance_nsfw_enabled: config.nsfw_enabled,
                        redis_key: key,
                        after: req.query.after,
                        before: req.query.before
                      })
                    }
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Subreddit not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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

  app.get('/r/:subreddit/comments/:id/:snippet?/:comment_id?', (req, res, next) => {
    let subreddit = req.params.subreddit
    let id = req.params.id
    let snippet = encodeURIComponent(req.params.snippet)
    let sortby = req.query.sort
    let comment_id = ''
    let viewing_comment = false
    let more_comments_cursor = req.query.cursor
    let context = parseInt(req.query.context)
    
    if(req.params.comment_id) {
      comment_id = `${req.params.comment_id}/`
      viewing_comment = true
    }
    
    if(!sortby) {
      sortby = config.post_comments_sort
    }
    
    if(!['confidence', 'top', 'new', 'controversial', 'old', 'qa', 'random'].includes(sortby)) {
      console.error(`Got invalid sort.`, req.originalUrl)
      return res.redirect('/')
    }
    
    let comments_url = `/r/${subreddit}/comments/${id}/${snippet}/${comment_id}`
    let post_url = `/r/${subreddit}/comments/${id}/${snippet}/`
    let comments_key = `${comments_url}:sort:${sortby}`
    
    redis.get(comments_key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${comments_url} key from redis.`, error)
        return res.render('index', { post: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got ${comments_url} key from redis.`);
        (async () => {
          if(!more_comments_cursor) {
            let processed_json = await processJsonPost(json, false, req.cookies)
            let finalized_json = await finalizeJsonPost(processed_json, id, post_url, null, viewing_comment, req.cookies)
            return res.render('post', {
              post: finalized_json.post_data,
              comments: finalized_json.comments,
              viewing_comment: viewing_comment,
              post_url: post_url,
              subreddit: subreddit,
              sortby: sortby,
              user_preferences: req.cookies,
              instance_nsfw_enabled: config.nsfw_enabled,
              post_media_max_heights: config.post_media_max_heights,
              redis_key: comments_key
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
                        let processed_json = await processJsonPost(post_json, true, req.cookies)
                        let finalized_json = await finalizeJsonPost(processed_json, id, post_url, morechildren_ids)
                        
                        return res.render('post', {
                          post: finalized_json.post_data,
                          comments: finalized_json.comments,
                          viewing_comment: false,
                          post_url: post_url,
                          subreddit: req.params.subreddit,
                          sortby: sortby,
                          more_comments_page: 1,
                          user_preferences: req.cookies,
                          instance_nsfw_enabled: config.nsfw_enabled,
                          post_media_max_heights: config.post_media_max_heights,
                          redis_key: comments_key
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
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com${comments_url}?api_type=json&sort=${sortby}&context=${context}`
        else
          url = `https://reddit.com${comments_url}.json?api_type=json&sort=${sortby}&context=${context}`
        
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              redis.setex(comments_key, config.setexs.posts, JSON.stringify(json), (error) => {
                if(error) {
                  console.error(`Error setting the ${comments_url} key to redis.`, error)
                  return res.render('post', { post: null, user_preferences: req.cookies })
                } else {
                  console.log(`Fetched the JSON from reddit.com${comments_url}.`);
                  (async () => {
                    let processed_json = await processJsonPost(json, true, req.cookies)
                    let finalized_json = await finalizeJsonPost(processed_json, id, post_url, null, viewing_comment)
                    return res.render('post', {
                      post: finalized_json.post_data,
                      comments: finalized_json.comments,
                      viewing_comment: viewing_comment,
                      post_url: post_url,
                      subreddit: subreddit,
                      sortby: sortby,
                      user_preferences: req.cookies,
                      instance_nsfw_enabled: config.nsfw_enabled,
                      post_media_max_heights: config.post_media_max_heights,
                      redis_key: comments_key
                    })
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Post not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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

  app.get('/user/:user/:kind?', (req, res, next) => {
    let kind = ''
    if(req.params.kind)
      kind = `/${req.params.kind}`
    let q = ''
    if(req.query.sort)     
      q += `?sort=${req.query.sort}&`
    if(req.query.t)
      q += `t=${req.query.t}`
      
    res.redirect(`/u/${req.params.user}${kind}${q}`)
  })

  app.get('/u/:user/:kind?', (req, res, next) => {
    let user = req.params.user
    let after = req.query.after
    let before = req.query.before
    let post_type = req.params.kind
    let kind = post_type
    let user_data = {}
    let api_req = req.query.api
    let api_type = req.query.type
    let api_target = req.query.target
    
    if(req.query.hasOwnProperty('api'))
      api_req = true
    else
      api_req = false
    
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

    post_type = `/${post_type}`
    switch(post_type) {
      case '/comments':
        kind = 't1'
        break;
      case '/submitted':
        kind = 't3'
        break;
      default:
        post_type = ''
        kind = ''
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
    
    let key = `${user}:${after}:${before}:sort:${sortby}:past:${past}:post_type:${post_type}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the user ${key} key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got user ${user} key from redis.`);
        (async () => {
          if(api_req) {
            return handleTedditApiUser(json, req, res, 'redis', api_type, api_target, user, after, before)
          } else {
            let processed_json = await processJsonUser(json, false, after, before, req.cookies, kind, post_type)
            return res.render('user', {
              data: processed_json,
              sortby: sortby,
              past: past,
              user_preferences: req.cookies
            })
          }
        })()
      } else {
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com/user/${user}/about`
        else
          url = `https://reddit.com/user/${user}/about.json`
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if(result.status === 200) {
            result.json()
            .then(json => {
              user_data.about = json
              let url = ''
              if(config.use_reddit_oauth) {
                let endpoint = '/overview'
                if(post_type !== '')
                  endpoint = post_type
                url = `https://oauth.reddit.com/user/${user}${post_type}?limit=26${d}&sort=${sortby}&t=${past}`
              } else {
                url = `https://reddit.com/user/${user}${post_type}.json?limit=26${d}&sort=${sortby}&t=${past}`
              }
              fetch(encodeURI(url), redditApiGETHeaders())
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
                          if(api_req) {
                            return handleTedditApiUser(user_data, req, res, 'online', api_type, api_target, user, after, before)
                          } else {
                            let processed_json = await processJsonUser(user_data, true, after, before, req.cookies, kind, post_type)
                            return res.render('user', {
                              data: processed_json,
                              sortby: sortby,
                              past: past,
                              user_preferences: req.cookies
                            })
                          }
                        })()
                      }
                    })
                  })
                } else {
                  console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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
              console.log('404 – User not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
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
  
  app.get('/user/:user/m/:custom_feed', (req, res, next) => {
    res.redirect(`/u/${req.params.user}/m/${req.params.custom_feed}`)
  })
  
  app.get('/u/:user/m/:custom_feed/:sort?', (req, res, next) => {
    let user = req.params.user
    let custom_feed = req.params.custom_feed
    let subreddit = `u/${user}/m/${custom_feed}`
    let sortby = req.params.sort
    let past = req.query.t
    let before = req.query.before
    let after = req.query.after
    let api_req = req.query.api
    let api_type = req.query.type
    let api_target = req.query.target
    
    if(req.query.hasOwnProperty('api'))
      api_req = true
    else
      api_req = false
      
    let d = `&after=${after}`
    if(before) {
      d = `&before=${before}`
    }
    
    if(!sortby) {
      sortby = 'hot'
    }
    
    if(!['new', 'rising', 'controversial', 'top', 'gilded', 'hot'].includes(sortby)) {
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
        past = undefined
      }
    } else {
      if(sortby === 'controversial' || sortby === 'top') {
        past = 'day'
      }
    }
    
    let key = `${user.toLowerCase()}:m:${custom_feed}:${after}:${before}:sort:${sortby}:past:${past}`
    redis.get(key, (error, json) => {
      if(error) {
        console.error(`Error getting the ${user} custom_feed key from redis.`, error)
        return res.render('index', { json: null, user_preferences: req.cookies })
      }
      if(json) {
        console.log(`Got /u/${user} custom_feed key from redis.`);
        (async () => {
          if(api_req) {
            return handleTedditApiSubreddit(json, req, res, 'redis', api_type, api_target, subreddit)
          } else {
            let processed_json = await processJsonSubreddit(json, 'redis', null, req.cookies)
            if(!processed_json.error) {
              return res.render('subreddit', {
                json: processed_json,
                subreddit: '../' + subreddit,
                subreddit_about: null,
                subreddit_front: (!before && !after) ? true : false,
                sortby: sortby,
                past: past,
                user_preferences: req.cookies,
                instance_nsfw_enabled: config.nsfw_enabled,
                redis_key: key,
                after: req.query.after,
                before: req.query.before
              })
            } else {
              return res.render('subreddit', {
                json: null,
                error: true,
                data: processed_json,
                user_preferences: req.cookies
              })
            }
          }
        })()
      } else {
        let url = ''
        if(config.use_reddit_oauth)
          url = `https://oauth.reddit.com/${subreddit}/${sortby}?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
        else
          url = `https://reddit.com/${subreddit}/${sortby}.json?api_type=json&count=25&g=GLOBAL&t=${past}${d}`
        fetch(encodeURI(url), redditApiGETHeaders())
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
                    if(api_req) {
                      return handleTedditApiSubreddit(json, req, res, 'from_online', api_type, api_target, subreddit)
                    } else {
                      let processed_json = await processJsonSubreddit(json, 'from_online', null, req.cookies)
                      return res.render('subreddit', {
                        json: processed_json,
                        subreddit: '../' + subreddit,
                        subreddit_about: null,
                        subreddit_front: (!before && !after) ? true : false,
                        sortby: sortby,
                        past: past,
                        user_preferences: req.cookies,
                        instance_nsfw_enabled: config.nsfw_enabled,
                        redis_key: key,
                        after: req.query.after,
                        before: req.query.before
                      })
                    }
                  })()
                }
              })
            })
          } else {
            if(result.status === 404) {
              console.log('404 – Subreddit not found')
            } else {
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
            }
            return res.render('index', {
              json: null,
              http_status_code: result.status,
              user_preferences: req.cookies
            })
          }
        }).catch(error => {
          console.error(`Error fetching the JSON file from reddit.com/${subreddit}.`, error)
        })
      }
    })
  })

  /**
  * POSTS
  */
  
  app.post('/saveprefs', (req, res, next) => {
    let theme = req.body.theme
    let flairs = req.body.flairs
    let nsfw_enabled = req.body.nsfw_enabled
    let highlight_controversial = req.body.highlight_controversial
    let post_media_max_height = req.body.post_media_max_height
    let collapse_child_comments = req.body.collapse_child_comments
    let show_upvoted_percentage = req.body.show_upvoted_percentage

    res.cookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    if(flairs === 'on')
      flairs = 'true'
    else
      flairs = 'false'
    res.cookie('flairs', flairs, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    if(nsfw_enabled === 'on')
      nsfw_enabled = 'true'
    else
      nsfw_enabled = 'false'
    res.cookie('nsfw_enabled', nsfw_enabled, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if(highlight_controversial === 'on')
      highlight_controversial = 'true'
    else
      highlight_controversial = 'false'
    res.cookie('highlight_controversial', highlight_controversial, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if(config.post_media_max_heights.hasOwnProperty(post_media_max_height) || !isNaN(post_media_max_height))
      res.cookie('post_media_max_height', post_media_max_height, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    if(collapse_child_comments === 'on')
      collapse_child_comments = 'true'
    else
      collapse_child_comments = 'false'
    res.cookie('collapse_child_comments', collapse_child_comments, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    if(show_upvoted_percentage === 'on')
      show_upvoted_percentage = 'true'
    else
      show_upvoted_percentage = 'false'
    res.cookie('show_upvoted_percentage', show_upvoted_percentage, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    
    return res.redirect('/preferences')
  })
  
  app.post('/export_prefs', (req, res, next) => {
    let export_saved = req.body.export_saved
    let export_data = req.cookies
    
    if(export_saved !== 'on') {
      if(req.cookies.saved)
        delete export_data.saved
    }
    
    let r = `${(Math.random().toString(36)+'00000000000000000').slice(2, 10+2).toUpperCase()}`
    let key = `prefs_key:${r}`
    redis.set(key, JSON.stringify(req.cookies), (error) => {
      if(error) {
        console.error(`Error saving preferences to redis.`, error)
        return res.redirect('/preferences')
      } else {
        return res.render('preferences', { user_preferences: req.cookies, instance_config: config, preferences_key: r })
      }
    })
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
          if(!config.use_reddit_oauth)
            return res.send(`This instance is using Reddit's public API (non-OAuth), and therefore this endpoint is not supported.`)
          let url = `https://oauth.reddit.com/api/morechildren?api_type=json&children=${ids_to_show}&limit_children=false&link_id=t3_${post_id}`
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
                        console.log(`Fetched the JSON from Reddit (endpoint "morechildren") with url: ${url}.`)
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
              console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText}`)
              console.error(config.reddit_api_error_text)
              return res.render('index', {
                json: null,
                http_status_code: result.status,
                user_preferences: req.cookies
              })
            }
          }).catch(error => {
            console.log(`Error fetching the JSON from Reddit (endpoint "morechildren") with url: ${url}.`, error)
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


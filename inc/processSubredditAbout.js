module.exports = function() {
  const config = require('../config')
  this.processSubredditAbout = (subreddit, redis, fetch, RedditAPI) => {
    return new Promise(resolve => {
      (async () => {
        if(subreddit && !subreddit.includes('+') && subreddit !== 'all') {
          function returnRelevantKeys(json) {
            return {
              title: json.data.title,
              public_description_html: json.data.public_description_html,
              active_user_count: json.data.active_user_count,
              subscribers: json.data.subscribers,
              created_utc: json.data.created_utc,
              over18: json.data.over18,
              description_html: json.data.description_html,
              moderators: json.moderators
            }
          }
        
          let key = `${subreddit}:sidebar`
          redis.get(key, (error, json) => {
            if(error) {
              console.error(`Error getting the ${subreddit}:sidebar key from redis.`, error)
              resolve(null)
            }
            if(json) {
              json = JSON.parse(json)
              resolve(returnRelevantKeys(json))
            } else {
              let url = `https://reddit.com/r/${subreddit}/about.json`
              if(config.use_reddit_oauth) {
                url = `https://oauth.reddit.com/r/${subreddit}/about`
              }
              fetch(encodeURI(url), redditApiGETHeaders())
              .then(result => {
                if(result.status === 200) {
                  result.json()
                  .then(json => {
                    json.moderators = []
                    redis.setex(key, config.setexs.sidebar, JSON.stringify(json), (error) => {
                      if(error) {
                        console.error('Error setting the sidebar key to redis.', error)
                        return res.render('index', { json: null, user_preferences: req.cookies })
                      } else {
                        console.log('Fetched the sidebar from reddit API.')
                        let moderators_url = `https://reddit.com/r/${subreddit}/about/moderators.json`
                        if(config.use_reddit_oauth) {
                          moderators_url = `https://oauth.reddit.com/r/${subreddit}/about/moderators`
                        }
                        resolve(returnRelevantKeys(json))
                        /*
                        * The following code is commented out because Reddit doesn't
                        * anymore support fetching moderators for subreddits
                        * when not logged in.
                        * This might change in the future though.
                        * https://codeberg.org/teddit/teddit/issues/207
                        */
                        
                        /*
                        fetch(encodeURI(moderators_url), redditApiGETHeaders())
                        .then(mod_result => {
                          if(mod_result.status === 200) {
                            mod_result.json()
                            .then(mod_json => {
                              json.moderators = mod_json
                              redis.setex(key, config.setexs.sidebar, JSON.stringify(json), (error) => {
                                if(error) {
                                  console.error('Error setting the sidebar with moderators key to redis.', error)
                                  return res.render('index', { json: null, user_preferences: req.cookies })
                                } else {
                                  console.log('Fetched the moderators from reddit API.')
                                  resolve(returnRelevantKeys(json))
                                }
                              })
                            })
                          } else {
                            console.error(`Something went wrong while fetching moderators data from reddit API. ${mod_result.status} – ${mod_result.statusText}`)
                            console.error(config.reddit_api_error_text)
                            resolve(returnRelevantKeys(json))
                          }
                        }).catch(error => {
                          console.error('Error fetching moderators.', error)
                          resolve(returnRelevantKeys(json))
                        })
                        */
                      }
                    })
                  })
                } else {
                  console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
                  console.error(config.reddit_api_error_text)
                  resolve(null)
                }
              }).catch(error => {
                console.error('Error fetching the sidebar.', error)
                resolve(null)
              })
            }
          })
        } else {
          resolve(null)
        }
      })()
    })
  }
}

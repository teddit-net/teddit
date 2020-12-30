module.exports = function() {
  const config = require('../config')
  this.processSubredditAbout = (subreddit, redis, fetch, RedditAPI) => {
    return new Promise(resolve => {
      (async () => {
        if(subreddit && !subreddit.includes('+')) {
          let key = `${subreddit}:sidebar`
          redis.get(key, (error, json) => {
            if(error) {
              console.error(`Error getting the ${subreddit}:sidebar key from redis.`, error)
              resolve(null)
            }
            if(json) {
              json = JSON.parse(json)
              let obj = {
                title: json.data.title,
                public_description_html: json.data.public_description_html,
                active_user_count: json.data.active_user_count,
                subscribers: json.data.subscribers,
                created_utc: json.data.created_utc,
                over18: json.data.over18,
                description_html: json.data.description_html
              }
              resolve(obj)
            } else {
              if(subreddit !== 'all') {
                let url = ''
                if(config.use_reddit_oauth)
                  url = `https://oauth.reddit.com/r/${subreddit}/about`
                else
                  url = `https://reddit.com/r/${subreddit}/about.json`
                fetch(encodeURI(url), redditApiGETHeaders())
                .then(result => {
                  if(result.status === 200) {
                    result.json()
                    .then(json => {
                      redis.setex(key, config.setexs.sidebar, JSON.stringify(json), (error) => {
                        if(error) {
                          console.error('Error setting the sidebar key to redis.', error)
                          return res.render('index', { json: null, user_preferences: req.cookies })
                        } else {
                          console.log('Fetched the sidebar from reddit API.');
                          (async () => {
                            let obj = {
                              title: json.data.title,
                              public_description_html: json.data.public_description_html,
                              active_user_count: json.data.active_user_count,
                              subscribers: json.data.subscribers,
                              created_utc: json.data.created_utc,
                              over18: json.data.over18,
                              description_html: json.data.description_html
                            }
                            resolve(obj)
                          })()
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
              } else {
                resolve(null)
              }
            }
          })
        } else {
          resolve(null)
        }
      })()
    })
  }
}

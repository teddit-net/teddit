module.exports = function() {
  const config = require('../config')
  this.moreComments = (fetch, redis, post_url, comment_ids, id) => {
    return new Promise(resolve => {
      (async () => {
        let key = `${post_url}:morechildren:comment_ids:${comment_ids}`
        redis.get(key, (error, json) => {
          if(error) {
            console.error(`Error getting the ${key} key from redis (moreComments()).`, error)
            resolve(false)
          }
          if(json) {
            json = JSON.parse(json)
            resolve(json)
          } else {
            let url = `https://oauth.reddit.com/api/morechildren?api_type=json&children=${comment_ids}&limit_children=false&link_id=t3_${id}`
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
                          console.error(`Error setting the ${key} key to redis (moreComments()).`, error)
                          resolve(false)
                        } else {
                          console.log(`Fetched the JSON from Reddit (endpoint "morechildren") for URL: ${post_url}. (moreComments())`)
                          resolve(comments)
                        }
                      })
                    } else {
                      resolve(false)
                    }
                  } else {
                    resolve(false)
                  }
                })
              } else {
                console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText} (moreComments())`)
                resolve(false)
              }
            }).catch(error => {
              console.log(`Error fetching the JSON from Reddit (endpoint "morechildren") with url: ${url}. (moreComments())`, error)
              resolve(false)
            })
          }
        })
      })()
    })
  }
}

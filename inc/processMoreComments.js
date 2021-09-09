const config = require('../config');
const { redisAsync } = require('./redis');

async function moreComments(fetch, redis, post_url, comment_ids, id) {
  if (post_url) {
    let key = `${post_url}:morechildren:comment_ids:${comment_ids}`
    redis.get(key, (error, json) => {
      if (error) {
        console.error(`Error getting the ${key} key from redis (moreComments()).`, error)
        return null;
      }
      if (json) {
        json = JSON.parse(json)
        return json;
      } else {
        let url = `https://oauth.reddit.com/api/morechildren?api_type=json&children=${comment_ids}&limit_children=false&link_id=t3_${id}`
        fetch(encodeURI(url), redditApiGETHeaders())
        .then(result => {
          if (result.status === 200) {
            result.json()
            .then(json => {
              if (json.json.data) {
                if (json.json.data.things) {
                  let comments = json.json.data.things
                  redis.setex(key, config.setexs.posts, JSON.stringify(comments), (error) => {
                    if (error) {
                      console.error(`Error setting the ${key} key to redis (moreComments()).`, error)
                      return null;
                    } else {
                      console.log(`Fetched the JSON from Reddit (endpoint "morechildren") for URL: ${post_url}. (moreComments())`)
                      return comments;
                    }
                  })
                } else {
                  return null;
                }
              } else {
                return null;
              }
            })
          } else {
            console.error(`Something went wrong while fetching data from Reddit. ${result.status} – ${result.statusText} (moreComments())`)
            return null;
          }
        }).catch(error => {
          console.log(`Error fetching the JSON from Reddit (endpoint "morechildren") with url: ${url}. (moreComments())`, error)
          return null;
        })
      }
    })
  } else {
    return null;
  }
}

module.exports = moreComments;

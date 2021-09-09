const config = require('../config');
const { redisAsync } = require('./redis');

async function processMoreComments(fetch, redis, post_url, comment_ids, id) {
  if (post_url) {
    let key = `${post_url}:morechildren:comment_ids:${comment_ids}`
    
    try {
      const cached = await redisAsync.get(key);

      if (cached !== null) {
        return JSON.parse(cached);
      }
      let url = `https://oauth.reddit.com/api/morechildren?api_type=json&children=${comment_ids}&limit_children=false&link_id=t3_${id}`
      const moreCommentsRequest = await fetch(url, redditApiGETHeaders());
      
      if (moreCommentsRequest.ok) {
        let response = await moreCommentsRequest.json();
          
        if (response.json.data) {
          if (response.json.data.things) {
            let comments = response.json.data.things
            await redisAsync.setex(
              key,
              config.setexs.posts,
              JSON.stringify(comments)
            );
            console.log(`Fetched more comments.`);
               
            return comments;
          }
        }
      } else {
        console.error(
          `Something went wrong while fetching data from Reddit: 
          ${moreCommentsRequest.status} – ${moreCommentsRequest.statusText}`
        );
        console.error(config.reddit_api_error_text);
        return null;
      }
    } catch (error) {
      console.error('Error fetching more comments: ', error);

      return null;
    }
  } else {
    return null;
  }
}

module.exports = processMoreComments;

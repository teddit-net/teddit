const config = require('../config');
const link = require('./components/link');

async function processSearchResults(
  json,
  parsed,
  after,
  before,
  user_preferences
) {
  if (!parsed) {
    json = JSON.parse(json);
  }
  let posts = [];
  let search_firstpage = false;

  before = json.data.before;
  after = json.data.after;

  if (!after && !before) {
    search_firstpage = true;
  }

  let suggested_subreddits = false;
  if (json.suggested_subreddits) {
    if (json.suggested_subreddits.data) {
      if (json.suggested_subreddits.data.children.length > 0) {
        suggested_subreddits = json.suggested_subreddits.data.children;
      }
    }
  }

  if (json.data.children) {
    let view_more_posts = false;
    let posts_limit = 25;

    if (json.data.children.length > posts_limit) {
      view_more_posts = true;
    } else {
      posts_limit = json.data.children.length;
    }

    for (var i = 0; i < posts_limit; i++) {
      let post = json.data.children[i].data;

      if (post.over_18)
        if (
          (config.nsfw_enabled === false &&
            user_preferences.nsfw_enabled != 'true') ||
          user_preferences.nsfw_enabled === 'false'
        )
          continue;

      let obj = await link.fromJson(post, user_preferences);
      posts.push(obj);
    }
  }

  let obj = {
    search_firstpage: search_firstpage,
    before: before,
    after: after,
    posts: posts,
    suggested_subreddits: suggested_subreddits,
  };

  return obj;
}

module.exports = processSearchResults;

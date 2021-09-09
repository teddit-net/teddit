const config = require('../config');

async function processJsonSubredditsExplore(
  json,
  from,
  subreddit_front,
  user_preferences
) {
  if (from === 'redis') {
    json = JSON.parse(json);
  }
  if (json.error) {
    return { error: true, error_data: json };
  } else {
    let before = json.data.before;
    let after = json.data.after;

    let ret = {
      info: {
        before: before,
        after: after,
      },
      links: [],
    };

    let children_len = json.data.children.length;

    for (var i = 0; i < children_len; i++) {
      let data = json.data.children[i].data;

      if (data.over_18)
        if (
          (config.nsfw_enabled === false &&
            user_preferences.nsfw_enabled != 'true') ||
          user_preferences.nsfw_enabled === 'false'
        )
          continue;

      let obj = {
        created: data.created_utc,
        id: data.id,
        over_18: data.over_18,
        display_name: data.display_name,
        display_name_prefixed: data.display_name_prefixed,
        public_description: data.public_description,
        url: replaceDomains(data.url, user_preferences),
        subscribers: data.subscribers,
        over_18: data.over18,
        title: data.title,
        subreddit_front: subreddit_front,
      };
      ret.links.push(obj);
    }
    return ret;
  }
}

module.exports = processJsonSubredditsExplore;

const config = require('../config');
const link = require('./components/link');

async function processJsonSubreddit(
  json,
  from,
  subreddit_front,
  user_preferences,
  saved
) {
  if (from === 'redis') {
    json = JSON.parse(json);
  }
  if (json.error) {
    return { error: true, error_data: json };
  } else {
    if (saved) {
      let t = {
        data: {
          before: null,
          after: null,
          children: json,
        },
      };
      json = t;
    }

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

      /* 
      // Todo: Remove this once the link component is done
      // but keep it for now in case we need it later
      let obj = {
        author: data.author,
        created: data.created_utc,
        domain: data.domain,
        id: data.id,
        images: images,
        is_video: data.is_video,
        link_flair_text: data.link_flair_text,
        locked: data.locked,
        media: data.media,
        selftext_html: data.selftext_html,
        num_comments: data.num_comments,
        over_18: data.over_18,
        permalink: data.permalink,
        score: data.score,
        subreddit: data.subreddit,
        title: data.title,
        ups: data.ups,
        upvote_ratio: data.upvote_ratio,
        url: replaceDomains(data.url, user_preferences),
        stickied: data.stickied,
        is_self_link: is_self_link,
        subreddit_front: subreddit_front,
        link_flair: (user_preferences.flairs != 'false' ? await formatLinkFlair(data) : ''),
        user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(data) : '')
      } */

      let obj = await link.fromJson(data, user_preferences, subreddit_front);

      ret.links.push(obj);
    }
    return ret;
  }
}

module.exports = processJsonSubreddit;

const config = require('../config');
const link = require('./components/link');

async function processJsonUser(
  json,
  parsed,
  after,
  before,
  user_preferences,
  kind,
  post_type
) {
  if (!parsed) {
    json = JSON.parse(json);
  }

  function validateJson(json) {
    const empty = {
      username: '',
      icon_img: '',
      created: '',
      verified: '',
      link_karma: '',
      comment_karma: '',
      view_more_posts: '',
      user_front: '',
      post_type:'',
      before: '',
      after: '',
      posts: [],
    };

    if (!json.overview) {
      return { error: true, data: empty };
    }

    if (!json.overview.data) {
      return { error: true, data: empty };
    }

    return true;
  }

  const validJson = validateJson(json);
  if (validJson.error) {
    return validJson.data
  }

  let about = json.about.data;
  let posts = [];
  let view_more_posts = false;
  let posts_limit = 25;
  let user_front = false;

  if (json.overview.data.children.length > posts_limit) {
    view_more_posts = true;
  } else {
    posts_limit = json.overview.data.children.length;
  }

  if (!after && !before) {
    user_front = true;
  }

  if (json.overview.data.children) {
    if (json.overview.data.children[posts_limit - 1]) {
      after = json.overview.data.children[posts_limit - 1].data.name;
    }
    if (json.overview.data.children[0]) {
      before = json.overview.data.children[0].data.name;
    }
  }

  for (var i = 0; i < posts_limit; i++) {
    let post = json.overview.data.children[i].data;
    let thumbnail = 'self';
    let type = json.overview.data.children[i].kind;
    let obj;

    let post_id = post.permalink.split('/').slice(-2)[0] + '/';
    let url = post.permalink.replace(post_id, '');

    if (type !== kind && kind) continue;

    if (post.over_18)
      if (
        (config.nsfw_enabled === false &&
          user_preferences.nsfw_enabled != 'true') ||
        user_preferences.nsfw_enabled === 'false'
      )
        continue;

    if (type === 't3') {
      obj = await link.fromJson(post, user_preferences);
      obj.type = 't3';
    }
    if (type === 't1') {
      obj = {
        type: type,
        subreddit: post.subreddit,
        title: post.title,
        created: post.created_utc,
        subreddit_name_prefixed: post.subreddit_name_prefixed,
        ups: post.ups,
        url: replaceDomains(url, user_preferences),
        edited: post.edited,
        body_html: unescape(post.body_html),
        num_comments: post.num_comments,
        over_18: post.over_18,
        permalink: post.permalink,
        link_author: post.link_author,
        link_title: post.link_title,
        user_flair:
          user_preferences.flairs != 'false' ? await formatUserFlair(post) : '',
      };
    }
    posts.push(obj);
  }

  let obj = {
    username: about.name,
    icon_img: await downloadAndSave(about.icon_img, 'icon_'),
    created: about.created_utc,
    verified: about.verified,
    link_karma: about.link_karma,
    comment_karma: about.comment_karma,
    view_more_posts: view_more_posts,
    user_front: user_front,
    post_type: post_type,
    before: before,
    after: after,
    posts: posts,
  };

  return obj;
}

module.exports = processJsonUser;

const compilePostComments = require('./compilePostComments.js')();
const procPostMedia = require('./processPostMedia.js')();
const config = require('../config');

async function processReplies(data, post_id, depth, user_preferences) {
  let return_replies = [];
  for (var i = 0; i < data.length; i++) {
    let kind = data[i].kind;
    let reply = data[i].data;
    let obj = {};
    if (kind !== 'more') {
      obj = {
        author: reply.author,
        body_html: reply.body_html,
        parent_id: reply.parent_id,
        created: reply.created_utc,
        edited: reply.edited,
        score: reply.score,
        ups: reply.ups,
        id: reply.id,
        permalink: teddifyUrl(reply.permalink),
        stickied: reply.stickied,
        distinguished: reply.distinguished,
        score_hidden: reply.score_hidden,
        edited: reply.edited,
        replies: [],
        depth: depth,
        user_flair:
          user_preferences.flairs != 'false'
            ? await formatUserFlair(reply)
            : '',
        controversiality:
          user_preferences.highlight_controversial != 'false'
            ? reply.controversiality
            : '',
      };
    } else {
      obj = {
        type: 'load_more',
        count: reply.count,
        id: reply.id,
        parent_id: reply.parent_id,
        post_id: post_id,
        children: [],
        depth: depth,
      };
    }

    if (reply.replies && kind !== 'more') {
      if (reply.replies.data.children.length) {
        for (var j = 0; j < reply.replies.data.children.length; j++) {
          let comment = reply.replies.data.children[j].data;
          let objct = {};

          if (comment.author && comment.body_html) {
            objct = {
              author: comment.author,
              body_html: comment.body_html,
              parent_id: comment.parent_id,
              created: comment.created_utc,
              edited: comment.edited,
              score: comment.score,
              ups: comment.ups,
              id: comment.id,
              permalink: teddifyUrl(comment.permalink),
              score_hidden: comment.score_hidden,
              distinguished: comment.distinguished,
              distinguished: comment.edited,
              replies: [],
              depth: depth + 1,
              user_flair:
                user_preferences.flairs != 'false'
                  ? await formatUserFlair(comment)
                  : '',
              controversiality:
                user_preferences.highlight_controversial != 'false'
                  ? comment.controversiality
                  : '',
            };
          } else {
            objct = {
              type: 'load_more',
              count: comment.count,
              id: comment.id,
              parent_id: comment.parent_id,
              post_id: post_id,
              children: [],
              depth: depth + 1,
            };
            if (comment.children) {
              for (var k = 0; k < comment.children.length; k++) {
                objct.children.push(comment.children[k]);
              }
            }
          }

          if (comment.replies) {
            if (comment.replies.data) {
              if (comment.replies.data.children.length > 0) {
                objct.replies = await processReplies(
                  comment.replies.data.children,
                  post_id,
                  depth,
                  user_preferences
                );
              }
            }
          }

          obj.replies.push(objct);
        }
      }
    }

    if (reply.children) {
      for (var j = 0; j < reply.children.length; j++) {
        obj.children.push(reply.children[j]);
      }
    }

    return_replies.push(obj);
  }
  return return_replies;
}

async function processJsonPost(json, parsed, user_preferences) {
  if (!parsed) {
    json = JSON.parse(json);
  }

  let post = json[0].data.children[0].data;
  let post_id = post.name;
  let comments = json[1].data.children;

  let obj = {
    author: post.author,
    created: post.created_utc,
    edited: post.edited,
    is_video: post.is_video,
    locked: post.locked,
    link_flair_text: post.link_flair_text,
    name: post_id,
    num_comments: post.num_comments,
    over_18: post.over_18,
    permalink: teddifyUrl(post.permalink),
    title: post.title,
    url: teddifyUrl(post.url, user_preferences),
    ups: post.ups,
    id: post.id,
    domain: post.domain,
    contest_mode: post.contest_mode,
    upvote_ratio: post.upvote_ratio,
    comments: null,
    has_media: false,
    media: null,
    images: null,
    crosspost: false,
    selftext: unescape(post.selftext_html),
    selftext_preview: post.selftext.substr(0, 120).replace(/\n/g, ' '),
    poll_data: post.poll_data,
    link_flair:
      user_preferences.flairs != 'false' ? await formatLinkFlair(post) : '',
    user_flair:
      user_preferences.flairs != 'false' ? await formatUserFlair(post) : '',
  };

  let valid_embed_video_domains = ['gfycat.com'];
  let has_gif = false;
  let gif_to_mp4 = null;
  let reddit_video = null;
  let embed_video = false;

  if (post.media)
    if (valid_embed_video_domains.includes(post.media.type)) embed_video = true;

  if (post.preview && !embed_video) {
    if (post.preview.reddit_video_preview) {
      if (post.preview.reddit_video_preview.is_gif) {
        has_gif = true;
        gif_url = post.preview.reddit_video_preview.fallback_url;
      } else {
        let file_ext = getFileExtension(
          post.preview.reddit_video_preview.fallback_url
        );
        if (file_ext === 'mp4') {
          post.media = true;
          reddit_video = post.preview.reddit_video_preview;
        }
      }
    }
    if (post.preview.images) {
      if (post.preview.images[0].source) {
        let file_ext = getFileExtension(post.preview.images[0].source.url);
        if (file_ext === 'gif') {
          has_gif = true;
          let resolutions = post.preview.images[0].variants.mp4.resolutions;
          gif_to_mp4 = resolutions[resolutions.length - 1];
        }
      }
    }
  }

  obj = await processPostMedia(
    obj,
    post,
    post.media,
    has_gif,
    reddit_video,
    gif_to_mp4
  );

  if (post.crosspost_parent_list) {
    post.crosspost = post.crosspost_parent_list[0];
  }
  if (post.crosspost) {
    obj = await processPostMedia(
      obj,
      post.crosspost,
      post.crosspost.media,
      has_gif,
      reddit_video,
      gif_to_mp4
    );
    obj.crosspost = {
      author: post.crosspost.author,
      created: post.crosspost.created_utc,
      subreddit: post.crosspost.subreddit,
      title: post.crosspost.title,
      name: post.crosspost.name,
      num_comments: post.crosspost.num_comments,
      over_18: post.crosspost.over_18,
      id: post.crosspost.id,
      permalink: teddifyUrl(post.crosspost.permalink),
      ups: post.crosspost.ups,
      selftext: unescape(post.selftext_html),
      selftext_crosspost: unescape(post.crosspost.selftext_html),
      poll_data: post.poll_data,
      is_crosspost: true,
      user_flair:
        user_preferences.flairs != 'false' ? await formatUserFlair(post) : '',
    };
  }

  if (post.preview && !obj.has_media) {
    obj.images = {
      source: await downloadAndSave(post.preview.images[0].source.url),
    };
  }

  if (obj.media) {
    if (obj.media.source === 'external') {
      if (post.preview) {
        obj.images = {
          source: await downloadAndSave(post.preview.images[0].source.url),
        };
      }
    }
  }

  if (post.gallery_data) {
    obj.gallery = true;
    obj.gallery_items = [];
    for (var i = 0; i < post.gallery_data.items.length; i++) {
      let id = post.gallery_data.items[i].media_id;
      if (post.media_metadata) {
        if (post.media_metadata[id]) {
          if (post.media_metadata[id].p) {
            if (post.media_metadata[id].p[0]) {
              let item = { source: null, thumbnail: null, large: null };
              if (post.media_metadata[id].s && post.media_metadata[id].p[0].u) {
                item = {
                  type: post.media_metadata[id].e,
                  source: await downloadAndSave(post.media_metadata[id].s.u),
                  thumbnail: await downloadAndSave(
                    post.media_metadata[id].p[0].u
                  ),
                  large: await downloadAndSave(
                    post.media_metadata[id].p[
                      post.media_metadata[id].p.length - 1
                    ].u
                  ),
                  caption: post.gallery_data.items[i].caption || false,
                };
              }
              obj.gallery_items.push(item);
            }
          }
        }
      }
    }
  }

  let comms = [];
  for (var i = 0; i < comments.length; i++) {
    let comment = comments[i].data;
    let kind = comments[i].kind;
    let obj = {};

    if (kind !== 'more') {
      obj = {
        author: comment.author,
        body_html: comment.body_html,
        parent_id: comment.parent_id,
        created: comment.created_utc,
        edited: comment.edited,
        score: comment.score,
        ups: comment.ups,
        id: comment.id,
        permalink: teddifyUrl(comment.permalink),
        stickied: comment.stickied,
        distinguished: comment.distinguished,
        score_hidden: comment.score_hidden,
        edited: comment.edited,
        replies: [],
        depth: comment.depth,
        user_flair:
          user_preferences.flairs != 'false'
            ? await formatUserFlair(comment)
            : '',
        controversiality:
          user_preferences.highlight_controversial != 'false'
            ? comment.controversiality
            : '',
      };
    } else {
      obj = {
        type: 'load_more',
        count: comment.count,
        id: comment.id,
        parent_id: comment.parent_id,
        post_id: post.name,
        children: [],
      };
    }

    if (comment.replies && kind !== 'more') {
      if (comment.replies.data) {
        if (comment.replies.data.children.length > 0) {
          obj.replies = await processReplies(
            comment.replies.data.children,
            post_id,
            1,
            user_preferences
          );
        }
      }
    }

    if (comment.children) {
      for (var j = 0; j < comment.children.length; j++) {
        obj.children.push(comment.children[j]);
      }
    }

    comms.push(obj);
  }

  obj.comments = comms;

  return obj;
}

async function finalizeJsonPost(
  processed_json,
  post_id,
  post_url,
  morechildren_ids,
  viewing_comment,
  user_preferences
) {
  let comments_html = `<div class="comments">`;
  let comments = processed_json.comments;
  let last_known_depth = undefined;
  for (var i = 0; i < comments.length; i++) {
    let next_comment = false;
    if (comments[i + 1]) {
      next_comment = comments[i + 1];
    }
    if (comments[i].depth != undefined) {
      last_known_depth = comments[i].depth;
    }

    comments_html += await compilePostCommentsHtml(
      comments[i],
      next_comment,
      post_id,
      post_url,
      morechildren_ids,
      processed_json.author,
      viewing_comment,
      user_preferences,
      last_known_depth
    );
  }

  comments_html += `</div>`;

  delete processed_json['comments'];
  let post_data = processed_json;
  return { post_data: post_data, comments: comments_html };
}

async function processJsonPostList(posts, mode) {
  let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';

  for (var i = 0; i < posts.length; i++) {
    let link = posts[i];
    let valid_reddit_self_domains = ['reddit.com'];
    let is_self_link = false;

    if (link.domain) {
      let tld = link.domain.split('self.');
      if (tld.length > 1) {
        if (!tld[1].includes('.')) {
          is_self_link = true;
          link.url = teddifyUrl(link.url);
        }
      }
      if (
        config.valid_media_domains.includes(link.domain) ||
        valid_reddit_self_domains.includes(link.domain)
      ) {
        is_self_link = true;
        link.url = teddifyUrl(link.url);
      }
    }

    link.permalink = `${protocol}://${config.domain}${link.permalink}`;

    if (is_self_link) link.url = link.permalink;

    if (link.images) {
      if (link.images.thumb !== 'self') {
        link.images.thumb = `${protocol}://${config.domain}${link.images.thumb}`;
      }
    }

    if (mode === 'light') {
      link.selftext_html = null;
    }
  }

  return posts;
}

async function getPostItem(post_json, req, protocol) {
  let thumbnail = '';
  let post_image = '';
  let is_self_link = false;
  let valid_reddit_self_domains = ['reddit.com'];

  if (post_json.domain) {
    let tld = post_json.domain.split('self.');
    if (tld.length > 1) {
      if (!tld[1].includes('.')) {
        is_self_link = true;
        post_json.url = teddifyUrl(post_json.url);
      }
    }
    if (
      config.valid_media_domains.includes(post_json.domain) ||
      valid_reddit_self_domains.includes(post_json.domain)
    ) {
      is_self_link = true;
      post_json.url = teddifyUrl(post_json.url);
    }
  }

  if (post_json.preview && post_json.thumbnail !== 'self') {
    if (!post_json.url.startsWith('/r/') && isGif(post_json.url)) {
      let s = await downloadAndSave(post_json.thumbnail, 'thumb_');
      thumbnail = `${protocol}://${config.domain}${s}`;
    } else {
      if (post_json.preview.images[0].resolutions[0]) {
        let s = await downloadAndSave(
          post_json.preview.images[0].resolutions[0].url,
          'thumb_'
        );
        thumbnail = `${protocol}://${config.domain}${s}`;
        if (!isGif(post_json.url) && !post_json.post_hint.includes(':video')) {
          s = await downloadAndSave(post_json.preview.images[0].source.url);
          post_image = `${protocol}://${config.domain}${s}`;
        }
      }
    }
  }

  post_json.permalink = `${protocol}://${config.domain}${post_json.permalink}`;

  if (is_self_link) post_json.url = post_json.permalink;

  if (req.query.hasOwnProperty('full_thumbs')) {
    if (!post_image) post_image = thumbnail;

    thumbnail = post_image;
  }

  let enclosure = '';
  if (thumbnail != '') {
    let mime = '';
    let ext = thumbnail.split('.').pop();
    if (ext === 'png') mime = 'image/png';
    else mime = 'image/jpeg';
    enclosure = `<enclosure length="0" type="${mime}" url="${thumbnail}" />`;
  }

  let append_desc_html = `<br/><a href="${post_json.url}">[link]</a> <a href="${post_json.permalink}">[comments]</a>`;

  return `
    <item>
      <title>${post_json.title}</title>
      <author>${post_json.author}</author>
      <created>${post_json.created}</created>
      <pubDate>${new Date(
        post_json.created_utc * 1000
      ).toGMTString()}</pubDate>
      <domain>${post_json.domain}</domain>
      <id>${post_json.id}</id>
      <thumbnail>${thumbnail}</thumbnail>
      ${enclosure}
      <link>${post_json.permalink}</link>
      <url>${post_json.url}</url>
      <description><![CDATA[${unescape(
        post_json.selftext_html
      )}${append_desc_html}]]></description>
      <num_comments>${post_json.num_comments}</num_comments>
      <ups>${post_json.ups}</ups>
      <stickied>${post_json.stickied}</stickied>
      <is_self_link>${is_self_link}</is_self_link>
    </item>
  `;
}

module.exports = {
  processReplies,
  processJsonPost,
  finalizeJsonPost,
  processJsonPostList,
  getPostItem
};

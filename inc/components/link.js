/*
 * Corresponds to `components/link.pug`
 */

const config = require('../../config')
let valid_reddit_self_domains = ['reddit.com']

// Parses a link from a response returned by reddit.
async function fromJson(data, user_preferences, subreddit_front) {
  let result = {}

  // Meta
  result.id = data.id
  result.permalink = data.permalink
  result.created = data.created_utc
  result.author = data.author
  result.title = data.title
  result.over_18 = data.over_18
  result.score = data.score
  result.ups = data.ups
  result.upvote_ratio = data.upvote_ratio
  result.num_comments = data.num_comments

  // Content
  result.is_self_link = false
  result.selftext_html = data.selftext_html
  result.url = replaceDomains(data.url, user_preferences)
  result.domain = data.domain
  result.is_video = data.is_video
  result.media = data.media
  result.duration = null
  result.images = null
  
  if(data.is_video && data.media) {
    if(data.media.reddit_video) {
      result.duration = data.media.reddit_video.duration
    }
  }

  // Moderation attributes
  result.locked = data.locked
  result.stickied = data.stickied

  // Subreddit
  result.subreddit_front = subreddit_front
  result.subreddit = data.subreddit

  // Flair
  result.link_flair = (user_preferences.flairs != 'false' ? await formatLinkFlair(data) : '')
  result.user_flair = (user_preferences.flairs != 'false' ? await formatUserFlair(data) : '')
  result.link_flair_text = data.link_flair_text

  if(data.domain) {
    let tld = data.domain.split('self.')
    if(tld.length > 1) {
      if(!tld[1].includes('.')) {
        result.is_self_link = true
      }
    }
    if(config.valid_media_domains.includes(data.domain) || valid_reddit_self_domains.includes(data.domain)) {
      result.is_self_link = true
    }
  }

  if(data.preview && data.thumbnail !== 'self') {
    if(!data.url.startsWith('/r/') && isGif(data.url)) {
      result.images = {
        thumb: await downloadAndSave(data.thumbnail, 'thumb_')
      }
    } else {
      if(data.preview.images[0].resolutions[0]) {
        let preview = null
        if(!isGif(data.url) && !data.post_hint.includes(':video'))
          preview = await downloadAndSave(data.preview.images[0].source.url)
        result.images = {
          thumb: await downloadAndSave(data.preview.images[0].resolutions[0].url, 'thumb_'),
          preview: preview
        }
      }
    }
  }

  return result
}

module.exports = {
  fromJson,
}

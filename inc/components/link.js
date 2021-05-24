/*
 * Corresponds to `components/link.pug`
 */

const config = require('../../config')
let valid_reddit_self_domains = ['reddit.com']

class Link {
    // Parses a link from a response returned by reddit.
    static async fromJson(data, user_preferences, subreddit_front) {

        // Meta
        this.id = data.id
        this.permalink = data.permalink
        this.created = data.created_utc
        this.author = data.author
        this.title = data.title
        this.over_18 = data.over_18
        this.score = data.score
        this.ups = data.ups
        this.upvote_ratio = data.upvote_ratio
        this.num_comments = data.num_comments

        // Content
        this.is_self_link = false
        this.selftext_html = data.selftext_html
        this.url = replaceDomains(data.url, user_preferences)
        this.domain = data.domain
        this.is_video = data.is_video
        this.media = data.media
        this.duration = data.is_video ? data.media.reddit_video ? data.media.reddit_video.duration : void 0 : void 0
        this.images = null

        // Moderation attributes
        this.locked = data.locked
        this.stickied = data.stickied

        // Subreddit
        this.subreddit_front = subreddit_front
        this.subreddit = data.subreddit

        // Flair
        this.link_flair = (user_preferences.flairs != 'false' ? await formatLinkFlair(data) : '')
        this.user_flair = (user_preferences.flairs != 'false' ? await formatUserFlair(data) : '')
        this.link_flair_text = data.link_flair_text

        if(data.domain) {
          let tld = data.domain.split('self.')
          if(tld.length > 1) {
            if(!tld[1].includes('.')) {
              this.is_self_link = true
            }
          }
          if(config.valid_media_domains.includes(data.domain) || valid_reddit_self_domains.includes(data.domain)) {
            this.is_self_link = true
          }
        }

        if(data.preview && data.thumbnail !== 'self') {
          if(!data.url.startsWith('/r/') && isGif(data.url)) {
            this.images = {
              thumb: await downloadAndSave(data.thumbnail, 'thumb_')
            }
          } else {
            if(data.preview.images[0].resolutions[0]) {
              let preview = null
              if(!isGif(data.url) && !data.post_hint.includes(':video'))
                preview = await downloadAndSave(data.preview.images[0].source.url)
              this.images = {
                thumb: await downloadAndSave(data.preview.images[0].resolutions[0].url, 'thumb_'),
                preview: preview
              }
            }
          }
        }

        // Use black magic in order to return a normal object
        return Object.fromEntries(Object.entries(this))
    }

}

module.exports = Link;

module.exports = function() {
  const config = require('../config');
  this.processSearchResults = (json, parsed, after, before, user_preferences) => {
    return new Promise(resolve => {
      (async () => {
        if(!parsed) {
          json = JSON.parse(json)
        }
        let posts = []
        let search_firstpage = false
        let before = json.data.before
        let after = json.data.after
        
        if(!after && !before) {
          search_firstpage = true
        }
        
        if(json.data.children) {
          let view_more_posts = false
          let posts_limit = 25

          if(json.data.children.length > posts_limit) {
            view_more_posts = true
          } else {
            posts_limit = json.data.children.length
          }
          
          for(var i = 0; i < posts_limit; i++) {
            let post = json.data.children[i].data
            let post_id = post.permalink.split('/').slice(-2)[0] + '/'
            
            let images = null
            let is_self_link = false
            let valid_reddit_self_domains = ['reddit.com']
            
            if(post.over_18)
              if((config.nsfw_enabled === false && user_preferences.nsfw_enabled != 'true') || user_preferences.nsfw_enabled === 'false')
                continue

            if(post.domain) {
              let tld = post.domain.split('self.')
              if(tld.length > 1) {
                if(!tld[1].includes('.')) {
                  is_self_link = true
                }
              }
              if(config.valid_media_domains.includes(post.domain) || valid_reddit_self_domains.includes(post.domain)) {
                is_self_link = true
              }
            }

            if(post.preview && post.thumbnail !== 'self') {
              if(!post.url.startsWith('/r/') && isGif(post.url)) {
                images = {
                  thumb: await downloadAndSave(post.thumbnail, 'thumb_')
                }
              } else {
                if(post.preview.images[0].resolutions[0]) {
                  images = {
                    thumb: await downloadAndSave(post.preview.images[0].resolutions[0].url, 'thumb_')
                  }
                }
              }
            }
            
            let obj = {
              subreddit: post.subreddit,
              title: post.title,
              created: post.created_utc,
              domain: post.domain,
              subreddit_name_prefixed: post.subreddit_name_prefixed,
              link_flair_text: post.link_flair_text,
              ups: post.ups,
              images: images,
              url: post.url,
              edited: post.edited,
              selftext_html: unescape(post.body_html),
              num_comments: post.num_comments,
              over_18: post.over_18,
              permalink: post.permalink,
              is_self_link: is_self_link,
              author: post.author,
              link_title: post.link_title,
              link_flair: (user_preferences.flairs != 'false' ? await formatLinkFlair(post) : ''),
              user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(post) : '')
            }
            posts.push(obj)
          }
        }
        
        let obj = {
          search_firstpage: search_firstpage,
          before: before,
          after: after,
          posts: posts
        }

        resolve(obj)
      })()
    })
  }
}

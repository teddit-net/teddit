module.exports = function() {
  this.processJsonUser = function(json, parsed, after, before) {
    return new Promise(resolve => {
      (async () => {
        if(!parsed) {
          json = JSON.parse(json)
        }

        let about = json.about.data
        let posts = []
        let view_more_posts = false
        let posts_limit = 25
        let user_front = false

        if(json.overview.data.children.length > posts_limit) {
          view_more_posts = true
        } else {
          posts_limit = json.overview.data.children.length
        }

        if(!after && !before) {
          user_front = true
        }
        
        after = json.overview.data.children[posts_limit - 1].data.name
        before = json.overview.data.children[0].data.name
        
        for(var i = 0; i < posts_limit; i++) {
          let post = json.overview.data.children[i].data
          let thumbnail = 'self'
          let type = json.overview.data.children[i].kind
          let obj
          
          let post_id = post.permalink.split('/').slice(-2)[0] + '/'
          let url = post.permalink.replace(post_id, '')
          
          if(type === 't3') {
            let duration = null
            if(post.media) {
              if(post.is_video) {
                if(post.media.reddit_video) {
                  duration = post.media.reddit_video.duration
                }
              }
            }

            obj = {
              type: type,
              subreddit: post.subreddit,
              title: post.title,
              created: post.created_utc,
              ups: post.ups,
              url: url,
              thumbnail: await downloadAndSave(post.thumbnail),
              duration: duration,
              edited: post.edited,
              selftext_html: unescape(post.selftext_html),
              num_comments: post.num_comments,
              permalink: post.permalink
            }
          }
          if(type === 't1') {
            obj = {
              type: type,
              subreddit: post.subreddit,
              title: post.title,
              created: post.created_utc,
              subreddit_name_prefixed: post.subreddit_name_prefixed,
              ups: post.ups,
              url: url,
              edited: post.edited,
              body_html: unescape(post.body_html),
              num_comments: post.num_comments,
              permalink: post.permalink,
              link_author: post.link_author,
              link_title: post.link_title
            }
          }
          posts.push(obj)
        }

        let obj = {
          username: about.name,
          icon_img: about.icon_img,
          created: about.created_utc,
          verified: about.verified,
          link_karma: about.link_karma,
          comment_karma: about.comment_karma,
          view_more_posts: view_more_posts,
          user_front: user_front,
          before: before,
          after: after,
          posts: posts
        }
        
        resolve(obj)
      })()
    })
  }
}

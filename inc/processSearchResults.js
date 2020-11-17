module.exports = function() {
  this.processSearchResults = function(json, parsed, after, before) {
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
            let url = post.permalink.replace(post_id, '')
            
            let obj = {
              subreddit: post.subreddit,
              title: post.title,
              created: post.created_utc,
              subreddit_name_prefixed: post.subreddit_name_prefixed,
              ups: post.ups,
              url: url,
              edited: post.edited,
              selftext_html: unescape(post.body_html),
              num_comments: post.num_comments,
              permalink: post.permalink,
              author: post.author,
              link_title: post.link_title
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

module.exports = function(fetch) {
  var compilePostComments = require('./compilePostComments.js')();
  var procPostMedia = require('./processPostMedia.js')();
  this.processJsonPost = (json, parsed, user_preferences) => {
    return new Promise(resolve => {
      (async () => {
        if(!parsed) {
          json = JSON.parse(json)
        }

        let post = json[0].data.children[0].data
        let post_id = post.name
        let comments = json[1].data.children

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
          url: teddifyUrl(post.url),
          ups: post.ups,
          id: post.id,
          domain: post.domain,
          contest_mode: post.contest_mode,
          comments: null,
          has_media: false,
          media: null,
          images: null,
          crosspost: false,
          selftext: unescape(post.selftext_html),
          link_flair: (user_preferences.flairs != 'false' ? await formatLinkFlair(post) : ''),
          user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(post) : '')
        }

        let validEmbedDomains = ['gfycat.com', 'youtube.com']
        let has_gif = false
        let gif_to_mp4 = null
        let reddit_video = null

        if(post.preview) {
          if(post.preview.reddit_video_preview) {
            if(post.preview.reddit_video_preview.is_gif) {
              has_gif = true
              gif_url = post.preview.reddit_video_preview.fallback_url
            } else {
              let file_ext = getFileExtension(post.preview.reddit_video_preview.fallback_url)
              if(file_ext === 'mp4')  {
                post.media = true
                reddit_video = post.preview.reddit_video_preview
              }
            }
          }
          if(post.preview.images) {
            if(post.preview.images[0].source) {
              let file_ext = getFileExtension(post.preview.images[0].source.url)
              if(file_ext === 'gif') {
                has_gif = true
                let resolutions = post.preview.images[0].variants.mp4.resolutions
                gif_to_mp4 = resolutions[resolutions.length - 1]
              }
            }
          }
        }

        obj = await processPostMedia(obj, post, post.media, has_gif, reddit_video, gif_to_mp4)

        if(post.crosspost_parent_list) {
          post.crosspost = post.crosspost_parent_list[0]
        }
        if(post.crosspost) {
          obj = await processPostMedia(obj, post.crosspost, post.crosspost.media, has_gif, reddit_video, gif_to_mp4)
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
            is_crosspost: true,
            user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(post) : '')
          }
        }

        if(post.preview && !obj.has_media) {
          obj.images = {
            source: await downloadAndSave(post.preview.images[0].source.url)
          }
        }

        if(obj.media) {
          if(obj.media.source === 'external') {
            if(post.preview) {
              obj.images = {
                source: await downloadAndSave(post.preview.images[0].source.url)
              }
            }
          }
        }

        if(post.gallery_data) {
          obj.gallery = true
          obj.gallery_items = []
          for(var i = 0; i < post.gallery_data.items.length; i++) {
            let id = post.gallery_data.items[i].media_id
            if(post.media_metadata[id]) {
              let item = {
                type: post.media_metadata[id].e,
                source: await downloadAndSave(post.media_metadata[id].s.u),
                thumbnail: await downloadAndSave(post.media_metadata[id].p[0].u),
                large: await downloadAndSave(post.media_metadata[id].p[post.media_metadata[id].p.length - 1].u),
              }
              obj.gallery_items.push(item)
            }
          }
        }

        let comms = []
        for(var i = 0; i < comments.length; i++) {
          let comment = comments[i].data
          let kind = comments[i].kind
          let obj = {}

          if(kind !== 'more') {
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
              depth: 0,
              user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(comment) : '')
            }
          } else {
            obj = {
              type: 'load_more',
              count: comment.count,
              id: comment.id,
              parent_id: comment.parent_id,
              post_id: post.name,
              children: []
            }
          }

          if(comment.replies && kind !== 'more') {
            if(comment.replies.data) {
              if(comment.replies.data.children.length > 0) {
                obj.replies = await processReplies(comment.replies.data.children, post_id, 1, user_preferences)
              }
            }
          }

          if(comment.children) {
            for(var j = 0; j < comment.children.length; j++) {
              obj.children.push(comment.children[j])
            }
          }

          comms.push(obj)
        }

        obj.comments = comms

        resolve(obj)
      })()
    })
  }

  this.finalizeJsonPost = async (processed_json, post_id, post_url, morechildren_ids, viewing_comment) => {
    let comments_html = `<div class="comments">`
    let comments = processed_json.comments
    for(var i = 0; i < comments.length; i++) {
      let next_comment
      if(comments[i+1]) {
        next_comment = comments[i+1]
      }
      comments_html += await compilePostCommentsHtml(comments[i], next_comment, post_id, post_url, morechildren_ids, processed_json.author, viewing_comment)
    }

    comments_html += `</div>`

    delete processed_json['comments']
    let post_data = processed_json
    return { post_data: post_data, comments: comments_html }
  }

  this.processReplies = async (data, post_id, depth, user_preferences) => {
    let return_replies = []
    for(var i = 0; i < data.length; i++) {
      let kind = data[i].kind
      let reply = data[i].data
      let obj = {}
      if(kind !== 'more') {
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
          user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(reply) : '')
        }
      } else {
        obj = {
          type: 'load_more',
          count: reply.count,
          id: reply.id,
          parent_id: reply.parent_id,
          post_id: post_id,
          children: [],
          depth: depth
        }
      }

      if(reply.replies && kind !== 'more') {
        if(reply.replies.data.children.length) {
          for(var j = 0; j < reply.replies.data.children.length; j++) {
            let comment = reply.replies.data.children[j].data
            let objct = {}

            if(comment.author && comment.body_html) {
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
                user_flair: (user_preferences.flairs != 'false' ? await formatUserFlair(comment) : '')
              }
            } else {
              objct = {
                type: 'load_more',
                count: comment.count,
                id: comment.id,
                parent_id: comment.parent_id,
                post_id: post_id,
                children: [],
                depth: depth + 1
              }
              if(comment.children) {
                for(var k = 0; k < comment.children.length; k++) {
                  objct.children.push(comment.children[k])
                }
              }
            }

            if(comment.replies) {
              if(comment.replies.data) {
                if(comment.replies.data.children.length > 0) {
                  objct.replies = await processReplies(comment.replies.data.children, post_id, depth, user_preferences)
                }
              }
            }

            obj.replies.push(objct)
          }
        }
      }

      if(reply.children) {
        for(var j = 0; j < reply.children.length; j++) {
          obj.children.push(reply.children[j])
        }
      }

      return_replies.push(obj)
    }
    return return_replies
  }
}

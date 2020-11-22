module.exports = function() {
  this.compilePostCommentsHtml = (comments, next_comment, post_id, post_url, morechildren_ids, post_author) => {
    return new Promise((resolve, reject) => {
      (async () => {
        let comments_html
        if(comments.author !== undefined && comments.body_html !== undefined) {
          let classlist = []
          let submitter_link = ''
          let moderator = false
          let submitter = false
          
          if(post_author === comments.author) {
            classlist.push('submitter')
            submitter_link = `<a href="${post_url}" title="submitter">[S]</a>`
            submitter = true
          }
          if(comments.distinguished === 'moderator') {
            classlist.push('green')
            moderator_badge = ` <span class="green" title="moderator of this subreddit">[M]</span>`
            moderator = true
          }
          comments_html = `
            <div class="comment" id="${comments.id}">
              <details open>
                <summary>
                  <a href="/u/${comments.author}">${comments.author}${moderator ? moderator_badge : ''}</a>
                  <p class="ups">${kFormatter(comments.ups)} points</p>
                  <p class="created" title="${toUTCString(comments.created)}">${timeDifference(comments.created)}</p>
                  <p class="stickied">${comments.stickied ? 'stickied comment' : ''}</p>
                </summary>
              <div class="meta">
                <p class="author"><a href="/u/${comments.author}" class="${classlist.join(' ')}">${comments.author}</a>${submitter ? submitter_link : ''}${moderator ? moderator_badge : ''}</p>
                <p class="ups">${kFormatter(comments.ups)} points</p>
                <p class="created" title="${toUTCString(comments.created)}">
                   <a href="${comments.permalink}">${timeDifference(comments.created)}</a>
                </p>
                <p class="stickied">${comments.stickied ? 'stickied comment' : ''}</p>
              </div>
              <div class="body">${unescape(comments.body_html)}</div>
          `
        } else {
          if(comments.children) {
            if(comments.children.length > 0) {
              let parent_id = comments.parent_id.split('_')[1]
              if(post_id === parent_id && !morechildren_ids) {
                comments_html = `
                  <form method="POST">
                    <button type="submit">load more comments (${comments.count})</button>
                    <input type="hidden" name="url" id="url" value="${post_url}">
                    <input type="hidden" name="all_ids" id="all_ids" value="${comments.children.join()}">
                  </form>
                `
              } else {
                if(!morechildren_ids) {
                  comments_html = `
                    <div class="load-more-comments">
                      <a href="${parent_id}">load more comments (${comments.count})</a>
                    </div>
                  `
                } else {
                  morechildren_ids = JSON.parse(morechildren_ids)
                  comments_html = `
                    <form method="POST">
                      <button type="submit">load more comments (${morechildren_ids.length})</button>
                      <input type="hidden" name="url" id="url" value="${post_url}">
                      <input type="hidden" name="all_ids" id="all_ids" value='${morechildren_ids.join()}'>
                    </form>
                  `
                }
              }
            } else {
              comments_html = `
                <a href="${comments.id}/">continue this thread</a>
              `
            }
          }
        }

        if(comments.replies) {
          for(var i = 0; i < comments.replies.length; i++) {
            let comment = comments.replies[i]
            if(comment.type !== 'load_more') {
              let classlist = []
              let submitter_link = ''
              let moderator = false
              let submitter = false

              if(post_author === comment.author) {
                classlist.push('submitter')
                submitter_link = `<a href="${post_url}" title="submitter">[S]</a>`
                submitter = true
              }
              if(comments.distinguished === 'moderator') {
                classlist.push('green')
                moderator_badge = ` <span class="green" title="moderator of this subreddit">[M]</span>`
                moderator = true
              }
              comments_html += `
                <div class="comment" id="${comment.id}">
                <details open>
                  <summary>
                    <a href="/u/${comment.author}">${comment.author}${moderator ? moderator_badge : ''}</a>
                    <p class="ups">${kFormatter(comment.ups)} points</p>
                    <p class="created" title="${toUTCString(comment.created)}">${timeDifference(comment.created)}</p>
                    <p class="stickied">${comment.stickied ? 'stickied comment' : ''}</p>
                  </summary>
                  <div class="meta">
                    <p class="author"><a href="/u/${comment.author}" class="${classlist.join(' ')}">${comment.author}</a>${submitter ? submitter_link : ''}${moderator ? moderator_badge : ''}</p>
                    <p class="ups">${kFormatter(comment.ups)} points</p>
                    <p class="created" title="${toUTCString(comment.created)}">
                      <a href="${comment.permalink}">${timeDifference(comment.created)}</a>
                    </p>
                    <p class="stickied">${comment.stickied ? 'stickied comment' : ''}</p>
                  </div>
                  <div class="body">${unescape(comment.body_html)}</div>
              `
              let replies_html = ''
              if(comment.replies) {
                if(comment.replies.length) {
                  for(var j = 0; j < comment.replies.length; j++) {
                    let next_reply
                    if(comment.replies[j+1]) {
                      next_reply = comment.replies[j+1]
                    }
                    replies_html += await compilePostCommentsHtml(comment.replies[j], next_reply, post_id, post_url, null, post_author)
                  }
                }
              }
              comments_html += replies_html + '</details></div>'
            } else {
              if(comment.children.length > 0) {
              let parent_id = comment.parent_id.split('_')[1]
                comments_html += `
                  <div class="load-more-comments">
                    <a href="${parent_id}">load more comments (${comment.count})</a>
                  </div>
                `
              } else {
                comments_html += `
                  <div class="load-more-comments">
                    <a href="${comment.id}">continue this thread</a>
                  </div>
                `
              }
            }
          }
        }

        let next_comment_parent_id = null
        if(next_comment) {
          if(next_comment.parent_id) {
            next_comment_parent_id = next_comment.parent_id.split('_')[1]
          }
        }

        if((comments.replies || comments.author !== undefined) && next_comment_parent_id !== comments.id) {
          comments_html += `</details></div>`
        }
        next_comment_parent_id = null
        
        resolve(comments_html)
      })()
    })
  }
}

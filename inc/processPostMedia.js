module.exports = function() {
  const config = require('../config')
  this.processPostMedia = (obj, post, post_media, has_gif, reddit_video, gif_to_mp4, user_preferences) => {
    return new Promise(resolve => {
      (async () => {
        if(post_media || has_gif) {
          if(!has_gif) {
            if(config.valid_embed_video_domains.includes(post_media.type)) {
              if(post_media.type === 'gfycat.com') {
                obj.has_media = true
                let video_url = post_media.oembed.thumbnail_url
                video_url = video_url.replace('size_restricted.gif', 'mobile.mp4')
                obj.media = {
                  source: await downloadAndSave(video_url),
                  height: post_media.oembed.thumbnail_height,
                  width: post_media.oembed.thumbnail_width
                }
              }
              if(post_media.type === 'youtube.com') {
                obj.has_media = true
                obj.media = {
                  source: 'YouTube',
                  height: post_media.oembed.thumbnail_height,
                  width: post_media.oembed.thumbnail_width,
                  thumbnail: await downloadAndSave(post_media.oembed.thumbnail_url, '', false, true),
                  author_name: post_media.oembed.author_name,
                  author_url: replaceDomains(post_media.oembed.author_url, user_preferences),
                  title: post_media.oembed.title,
                  duration: null,
                  is_gif: null,
                  not_hosted_in_reddit: true,
                  embed_src: null
                }
                
                try {
                  let str = post_media.oembed.html
                  let r = /iframe.*?src=\"(.*?)\"/;
                  let src = r.exec(str)[1]
                  let youtube_id = src.split('/embed/')[1].split('?')[0]
                  let youtube_url = `https://youtube.com/watch?v=${youtube_id}`
                  obj.media.embed_src = replaceDomains(youtube_url, user_preferences)
                } catch(error) {
                  console.error(`Error while trying to get src link from embed youtube html.`, error)
                }
              }
            } else {
              obj.has_media = true
              let video
              if(!reddit_video) {
                video = post_media.reddit_video
              } else {
                video = post.preview.reddit_video_preview
              }

              if(video) {
                obj.media = {
                  source: await downloadAndSave(video.fallback_url),
                  height: video.height,
                  width: video.width,
                  duration: video.duration,
                  is_gif: post_media.reddit_video.is_gif
                }
              } else {
                if(post_media.oembed) {
                  obj.media = {
                    source: 'external',
                    height: post_media.oembed.height,
                    width: post_media.oembed.width,
                    provider_url: replaceDomains(post_media.oembed.provider_url, user_preferences),
                    provider_name: post_media.oembed.provider_name,
                    title: post_media.oembed.title,
                    duration: null,
                    is_gif: null,
                    not_hosted_in_reddit: true,
                    embed_src: null
                  }
                  try {
                    let str = post_media.oembed.html
                    let r = /iframe.*?src=\"(.*?)\"/;
                    let src = r.exec(str)[1]
                    obj.media.embed_src = replaceDomains(cleanUrl(src), user_preferences)
                  } catch(error) {
                    //console.error(`Error while trying to get src link from embed html.`, error)
                  }
                  if(!obj.media.embed_src) {
                    obj.media.embed_src = replaceDomains(post_media.oembed.url, user_preferences)
                  }
                }
              }
            }
          } else {
            obj.has_media = true
            if(!gif_to_mp4) {
              if(post.preview) {
                if(post.preview.reddit_video_preview) {
                  const url = post.domain === 'i.imgur.com'
                    ? replaceDomains(post.url_overridden_by_dest.replace(/\.gifv$/, '.mp4'))
                    : post.preview.reddit_video_preview.fallback_url;
                  if(url) {
                    obj.media = {
                      source: await downloadAndSave(url),
                      height: post.preview.reddit_video_preview.height,
                      width: post.preview.reddit_video_preview.width,
                      duration: post.preview.reddit_video_preview.duration,
                      is_gif: true
                    }
                  } else {
                    obj.has_media = false
                  }
                } else {
                  obj.has_media = false
                }
              } else {
                obj.has_media = false
              }
            } else {
              obj.media = {
                source: await downloadAndSave(gif_to_mp4.url, null, true),
                height: gif_to_mp4.height,
                width: gif_to_mp4.width,
                duration: null,
                is_gif: null
              }
            }
          }
        } else {
          /**
          * Sometimes post has an image, but all the common keys which are implying
          * that the post has an iamge, are null or don't exist. Awesome Reddit!
          */
          if(!post_media && !has_gif && !post.gallery_data && post.url != '') {
            try {
              let url = replaceDomains(post.url)
              const u = new URL(url)
              if(config.valid_media_domains.includes(u.hostname)) {
                const ext = u.pathname.split('.')[1]
                if(['jpg', 'png', 'jpeg', 'gif'].includes(ext)) {
                  obj.images = {
                    source: await downloadAndSave(url)
                  }
                }
                else if(['gifv', 'mp4'].includes(ext)) {
                  if (obj.domain === 'i.imgur.com') {
                    url = url.replace(/\.gifv$/, '.mp4');
                  }
                  obj.has_media = true
                  obj.media = {
                    source: await downloadAndSave(url)
                  }
                  if (post.preview && post.preview.images) {
                    obj.media.height = post.preview.images[0].source.height;
                    obj.media.width = post.preview.images[0].source.width;
                  }
                }
              }
            } catch(error) {
              //console.error(Invalid URL supplied when trying to fetch an image', error)
            }
          }
        }
        resolve(obj)
      })()
    })
  }
}

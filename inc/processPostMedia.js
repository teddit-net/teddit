module.exports = function() {
  const config = require('../config')
  this.processPostMedia = (obj, post, post_media, has_gif, reddit_video, gif_to_mp4) => {
    return new Promise(resolve => {
      (async () => {
        let valid_embed_domains = ['gfycat.com', 'youtube.com']
        if(post_media || has_gif) {
          if(!has_gif) {
            if(valid_embed_domains.includes(post_media.type)) {
              if(post_media.type === 'gfycat.com') {
                obj.has_media = true
                obj.media = {
                  source: await downloadAndSave(post_media.oembed.thumbnail_url),
                  height: post_media.oembed.thumbnail_height,
                  width: post_media.oembed.thumbnail_width,
                  duration: null,
                  is_gif: null,
                  not_hosted_in_reddit: true,
                  embed_src: null
                }
                try {
                  let str = post_media.oembed.html
                  let r = /iframe.*?src=\"(.*?)\"/;
                  let src = r.exec(str)[1]
                  obj.media.embed_src = cleanUrl(src)
                } catch(error) {
                  console.error(`Error while trying to get src link from embed html.`, error)
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
                  author_url: post_media.oembed.author_url,
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
                  // TODO: Invidious youtube URLs.
                  let youtube_url = `https://youtube.com/watch?v=${youtube_id}`
                  obj.media.embed_src = youtube_url
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
                    provider_url: post_media.oembed.provider_url,
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
                    obj.media.embed_src = cleanUrl(src)
                  } catch(error) {
                    //console.error(`Error while trying to get src link from embed html.`, error)
                  }
                  if(!obj.media.embed_src) {
                    obj.media.embed_src = post_media.oembed.url
                  }
                }
              }
            }
          } else {
            obj.has_media = true
            if(!gif_to_mp4) {
              if(post.preview) {
                obj.media = {
                  source: await downloadAndSave(post.preview.reddit_video_preview.fallback_url),
                  height: post.preview.reddit_video_preview.height,
                  width: post.preview.reddit_video_preview.width,
                  duration: post.preview.reddit_video_preview.duration,
                  is_gif: true
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
              let u = new URL(post.url)
              if(config.valid_media_domains.includes(u.hostname)) {
                let ext = u.pathname.split('.')[1]
                if(ext === 'jpg' || ext === 'png') {
                  obj.images = {
                    source: await downloadAndSave(post.url)
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

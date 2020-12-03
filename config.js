const config = {
  domain: 'teddit.net',
  reddit_app_id: 'H6-HjZ5pUPjaFQ',
  cert_dir: `/home/teddit/letsencrypt/live/teddit.net`, // no trailing slash
  video_enabled: true,
  ssl_port: 8088,
  nonssl_port: 8080,
  listen_address: '0.0.0.0',
  https_enabled: true,
  redirect_http_to_https: true,
  use_compression: true,
  use_view_cache: false,
  use_helmet: true,
  use_helmet_hsts: true,
  trust_proxy: false, // Enable trust_proxy if you are using reverse proxy like nginx
  trust_proxy_address: '127.0.0.1',
  setexs: {
    /**,
    * Redis cache expiration values (in seconds).
    * When the cache expires, new content is fetched from Reddit's API (when
    * the given URL is revisited).
    */
    frontpage: 600,
    subreddit: 600,
    posts: 600,
    user: 600,
    searches: 600,
    sidebar: 60 * 60 * 24 * 7 // 7 days
  },
  post_comments_sort: 'confidence', // one of: confidence, top, new, controversial, old, random, qa, live
  valid_media_domains: ['preview.redd.it', 'external-preview.redd.it', 'i.redd.it', 'v.redd.it', 'a.thumbs.redditmedia.com', 'b.thumbs.redditmedia.com', 'thumbs.gfycat.com', 'i.ytimg.com'],
  reddit_api_error_text: `Seems like your instance is either blocked (e.g. due to API rate limiting), reddit is currently down, or your API key is expired and not renewd properly. This can also happen for other reasons.`
};

module.exports = config;

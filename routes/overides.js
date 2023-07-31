const config = require('../config');
const overridingRoutes = require('express').Router();

overridingRoutes.all('*', (req, res, next) => {
  let themeOverride = req.query.theme;
  if (themeOverride) {
    // Convert Dark to dark since the stylesheet has it lower case
    themeOverride = themeOverride.toLowerCase();
    // This override here will set it for the current request
    req.cookies.theme = themeOverride;
    // this will set it for future requests
    res.cookie('theme', themeOverride, { maxAge: 31536000, httpOnly: true });
  } else if (!req.cookies.theme && req.cookies.theme !== '') {
    req.cookies.theme = config.theme;
  }

  let flairsOverride = req.query.flairs;
  if (flairsOverride) {
    req.cookies.flairs = flairsOverride;
    res.cookie('flairs', flairsOverride, { maxAge: 31536000, httpOnly: true });
  }

  let nsfwEnabledOverride = req.query.nsfw_enabled;
  if (nsfwEnabledOverride) {
    req.cookies.nsfw_enabled = nsfwEnabledOverride;
    res.cookie('nsfw_enabled', nsfwEnabledOverride, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let highlightControversialOverride = req.query.highlight_controversial;
  if (highlightControversialOverride) {
    req.cookies.highlight_controversial = highlightControversialOverride;
    res.cookie('highlight_controversial', highlightControversialOverride, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let postMediaMaxHeight = req.query.post_media_max_height;
  if (postMediaMaxHeight) {
    if (
      config.post_media_max_heights.hasOwnProperty(postMediaMaxHeight) ||
      !isNaN(postMediaMaxHeight)
    ) {
      req.cookies.post_media_max_height = postMediaMaxHeight;
      res.cookie('post_media_max_height', postMediaMaxHeight, {
        maxAge: 31536000,
        httpOnly: true,
      });
    }
  }

  let collapseChildComments = req.query.collapse_child_comments;
  if (collapseChildComments) {
    req.cookies.collapse_child_comments = collapseChildComments;
    res.cookie('collapse_child_comments', collapseChildComments, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let showUpvotedPercentage = req.query.show_upvoted_percentage;
  if (showUpvotedPercentage) {
    req.cookies.show_upvoted_percentage = showUpvotedPercentage;
    res.cookie('show_upvoted_percentage', showUpvotedPercentage, {
      maxAge: 31536000,
      httpOnly: true,
    });
  } else if (!req.cookies.show_upvoted_percentage) {
    if (config.show_upvoted_percentage) {
      req.cookies.show_upvoted_percentage = 'true';
    }
  }

  let domainTwitter = req.query.domain_twitter;
  if (domainTwitter) {
    req.cookies.domain_twitter = domainTwitter;
    res.cookie('domain_twitter', domainTwitter, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let domainYoutube = req.query.domain_youtube;
  if (domainYoutube) {
    req.cookies.domain_youtube = domainYoutube;
    res.cookie('domain_youtube', domainYoutube, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let domainInstagram = req.query.domain_instagram;
  if (domainInstagram) {
    req.cookies.domain_instagram = domainInstagram;
    res.cookie('domain_instagram', domainInstagram, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let domainQuora = req.query.domain_quora;
  if (domainQuora) {
    req.cookies.domain_quora = domainQuora;
    res.cookie('domain_quora', domainQuora, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let domainImgur = req.query.domain_imgur;
  if (domainImgur) {
    req.cookies.domain_imgur = domainImgur;
    res.cookie('domain_imgur', domainImgur, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  let videosMuted = req.query.videos_muted;
  if (videosMuted) {
    req.cookies.videos_muted = videosMuted;
    res.cookie('videos_muted', videosMuted, {
      maxAge: 31536000,
      httpOnly: true,
    });
  }

  if (!config.rate_limiting) {
    return next();
  }

  const valid_reddit_starts = [
    '/https://old.reddit.com',
    '/https://reddit.com',
    '/https://www.reddit.com',
    '/old.reddit.com',
    '/reddit.com',
    '/www.reddit.com',
  ];
  for (var i = 0; i < valid_reddit_starts.length; i++) {
    if (req.url.startsWith(valid_reddit_starts[i])) {
      req.url = req.url.substring(1);
      const redditRegex = /([A-z.]+\.)?(reddit(\.com))/gm;
      let teddified_url = req.url.replace(redditRegex, '');
      if (teddified_url.includes('://')) {
        teddified_url = teddified_url.split('://')[1];
      }
      if (teddified_url == '') {
        teddified_url = '/';
      }
      return res.redirect(teddified_url);
    }
  }

  if (config.rate_limiting.enabled) {
    /**
     * This route enforces request limits based on an IP address if
     * config.rate_limiting.enabled is true. By default it's false.
     */

    let ip = String(
      req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        'unknown'
    );

    if (ip === 'unknown') {
      return next();
    }

    if (ratelimit_counts[ip] == undefined) {
      ratelimit_counts[ip] = 0;
    }

    if (ratelimit_timestamps[ip] == undefined) {
      ratelimit_timestamps[ip] = Date.now();
    }

    let diff = Date.now() - ratelimit_timestamps[ip];
    let credit = (diff / 60000) * config.rate_limiting.limit_after_limited;
    ratelimit_counts[ip] -= credit;

    if (ratelimit_counts[ip] < 0) {
      ratelimit_counts[ip] = 0;
    }

    ratelimit_counts[ip]++;
    ratelimit_timestamps[ip] = Date.now();

    if (ratelimit_counts[ip] > config.rate_limiting.initial_limit) {
      console.log(`RATE LIMITED IP ADDRESS: ${ip}`);
      return res.send(
        `Hold your horses! You have hit the request limit. You should be able to refresh this page in a couple of seconds. If you think you are wrongfully limited, create an issue at https://codeberg.org/teddit/teddit. Rate limiting is highly experimental feature.`
      );
    } else {
      return next();
    }
  } else {
    return next();
  }
});

module.exports = overridingRoutes;

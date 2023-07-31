const config = require('../config');
const { redis } = require('../app');
const preferenceRoutes = require('express').Router();

function resetPreferences(res) {
  res.clearCookie('theme');
  res.clearCookie('flairs');
  res.clearCookie('nsfw_enabled');
  res.clearCookie('highlight_controversial');
  res.clearCookie('post_media_max_height');
  res.clearCookie('collapse_child_comments');
  res.clearCookie('show_upvoted_percentage');
  res.clearCookie('show_upvotes')
  res.clearCookie('subbed_subreddits');
  res.clearCookie('domain_twitter');
  res.clearCookie('domain_youtube');
  res.clearCookie('domain_instagram');
  res.clearCookie('domain_quora');
  res.clearCookie('domain_imgur');
  res.clearCookie('videos_muted');
  res.clearCookie('prefer_frontpage');
  res.clearCookie('show_large_gallery_images');
  res.clearCookie('default_comment_sort');
}

preferenceRoutes.get('/preferences', (req, res, next) => {
  return res.render('preferences', {
    user_preferences: req.cookies,
    instance_config: config,
    comment_sort_values: ['best', 'top', 'new', 'controversial', 'old', 'qa'],
  });
});

preferenceRoutes.get('/resetprefs', (req, res, next) => {
  resetPreferences(res);
  return res.redirect('/preferences');
});

preferenceRoutes.get('/import_prefs/:key', (req, res, next) => {
  let key = req.params.key;
  if (!key) return res.redirect('/');
  if (key.length !== 10) return res.redirect('/');

  key = `prefs_key:${key}`;
  redis.get(key, (error, json) => {
    if (error) {
      console.error(
        `Error getting the preferences import key ${key} from redis.`,
        error
      );
      return res.render('frontpage', {
        json: null,
        user_preferences: req.cookies,
        instance_config: config,
      });
    }
    if (json) {
      try {
        let prefs = JSON.parse(json);
        let subbed_subreddits_is_set = false;
        for (var setting in prefs) {
          if (prefs.hasOwnProperty(setting)) {
            res.cookie(setting, prefs[setting], {
              maxAge: 365 * 24 * 60 * 60 * 1000,
              httpOnly: true,
            });
            if (setting === 'subbed_subreddits')
              subbed_subreddits_is_set = true;
          }
        }
        if (!subbed_subreddits_is_set) res.clearCookie('subbed_subreddits');
        return res.redirect('/');
      } catch (e) {
        console.error(
          `Error setting imported preferences to the cookies. Key: ${key}.`,
          error
        );
      }
    } else {
      return res.redirect('/preferences');
    }
  });
});

preferenceRoutes.post('/saveprefs', (req, res, next) => {
  let theme = req.body.theme;
  let flairs = req.body.flairs;
  let nsfw_enabled = req.body.nsfw_enabled;
  let highlight_controversial = req.body.highlight_controversial;
  let post_media_max_height = req.body.post_media_max_height;
  let collapse_child_comments = req.body.collapse_child_comments;
  let show_upvoted_percentage = req.body.show_upvoted_percentage;
  let show_upvotes = req.body.show_upvotes;
  let domain_twitter = req.body.domain_twitter;
  let domain_youtube = req.body.domain_youtube;
  let domain_instagram = req.body.domain_instagram;
  let domain_quora = req.body.domain_quora;
  let domain_imgur = req.body.domain_imgur;
  let videos_muted = req.body.videos_muted;
  let prefer_frontpage = req.body.prefer_frontpage;
  let show_large_gallery_images = req.body.show_large_gallery_images;
  let default_comment_sort = req.body.default_comment_sort;

  res.cookie('theme', theme, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (flairs === 'on') flairs = 'true';
  else flairs = 'false';
  res.cookie('flairs', flairs, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (nsfw_enabled === 'on') nsfw_enabled = 'true';
  else nsfw_enabled = 'false';
  res.cookie('nsfw_enabled', nsfw_enabled, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (highlight_controversial === 'on') highlight_controversial = 'true';
  else highlight_controversial = 'false';
  res.cookie('highlight_controversial', highlight_controversial, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (
    config.post_media_max_heights.hasOwnProperty(post_media_max_height) ||
    !isNaN(post_media_max_height)
  )
    res.cookie('post_media_max_height', post_media_max_height, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

  if (collapse_child_comments === 'on') collapse_child_comments = 'true';
  else collapse_child_comments = 'false';
  res.cookie('collapse_child_comments', collapse_child_comments, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (show_upvoted_percentage === 'on') show_upvoted_percentage = 'true';
  else show_upvoted_percentage = 'false';
  res.cookie('show_upvoted_percentage', show_upvoted_percentage, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (show_upvotes === 'on') show_upvotes = 'true';
  else show_upvotes = 'false';
  res.cookie('show_upvotes', show_upvotes, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (videos_muted === 'on') videos_muted = 'true';
  else videos_muted = 'false';
  res.cookie('videos_muted', videos_muted, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  res.cookie('domain_twitter', domain_twitter, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  res.cookie('domain_youtube', domain_youtube, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  res.cookie('domain_instagram', domain_instagram, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  res.cookie('domain_quora', domain_quora, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  res.cookie('domain_imgur', domain_imgur, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (prefer_frontpage === 'on') prefer_frontpage = 'true';
  else prefer_frontpage = 'false';
  res.cookie('prefer_frontpage', prefer_frontpage, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (show_large_gallery_images === 'on') show_large_gallery_images = 'true';
  else show_large_gallery_images = 'false';
  res.cookie('show_large_gallery_images', show_large_gallery_images, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  res.cookie('default_comment_sort', default_comment_sort, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  return res.redirect('/preferences');
});

preferenceRoutes.post('/export_prefs', (req, res, next) => {
  let export_saved = req.body.export_saved;
  let export_data = req.cookies;
  let export_to_file = req.body.export_to_file;

  if (export_saved !== 'on') {
    if (req.cookies.saved) delete export_data.saved;
  }

  if (export_to_file === 'on') {
    res.setHeader(
      'Content-disposition',
      'attachment; filename=teddit_prefs.json'
    );
    res.setHeader('Content-type', 'application/json');
    return res.send(export_data);
  }

  let r = `${(Math.random().toString(36) + '00000000000000000')
    .slice(2, 10 + 2)
    .toUpperCase()}`;
  let key = `prefs_key:${r}`;
  redis.set(key, JSON.stringify(export_data), (error) => {
    if (error) {
      console.error(`Error saving preferences to redis.`, error);
      return res.redirect('/preferences');
    } else {
      return res.render('preferences', {
        user_preferences: req.cookies,
        instance_config: config,
        preferences_key: r,
      });
    }
  });
});

preferenceRoutes.post('/import_prefs', (req, res, next) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    body = body.toString();
    try {
      let json = body
        .split('Content-Type: application/json')[1]
        .trim()
        .split('--')[0];
      let prefs = JSON.parse(json);
      resetPreferences(res);
      for (var setting in prefs) {
        if (prefs.hasOwnProperty(setting)) {
          res.cookie(setting, prefs[setting], {
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
          });
        }
      }
      return res.redirect('/preferences');
    } catch (e) {
      console.error(
        `Error importing preferences from a JSON file. Please report this error on https://codeberg.org/teddit/teddit.`,
        e
      );
    }
  });
});

module.exports = preferenceRoutes;

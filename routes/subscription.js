const subscriptionRoutes = require('express').Router();

subscriptionRoutes.get('/subscribe/:subreddit', (req, res, next) => {
  let subreddit = req.params.subreddit;
  let subbed = req.cookies.subbed_subreddits;
  let back = req.query.b;

  if (!subreddit) return res.redirect('/');

  if (!subbed || !Array.isArray(subbed)) subbed = [];

  if (!subbed.includes(subreddit)) subbed.push(subreddit);

  res.cookie('subbed_subreddits', subbed, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });

  if (!back) return res.redirect('/r/' + subreddit);
  else {
    back = back.replace(/,/g, '+').replace(/§1/g, '&');
    return res.redirect(back);
  }
});

subscriptionRoutes.get(
  '/import_subscriptions/:subreddits',
  (req, res, next) => {
    let subreddits = req.params.subreddits;
    let subbed = req.cookies.subbed_subreddits;
    let back = req.query.b;

    if (!subreddits) return res.redirect('/');

    if (!subbed || !Array.isArray(subbed)) subbed = [];

    subreddits = subreddits.split('+');
    for (var i = 0; i < subreddits.length; i++) {
      if (!subbed.includes(subreddits[i])) subbed.push(subreddits[i]);
    }

    res.cookie('subbed_subreddits', subbed, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    if (!back) return res.redirect('/r/' + subreddits);
    else {
      back = back.replace(/,/g, '+').replace(/ /g, '+');
      return res.redirect(back);
    }
  }
);

subscriptionRoutes.get('/unsubscribe/:subreddit', (req, res, next) => {
  let subreddit = req.params.subreddit;
  let subbed = req.cookies.subbed_subreddits;
  let back = req.query.b;

  if (!subreddit || !subbed || !Array.isArray(subbed)) {
    res.clearCookie('subbed_subreddits');
    return res.redirect('/');
  }

  var index = subbed.indexOf(subreddit);
  if (index !== -1) subbed.splice(index, 1);

  if (subbed.length <= 0) res.clearCookie('subbed_subreddits');
  else
    res.cookie('subbed_subreddits', subbed, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

  if (!back) return res.redirect('/r/' + subreddit);
  else {
    back = back.replace(/,/g, '+').replace(/§1/g, '&');
    return res.redirect(back);
  }
});

module.exports = subscriptionRoutes;

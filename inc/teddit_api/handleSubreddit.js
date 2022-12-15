const processJsonSubreddit = require('../processJsonSubreddit');
const { processJsonSubredditAbout } = require('../processSubredditAbout');
const processSearchResults = require('../processSearchResults.js');
const { processJsonPostList, getPostItem } = require('../processJsonPost');

module.exports = function () {
  const config = require('../../config');
  this.handleTedditApiSubreddit = async (
    json,
    req,
    res,
    from,
    api_type,
    api_target,
    subreddit,
    mode
  ) => {
    if (!config.api_enabled) {
      res.setHeader('Content-Type', 'application/json');
      let msg = {
        info: 'This instance do not support API requests. Please see https://codeberg.org/teddit/teddit#instances for instances that support API, or setup your own instance.',
      };
      return res.end(JSON.stringify(msg));
    }

    console.log('Teddit API request - subreddit');
    let _json = json; // Keep the original json
    if (from === 'redis') json = JSON.parse(json);

    if (api_type === 'rss') {
      let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';
      let items = '';

      for (var i = 0; i < json.data.children.length; i++) {
        let post = json.data.children[i].data;
        items += await getPostItem(post, req, protocol);
      }

      let r_subreddit = '/r/' + subreddit;
      let title = r_subreddit;
      let link = `${protocol}://${config.domain}${r_subreddit}`;
      if (subreddit === '/') {
        r_subreddit = 'frontpage';
        title = 'teddit frontpage';
        link = `${protocol}://${config.domain}`;
      }

      let xml_output = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
            <atom:link href="${link}/?api&amp;type=rss" rel="self" type="application/rss+xml" />
            <title>${title}</title>
            <link>${link}</link>
            <description>Subreddit feed for: ${r_subreddit}</description>
            ${items}
          </channel>
        </rss>`;
      res.setHeader('Content-Type', 'application/rss+xml');
      return res.end(xml_output);
    } else {
      res.setHeader('Content-Type', 'application/json');
      if (api_target === 'reddit') {
        return res.end(JSON.stringify(json));
      } else {
        let processed_json = await processJsonSubreddit(
          _json,
          from,
          null,
          req.cookies
        );

        await processJsonPostList(processed_json.links, mode);

        return res.end(JSON.stringify(processed_json));
      }
    }
  };
  this.handleTedditApiSubredditAbout = async (
    json,
    res,
    from,
    api_target
  ) => {
    if (!config.api_enabled) {
      res.setHeader('Content-Type', 'application/json');
      let msg = {
        info: 'This instance do not support API requests. Please see https://codeberg.org/teddit/teddit#instances for instances that support API, or setup your own instance.',
      };
      return res.end(JSON.stringify(msg));
    }

    console.log('Teddit API request - subreddit about');
    if (from === 'redis') json = JSON.parse(json);

    res.setHeader('Content-Type', 'application/json');

    if (api_target === 'reddit') {
      return res.end(JSON.stringify(json));
    } else {
      let subreddit_about = await processJsonSubredditAbout(
        json,
        true
      );

      return res.end(JSON.stringify(subreddit_about));
    }
  };
  this.handleTedditApiSubredditSearch = async (
    json,
    req,
    res,
    from,
    api_type,
    api_target,
    subreddit,
    query,
    mode
  ) => {
    if (!config.api_enabled) {
      res.setHeader('Content-Type', 'application/json');
      let msg = {
        info: 'This instance do not support API requests. Please see https://codeberg.org/teddit/teddit#instances for instances that support API, or setup your own instance.',
      };
      return res.end(JSON.stringify(msg));
    }

    console.log('Teddit API request - subreddit search');
    if (from === 'redis') json = JSON.parse(json);

    if (api_type === 'rss') {
      let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';
      let items = '';

      for (var i = 0; i < json.data.children.length; i++) {
        let post = json.data.children[i].data;
        items += await getPostItem(post, req, protocol);
      }

      let r_subreddit = '/r/' + subreddit;
      let title = `${query} - ${r_subreddit}`;
      let link = `${protocol}://${config.domain}${r_subreddit}/search?q=${query}`;

      let xml_output = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
            <atom:link href="${link}&amp;api&amp;type=rss" rel="self" type="application/rss+xml" />
            <title>${title}</title>
            <link>${link}</link>
            <description>Results for: ${query} - ${r_subreddit}</description>
            ${items}
          </channel>
        </rss>`;

      res.setHeader('Content-Type', 'application/rss+xml');

      return res.end(xml_output);
    } else {
      res.setHeader('Content-Type', 'application/json');
      if (api_target === 'reddit') {
        return res.end(JSON.stringify(json));
      } else {
        let processed_json = await processSearchResults(
          json,
          true,
          null,
          null,
          req.cookies
        );

        await processJsonPostList(processed_json.posts, mode);

        return res.end(JSON.stringify(processed_json));
      }
    }
  };
};

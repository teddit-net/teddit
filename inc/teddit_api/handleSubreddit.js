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
        let link = json.data.children[i].data;
        let thumbnail = '';
        let post_image = '';
        let is_self_link = false;
        let valid_reddit_self_domains = ['reddit.com'];

        if (link.domain) {
          let tld = link.domain.split('self.');
          if (tld.length > 1) {
            if (!tld[1].includes('.')) {
              is_self_link = true;
              link.url = teddifyUrl(link.url);
            }
          }
          if (
            config.valid_media_domains.includes(link.domain) ||
            valid_reddit_self_domains.includes(link.domain)
          ) {
            is_self_link = true;
            link.url = teddifyUrl(link.url);
          }
        }

        if (link.preview && link.thumbnail !== 'self') {
          if (!link.url.startsWith('/r/') && isGif(link.url)) {
            let s = await downloadAndSave(link.thumbnail, 'thumb_');
            thumbnail = `${protocol}://${config.domain}${s}`;
          } else {
            if (link.preview.images[0].resolutions[0]) {
              let s = await downloadAndSave(
                link.preview.images[0].resolutions[0].url,
                'thumb_'
              );
              thumbnail = `${protocol}://${config.domain}${s}`;
              if (!isGif(link.url) && !link.post_hint.includes(':video')) {
                s = await downloadAndSave(link.preview.images[0].source.url);
                post_image = `${protocol}://${config.domain}${s}`;
              }
            }
          }
        }

        link.permalink = `${protocol}://${config.domain}${link.permalink}`;

        if (is_self_link) link.url = link.permalink;

        if (req.query.hasOwnProperty('full_thumbs')) {
          if (!post_image) post_image = thumbnail;

          thumbnail = post_image;
        }

        let enclosure = '';
        if (thumbnail != '') {
          let mime = '';
          let ext = thumbnail.split('.').pop();
          if (ext === 'png') mime = 'image/png';
          else mime = 'image/jpeg';
          enclosure = `<enclosure length="0" type="${mime}" url="${thumbnail}" />`;
        }

        let append_desc_html = `<br/><a href="${link.url}">[link]</a> <a href="${link.permalink}">[comments]</a>`;

        items += `
          <item>
            <title>${link.title}</title>
            <author>${link.author}</author>
            <created>${link.created}</created>
            <pubDate>${new Date(
              link.created_utc * 1000
            ).toGMTString()}</pubDate>
            <domain>${link.domain}</domain>
            <id>${link.id}</id>
            <thumbnail>${thumbnail}</thumbnail>
            ${enclosure}
            <link>${link.permalink}</link>
            <url>${link.url}</url>
            <description><![CDATA[${unescape(
              link.selftext_html
            )}${append_desc_html}]]></description>
            <num_comments>${link.num_comments}</num_comments>
            <ups>${link.ups}</ups>
            <stickied>${link.stickied}</stickied>
            <is_self_link>${is_self_link}</is_self_link>
          </item>
        `;
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

        let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';
        for (var i = 0; i < processed_json.links.length; i++) {
          let link = processed_json.links[i];
          let valid_reddit_self_domains = ['reddit.com'];
          let is_self_link = false;

          if (link.domain) {
            let tld = link.domain.split('self.');
            if (tld.length > 1) {
              if (!tld[1].includes('.')) {
                is_self_link = true;
                link.url = teddifyUrl(link.url);
              }
            }
            if (
              config.valid_media_domains.includes(link.domain) ||
              valid_reddit_self_domains.includes(link.domain)
            ) {
              is_self_link = true;
              link.url = teddifyUrl(link.url);
            }
          }

          link.permalink = `${protocol}://${config.domain}${link.permalink}`;

          if (is_self_link) link.url = link.permalink;

          if (link.images) {
            if (link.images.thumb !== 'self') {
              link.images.thumb = `${protocol}://${config.domain}${link.images.thumb}`;
            }
          }

          if (mode === 'light') {
            link.selftext_html = null;
          }
        }

        return res.end(JSON.stringify(processed_json));
      }
    }
  };
  this.handleTedditApiSubredditAbout = async (
    json,
    req,
    res,
    from,
    api_type,
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
    let _json = json; // Keep the original json
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
      let title = `${query} - ${r_subreddit}`;
      let link = `${protocol}://${config.domain}${r_subreddit}/search?q=${query}`;

      let xml_output = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
            <atom:link href="${link}&api&amp;type=rss" rel="self" type="application/rss+xml" />
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

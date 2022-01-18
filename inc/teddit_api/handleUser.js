const processJsonUser = require('../processJsonUser');

module.exports = function () {
  const config = require('../../config');
  this.handleTedditApiUser = async (
    json,
    req,
    res,
    from,
    api_type,
    api_target,
    user
  ) => {
    if (!config.api_enabled) {
      res.setHeader('Content-Type', 'application/json');
      let msg = {
        info: 'This instance do not support API requests. Please see https://codeberg.org/teddit/teddit#instances for instances that support API, or setup your own instance.',
      };
      return res.end(JSON.stringify(msg));
    }

    console.log('Teddit API request - user');
    let _json = json; // Keep the original json
    if (from === 'redis') json = JSON.parse(json);

    let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';
    let link = `${protocol}://${config.domain}/user/${user}`;

    if (api_type === 'rss') {
      let items = '';
      let posts_limit = 25;

      if (json.overview.data.children.length <= posts_limit) {
        posts_limit = json.overview.data.children.length;
      }

      for (var i = 0; i < posts_limit; i++) {
        let post = json.overview.data.children[i].data;
        let post_id = post.permalink.split('/').slice(-2)[0] + '/';
        let url = post.permalink.replace(post_id, '');
        let permalink = `${protocol}://${config.domain}${post.permalink}`;
        let comments_url = `${protocol}://${config.domain}${url}`;
        let kind = json.overview.data.children[i].kind;

        let t1_elements = '';
        let t3_elements = '';
        if (kind === 't1') {
          let append_desc_html = `<br/><a href="${permalink}">[link]</a> <a href="${comments_url}">[comments]</a>`;
          t1_elements = `
            <description><![CDATA[${unescape(
              post.body_html
            )}${append_desc_html}]]></description>
            <url>${comments_url}</url>
          `;
        }
        if (kind === 't3') {
          let s = await downloadAndSave(post.thumbnail, 'thumb_');
          let thumbnail = '';
          let enclosure = '';
          if (s !== 'self' && s != '') {
            let img = `${protocol}://${config.domain}${s}`;
            thumbnail = `<thumbnail>${img}</thumbnail>`;

            let mime = '';
            let ext = s.split('.').pop();
            if (ext === 'png') mime = 'image/png';
            else mime = 'image/jpeg';
            enclosure = `<enclosure length="0" type="${mime}" url="${img}" />`;
          }
          let append_desc_html = `submitted by <a href="${protocol}://${config.domain}/u/${user}>/u/${user}</a> to <a href="${protocol}://${config.domain}/r/${post.subreddit}/">r/${post.subreddit}</a>`;
          append_desc_html += `<br/><a href="${permalink}">[comments]</a>`;
          t3_elements = `
            <description><![CDATA[${unescape(
              post.selftext_html
            )}${append_desc_html}]]></description>
            ${thumbnail}
            ${enclosure}
          `;
        }

        let title = post.title;
        if (!post.title) title = post.link_title;

        items += `
          <item>
            <title>${title}</title>
            <dc:creator>/u/${user}</dc:creator>
            <kind>${kind}</kind>
            <subreddit>${post.subreddit}</subreddit>
            <created>${post.created_utc}</created>
            <pubDate>${new Date(
              post.created_utc * 1000
            ).toGMTString()}</pubDate>
            <ups>${post.ups}</ups>
            <link>${permalink}</link>
            <edited>${post.edited}</edited>
            <num_comments>${post.num_comments}</num_comments>
            <over_18>${post.over_18}</over_18>
            ${t1_elements}
            ${t3_elements}
          </item>
        `;
      }

      let xml_output = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
            <atom:link href="${link}/?api&amp;type=rss" rel="self" type="application/rss+xml" />
            <title>overview for ${user}</title>
            <link>${link}</link>
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
        let processed_json = await processJsonUser(
          json,
          true,
          null,
          null,
          req.cookies
        );
        return res.end(JSON.stringify(processed_json));
      }
    }
  };
};

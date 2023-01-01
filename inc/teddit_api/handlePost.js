const { processJsonPost, getPostItem } = require('../processJsonPost');

module.exports = function () {
  const config = require('../../config');
  this.handleTedditApiPost = async (
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

    console.log('Teddit API request - post');
    if (from === 'redis') json = JSON.parse(json);

    if (api_type === 'rss') {
      let protocol = config.https_enabled || config.api_force_https ? 'https' : 'http';
      let items = '';

      let post = json[0].data.children[0].data;
      let comments = json[1].data.children;

      items += await getPostItem(post, req, protocol);

      for (var i = 0; i < comments.length; i++) {
        let comment = comments[i].data;
        let kind = comments[i].kind;

        let title = `/u/${comment.author} on ${post.title}`;
        
        comment.permalink = `${protocol}://${config.domain}${comment.permalink}`;

        if (kind !== 'more') {
          items += `
            <item>
              <title>${title}</title>
              <author>${comment.author}</author>
              <created>${comment.created}</created>
              <pubDate>${new Date(
                comment.created_utc * 1000
              ).toGMTString()}</pubDate>
              <id>${comment.id}</id>
              <link>${comment.permalink}</link>
              <description><![CDATA[${unescape(
                comment.body_html
              )}]]></description>
              <ups>${comment.ups}</ups>
            </item>
          `;
        }
      }

      let xml_output = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
            <atom:link href="${post.permalink}?api&amp;type=rss" rel="self" type="application/rss+xml" />
            <title>${post.title}</title>
            <link>${post.url}</link>
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
        let processed_json = await processJsonPost(
          json,
          true,
          req.cookies
        );

        return res.end(JSON.stringify(processed_json));
      }
    }
  };
};

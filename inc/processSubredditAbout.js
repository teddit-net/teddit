const config = require('../config');
const { redisAsync } = require('./redis');

function returnRelevantKeys(json) {
  return {
    title: json.data.title,
    public_description_html: json.data.public_description_html,
    active_user_count: json.data.active_user_count,
    subscribers: json.data.subscribers,
    created_utc: json.data.created_utc,
    over18: json.data.over18,
    description_html: json.data.description_html,
    moderators: json.moderators,
  };
}

async function processSubredditAbout(subreddit, redis, fetch, RedditAPI) {
  if (subreddit && !subreddit.includes('+') && subreddit !== 'all') {
    const key = `${subreddit}:sidebar`;

    try {
      const cached = await redisAsync.get(key);

      if (cached !== null) {
        return returnRelevantKeys(JSON.parse(cached));
      }

      let url = `https://reddit.com/r/${subreddit}/about.json`;

      if (config.use_reddit_oauth) {
        url = `https://oauth.reddit.com/r/${subreddit}/about`;
      }

      const subredditAboutRequest = await fetch(url, redditApiGETHeaders());

      if (subredditAboutRequest.ok) {
        let response = await subredditAboutRequest.json();
        response.moderators = [];

        await redisAsync.setex(
          key,
          config.setexs.sidebar,
          JSON.stringify(response)
        );

        console.log(`Fetched sidebar for ${subreddit} from reddit API`);

        return returnRelevantKeys(response);
      } else {
        console.error(
          `Something went wrong while fetching data from reddit API: 
          ${subredditAboutRequest.status} – ${subredditAboutRequest.statusText}`
        );
        console.error(config.reddit_api_error_text);
        return null;
      }
    } catch (error) {
      console.error('Error fetching the sidebar: ', error);

      return null;
    }
  } else {
    return null;
  }
}

async function processJsonSubredditAbout(json, parsed) {
  if (!parsed) {
    json = JSON.parse(json);
  }

  return returnRelevantKeys(json);
}

module.exports = {
  processSubredditAbout,
  processJsonSubredditAbout
};

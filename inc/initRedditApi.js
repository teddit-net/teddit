module.exports = function(fetch) {
  const config = require('../config');
  this.initRedditApi = function() {
    if(!config.use_reddit_oauth)
      return null
    
    let options = {
      body: `grant_type=https://oauth.reddit.com/grants/installed_client&device_id=DO_NOT_TRACK_THIS_DEVICE&duration=permanent`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${client_id_b64}`,
      },
      method: 'POST'
    }

    fetch('https://www.reddit.com/api/v1/access_token', options)
    .then(result => {
      if(result.status === 200) {
        result.json()
        .then(data => {
          //console.log(data)
          if(data.access_token) {
            reddit_access_token = data.access_token
            reddit_refresh_token = data.refresh_token
            console.log(`Successfully obtained a reddit API key.`)
          } else {
            console.log(`Error while obtaining a reddit API key. Check that your reddit app ID is correct. Reddit could also be down.`, data)
          }
        })
      } else {
        console.error(`Something went wrong while trying to get an access token from reddit API. ${result.status} – ${result.statusText}`)
        console.error(reddit_api_error_text)
        return res.render('frontpage', { json: null, http_status_code: result.status, instance_config: config })
      }
    }).catch(error => {
      console.log(`Error while obtaining a reddit API key.`, error)
    })
    
    setInterval(() => {
      refreshRedditToken()
    }, 1000 * 60 * 58) /* Refresh access token every ~1 hour. */
  }

  this.refreshRedditToken = function() {
    let options = {
      body: `grant_type=refresh_token&refresh_token=${reddit_refresh_token}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${client_id_b64}`,
      },
      method: 'POST'
    }
    fetch('https://www.reddit.com/api/v1/access_token', options)
    .then(result => {
      if(result.status === 200) {
        result.json()
        .then(data => {
          //console.log(data)
          if(data.access_token) {
            reddit_access_token = data.access_token
            console.log(`Successfully refreshed the reddit API key.`)
          } else {
            console.log(`Error while refreshing the reddit API key.`, data)
          }
        })
      } else {
        console.error(`Something went wrong while fetching data from reddit API. ${result.status} – ${result.statusText}`)
        console.error(reddit_api_error_text)
        return res.render('frontpage', { json: null, http_status_code: result.status, instance_config: config })
      }
    }).catch(error => {
      console.log(`Error while refreshing the reddit API key.`, error)
    })
  }
  this.redditApiGETHeaders = function() {
    let cookies = `edgebucket=; _options={%22pref_gated_sr_optin%22:true,%22pref_quarantine_optin%22:true}`
    
    if(!config.use_reddit_oauth)
      return { headers: { cookie: cookies }, method: 'GET' }
    
    return {
      headers: {
        Authorization: `Bearer ${reddit_access_token}`,
        cookie: cookies
      },
      method: 'GET'
    }
  }
  initRedditApi()
}

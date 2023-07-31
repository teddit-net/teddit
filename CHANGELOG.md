## Changelog has not been updated since 2021-03-23

# Changelog
## 2021-03-23
### Fixed
1. fix /r/:subreddit/search redis key.
## 2021-03-22
### Added
1. add favicon.ico and display profile icons
## 2021-03-21
### Added
1.  Add support for /poll urls 
2.  Replace reddit links by default
3.  Add missing user_preferences parameter 
4.  add replacePrivacyDomains()
5.  Replace youtube/twitter/instagram with privacy respecting ones 	
### Fixed
1.  Fix export feature when not exporting saved posts
2.  Ignore urls starting with /r/ 
## 2021-03-20
### Fixed
1.  Rewrite redd.it and its subdomains to teddit domain, fixes (#120)
2.  Replace all (*.)reddit.com domains with teddit domain (#120)  
## 2021-03-19
### Added
1.  Add feature to export and import preferences as json file 
### Fixed
1. Fix search page (PR #164)
2. Fix Pug security vulns. see more PR #165 
## 2021-03-18
1.Add a feature for showing upvote ratio in posts #147 
## 2021-03-16
## Added
1. Add a feature to the preferences where users can choose to collapse child comments automatically
## 2021-03-15
### Added
1. Add support for user created custom fields (#162)
## 2021-03-01
### Added
1. Make a preference for image sizes in posts, fix #119
    - Now users can change the max height of the media in posts. In preferences there is a setting called "Media size in posts". For more info, click [here](https://codeberg.org/teddit/teddit/issues/119#issuecomment-180384)
## 2021-02-23
### Fixed
1. Fix next page bug if NSFW is turned on
## 2021-02-19
### Fixed
1. Improve support for gyfcat(fix #15)
## 2021-02-14
### Fixed
1. fix spoiler text not always showing when focused
## 2021-02-13
### Added
1. Include saved posts in export preferences
## 2021-02-06
### Added
1. Save Post feature
    - You can now save/bookmark posts! Click the **saved** button on the subreddit bar to view the bookmarked posts.
### Fixed
1. Fix error message for empty/saved
2. Fix main post links
## 2021-01-31
### Added
1. Support for short Gallery URLs
## 2021-01-30
### Added
1. add import/export feature for preferences
    - You can now transfer your preferences and subreddits to another device. To export preferences, go to **Preferences** --> click the arrow next to **Export Preferences**. Access the URL from another device to import your preferences and subreddits.
2. add 'pubDate' for RSS feeds
## 2021-01-29
### Added
1. filter users by submissions/comments
### Fixed
1. fixes for #139
2. Fix expandable and image overflow for sepia theme
## 2021-01-28
### Fixed
1. Fine tune expandable post
## 2021-01-27
### Added
1. Automatically change theme
### Fixed
1. Fix expanding post (#137)
## 2021-01-23
### Fixed
1. Styling of footer (PR: #132)
2. Fix (#130) - Placement of buttons.
## 2021-01-22
### Fixed
1. Fix short comment URLs(#114)
2. Fix unescape's regex(#128)
3. Optimize CSS for narrow devices(#123)
## 2021-01-21
### Fixed
1. Styling of sepia theme
## 2021-01-20
### Added
1. Added Teddit logo to the topbar
2. Sepia theme
     - Teddit has a new beautiful Sepia theme. Go to preferences to change the theme.
## 2021-01-19
### Added
1. Expand text posts from subreddit view
    - Now you can expand/preview text posts by clicking on the hamburger icon.
### Fixed
1. Check that Gallery ID exists
2. Optimized CSS
## 2021-01-17
### Added
1. Support for r/random
2. add '/subreddits'
    - Now you can search and explore subreddits easily. Add '/subreddits' to the URL or press the **more** button in the top bar.
## 2021-01-16
### Added
- Convert reddit.com links to instance domain
## 2021-01-15
### Added
-  scroll to infobar when viewing comment permalink (#78) 
### Fixed
- Fix sidebar overflow on mobile (#109)
## 2021-01-12
### Added
- Added r/popular to list of subreddits
## 2021-01-10
### Added
- Edit date for comments
### Fixed
- Position of subscribe button in mobile
- Inconsistency of Link colours
## 2021-01-09
### Added
- User info on top of entries
- r/all even when users have subscriptions
### Fixed
- Previous/Next links on page.
## 2021-01-08
### Added
- Subscribe to subreddits and manage subscriptions from preferences page.
### Fixed
- Fixed subreddit view when there are no subscriptions.









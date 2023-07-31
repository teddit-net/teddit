module.exports.removeCacheFiles = function() {
  const config = require('./config');

  async function deleteStatic() {
    const fs = require('fs');
    const pics = './static/pics/';
    const vids = './static/vids/';

    fs.rmdir(pics, { recursive: true, force: true }, () => {
      fs.rmdir(vids, { recursive: true, force: true }, () => {
        ['pics/thumbs', 'pics/flairs', 'pics/icons', 'vids'].map((d) => `./static/${d}`)
        .filter((d) => !fs.existsSync(d))
        .forEach((d) => fs.mkdirSync(d, { recursive: true }));

        console.log('Cleared cached static media files. You can turn this off by setting the config.cache_control to false.');
      });
    });
  }

  if(config.cache_control) {
    deleteStatic();

    let hours = config.cache_control_interval;
    if (hours < 1 || hours > 10000 || isNaN(hours)) {
      hours = 24;
    }

    setInterval(() => {
      deleteStatic();
    }, 1000 * 60 * 60 * hours);
  }
}

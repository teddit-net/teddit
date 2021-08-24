module.exports.removeCacheFiles = function() {
  const fs = require('fs')
  const config = require('./config')
  const pics = './static/pics'
  const flairs = './static/pics/flairs'
  const icons = './static/pics/icons'
  const thumbs = './static/pics/thumbs'
  const vids = './static/vids'
  let util  = require('util')
  let spawn = require('child_process').spawn
  
  let usage
  const limit = config.cache_max_size
  
  function getUsage() {
    return new Promise((resolve, reject) => {
      let size = spawn('du', ['-sBM', './static/'])
      size.stdout.on('data', function (data) {
        usage = parseInt(data)
        resolve(usage)
      })
    })
  }

  function deleteFiles() {
    return new Promise(async (resolve, reject) => {
      usage = await getUsage()
      if(usage > limit) {
        const { exec } = require('child_process')
        exec(`cd ${pics} && ls -1btr -Iflairs -Iicons -Ithumbs -I.gitignore | head -50 | xargs rm -f --`)
        exec(`cd ${flairs} && ls -1btr -I.gitignore | head -50 | xargs rm -f --`)
        exec(`cd ${icons} && ls -1btr -I.gitignore | head -50 | xargs rm -f --`)
        exec(`cd ${thumbs} && ls -1btr -I.gitignore | head -50 | xargs rm -f --`)
        exec(`cd ${vids} && ls -1btr -I.gitignore | head -30 | xargs rm -f --`)
      }
      resolve(1)
    })
  }
  
  async function main() {
    usage = await getUsage()
    if(usage > limit) {
      console.log('Started removeCacheFiles()')
      while(usage > limit) {
        await deleteFiles()
      }
    }
  }

  if(config.cache_control) {
    main()
    
    const interval_ms = config.cache_control_interval
    setInterval(() => {
      main()
    }, interval_ms)
  }
}

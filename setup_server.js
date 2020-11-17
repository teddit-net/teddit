/**
 Basic HTTP-server, used for obtaining certificates.
*/
const path = require('path')
const express = require('express')
const app = express()
const NONSSL_PORT = 8080
const http = require('http').Server(app)

app.use(express.static(`${__dirname}/dist`))
app.set('trust proxy', 1)

app.get('/', (req, res, next) => {
  res.send('/')
})

http.listen(NONSSL_PORT, '0.0.0.0', () => console.log(`HTTP web server started with port ${NONSSL_PORT}`))

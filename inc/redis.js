const config = require('../config');
const { promisify } = require('util');
const r = require('redis');

const redisOptions = {
  host: '127.0.0.1',
  port: 6379,
};

if (config.redis_db) {
  redisOptions.db = config.redis_db;
}

if (config.redis_host) {
  redisOptions.host = config.redis_host;
}

if (config.redis_port && config.redis_port > 0) {
  redisOptions.port = config.redis_port;
}

if (config.redis_password) {
  redisOptions.password = config.redis_password;
}

// Stub Redis if disabled
const stub = {
  get: (_, callback) => callback(null, null),
  setex: (_, _1, _2, callback) => callback(null),
  on: () => {},
};

const redisDisabled = !config.redis_enabled;

const redis = redisDisabled ? stub : r.createClient(redisOptions);

const redisAsync = {
  get: promisify(redis.get).bind(redis),
  setex: promisify(redis.setex).bind(redis),
};

redis.on('error', (error) => {
  if (error) {
    console.error(`Redis error: ${error}`);
  }
});

module.exports = {
  redis,
  redisAsync,
};

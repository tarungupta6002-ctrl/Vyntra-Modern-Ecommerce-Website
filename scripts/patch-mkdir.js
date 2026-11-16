/**
 * Windows NTFS / Node.js Concurrent mkdir Retry Hook
 * Prevents transient EPERM / EBUSY sharing violations during concurrent webpack compilation on Windows
 */
const fs = require('fs');

const origMkdir = fs.mkdir;
const origMkdirSync = fs.mkdirSync;

fs.mkdirSync = function (p, options) {
  let retries = 25;
  while (true) {
    try {
      return origMkdirSync.call(fs, p, options);
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY') && retries > 0) {
        retries--;
        const start = Date.now();
        while (Date.now() - start < 20) {}
        if (fs.existsSync(p)) return p;
      } else {
        throw err;
      }
    }
  }
};

fs.mkdir = function (p, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  let retries = 25;
  function attempt() {
    origMkdir.call(fs, p, options, (err, result) => {
      if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY') && retries > 0) {
        retries--;
        setTimeout(() => {
          if (fs.existsSync(p)) {
            return callback ? callback(null, p) : undefined;
          }
          attempt();
        }, 20);
      } else {
        if (callback) callback(err, result);
      }
    });
  }
  attempt();
};

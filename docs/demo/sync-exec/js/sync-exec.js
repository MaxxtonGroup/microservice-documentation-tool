// Generated by CoffeeScript 1.9.1
(function() {
  var child_process, create_pipes, dir, fs, i, len, name, proxy, read_pipes, ref, timeout, tmp_dir;

  child_process = require('child_process');

  fs = require('fs');

  tmp_dir = '/tmp';

  ref = ['TMPDIR', 'TMP', 'TEMP'];
  for (i = 0, len = ref.length; i < len; i++) {
    name = ref[i];
    if ((dir = process.env[name]) != null) {
      tmp_dir = dir.replace(/\/$/, '');
    }
  }

  timeout = function(limit, msg) {
    if ((new Date).getTime() > limit) {
      throw new Error(msg);
    }
  };

  create_pipes = function() {
    var created, t_limit;
    t_limit = (new Date).getTime() + 1000;
    while (!created) {
      try {
        dir = tmp_dir + '/sync-exec-' + Math.floor(Math.random() * 1000000000);
        fs.mkdir(dir);
        created = true;
      } catch (_error) {}
      timeout(t_limit, 'Can not create sync-exec directory');
    }
    return dir;
  };

  read_pipes = function(dir, max_wait) {
    var deleted, j, len1, pipe, read, ref1, result, t_limit;
    t_limit = (new Date).getTime() + max_wait;
    while (!read) {
      try {
        if (fs.readFileSync(dir + '/done').length) {
          read = true;
        }
      } catch (_error) {}
      timeout(t_limit, 'Process execution timeout or exit flag read failure');
    }
    while (!deleted) {
      try {
        fs.unlinkSync(dir + '/done');
        deleted = true;
      } catch (_error) {}
      timeout(t_limit, 'Can not delete exit code file');
    }
    result = {};
    ref1 = ['stdout', 'stderr', 'status'];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      pipe = ref1[j];
      result[pipe] = fs.readFileSync(dir + '/' + pipe, {
        encoding: 'utf-8'
      });
      read = true;
      fs.unlinkSync(dir + '/' + pipe);
    }
    try {
      fs.rmdirSync(dir);
    } catch (_error) {}
    result.status = Number(result.status);
    return result;
  };

  proxy = function(cmd, max_wait, options) {
    var err, orig_write, status, stderr, stdout, t0;
    options.timeout = max_wait;
    stdout = stderr = '';
    status = 0;
    t0 = (new Date).getTime();
    orig_write = process.stderr.write;
    process.stderr.write = function() {};
    try {
      stdout = child_process.execSync(cmd, options);
      process.stderr.write = orig_write;
    } catch (_error) {
      err = _error;
      process.stderr.write = orig_write;
      if (err.signal === 'SIGTERM' && t0 <= (new Date).getTime() - max_wait) {
        throw new Error('Timeout');
      }
      stdout = err.stdout, stderr = err.stderr, status = err.status;
    }
    return {
      stdout: stdout,
      stderr: stderr,
      status: status
    };
  };

  module.exports = function(cmd, max_wait, options) {
    var ref1;
    if (max_wait && typeof max_wait === 'object') {
      ref1 = [max_wait, null], options = ref1[0], max_wait = ref1[1];
    }
    if (options == null) {
      options = {};
    }
    if (!options.hasOwnProperty('encoding')) {
      options.encoding = 'utf8';
    }
    if (!(typeof options === 'object' && options)) {
      throw new Error('options must be an object');
    }
    if (max_wait == null) {
      max_wait = options.timeout || options.max_wait || 3600000;
    }
    if (!((max_wait == null) || max_wait >= 1)) {
      throw new Error('`options.timeout` must be >=1 millisecond');
    }
    delete options.max_wait;
    if (child_process.execSync) {
      return proxy(cmd, max_wait, options);
    }
    delete options.timeout;
    dir = create_pipes();
    cmd = '((((' + cmd + ' > ' + dir + '/stdout 2> ' + dir + '/stderr ) ' + '&& echo 0 > ' + dir + '/status) || echo 1 > ' + dir + '/status) &&' + ' echo 1 > ' + dir + '/done) || echo 1 > ' + dir + '/done';
    child_process.exec(cmd, options, function() {});
    return read_pipes(dir, max_wait);
  };

}).call(this);
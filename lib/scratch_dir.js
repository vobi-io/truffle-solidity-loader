var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')

/* ScratchDir - Handles the creation and path resolution of the
 * webpack loader build artifacts directory.
 */
var ScratchDir = function ScratchDir () { }

ScratchDir.prototype = {
  createIfMissing: function () {
    if (!this.dirExists()) {
      mkdirp.sync(this.path())
    }
  },

  dirExists: function () {
    return this.isDirSync(this.path())
  },

  path: function () {
    var cwd = process.cwd()
    var scratchDir = 'build/contracts'
    return path.resolve(cwd, scratchDir)
  },

  isDirSync: function (aPath) {
    try {
      return fs.statSync(aPath).isDirectory()
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false
      } else {
        throw e
      }
    }
  }
}

module.exports = ScratchDir

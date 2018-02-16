var fs = require('fs')
var Logger = require('./lib/logger_decorator')

function returnContractAsSource (filePath, compilationFinished) {
  fs.readFile(filePath, 'utf8', function (err, solJsFile) {
    if (err) {
      Logger.error(err)
      return compilationFinished(err, null)
    }

    compilationFinished(err, solJsFile)
  })
}

// Synchronus file existence check helper
function compiledContractExists (filePath) {
  try {
    fs.statSync(filePath)
  } catch (err) {
    if (err.code === 'ENOENT') return false
  }
  return true
}

module.exports = {
  returnContractAsSource,
  compiledContractExists
}

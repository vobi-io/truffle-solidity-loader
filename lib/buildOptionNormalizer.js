var path                    = require('path')
var merge                   = require('lodash.merge')
var Logger                  = require('./loggerDecorator')
var ScratchDir              = require('./scratchDir')
var TruffleConfig           = require('truffle-config')
var chalk                   = require('chalk')

var BuildOptionNormalizer = {
  normalize: function(buildOpts, query) {

    // define the migrations directory
    // default: './migrations' 
    if (!buildOpts.migrations_directory) {
      Logger.warn('Truffle migrations directory (migrations_directory) not provided.')
      Logger.warn('You can do this through the Truffle Configuration file or a loader query string.')
      Logger.warn('Defaulting migrations_directory to ./migrations')
      buildOpts.migrations_directory = path.resolve(buildOpts.working_directory, 'migrations')
    }

    // detect and initialize config from truffle(-config).js
    var config = TruffleConfig.detect(buildOpts)
    
    // merge webpack loader options (aka query parameters if using webpack 1) into the config
    if (query !== "undefined") {
      merge(config, query)
    }

    // define and format the contracts_build_directory if not done so already.
    // default: build/contracts (http://truffleframework.com/docs/advanced/configuration#contracts_build_directory)
    if (!config.contracts_build_directory) {
      var scratchPath = new ScratchDir()
      scratchPath.createIfMissing()
      config.contracts_build_directory = scratchPath.path()
    } else {
      config.contracts_build_directory = path.resolve(config.working_directory, config.contracts_build_directory)
    }

    // define network like `truffle develop` would (https://github.com/trufflesuite/truffle-core/blob/develop/lib/commands/develop.js)
    // default: { host: 'localhost', port: 8545, network_id: '* }
    var networksList = Object.keys(config.networks)
    if (
      (!config.network && !Logger.error("The 'network' property is not specified in the loader options")) ||
      ((!config.networks || !networksList.length) && !Logger.error("The 'networks' property is not provided in the loader options")) ||
      (config.networks && !config.networks[config.network] && !Logger.error("The specified network (" + chalk.red(config.network) + ") is not present in the provided networks ([" + chalk.red(networksList.join(', ')) + "])"))
    ) {
      Logger.warn('Defaulting to development network:')
      Logger.warn('  host: "localhost"')
      Logger.warn('  port: 8545')
      Logger.warn('  network_id: "*"')
      config.networks = {
        development: {
          host: 'localhost',
          port: 8545,
          network_id: "*" // Match any network id
        }
      }
      config.network = 'development'
    }

    return config
  }
}

module.exports = BuildOptionNormalizer
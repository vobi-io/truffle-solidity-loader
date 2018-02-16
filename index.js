/* External Module Dependencies */
var loaderUtils = require('loader-utils')
var Web3 = require('web3')
var SolidityParser = require('solidity-parser-antlr')
var TruffleCompiler = require('truffle-core/lib/commands/compile')
var TruffleMigrator = require('truffle-migrate')

/* Internal Module Dependencies */
var Logger = require('./lib/loggerDecorator')
var BuildOptionNormalizer = require('./lib/buildOptionNormalizer')
var {compiledContractExists, returnContractAsSource} = require('./lib/contract')

/* Native Node Imports */
var path = require('path')
var fs = require('fs')

// This acts as a mutex to prevent multiple compilation runs
var isCompilingContracts = false

module.exports = function (source) {
  this.cacheable && this.cacheable()

  var config = BuildOptionNormalizer.normalize({
    working_directory: process.cwd(),
    logger: Logger
  }, loaderUtils.getOptions(this))

  var compilationFinished = this.async()
  var contractPath = this.context
  var contractFilePath = this.resourcePath
  var contractFileName = path.basename(contractFilePath)
  var contractName = contractFileName.charAt(0).toUpperCase() + contractFileName.slice(1, contractFileName.length - 4)
  var compiledContractPath = path.resolve(config.contracts_build_directory, contractName + '.json') // compiled artifact JSON

  var addDependency = this.addDependency
  SolidityParser.visit(SolidityParser.parse(source), {
    ImportDirective: function (node) {
      var dependencyPath = path.resolve(contractPath, node.path)
      addDependency(dependencyPath)

      if (compiledContractExists(compiledContractPath)) {
        fs.unlinkSync(compiledContractPath)
      }
    }
  })

  function waitForContractCompilation () {
    setTimeout(function () {
      if (compiledContractExists(compiledContractPath)) {
        returnContractAsSource(compiledContractPath, compilationFinished, contractName)
      } else {
        waitForContractCompilation()
      }
    }, 500)
  }

  if (!isCompilingContracts) {
    Logger.log('Writing temporary contract build artifacts to ' + config.contracts_build_directory)
    isCompilingContracts = true

    config.contracts_directory = contractPath
    config.all = false

    var networkName = config.network
    var network = config.networks[networkName]
    var providerUri = 'http://' + network.host + ':' + network.port
    var provider = config.networks[networkName].provider = new Web3.providers.HttpProvider(providerUri)

    TruffleCompiler.run(config, function (err, contracts) {
      if (err) {
        Logger.error(err)
        return compilationFinished(err, null)
      }

      isCompilingContracts = false
      Logger.log('COMPILATION FINISHED')
      Logger.log('RUNNING MIGRATIONS')

      var web3 = new Web3(provider)
      config.networks[networkName].from = network.from || web3.eth.accounts[0] // similar to https://github.com/trufflesuite/truffle-core/blob/ed0f27b29f1f5eea54dc82f1eb17e63819a10614/test/migrate.js#L44
      config.reset = true // Force the migrations to re-run

      // Once all of the contracts have been compiled, we know we can immediately
      // try to run the migrations safely.
      TruffleMigrator.run(config, function (err, result) {
        if (err) {
          Logger.error(err)
          return compilationFinished(err, null)
        }

        // Finally return the contract source we were originally asked for.
        returnContractAsSource(compiledContractPath, compilationFinished, contractName)
      })
    })

    return
  }

  if (compiledContractExists(compiledContractPath)) {
    returnContractAsSource(compiledContractPath, compilationFinished, contractName)
  } else {
    waitForContractCompilation()
  }
}

const lodash = require('lodash')
const {join} = require('path')
const fs = require('fs')
const featuresFilePath = join(__dirname, '../', 'content', 'statix.json')
const defaultFeatures = {
  'all': {
    'generateSearchIndex': true,
    'generateWebp': true,
    'minifyCss': true,
    'minifyJs': true,
    'optimizeImages': true,
    'webpHighCompression': true
  },
  'dev': {
    'minifyCss': false,
    'minifyJs': false,
    'optimizeImages': false,
    'webpHighCompression': false
  }
}
const featuresFileContent = fs.existsSync(featuresFilePath)
  ? JSON.parse(fs.readFileSync(featuresFilePath))
  : {
    'all': {}
  }

module.exports = lodash.merge(
  {},
  defaultFeatures.all,
  defaultFeatures[process.env.NODE_ENV] || {},
  featuresFileContent.all,
  featuresFileContent[process.env.NODE_ENV] || {}
)

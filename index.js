const fs = require('fs-extra')
const {join} = require('path')
const SiteMap = require('./lib/sitemap')
const {listLangPaths} = require('./lib/multilingual')
const {generateLang} = require('./lib/generation')
const {loadContentTree, addAlternates} = require('./lib/content_tree')

const outputPath = join(__dirname, 'output')
const contentPath = join(__dirname, 'content')
const staticPath = join(__dirname, 'assets/output')
const extraFile = join(contentPath, 'extra.js')

let extra = () => {
  return { }
}

if (fs.existsSync(extraFile)) {
  extra = require(extraFile) // eslint-disable-line global-require
}

const sitemap = new SiteMap()

Promise.resolve()
.then(() => {
  console.log('1. Cleaning the output..')
  fs.removeSync(outputPath)

  return fs.mkdirp(outputPath)
})
.then(() => {
  console.log('2. Copying assets..')

  return fs.copy(staticPath, outputPath)
})
.then(() => {
  console.log('3. Loading data..')

  let siteData = {}
  const siteFile = join(contentPath, 'site.json')

  if (fs.existsSync(siteFile)) {
    siteData = JSON.parse(fs.readFileSync(siteFile, 'utf-8')) || {}
  }

  return listLangPaths(contentPath, siteData.defaultLang)
  .then(langPaths => {
    return Promise.all(langPaths.map(langPath => {
      return loadContentTree(contentPath, langPath, siteData, sitemap)
    }))
  })
  .then(contentTrees => {
    return addAlternates(contentTrees)
  })
})
.then(contentTrees => {
  console.log('4. Generating pages..')

  return Promise.all(contentTrees.map(contentTree => {
    return generateLang(contentTree, contentPath, outputPath, extra)
  }))
})
.then(() => {
  console.log('5. Generating sitemap + robots.txt..')

  return sitemap.generate(outputPath)
})
.then(() => {
  console.log('DONE')
})
.catch(err => {
  console.error('ERROR', err)
  process.exit(1)
})

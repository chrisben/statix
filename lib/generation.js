const util = require('util')
const ejs = require('ejs')
const renderFile = util.promisify(ejs.renderFile)
const {render} = ejs
const fs = require('fs-extra')
const {join} = require('path')
const joinUrl = require('url').resolve
const {JSDOM} = require('jsdom')
const FlexSearch = require('flexsearch')
const stopword = require('stopword')
const features = require('./features')

const generateLang = (contentTree, contentPath, outputPath, extra) => {
  const layoutsPath = join(contentPath, 'layouts')

  const indexDocuments = []
  let {lang} = contentTree

  lang = lang.substr(0, 2)

  FlexSearch.registerLanguage(lang, {
    'filter': stopword[lang],
    'stemmer': {}
  })

  return Promise.all(Object.entries(contentTree.getPages()).map(([page, data]) => {
    const {_layout} = data
    const layoutFile = join(layoutsPath, `${_layout}.html.ejs`)
    const path = data._path

    console.log(`   # ${path}`)

    const pageContent = contentTree.getPageContent(page)

    if (typeof extra !== 'undefined') {
      pageContent.extra = extra(pageContent, outputPath, contentTree.tree)
    }

    return renderFile(layoutFile, pageContent, {'async': false})
    .then(output => {
      if (typeof pageContent._extraRendering !== 'undefined' && pageContent._extraRendering) {
        return render(output, pageContent, {'async': false})
      }

      return output
    })
    .then(output => {
      // Prepare document to index
      const id = indexDocuments.length
      const url = pageContent._path
      const dom = new JSDOM(output)
      // We first look for the content within the <main> tag, otherwise use full body
      const mainContent = dom.window.document.querySelector('main')
      const body = (mainContent
        ? mainContent.textContent
        : dom.window.document.body.textContent)
       // Remove empty lines
      .replace(/^\s*$(?:\r\n?|\n)/gm, '')
      // Trim lines
      .replace(/^\s+|\s+$/gm, '')
      const title = pageContent.meta
        ? pageContent.meta.title
        : pageContent.title
      const desc = pageContent.meta
        ? pageContent.meta.description
        : ''

      indexDocuments.push({
        body,
        desc,
        id,
        title,
        url
      })

      return output
    })
    .then(output => {
      const outFile = path.endsWith('.html')
      ? join(outputPath, path)
      : join(outputPath, path, 'index.html')

      return fs.outputFile(outFile, output)
    })
  }))
  .then(() => {
    return Promise.all(contentTree
      .getRedirects()
      .map(redirect => {
        console.log(`   > ${redirect.source}`)

        const outFile = join(outputPath, join(redirect.source, 'index.html'))
        const absolutePath = joinUrl(contentTree.getSiteUrl() || '/', redirect.path)
        const output = `<!DOCTYPE html>
        <html>
        <head>
          <meta http-equiv="refresh" content="0; url=${absolutePath}">
        </head>
        <body>
          <p>The page has moved to <a href="${absolutePath}">${absolutePath}</a></p>
        </body>
        </html>`

        return fs.outputFile(outFile, output)
    }))
  })
  .then(() => {
    if (!features.generateSearchIndex) {
      console.log('Skipping search index generation')

      return Promise.resolve()
    }

    // Create search index
    const idx = new FlexSearch({
      'doc': {
        'field': [
          'title',
          'desc',
          'body'
        ],
        'id': 'id',
        'store': [
          'url',
          'title',
          'desc'
        ]
      },
      'filter': lang,
      'stemmer': lang
    })

    idx.add(indexDocuments)

    const indexContent = idx.export()
    const outFile = join(outputPath, `index-${lang}.json`)

    console.log('Generating search index', outFile)

    return fs.outputFile(outFile, indexContent)
  })
}

module.exports = {generateLang}

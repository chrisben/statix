const fs = require('fs-extra')
const {join} = require('path')
const joinUrl = require('url').resolve

class SiteMap {

  constructor () {
    this.info = {}
    this.langs = {}
    this.now = new Date().toISOString()
    this.siteUrl = null
  }

  setPageMeta (pageName, fileDate) {
    if (typeof this.info[pageName] === 'undefined') {
      this.info[pageName] = {}
    }
    // Keep newest date of last change
    if (typeof this.info[pageName].lastmod === 'undefined' || this.info[pageName].lastmod < fileDate) {
      this.info[pageName].lastmod = fileDate
    }
  }

  addPage (pageName, lang, absolutePath, priority) {
    const uniqueName = join(lang, pageName)

    if (typeof this.info[uniqueName] === 'undefined') {
      this.info[uniqueName] = {'lastmod': this.now}
    }
    this.info[uniqueName].loc = absolutePath
    if (typeof priority !== 'undefined') {
      this.info[uniqueName].priority = priority
    }
    this.info[uniqueName]._page = pageName
    this.info[uniqueName]._lang = lang
    if (typeof this.langs[pageName] === 'undefined') {
      this.langs[pageName] = {}
    }
    this.langs[pageName][lang] = absolutePath
  }

  setSiteUrl (siteUrl) {
    this.siteUrl = siteUrl
  }

  generate (outputPath) {
    // Generate sitemap
    let sitemap = Object.entries(this.info).reduce((acc, [_key, pageInfo]) => {
      const priority = typeof pageInfo.priority === 'undefined'
      ? 1
      : pageInfo.priority
      const extra = typeof this.langs[pageInfo._page] === 'undefined' || Object.keys(this.langs[pageInfo._page]).length < 2
      ? ''
      : Object.keys(this.langs[pageInfo._page])
              .reduce((acc2, lang) => {
                return `${acc2}
    <xhtml:link rel="alternate" hreflang="${lang}" href="${this.langs[pageInfo._page][lang]}" />`
              }, '')

      return `${acc}
  <url>
    <loc>${pageInfo.loc}</loc>
    <lastmod>${pageInfo.lastmod}</lastmod>
    <priority>${priority}</priority>${extra}
  </url>`
    }, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')

    sitemap += '\n</urlset>'

    return fs.outputFile(join(outputPath, 'sitemap.xml'), sitemap)
      .then(() => {
        const sitemapAbsoluteUrl = joinUrl(this.siteUrl || '/', 'sitemap.xml')
        const content = `User-agent: *
Allow: /

Sitemap: ${sitemapAbsoluteUrl}
`

        return fs.outputFile(join(outputPath, 'robots.txt'), content)
      })
  }
}

module.exports = SiteMap

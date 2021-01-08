const fs = require('fs-extra')
const lodash = require('lodash')
const {join, extname} = require('path')
const {translate} = require('./multilingual')
const showdown = require('showdown')
const {loadTranslations} = require('./multilingual')
const joinUrl = require('url').resolve

showdown.setFlavor('github')
const markdown = new showdown.Converter()

class ContentTree {

  static jsonTreeFileName () {
    return 'tree.json'
  }

  constructor (langFolder, langPath, translations, siteData) {
    const jsonTreeFilePath = join(langPath, ContentTree.jsonTreeFileName())
    let treeData = JSON.parse(fs.readFileSync(jsonTreeFilePath, 'utf8'))

    if (typeof treeData === 'undefined') {
      console.error('Failed to load tree json file', jsonTreeFilePath)
      treeData = {}
    }

    this.tree = {}
    lodash.merge(this.tree, siteData, treeData)

    if (typeof this.tree.site === 'undefined') {
      this.tree.site = {}
    }
    if (typeof this.tree.menus === 'undefined') {
      this.tree.menus = {}
    }
    if (typeof this.tree.pages === 'undefined') {
      this.tree.pages = {}
    }

    this.translations = translations || {}
    this.alternates = []
    this.relativeAlternates = []
    this.lang = langFolder
  }

  addPageContent (pageName, property, value) {
    if (typeof this.tree.pages[pageName][property] !== 'undefined') {
      console.warn(`/!\\ Property ${property} for page ${pageName} overloaded!`)
    }
    this.tree.pages[pageName][property] = value
  }

  addAlternate (pageName, lang, path, absolutePath) {
    if (typeof this.alternates[pageName] === 'undefined') {
      this.alternates[pageName] = []
    }
    this.alternates[pageName][lang] = absolutePath
    if (typeof this.relativeAlternates[pageName] === 'undefined') {
      this.relativeAlternates[pageName] = []
    }
    this.relativeAlternates[pageName][lang] = path
  }

  getSiteContent () {
    return this.tree.site
  }

  getPages () {
    return this.tree.pages
  }

  getLang () {
    return this.lang
  }

  getRedirects () {
    return (this.tree.redirects || [])
      .map(redirect => {
        if (typeof this.tree.pages[redirect._page] === 'undefined') {
          console.warn(`/!\\ Redirect _page ${redirect._page} does not exist!`)

          return null
        }

        if (Object.keys(this.tree.pages).filter(page => this.tree.pages[page]._path === redirect.source).length > 0) {
          console.warn(`/!\\ Redirect _page ${redirect._page} with source ${redirect.source} clashes with existing page !`)

          return null
        }

        return {
          'path': this.tree.pages[redirect._page]._path,
          'source': redirect.source
        }
      })
      .filter(redirect => redirect !== null)
  }

  getSiteUrl () {
    return process.env.SITE_URL || this.tree.site.url
  }

  getPageContent (pageName) {
    const paths = Object.entries(this.tree.pages).reduce((acc, [page, data]) => {
      acc[page] = data._path

      return acc
    }, {})
    const pathTransform = (path, isAbsolute) => {
      let output = typeof isAbsolute && isAbsolute
        ? this.getSiteUrl()
        : ''

      output += output.endsWith('/') || path.startsWith('/')
        ? path
        : `/${path}`

        return output
    }
    const pathFunction = (name, isAbsolute, anchor) => {
      const output = pathTransform(paths[name], isAbsolute)
      const suffix = typeof anchor === 'undefined'
          ? ''
          : `#${anchor}`

      return output + suffix
    }
    const menuFunctionConstructor = page => {
      return name => {
        const recursiveProcessMenuItem = item => {
          const path = typeof item._page === 'undefined'
            ? item._path
            : pathFunction(item._page, false, item._anchor)

          const isCurrent = val => {
            return typeof val !== 'undefined' && val._page === page
          }

          const recursiveIsActive = val => {
            return typeof val !== 'undefined' && (
              (Array.isArray(val)
              ? val.reduce((acc, sub) => acc || recursiveIsActive(sub), false)
              : isCurrent(val)) || recursiveIsActive(val._subs))
          }

          return {
            ...item,
            '_subs': typeof item._subs === 'undefined'
                ? item._subs
                : item._subs.map(subItem => recursiveProcessMenuItem(subItem)),
            'isActive': recursiveIsActive(item),
            'isCurrent': isCurrent(item),
            'isExternal': path.startsWith('http'),
            path
          }
        }

        return (this.tree.menus[name] || []).map(item => recursiveProcessMenuItem(item))
      }
    }
    const breadCrumbsFunctionConstructor = page => {
      const recursiveFindPage = (menu, index, parents) => {
        if (!menu || index >= menu.length) {
          return null
        }

        const menuItem = menu[index]

        if (menuItem && menuItem._page === page) {
          // Add self to the breadcrumb bar
          return parents.concat([menuItem])
        }

        return recursiveFindPage(menuItem._subs, 0, parents.concat([menuItem])) || recursiveFindPage(menu, index + 1, parents)
      }

      return menu => recursiveFindPage(this.tree.menus[menu], 0, [])
    }
    const assetFunction = (path, isAbsolute) => {
      return pathTransform(path, isAbsolute)
    }
    const siteFunction = property => {
      return this.tree.site[property]
    }
    const isDefinedFunction = page => property => {
      return typeof this.tree.pages[page][property] !== 'undefined'
    }
    const translateFunction = string => {
      return translate(this.translations, string)
    }
    const getAlternates = page => {
      return this.alternates[page] || []
    }
    const getRelativeAlternates = page => {
      return this.relativeAlternates[page] || []
    }
    const pageFunction = page => {
      return this.tree.pages[page]
    }

    return {
      '_page': pageName,
      'f': {
        'alternates': getAlternates(pageName),
        'asset': assetFunction,
        'breadCrumbs': breadCrumbsFunctionConstructor(pageName),
        'isDefined': isDefinedFunction(pageName),
        'menu': menuFunctionConstructor(pageName),
        'page': pageFunction,
        'path': pathFunction,
        'relativeAlternates': getRelativeAlternates(pageName),
        'site': siteFunction,
        't': translateFunction,
        'tree': () => this.tree,
        'url': isAbsolute => pathTransform(paths[pageName], isAbsolute)
      },
      ...this.tree.pages[pageName]
    }
  }
}


const loadContentTree = (contentPath, langFolder, siteData, sitemap) => {
  const langPath = join(contentPath, langFolder)
  const pagesPath = join(langPath, 'pages')
  const translations = loadTranslations(langPath)
  const contentTree = new ContentTree(langFolder, langPath, translations, siteData)

  sitemap.setSiteUrl(contentTree.getSiteUrl())

  return fs.exists(pagesPath)
  .then(exists => {
    if (exists) {
      fs.readdirSync(pagesPath).forEach(pageName => {
        const pagePath = join(pagesPath, pageName)

        fs.readdirSync(pagePath).forEach(fileName => {
          const dataPath = join(pagePath, fileName)
          const data = fs.readFileSync(dataPath, 'utf-8')
          const extension = extname(fileName)
          const dataName = fileName.substr(0, fileName.lastIndexOf(extension))
          const stats = fs.statSync(dataPath)
          const fileDate = new Date(stats.mtime).toISOString()

          sitemap.setPageMeta(join(langFolder, pageName), fileDate)

          switch (extension) {
            case '.md': {
              const mdData = markdown.makeHtml(data)

              if (!mdData) {
                console.error('Failed to load file', dataPath)
              }
              contentTree.addPageContent(pageName, dataName, mdData)
              break
            }
            case '.json': {
              const jsonData = JSON.parse(data)

              if (!jsonData) {
                console.error('Failed to load file', dataPath)
              }
              contentTree.addPageContent(pageName, dataName, jsonData)
              break
            }
            default:
              console.error('Unknown file extension', extension, 'for file', fileName)
              break
          }
        })
      })
    }

    return Promise.resolve()
  })
  .then(() => {
    Object.entries(contentTree.getPages()).forEach(([page, data]) => {
      if (data._sitemap !== false) {
        const path = data._path
        const absolutePath = joinUrl(contentTree.getSiteUrl() || '/', path)

        sitemap.addPage(page, langFolder, absolutePath, data._priority)
      }
    })

    return contentTree
  })
}

const addAlternates = contentTrees => {
  contentTrees.forEach((contentTree, index) => {
    const pages = contentTree.getPages()

    contentTrees.forEach((contentTree2, index2) => {
      if (index !== index2) {
        const pages2 = contentTree2.getPages()

        Object.keys(pages).forEach(pageName => {
          if (typeof pages2[pageName] !== 'undefined') {
            const path = pages2[pageName]._path
            const absolutePath = joinUrl(contentTree2.getSiteUrl() || '/', path)

            contentTree.addAlternate(pageName, contentTree2.getLang(), path, absolutePath)
          }
        })
      }
    })
  })

  return contentTrees
}

module.exports = {
  addAlternates,
  loadContentTree
}

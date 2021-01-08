const util = require('util')
const fs = require('fs-extra')
const {join} = require('path')
const readdirAsync = util.promisify(fs.readdir)

const isLangFolder = folder => {
  return fs.existsSync(join(folder, 'tree.json'))
}

// A lang path is a subdirectory of content/ that contains a tree.json file
const listLangPaths = (contentPath, defaultLang) => {
  return readdirAsync(contentPath)
  .then(folders => {
    return folders.filter(folder => {
      const fullFolder = join(contentPath, folder)

      return fs.statSync(fullFolder).isDirectory() && isLangFolder(fullFolder)
    })
    .sort((_langA, langB) => {
      return langB === defaultLang
      ? 1
      : -1
    })
  })
}

const loadTranslations = langPath => {
  const translationFile = join(langPath, 'translations.json')

  if (fs.existsSync(translationFile)) {
      return JSON.parse(fs.readFileSync(translationFile, 'utf8'))
  }

  return {}
}

const translate = (translations, string) => {
  if (typeof translations[string] !== 'undefined') {
    return translations[string]
  }
  if (Object.keys(translations).length > 0) {
    console.warn(`/!\\ Translation not found for "${string}"`)
  }

  return string
}

module.exports = {
  listLangPaths,
  loadTranslations,
  translate
}

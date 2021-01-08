# Statix

Simple static site generator.

## Functionalities

- Generates static pages from multiple inputs (markdown or json)
- Uses EJS layout templates
- Manages menus, links, assets
- i18n built-in: ability to handle content in multiple languages + translate content in layouts
- Generates sitemap.xml + robots.txt
- Generates redirect pages with HTML redirect meta for site migration, treated as 301 by Google

## Installation

```shell
npm install
```

## Run

```shell
# start the http-server
node_modules/.bin/http-server ./output -c-1 &

# start nodemon and rebuild all on content file change
node_modules/.bin/nodemon --config nodemon.json index.js
```

## Assets

You should have an `assets/src/` folder with all your asset sources.

To run the gulp pipeline for assets:

```
node_modules/.bin/gulp
```

In development mode:

```
NODE_ENV=dev node_modules/.bin/gulp watch
```

## Content

Your `content/` folder should contain:

- `layouts/` with `.html.ejs` and include `.ejs` files (see [EJS](http://ejs.co/))
- `{langCode}/` with all local content (e.g: `en/`)
- `site.json` (optional) for global defines (can be overridden per language)

The local content should include:

- `pages/` (optional) for markdown data 
- `tree.json` contains the actual data of the content for this language
- `translations.json` (optional) contains the translations from the original language

An example folder structure:

```
content/
        en/
           pages/
                 home/
                      content.md
           translations.json
           tree.json
        fr/
           pages/
                 home/
                      content.md
           tree.json
        layouts/
                footer.ejs
                header.ejs
                home.html.ejs
        static/
               js/
               css/
               images/
        site.json
```

### Content tree

An example:

```json
{
  "site": {
    "analytics": "UA12345678",
    "url": "https://www.statix.com"
  },
  "menus": {
    "header": [
      {
        "title": "Home",
        "_page": "home"
      },
      {
        "title": "About",
        "_page": "about"
      }
    ],
    "footer": [
      {
        "title": "About",
        "_page": "about"
      }
    ]
  },
  "redirects": [
    {
      "source": "/ye-old-link",
      "_page": "home"
    }
  ],
  "pages": {
    "home": {
      "_path": "/",
      "_layout": "home",
      "meta": {
        "title": "Home",
        "description": "My home page"
      },
      "title": "Home sweet home",
      "subtitle": "The best homepage.. ever!"
    },
    "about": {
      "_path": "/about",
      "_layout": "normal",
      "meta": {
        "title": "About this site",
        "description": "All about this site"
      },
      "title": "About us",
      "subtitle": "We are cool developers"
    },
    "404": {
      "_path": "/404.html",
      "_layout": "normal",
      "_sitemap": false,
      "meta": {
        "title": "404",
        "description": "page not found"
      },
      "title": "404",
      "subtitle": "page not found"
    }
  }
}
```

#### Pages content

Content can also be loaded directly from the following file formats:

- Github Markdown
- JSON

In the `pages/` folder, create a subfolder with the page name. All files with the allowed extensions will be loaded within the property named after the filename. For instance: `pages/home/content.md` will add the `content` property to the `home` page.

##### Reserved keywords

The following keywords cannot be used as a page property:

- `_page`
- `_path`
- `_layout`
- `_sitemap`
- `_priority`
- `f`
- `extra`

### Menu items

- `_anchor` : page anchor (`#anchor`) appended to the end of the link
- `_page` : defines an internal link
- `_path` : same page or external link
- `_subs` : child menu items (optional)

### Page

- `_page` : identifier of the current page
- `_path` : the rendered page URL path
- `_layout` : the layout model to use to render the page
- `_sitemap` : if `false`, this page does not appear in the sitemap
- `_priority` : sitemap priority [0..1]
- `_extraRendering` : calls EJS template rendering twice to integrate EJS syntax into Markdown content for instance

### Redirects

- `source` : the rendered page URL path
- `_page` : identifier of the target page

This creates an HTML meta redirect, treated as 301 by Google.

## Layout Documentation

## Functions

- `f.alternates` : get an array of type `[lang: absoluteUrl]` for hreflang alternate Urls
- `f.relativeAlternates` : get an array of type `[lang: path]`
- `f.asset(fileName, isAbsolute)` : url to asset
- `f.breadCrumbs(menu)` : returns a list of parent items found within a given menu
- `f.isDefined(property)` : checks if page property exists before using it
- `f.menu(name)` : returns a list of menu items
- `f.page(pageName)` : returns the data reloated to a page
- `f.path(pageName, isAbsolute, anchor)` : from page name to actual path (with optional anchor parameter)
- `f.site(property)` : retrieves global site property
- `f.t(string)` : translates a string
- `f.tree()` : returns the whold tree structure
- `f.url(isAbsolute)` : current page url (absolute or not)

### Custom functions

Custom JS functions can be added within a `content/extra.js` file. These will then be accessible via the global extra` property.

This module needs to return a function that returns a structure.

`content/extra.js`:

```js
const localizePrice = (lang, price, currency) => {
  if (lang === 'fr') {
    return `${price}${currency}`.replace('.', ',')
  }

  return `${currency}${price}`
}

module.exports = (pageContent, _outputPath, _tree) => {
  return {
    'price': price => {
      return localizePrice(pageContent.f.site('lang'), price, pageContent.f.site('currency'))
    }
  }
}
```

can then be used within a layout:

```js
<%- extra.price(74) %>
```

## Menus

- `isActive` : is this the active page or one of its parents?
- `isCurrent` : is this the active page?
- `isExternal` : is this an external link?
- `path` : URL to point to

## Select statix features

You can create a `content/statix.json` file to define what features to use (or not), and override these settings according to the NODE_ENV environment.
All available features can be found in `lib/features.js`

For instance:

```
{
  "all": {
    "generateSearchIndex": false
  },
  "dev": {
    "minifyCss": true
  }
}
```
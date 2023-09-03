const {join} = require('path')
const gulp = require('gulp')
const concat = require('gulp-concat')
const sass = require('gulp-sass')(require('node-sass'))
const cleanCSS = require('gulp-clean-css')
const imagemin = require('gulp-imagemin')
const extReplace = require('gulp-ext-replace')
const webp = require('imagemin-webp')
const babel = require('gulp-babel')
const clean = require('gulp-clean')
const identity = require('gulp-identity')
const uglify = require('gulp-uglify')
const features = require('./lib/features')

const assetsSourceFolder = 'assets/src'
const assetsOutputFolder = 'assets/output'

gulp.task('clean', () => {
  return gulp.src(join(assetsOutputFolder, '*'), {'read': false})
    .pipe(clean())
})

gulp.task('css-app', () => {
  return gulp.src(join(assetsSourceFolder, 'css/app/*.scss'))
    .pipe(sass())
    .pipe(concat('app.min.css'))
    .pipe(features.minifyCss
      ? cleanCSS({'level': 2})
      : identity())
    .pipe(gulp.dest(assetsOutputFolder))
})

gulp.task('css-vendors', () => {
  return gulp.src(join(assetsSourceFolder, 'css/vendors/*.css'))
    .pipe(concat('vendors.min.css'))
    .pipe(features.minifyCss
      ? cleanCSS({'level': 2})
      : identity())
    .pipe(gulp.dest(assetsOutputFolder))
})

gulp.task('css', gulp.parallel('css-vendors', 'css-app'))

gulp.task('js-app', () => {
  return gulp.src(join(assetsSourceFolder, 'js/app/*.js'))
//    .pipe(sourcemaps.init())
    .pipe(babel({'presets': ['@babel/env']}))
    .pipe(concat('app.min.js'))
    .pipe(features.minifyJs
      ? uglify()
      : identity())
//    .pipe(sourcemaps.write())
    .pipe(gulp.dest(assetsOutputFolder))
})

gulp.task('js-vendors', () => {
  return gulp.src(join(assetsSourceFolder, 'js/vendors/*.js'))
//    .pipe(sourcemaps.init())
    .pipe(concat('vendors.min.js'))
//    .pipe(sourcemaps.write())
    .pipe(gulp.dest(assetsOutputFolder))
})

gulp.task('js', gulp.parallel('js-vendors', 'js-app'))

gulp.task('images', () => {
  return gulp.src(join(assetsSourceFolder, 'images/*'))
    .pipe(features.optimizeImages
      ? imagemin([
        imagemin.gifsicle({'interlaced': true}),
        imagemin.mozjpeg({'progressive': true}),
        imagemin.optipng({'optimizationLevel': 5}),
        imagemin.svgo({'plugins': [{'cleanupIDs': true}]})
      ])
      : identity())
    .pipe(gulp.dest(join(assetsOutputFolder, 'images')))
})

gulp.task('images-webp', () => {
  if (!features.generateWebp) {
    // Do nothing
    return gulp.src([])
  }

  const quality = 75
  // 0 = Fastest
  const method = features.webpHighCompression
    ? 5
    : 0

  return gulp.src([
    join(assetsSourceFolder, 'images/*.jpg'),
    join(assetsSourceFolder, 'images/*.jpeg'),
    join(assetsSourceFolder, 'images/*.png'),
    join(assetsSourceFolder, 'images/*.gif')
  ])
  .pipe(imagemin([
      webp({
        method,
        quality
      })
    ]))
  .pipe(extReplace('.webp'))
  .pipe(gulp.dest(join(assetsOutputFolder, 'images')))
})

gulp.task('fonts', () => {
  return gulp.src(join(assetsSourceFolder, 'fonts/*'))
    .pipe(gulp.dest(join(assetsOutputFolder, 'fonts')))
})

gulp.task('videos', () => {
  return gulp.src(join(assetsSourceFolder, 'videos/*'))
    .pipe(gulp.dest(join(assetsOutputFolder, 'videos')))
})

gulp.task('icons', () => {
  return gulp.src(join(assetsSourceFolder, 'icons/*'))
    .pipe(features.optimizeImages
      ? imagemin()
      : identity())
    .pipe(gulp.dest(join(assetsOutputFolder, 'icons')))
})

gulp.task('favicon', () => {
  return gulp.src(join(assetsSourceFolder, 'icons/favicon.ico'))
    .pipe(gulp.dest(assetsOutputFolder))
})

gulp.task('others', () => {
  return gulp.src([
    join(assetsSourceFolder, '**/*'),
    `!${join(assetsSourceFolder, 'videos/*')}`,
    `!${join(assetsSourceFolder, 'images/*')}`,
    `!${join(assetsSourceFolder, 'icons/*')}`,
    `!${join(assetsSourceFolder, 'fonts/*')}`,
    `!${join(assetsSourceFolder, 'css')}`,
    `!${join(assetsSourceFolder, 'css/*')}`,
    `!${join(assetsSourceFolder, 'css/**/*')}`,
    `!${join(assetsSourceFolder, 'js/*')}`
  ])
  .pipe(gulp.dest(assetsOutputFolder))
})

// Keep the 'js' task at the end to signal the other watcher assets have been reloaded: avoid reload hell on the other side with nodemon
gulp.task('build', gulp.series('clean', gulp.parallel(['videos', 'images', 'images-webp', 'icons', 'favicon', 'fonts', 'css', 'others']), 'js'))

gulp.task('watch', () => {
  gulp.watch(join(assetsSourceFolder, '**/*.*'), gulp.parallel('build'))
})

gulp.task('default', gulp.parallel('build'))

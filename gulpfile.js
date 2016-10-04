const gulp = require('gulp');
const less = require('gulp-less');
const babel = require('gulp-babel');
const browserSync = require('browser-sync');
const concat = require('gulp-concat');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sync = require('gulp-sync')(gulp).sync;
const del = require('del');
const watchify = require('watchify');
const sourcemaps = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const notify = require('gulp-notify');
const merge = require('merge-stream');
const eslint = require('gulp-eslint');
const cache = require('gulp-cache');

const reload = browserSync.reload;

const projectName = 'robots';
const sourceFolder = './src';
const distributionFolder = './dist';

const bundler = {
  hotReloading: false,
  w: null,
  init: function init() {
    this.w = watchify(browserify({
      extensions: ['.js', '.json'],
      entries: [`${sourceFolder}/index.js`],
      debug: true, // enable inline sourcemaps
      cache: {},
      packageCache: {},
      // TODO #115705 Hot Reloading of React Components can be enabled via build.cfg.json
      // Options for babel(ify) are specified in .babelrc
    }).transform('babelify').transform('envify'));
  },
  bundle: function bundle() {
    return this.w && this.w.bundle()
        .on('error', notify.onError())
      .pipe(source(`${projectName}.js`))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(distributionFolder))
      .pipe(gulpif(!this.hotReloading, reload({ stream: true })));
  },
  watch: function watch() {
    if (this.w) {
      this.w.on('update', this.bundle.bind(this));
    }
  },
  stop: function stop() {
    if (this.w) {
      this.w.close();
    }
  },
};

gulp.task('scripts:watch', () => {
  bundler.init();
  return bundler.bundle();
});

gulp.task('scripts', ['scripts:watch'], bundler.stop.bind(bundler));

gulp.task('lint', () => gulp.src([`${sourceFolder}/**/*.js`, './gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
);

// LESS compiler
gulp.task('styles', () => {
  const processedLess = gulp.src(`${sourceFolder}/styles/**/*.less`).pipe(less());
  const srcCss = gulp.src(`${sourceFolder}/styles/**/*.css`);
  return merge(srcCss, processedLess)
    .pipe(concat(`${projectName}.css`))
    .pipe(gulp.dest(`${distributionFolder}/styles`))
    .pipe(reload({ stream: true }));
});

// picture-pipe!
gulp.task('images', () => gulp.src(`${sourceFolder}/images/**/*.*(png|jpg|gif|svg)`)
    .pipe(gulp.dest(`${distributionFolder}/images`))
    .pipe(reload({ stream: true }))
);

gulp.task('html', () => gulp.src(`${sourceFolder}/**/*.html`)
    .pipe(gulp.dest((distributionFolder)))
    .pipe(reload({ stream: true }))
);

gulp.task('serve', () => browserSync({
  server: {
    baseDir: distributionFolder,
    port: 3000
  }
}));

gulp.task('clean', () => del(distributionFolder));

gulp.task('clear-cache', () => cache.clearAll());

gulp.task('set-production', () => { process.env.NODE_ENV = 'production'; });

gulp.task('bundle:watch', sync([['images'], ['styles', 'scripts:watch'], 'html']));
gulp.task('clean-bundle:watch', sync([['clean', 'clear-cache'], 'lint', 'bundle:watch']));

gulp.task('build', ['clean-bundle:watch'], bundler.stop.bind(bundler));
gulp.task('build:production', sync(['set-production', 'build', 'html']));

gulp.task('serve:production', sync(['build:production', 'serve']));

gulp.task('watch', sync(['clean-bundle:watch', 'serve']), () => {
  bundler.watch();
  gulp.watch([`${sourceFolder}/**/*.js`, './.eslintrc', './gulpfile.js'], ['lint']);
  gulp.watch([`${sourceFolder}/**/*.html`], ['html']);
  gulp.watch([`${sourceFolder}/styles/**/*.*(css|less)`], ['styles']);
  gulp.watch([`${sourceFolder}/images/**/*.*(png|jpg|gif|svg)`], ['images']);
});

gulp.task('default', ['build']);

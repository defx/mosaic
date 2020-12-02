#!/usr/bin/env node

/*
export default {
    templates: "./pages/*.html",
    fragments: "./components/*.html",
    placeholder: "<!-- {{ COMPONENTS }} -->",
    outputDir: "./public",
    filter(template, fragments) {
        //....
    },
    dev: {
        transform() {
            //...
        }
    },
    build: {
        transform() {
            //...
        }
    }
}
*/

import chokidar from 'chokidar';
import deepmerge from 'deepmerge';
import express from 'express';
import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

const CWD = process.env.INIT_CWD || process.env.PWD;
const basename = (v) => path.basename(v, path.extname(v));
const IDENTITY = (v) => v;

const app = express();
const PORT = process.env.PORT || 5000;
const staticPath = './static';

app.use(express.static(staticPath));

let config = {
  port: 5000,
  replace: IDENTITY,
  filter: IDENTITY,
  dev: {
    transform: IDENTITY,
  },
  build: {
    transform: IDENTITY,
  },
};

const configure = (key) =>
  import(path.join(CWD, './mosaic.config.js')).then(
    (v) => (config = deepmerge(config, key ? v.default[key] : v.default))
  );

const ensureOutputDir = (outputDir) =>
  fs.promises.stat(outputDir).catch(() => fs.promises.mkdir(outputDir));

function loadFiles(globPath) {
  return glob(globPath).then((paths) =>
    Promise.all(
      paths.map((filepath) =>
        fs.promises
          .readFile(filepath, 'utf8')
          .then((v) => [path.basename(filepath), v])
      )
    )
  );
}

const compile = () =>
  Promise.all([
    loadFiles(config.templates),
    loadFiles(config.fragments),
    ensureOutputDir(config.outputDir),
  ]).then(([templates, fragments]) =>
    templates.map(([name, content]) => [
      name,
      config.replace(
        content,
        config
          .filter(content, fragments)
          .map(([name, content]) => content)
          .join('\n')
      ),
    ])
  );

const build = () =>
  compile().then((files) =>
    files.map(([name, content]) =>
      fs.promises.writeFile(
        path.join(config.outputDir, name),
        config.build.transform(content)
      )
    )
  );

let pageCache = {};

const updateCache = () =>
  compile().then((files) => {
    pageCache = files.reduce((a, [filename, content]) => {
      a[basename(filename)] = content;
      return a;
    }, {});
  });

const dev = () => {
  updateCache().then(() => {
    app.use(function (req, res, next) {
      let name = req.originalUrl;
      name = name === '/' ? 'index' : name.slice(1);

      let entry = pageCache[name];

      if (entry) {
        res.send(config.dev.transform(entry));
      } else {
        next();
      }
    });

    app.listen(config.port, () =>
      console.log(`dev server listening on port ${config.port}`)
    );

    chokidar
      .watch([config.templates, config.fragments])
      .on('change', updateCache)
      .on('add', updateCache)
      .on('unlink', updateCache);
  });
};

const [cmd, key] = process.argv.slice(2);

switch (cmd) {
  case 'dev':
    configure(key).then(dev);
    break;
  case 'build':
    configure(key).then(build);
    break;
  default:
    console.error(
      `mosaic command expects either "dev" or "build" as the first and only argument`
    );
}

#!/usr/bin/env node

import chokidar from 'chokidar';
import deepmerge from 'deepmerge';
import express from 'express';
import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

const CWD = process.env.INIT_CWD || process.env.PWD;
const basename = (v) => path.basename(v, path.extname(v));
const IDENTITY = (v) => v;

let config = {};

const configure = (key) =>
  import(path.join(CWD, './mosaic.config.js')).then(
    (v) => (config = key ? v.default[key] : v.default)
  );

let cache = {
  fragments: {},
  templates: {},
};

const cacheFragment = (filename, fc) => {
  fc.cache = fc.cache || {};
  return fs.promises.readFile(filename, 'utf8').then((content) => {
    fc.cache[basename(filename)] = { filename, content };
  });
};

const cacheTemplate = (filename, fc) => {
  fc.cache = fc.cache || {};
  fs.promises.readFile(filename, 'utf8').then((content) => {
    fc.cache[basename(filename)] = { filename, content };
  });
};

/*

@TODO: modify schema so that template config uses { input } as well...

*/

const initialiseFragments = (fc) =>
  glob(fc.input).then((files) =>
    Promise.all(files.map((file) => cacheFragment(file, fc)))
  );

const initialiseTemplates = (fc) =>
  glob(fc.templates).then((files) =>
    Promise.all(files.map((file) => cacheTemplate(file, fc)))
  );

const watchFragments = (fc) => {
  chokidar
    .watch(fc.input)
    .on('change', (filename) => cacheFragment(filename, fc).then(build));
};

const watchTemplates = (fc) => {
  chokidar
    .watch(config.templates)
    .on('change', (filename) => cacheTemplate(filename).then(build));
};

const initialise = () => {
  return Promise.all([
    initialiseTemplates(config),
    ...config.fragments.map(initialiseFragments),
  ]);
};

const pageCache = {};

const build = () => {
  let templates = config.cache;
  let fragmentConfigs = config.fragments;

  Object.values(templates).map((template) => {
    let { filename, content } = template;
    let tpl = fragmentConfigs.reduce((tpl, fc) => {
      let { map = IDENTITY, filter = IDENTITY, reduce = IDENTITY, cache } = fc;
      let fragments = filter(Object.values(cache), tpl).map(map);
      return reduce(tpl, fragments);
    }, content);

    pageCache[basename(filename)] = tpl;

    //save?
  });
};

const serve = () => {
  const app = express();
  const staticPath = './';

  app.use(express.static(staticPath));
  app.use(function (req, res, next) {
    let name = req.originalUrl.split('?')[0];
    name = name === '/' ? 'index' : name.slice(1);

    let entry = pageCache[name];

    if (entry) {
      res.send(entry);
    } else {
      next();
    }
  });

  app.listen(config.port, () =>
    console.log(`dev server listening on port ${config.port}`)
  );

  chokidar
    .watch([config.templates, ...config.fragments.map(({ input }) => input)])
    .on('change', build)
    .on('add', build)
    .on('unlink', build);
};

configure().then(initialise).then(build).then(serve);

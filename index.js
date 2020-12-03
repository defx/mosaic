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

const app = express();
const staticPath = './static';

app.use(express.static(staticPath));

let config = {};

const configure = (key) =>
  import(path.join(CWD, './mosaic.config.js')).then(
    (v) => (config = key ? v.default[key] : v.default)
  );

const build = () => {
  //...
};

let cache = {
  fragments: {},
  templates: {},
};

const cacheFragment = (filename, fc) =>
  fs.promises.readFile(filename, 'utf8').then((content) => {
    cache.fragments[filename] = fc.map({ filename, content });
  });

const initialiseFragments = (fc) =>
  glob(fc.input).then((files) =>
    Promise.all(files.map((file) => cacheFragment(file, fc)))
  );

const watchFragments = (fc) => {
  chokidar
    .watch(fc.input)
    .on('change', (filename) => cacheFragment(filename, fc).then(build));
};

const cacheTemplate = (filename) =>
  fs.promises.readFile(filename, 'utf8').then((content) => {
    cache.templates[filename] = content;
  });

const initialiseTemplates = () =>
  glob(config.templates).then((files) =>
    Promise.all(files.map((file) => cacheTemplate(file)))
  );

const watchTemplates = () => {
  chokidar
    .watch(config.templates)
    .on('change', (filename) => cacheTemplate(filename).then(build));
};

const initialise = () => {
  /*
  
  initialising all of the templates and fragments makes them available in the global scope via cache.

  now we should be able to build each template

  each template

    run filter to get list of fragments

    run reduce to merge the two together 

    save || serve
  
  */

  return Promise.all([
    initialiseTemplates(),
    ...config.fragments.map(initialiseFragments),
  ]);

  /*
  
  .then(() => Promise.all([
    watchTemplates(),
    ...config.fragments.map(watchFragments)
  ]));
  
  */
};

configure()
  .then(initialise)
  .then(() => console.log(JSON.stringify(cache, null, 2)));

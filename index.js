#!/usr/bin/env node

import chokidar from 'chokidar';
import express from 'express';
import fs from 'fs';
import path from 'path';

import loadFiles from './loadFiles.js';
import customElementTagNames from './customElementTagNames.js';

const CWD = process.env.INIT_CWD || process.env.PWD;

const basename = (v) => path.basename(v, path.extname(v));
const IDENTITY = (v) => v;
const COMPONENTS_PLACEHOLDER = '<!-- {{ COMPONENTS }} -->';
const registry = {};
const app = express();
const PORT = process.env.PORT || 5000;
const staticPath = './static';

const pageCache = {};
const pageTemplates = {};
const pageToComponentsMap = {};

const GLOB_COMPONENTS = './components/*.html';
const GLOB_PAGES = './pages/*.html';
const OUTPUT_DIR = './public';

app.use(express.static(staticPath));

const updateRegistry = (name, content) => {
  registry[name] = content;
};

const initialiseComponents = () =>
  loadFiles(GLOB_COMPONENTS).then((components) => {
    components.forEach(([name, content]) => updateRegistry(name, content));
    return components;
  });

const componentDefs = (filter = IDENTITY) =>
  Object.entries(registry)
    .filter(([name, html]) => filter(name))
    .map(([name, html]) => html)
    .join('\n');

const pagesThatIncludeComponent = (componentName) =>
  Object.entries(pageToComponentsMap)
    .filter(([pageName, components]) => components.includes(componentName))
    .map(([pageName]) => pageName);

const buildPage = (name) => {
  let html = pageTemplates[name];
  let names = pageToComponentsMap[name];
  let filter = (name) => names.includes(name);
  return (pageCache[name] = html.replace(
    COMPONENTS_PLACEHOLDER,
    componentDefs(filter)
  ));
};

const updatePage = (name, content) => {
  pageTemplates[name] = content;
  pageToComponentsMap[name] = customElementTagNames(content);
  return buildPage(name);
};

const savePage = (name, html) =>
  fs.promises.writeFile(path.join(OUTPUT_DIR, `${name}.html`), html);

const initialisePages = () =>
  loadFiles(GLOB_PAGES).then((pages) =>
    pages.map(([name, content]) => [name, updatePage(name, content)])
  );

const onComponentChange = (path) => {
  let name = basename(path);
  fs.promises.readFile(path, 'utf8').then((content) => {
    updateRegistry(name, content);
    pagesThatIncludeComponent(name).map(buildPage);
  });
};

/* @TODO: add WS reload  */
const initialiseServer = () => {
  Object.keys(pageCache).forEach((name) => {
    let route = '/' + (name === 'index' ? '' : name);
    app.get(route, (_, res) => {
      res.send(pageCache[name]);
    });
  });

  app.listen(PORT, () => console.log(`dev server listening on port ${PORT}`));
};

/* @TODO: handle add/remove */
const initialiseWatchers = () => {
  chokidar.watch(GLOB_COMPONENTS).on('change', onComponentChange);
  chokidar
    .watch(GLOB_PAGES)
    .on('change', (path) =>
      fs.promises
        .readFile(path, 'utf8')
        .then((content) => updatePage(basename(path), content))
    );
};

const ensureOutputDir = (dir = OUTPUT_DIR) =>
  fs.promises.stat(dir).catch(() => fs.promises.mkdir(dir));

/* @TODO: logging */
const dev = () =>
  initialiseComponents()
    .then(initialisePages)
    .then(initialiseServer)
    .then(initialiseWatchers);

/* @TODO: logging */
const build = () =>
  ensureOutputDir()
    .then(initialiseComponents)
    .then(initialisePages)
    .then((pages) =>
      Promise.all(pages.map(([name, html]) => savePage(name, html)))
    );

const [cmd] = process.argv.slice(2);

switch (cmd) {
  case 'dev':
    dev();
    break;
  case 'build':
    build();
    break;
  default:
    console.error(
      `mosaic command expects either "dev" or "build" as the first and only argument`
    );
}

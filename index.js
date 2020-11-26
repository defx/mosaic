import chokidar from 'chokidar';
import express from 'express';
import fs from 'fs';
import path from 'path';

import loadFiles from './loadFiles.js';
import customElementTagNames from './customElementTagNames.js';

const basename = (v) => path.basename(v, path.extname(v));
const IDENTITY = (v) => v;
const COMPONENTS_PLACEHOLDER = '<!-- {{ COMPONENT DEFS }} -->';
const registry = {};
const app = express();
const PORT = process.env.PORT || 5000;
const staticPath = './static';

const pageCache = {};
const pageTemplates = {};
const pageToComponentsMap = {};

app.use(express.static(staticPath));

let config = {
  transformPageHTML: IDENTITY,
};

const configure = () =>
  import('./x-static.config.js')
    .then((v) => {
      config = v.default;
    })
    .catch(() => {});

const updateRegistry = (name, content) => {
  registry[name] = content;
};

const initialiseComponents = () =>
  loadFiles('./components/*.html').then((components) => {
    components.map(([name, content]) => updateRegistry(name, content));
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
  let names = customElementTagNames(html);
  pageToComponentsMap[name] = names;
  let filter = (name) => names.includes(name);
  let v = html.replace(COMPONENTS_PLACEHOLDER, componentDefs(filter));
  pageCache[name] = config.transformPageHTML(v);
  return fs.promises.writeFile(`./dist/${name}.html`, v);
};

const updatePage = (name, content) => {
  pageTemplates[name] = content;
  buildPage(name);
};

const initialisePages = () =>
  loadFiles('./pages/*.html').then((pages) => {
    pages.map(([name, content]) => updatePage(name, content));
  });

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
};

const onComponentChange = (path) => {
  let name = basename(path);
  fs.promises.readFile(path, 'utf8').then((content) => {
    updateRegistry(name, content);
    pagesThatIncludeComponent(name).map(buildPage);
  });
};

/*
  bonus: inject websocket script into pages so that we can live reload 
*/
const initialiseServer = () => {
  Object.keys(pageCache).forEach((name) => {
    let route = '/' + (name === 'index' ? '' : name);
    app.get(route, (_, res) => {
      res.send(pageCache[name]);
    });
  });

  app.listen(PORT, () => console.log(`dev server listening on port ${PORT}`));
};

const watch = () => {
  chokidar.watch('./components/*.html').on('change', onComponentChange);
};

const initialise = () =>
  configure()
    .then(initialiseComponents)
    .then(initialisePages)
    .then(initialiseServer)
    .then(watch);

ensureDir('./dist');
initialise();

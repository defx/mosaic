import chokidar from 'chokidar';
import deepmerge from 'deepmerge';
import express from 'express';
import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

const basename = (v) => path.basename(v, path.extname(v));
const IDENTITY = (v) => v;

let config = {};

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

const initialise = () =>
  Promise.all([
    initialiseTemplates(config),
    ...config.fragments.map(initialiseFragments),
  ]);

const pageCache = {};

const compile = () => {
  let templates = config.cache;
  let fragmentConfigs = config.fragments;

  Object.values(templates).map((template) => {
    let { filename, content } = template;
    let tpl = fragmentConfigs.reduce((tpl, fc) => {
      let { map = IDENTITY, filter = IDENTITY, reduce = IDENTITY, cache } = fc;
      let fragments = filter(Object.values(cache), template).map(map);
      return reduce(tpl, fragments);
    }, content);

    pageCache[basename(filename)] = {
      ...template,
      content: tpl,
    };
  });
};

const serve = () => {
  const app = express();

  if (config.staticDir) {
    app.use(express.static(staticDir));
  }

  app.get('/health', (req, res) => res.send('ok'));

  app.use(function (req, res, next) {
    let name = req.originalUrl.split('?')[0];
    name = name === '/' ? 'index' : name.slice(1);

    let entry = pageCache[name];

    if (entry) {
      res.send(entry.content);
    } else {
      next();
    }
  });

  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`dev server listening on port ${config.port}`);
      resolve();
    });

    // chokidar
    //   .watch([config.templates, ...config.fragments.map(({ input }) => input)])
    //   .on('change', compile)
    //   .on('add', compile)
    //   .on('unlink', compile);
  });
};

const ensureDir = (filepath, dir = path.dirname(filepath)) =>
  fs.promises.stat(dir).catch(() => fs.promises.mkdir(dir));

const save = () => {
  let dir = config.output.dir;

  //@TODO: clean?

  return ensureDir(dir).then(() =>
    Object.values(pageCache).map(({ filename, content }) => {
      let f = config.output.filename || filename;

      if (typeof f === 'function') {
        f = f(filename);
      }

      let filepath = path.join(dir, path.basename(f));

      return fs.promises.writeFile(filepath, content);
    })
  );
};

function mosaic(c) {
  config = c;
  return initialise()
    .then(compile)
    .then(() => {
      if (c.port) {
        return serve(); //@TODO if(c.watch)
      } else if (c.output) return save();
    });
}

export default mosaic;

import chokidar from 'chokidar';
import express from 'express';
import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

const mosaic = (config) => {
  let app, routes;

  if (config.port) {
    app = new express();
    app.use(express.static('./'));
    app.use(function (req, res, next) {
      let k = req.originalUrl.split('?')[0];
      if (k in routes) {
        res.send(routes[k]);
      } else {
        next();
      }
    });
    app.listen(config.port, () =>
      console.log(`app listening on port ${config.port}`)
    );
  }

  const cache = {
    /*
        [mdContent]: [{ filepath, content }, { filepath, content }],
        [template]: [{ filepath, content }]
      */
  };

  /*
      transform cache into object expected by config...

      - remove cache keys so that input name maps to array of objects
      - if the input path wasn't a glob, then flatten

      */
  const getCacheValues = () =>
    Object.keys(cache).reduce((a, k) => {
      let isGlob = config.input[k].includes('*');
      let values = Object.values(cache[k]);
      a[k] = isGlob ? values : values[0];
      return a;
    }, {});

  const update = () => {
    let values = getCacheValues();

    let output = config.output.reduce(
      (output, fn) => fn(output),
      values
    );
    if (config.port) {
      //@TODO: serve
      routes = output.routes;
      return Promise.resolve();
    } else {
      //save

      //@TODO ensure directories exist

      return Promise.all(
        output.map(({ filepath, content }) =>
          fs.promises.writeFile(filepath, content)
        )
      );
    }
  };

  const updateCache = (key, filepath) =>
    fs.promises
      .readFile(filepath, 'utf8')
      .then((content) => {
        cache[key][filepath] = { content, filepath };
      });

  const populateCache = () =>
    Promise.all(
      Object.entries(config.input).map(
        ([type, globPath]) => {
          cache[type] = {};
          return glob(globPath).then((paths) =>
            Promise.all(
              paths.map((filepath) =>
                updateCache(type, filepath)
              )
            )
          );
        }
      )
    );

  return populateCache().then(update);
  //   .then(() => {
  //     if (config.watch) {
  //       //@TODO: chokidar to watch -> update
  //     }
  //   });
};

export default mosaic;

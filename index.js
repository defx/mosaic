import chokidar from 'chokidar';
import express from 'express';
import fs from 'fs-extra';
import glob from 'glob-promise';
import path from 'path';
import debounce from 'lodash.debounce';

const mosaic = (config) => {
  let app, routes;

  if (config.serve) {
    let { port = 3000, staticPath = './' } = config.serve;
    app = new express();
    app.use(express.static(staticPath));
    app.use(function (req, res, next) {
      let k = req.originalUrl.split('?')[0];
      if (k in routes) {
        res.send(routes[k]);
      } else {
        next();
      }
    });
    app.listen(port, () =>
      console.log(`app listening on port ${port}`)
    );
  }

  const cache = {
    /*
        [mdContent]: [{ filepath, content }, { filepath, content }],
        [template]: [{ filepath, content }]
      */
  };

  const getCacheValues = () =>
    Object.keys(cache).reduce((a, k) => {
      let isGlob = config.input[k].includes('*');
      let values = Object.values(cache[k]);
      a[k] = isGlob ? values : values[0];
      return a;
    }, {});

  const update = () => {
    let values = getCacheValues();
    let { transform = [] } = config;

    let transformResult = transform.reduce(
      (output, fn) => fn(output),
      values
    );

    if (config.serve) {
      let { mapRoutes = () => ({}) } = config.serve;
      routes = mapRoutes(transformResult);
      return Promise.resolve();
    }

    if (config.output) {
      let { map = (v = v) } = config.output;
      let output = map(transformResult);

      return Promise.all(
        output.map(({ filepath, content }) => {
          return fs
            .ensureDir(path.dirname(filepath))
            .then(() =>
              fs.promises.writeFile(filepath, content)
            );
        })
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
        ([key, globPath]) => {
          cache[key] = {};
          return glob(globPath).then((paths) =>
            Promise.all(
              paths.map((f) => updateCache(key, f))
            )
          );
        }
      )
    );

  const scheduleUpdate = debounce(update);

  /*
  
  @TODO: hot reload 
  
  */

  return populateCache()
    .then(update)
    .then(() => {
      if (config.watch) {
        Object.entries(config.input).forEach(
          ([key, glob]) => {
            chokidar
              .watch(glob)
              .on('change', (filepath) => {
                console.log('change', filepath);
                updateCache(key, filepath);
                scheduleUpdate();
              });
          }
        );
        //@TODO: on('unlink').on('add')
      }
    });
};

export default mosaic;

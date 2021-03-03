import chokidar from 'chokidar';
import express from 'express';
import fs from 'fs-extra';
import glob from 'glob-promise';
import path from 'path';
import debounce from 'lodash.debounce';
import WebSocket from 'ws';

function injectHotReloadScript(v, port) {
  return typeof v === 'string'
    ? v.replace(
        '</body>',
        `
  <script>new WebSocket("ws://localhost:80").addEventListener("message", event => {
    if (event.data === "reload") window.location.reload();
  })</script>
  `
      )
    : v;
}

const mosaic = (config) => {
  let app, routes, socket;

  const hotReload = config.serve && config.watch;

  if (hotReload) {
    const wss = new WebSocket.Server({ port: 80 });
    wss.on('connection', (s) => {
      socket = s;
    });
  }

  if (config.serve) {
    let { port = 3000, staticPath = './' } = config.serve;
    app = new express();
    app.use(express.static(staticPath));
    app.use(function (req, res, next) {
      let k = req.originalUrl.split('?')[0];
      if (k in routes) {
        let payload = routes[k];

        if (hotReload) {
          payload = injectHotReloadScript(payload);
        }

        res.send(payload);
      } else {
        next();
      }
    });
    app.listen(port, () => console.log(`Express server listening on port ${port}`));
  }

  const cache = {};

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

    let transformResult = transform.reduce((output, fn) => fn(output), values);

    if (config.serve) {
      let { mapRoutes = () => ({}) } = config.serve;
      routes = mapRoutes(transformResult);
      if (hotReload && socket) socket.send('reload');
    }

    if (config.output) {
      let { map = (v = v) } = config.output;
      let output = map(transformResult);

      return Promise.all(
        output.map(({ filepath, content }) => {
          return fs
            .ensureDir(path.dirname(filepath))
            .then(() => fs.promises.writeFile(filepath, content));
        })
      );
    } else {
      return Promise.resolve();
    }
  };

  const updateCache = (key, filepath) =>
    fs.promises.readFile(filepath, 'utf8').then((content) => {
      cache[key][filepath] = { content, filepath };
    });

  const populateCache = () =>
    Promise.all(
      Object.entries(config.input).map(([key, globPath]) => {
        cache[key] = {};
        return glob(globPath).then((paths) => Promise.all(paths.map((f) => updateCache(key, f))));
      })
    );

  const scheduleUpdate = debounce(update);

  return populateCache()
    .then(update)
    .then(() => {
      if (config.watch) {
        Object.entries(config.input).forEach(([key, glob]) => {
          chokidar.watch(glob).on('change', (filepath) => {
            updateCache(key, filepath).then(scheduleUpdate);
          });
        });
        //@todo: handle unlink, add
      }
    });
};

export default mosaic;

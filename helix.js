import chokidar from "chokidar"
import fs from "fs-extra"
import glob from "glob-promise"
import path from "path"
import { WebSocketServer } from "ws"

export const helix = (config) => {
  const cache = {}

  const xupdateCache = (key, filepath) =>
    fs.promises.readFile(filepath, "utf8").then((content) => {
      let { transform = {} } = config
      ;(transform[key] || [])
        .reduce((p, f) => p.then(f), Promise.resolve({ content, filepath }))
        .then((v) => {
          cache[key][filepath] = v
          transform.afterEach?.(v, cache)
        })
    })

  const updateCache = (key, filepath) => {
    let { transform = {} } = config

    return fs.promises.readFile(filepath, "utf8").then((content) => {
      ;(transform[key] || [])
        .reduce((p, f) => p.then(f), Promise.resolve({ content, filepath }))
        .then((v) => {
          cache[key][filepath] = v
          transform.afterEach?.(v, cache)
        })
    })
  }

  const populateCache = () =>
    Promise.all(
      Object.entries(config.input).map(([key, globPath]) => {
        cache[key] = {}
        return glob(globPath).then((paths) =>
          Promise.all(paths.map((f) => updateCache(key, path.normalize(f))))
        )
      })
    )

  /*
    
    
    const wss = new WebSocketServer({ port })
  wss.on("connection", (socket) => {
    chokidar.watch(files).on("change", () => {
      socket.send("reload")
    })
    //@todo: handle unlink, add
  })
    
    */

  return populateCache().then(() => {
    if (config.watch) {
      const wss = new WebSocketServer({ port: 80 })

      wss.on("connection", (socket) => {
        Object.entries(config.input).forEach(([key, glob]) => {
          chokidar
            .watch(glob)
            .on("change", (filepath) => {
              updateCache(key, filepath).then(() => socket.send("reload"))
            })
            .on("add", (filepath) => {
              // updateCache(key, filepath).then(() => socket.send("reload"))
            })
        })

        // chokidar.watch(files).on("change", () => {
        //   socket.send("reload")
        // })
        //@todo: handle unlink, add
      })
    }
    return cache
  })
}

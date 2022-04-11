import chokidar from "chokidar"
import fs from "fs-extra"
import glob from "glob-promise"
import path from "path"

export const helix = (config) => {
  const cache = {}

  const updateCache = (key, filepath) =>
    fs.promises.readFile(filepath, "utf8").then((content) => {
      let { transform = {} } = config
      ;(transform[key] || [])
        .reduce((p, f) => p.then(f), Promise.resolve({ content, filepath }))
        .then((v) => {
          cache[key][filepath] = v
          transform.afterEach?.(v, cache)
        })
    })

  const populateCache = () =>
    Promise.all(
      Object.entries(config.input).map(([key, globPath]) => {
        cache[key] = {}
        return glob(globPath).then((paths) =>
          Promise.all(paths.map((f) => updateCache(key, path.normalize(f))))
        )
      })
    )

  return populateCache().then(() => {
    if (config.watch) {
      Object.entries(config.input).forEach(([key, glob]) => {
        chokidar.watch(glob).on("change", (filepath) => {
          updateCache(key, filepath)
        })
      })
    }
    return cache
  })
}

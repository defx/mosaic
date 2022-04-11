#!/usr/bin/env node

import path from "path"
import { start } from "./server.js"

const [cmd] = process.argv.slice(2)

switch (cmd) {
  default: {
    import(path.resolve("./mosaic.config.js")).then(({ default: config }) =>
      start(config)
    )
    break
  }
}

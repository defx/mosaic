#!/usr/bin/env node

import { customElementIncludes } from "customelementincludes"
import fs from "fs-extra"
import express from "express"
import { globby } from "globby"
import hljs from "highlight.js"
import MarkdownIt from "markdown-it"

// import postcss from "postcss"
// import prefixer from "postcss-prefix-selector"
import { decapitate } from "./head.js"
import { document } from "./document.js"

let md = new MarkdownIt({
  html: true,
  highlight: function (str, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language, ignoreIllegals: true }).value +
          "</code></pre>"
        )
      } catch (__) {}
    }
    return (
      '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + "</code></pre>"
    )
  },
})

;(async () => {
  const app = express()
  const port = process.env.port || 3000

  app.use(express.static("public"))

  app.use("/components", express.static("components"))

  app.use(async function (req, res, next) {
    if (req.originalUrl.includes(".")) return next()

    const route = req.originalUrl.split("?")[0]

    const [filepath] = await globby([
      `./pages${route === "/" ? "/index" : route}.(md|html)`,
    ])

    if (!filepath) return next()

    const contents = await fs.readFile(filepath, "utf8")

    let html = ""

    if (contents.includes("<!DOCTYPE")) {
      html = contents
    } else {
      const result = decapitate(contents)
      const head = result.head
      const main =
        path.extname(filepath) === ".md" ? md.render(result.body) : result.body

      html = document({
        head,
        main,
      })
    }

    res.send(await customElementIncludes(html))
  })

  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
})()

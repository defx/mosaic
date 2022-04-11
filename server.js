import path from "path"
import express from "express"

import { helix } from "./helix.js"
import { prefixSelectors } from "./css.js"
import { tagName, customTags, resolveTagNames } from "./helpers.js"
import { matchRoute, getParams } from "./router.js"

export const start = async (config) => {
  let port = 3000
  let app = new express()

  let components = await helix({
    watch: true,
    input: {
      // synergyjs: "./node_modules/synergy/dist/synergy.js",
      html: "./components/**/index.html",
      css: "./components/**/index.css",
      js: "./components/**/index.js",
    },
    transform: {
      html: [
        (v) => {
          let { filepath, content } = v

          return {
            ...v,
            tags: customTags(content),
            tagName: tagName(filepath),
          }
        },
      ],
      css: [
        (v) => {
          let { filepath, content } = v
          return {
            ...v,
            content: prefixSelectors(tagName(filepath), content),
          }
        },
      ],
      js: [],
      synergyjs: [],
      afterEach: (v, cache) => {
        let { filepath } = v
        let k = tagName(filepath)
        let ext = path.extname(filepath).slice(1)
        cache[k] = cache[k] || {}
        cache[k][ext] = v
      },
    },
  })

  app.use("/components", express.static("components"))

  app.get("/components/:id/entry.js", (req, res, next) => {
    let name = req.params.id

    if (name in components) {
      let component = components[name]

      res.type(".js")
      res.send(`
        import factory from "./index.js";
        const template = \`${component.html.content}\`;
        export { factory, template }
      `)
    } else {
      next()
    }
  })

  app.use(async function (req, res, next) {
    let k = req.originalUrl.split("?")[0].replace(/^\/|\/$/g, "") || "/"

    let route = matchRoute(k, config.routes)

    if (!route) return next()

    // let params = getParams(k, route)

    let templates = Object.values(components.html)

    let tagName = route.component

    let pageTemplate = templates.find(
      ({ tagName }) => tagName === route.component
    )

    let tagNames = resolveTagNames(pageTemplate, templates)

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style></style>
    </head>
    <body>  
        <${route.component}></${route.component}>
        <script type="module">

          import { define } from "https://www.unpkg.com/mosaic@1.0.8/dist/mosaic.js"

          ${JSON.stringify(
            tagNames
          )}.forEach(name => import(\`/components/\${name}/entry.js\`).then(({ factory, template }) => define(name, factory, template)));
        </script>
    </body>
    </html>
    `

    res.send(html)
  })

  app.listen(port, () =>
    console.log(`Express server listening on port ${port}`)
  )

  return {
    config,
    components,
  }
}

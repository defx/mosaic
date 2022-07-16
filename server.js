import path from "path"
import express from "express"

import { helix } from "./helix.js"
import { prefixSelectors, resolveImports } from "./css.js"
import { tagName, customTags, resolveTagNames } from "./helpers.js"
import { matchRoute, getParams } from "./router.js"
// import { createProxyMiddleware } from "http-proxy-middleware"

export const start = async (config) => {
  let port = config.port || 3000
  let app = express()

  let components = await helix({
    watch: true,
    input: {
      synergyjs: "./node_modules/synergy/dist/synergy.js",
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
  app.use(express.static("public"))

  function expandPartials(html) {
    let tags = customTags(html)

    for (let tag of tags) {
      if (components[tag] && !components[tag].js && components[tag].html) {
        // this component has no js module so lets treat it as a partial...
        html = html.replaceAll(
          `</${tag}>`,
          `${expandPartials(components[tag].html.content)}</${tag}>`
        )
      }
    }
    return html
  }

  app.get("/components/:id/entry.js", (req, res, next) => {
    let name = req.params.id

    if (name in components) {
      let component = components[name]

      let tags = resolveTagNames(component.html, Object.values(components.html))

      res.type(".js")
      res.send(`
        import factory from "./index.js";
        const template = \`${expandPartials(component.html.content, tags)}\`;
        export { factory, template }
      `)
    } else {
      next()
    }
  })

  app.get("/synergy.js", (_, res) => {
    res.type(".js")
    res.send(
      components.synergyjs["node_modules/synergy/dist/synergy.js"].content
    )
  })

  app.use(async function (req, res, next) {
    let k = "/" + req.originalUrl.split("?")[0].replace(/^\/|\/$/g, "")

    let route = matchRoute(k, config.routes)

    if (!route) return next()

    let params = getParams(k, route)

    let templates = Object.values(components.html)

    let pageTemplate = templates.find(
      ({ tagName }) => tagName === route.component
    )

    let tagNames = resolveTagNames(pageTemplate, templates)

    if (config.wrapper) tagNames.unshift(config.wrapper)

    let cssComponents = tagNames.reduce((styles, t) => {
      let x = Object.values(components.css).find(
        ({ filepath }) => tagName(filepath) === t
      )
      if (x) styles.push(x)
      return styles
    }, [])

    let componentStyles = ""

    for (let { content, filepath } of cssComponents) {
      let css = await resolveImports(content, filepath)
      componentStyles += css
    }

    let componentHTML = `<${route.component}${params}></${route.component}>`

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${componentStyles}</style>
    </head>
    <body>
    
        ${componentHTML}
        <script type="module">

          import { define } from "/synergy.js";

          ${JSON.stringify(
            tagNames.filter((name) => components[name].js)
          )}.forEach(name => import(\`/components/\${name}/entry.js\`).then(({ factory, template }) => define(name, factory, template)));
        </script>
        <script>
          new WebSocket("ws://localhost:80").addEventListener(
            "message",
            (event) => {
              if (event.data === "reload") window.location.reload()
            }
          )
        </script>
    </body>
    </html>
    `

    res.send(html)
  })

  app.use("/node_modules", express.static("node_modules"))

  // app.use(
  //   "/api",
  //   createProxyMiddleware({
  //     target: {
  //       host: "localhost",
  //       port: 4000,
  //     },
  //     secure: false,
  //     pathRewrite: {
  //       [`^/api`]: "",
  //     },
  //   })
  // )

  app.listen(port, () =>
    console.log(`Express server listening on port ${port}`)
  )

  return {
    config,
    components,
  }
}

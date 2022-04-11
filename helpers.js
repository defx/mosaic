import fs from "fs-extra"
import path from "path"

export async function write({ filepath, content }) {
  return fs
    .ensureDir(path.dirname(filepath))
    .then(() => fs.promises.writeFile(filepath, content))
}

export const tagName = (filepath) => {
  return path.dirname(filepath).split(path.sep).pop()
}

const ANON = /<([a-z]\w*-\w*)/gm

export function customTags(html = "") {
  return (html.match(ANON) || []).map((v) => v.slice(1))
}

export function resolveTagNames(
  component,
  components,
  o = { [component.tagName]: true },
  f = true
) {
  for (let k of component.tags) {
    let c = components.find(({ tagName }) => tagName === k)
    if (c && !(k in o)) {
      o[k] = true
      o = resolveTagNames(c, components, o, false)
    }
  }
  return f ? Object.keys(o) : o
}

export function groupBy(key, arr) {
  return arr.reduce((a, v) => {
    let k = v[key]
    a[k] = a[k] || []
    a[k].push(v)
    return a
  }, {})
}

export function withTemplate({ filepath, content }) {
  return `
    <template id="${tagName(filepath)}">
  ${content}
  </template>
`
}

export const splice = (str, START_MARKER, END_MARKER) => {
  let start = str.indexOf(START_MARKER)

  if (start === -1) return str

  let end = str.indexOf(END_MARKER, start)

  if (end === -1) return str

  return splice(
    str.slice(0, start) + str.slice(end + END_MARKER.length),
    START_MARKER,
    END_MARKER
  )
}

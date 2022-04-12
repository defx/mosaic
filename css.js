import path from "path"

import postcss from "postcss"
import atImport from "postcss-import"

export function resolveImports(css, filepath) {
  return postcss()
    .use(atImport())
    .process(css, {
      from: filepath,
    })
    .then(({ css }) => css)
}

function nextWord(css, count) {
  return css.slice(count - 1).split(/[\s+|\n+|,]/)[0]
}

export function prefixSelectors(prefix, css) {
  let insideBlock = false
  let look = true
  let output = ""
  let count = 0

  for (let char of css) {
    if (char === "}") {
      insideBlock = false
      look = true
    } else if (char === ",") {
      look = true
    } else if (char === "{") {
      insideBlock = true
    } else if (look && !insideBlock && !char.match(/\s/)) {
      let w = nextWord(css, count + 1)

      if (
        w !== prefix &&
        w.charAt(0) !== "@" &&
        w.charAt(0) !== ":" &&
        w !== "*" &&
        w !== "html" &&
        w !== "body"
      ) {
        output += prefix + " "
      }
      look = false
    }
    output += char
    count += 1
  }

  return output
}

function tagName(v) {
  return path.dirname(v.filepath).split(path.sep).pop()
}

export function scopeComponentCSSWithElementSelectors(v) {
  return {
    ...v,
    componentCSS: v.componentCSS.map((v) => {
      return {
        ...v,
        content: prefixSelectors(tagName(v), v.content),
      }
    }),
  }
}

import { isPrimitive } from "./helpers.js"

const pascalToKebab = (string) =>
  string.replace(/[\w]([A-Z])/g, function (m) {
    return m[0] + "-" + m[1].toLowerCase()
  })

const kebabToPascal = (string) =>
  string.replace(/[\w]-([\w])/g, function (m) {
    return m[0] + m[2].toUpperCase()
  })

export const objectToClasses = (v = {}) => {
  return Object.entries(v)
    .reduce((c, [k, v]) => {
      if (v) c.push(k)
      return c
    }, [])
    .join(" ")
}

export const objectFromClasses = (v = "") => {
  return v
    .split(/\s+/)
    .filter((v) => v)
    .reduce((o, k) => {
      o[k] = true
      return o
    }, {})
}

export const write = (node, attrs) => {
  for (let [k, v] of Object.entries(attrs || {})) {
    k = pascalToKebab(k)

    if (k === "textContent" && node.textContent !== textContent) {
      node.textContent = textContent
      continue
    }

    if (k === "class") {
      v = objectToClasses(v)
    }

    if (typeof v === "boolean") {
      if (k.startsWith("aria-")) {
        v = "" + v
      } else if (v) {
        v = ""
      }
    }

    if (isPrimitive(v) === false) {
      node[kebabToPascal(k)] = v
      continue
    }

    let current = node.getAttribute(k)

    if (v === current) continue

    if (typeof v === "string" || typeof v === "number") {
      node.setAttribute(k, v)
    } else {
      node.removeAttribute(k)
    }
  }
  return node
}

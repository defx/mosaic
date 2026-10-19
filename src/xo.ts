import { isPrimitive } from "./helpers.js"
import type { Attributes } from "./types.js"

const pascalToKebab = (string: string) =>
  string.replace(/[\w]([A-Z])/g, function (m) {
    return m[0] + "-" + m[1].toLowerCase()
  })

const kebabToPascal = (string: string) =>
  string.replace(/[\w]-([\w])/g, function (m) {
    return m[0] + m[2].toUpperCase()
  })

export const objectToClasses = (v: Record<string, unknown> = {}) => {
  return Object.entries(v)
    .reduce<string[]>((c, [k, v]) => {
      if (v) c.push(k)
      return c
    }, [])
    .join(" ")
}

export const objectFromClasses = (v = "") => {
  return v
    .split(/\s+/)
    .filter((v) => v)
    .reduce<Record<string, boolean>>((o, k) => {
      o[k] = true
      return o
    }, {})
}

export const write = (node: Element, attrs: Attributes | null | undefined) => {
  for (let [k, v] of Object.entries(attrs || {})) {
    k = pascalToKebab(k)

    if (k === "class") {
      v = objectToClasses(v as Record<string, unknown>)
    }

    if (typeof v === "boolean") {
      if (k.startsWith("aria-")) {
        v = "" + v
      } else if (v) {
        v = ""
      }
    }

    if (isPrimitive(v) === false) {
      ;(node as unknown as Record<string, unknown>)[kebabToPascal(k)] = v
      continue
    }

    let current = node.getAttribute(k)

    if (v === current) continue

    if (typeof v === "string" || typeof v === "number") {
      node.setAttribute(k, String(v))
    } else {
      node.removeAttribute(k)
    }
  }
  return node
}

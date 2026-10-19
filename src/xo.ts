import type { Attributes, Classes, TextValue } from "./types.js"

export function write(node: Element, attributes: Attributes | null | undefined) {
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (value === false || value == null) {
      if (node.hasAttribute(name)) node.removeAttribute(name)
    } else {
      const text = value === true ? "" : String(value)
      if (node.getAttribute(name) !== text) node.setAttribute(name, text)
    }
  }
}

export function writeText(node: Element, value: TextValue) {
  const text = value == null ? "" : String(value)
  if (node.textContent !== text) node.textContent = text
}

export function writeClasses(node: Element, classes: Classes | null | undefined) {
  for (const [name, enabled] of Object.entries(classes ?? {})) {
    node.classList.toggle(name, enabled)
  }
}

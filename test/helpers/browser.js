export const html = (strings, ...values) =>
  strings.reduce((result, string, i) => result + string + (values[i] ?? ""), "")

export const nextFrame = () => new Promise(requestAnimationFrame)

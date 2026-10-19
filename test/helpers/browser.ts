export const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((result, string, i) => result + string + (values[i] ?? ""), "")

export const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))

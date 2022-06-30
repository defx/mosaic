export function matchRoute(pathname, routes) {
  let a = pathname.split("/")
  for (let route of routes) {
    let b = (route.match || "").split("/")
    if (b.length !== a.length) continue
    if (b.every((x, i) => x.charAt(0) === ":" || x === a[i])) {
      return route
    }
  }
}

export function getParamsAsObject(pathname, route) {
  let a = pathname.split("/")
  let b = route.match.split("/")
  return b.reduce((o, k, i) => {
    if (k.charAt(0) === ":") {
      o[k.slice(1)] = a[i]
    }
    return o
  }, {})
}

export function getParams(pathname, route) {
  let a = pathname.split("/")
  let b = route.match.split("/")
  let result = ""
  b.forEach((k, i) => {
    if (k.charAt(0) === ":") {
      result += ` ${k.slice(1)}="${a[i]}"`
    }
  })
  return result
}

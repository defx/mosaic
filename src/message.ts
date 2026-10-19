export const Message = <Args extends unknown[]>(callbacks: {
  postPublish?: () => void
}) => {
  const subscribers: ((...args: Args) => void)[] = []
  return {
    subscribe(fn: (...args: Args) => void) {
      subscribers.push(fn)
    },
    publish(...args: Args) {
      subscribers.forEach((fn) => fn(...args))
      callbacks.postPublish?.()
    },
  }
}

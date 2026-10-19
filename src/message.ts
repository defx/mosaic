export const Message = <Args extends unknown[]>() => {
  const subscribers = new Set<{ callback: (...args: Args) => void }>()
  return {
    subscribe(callback: (...args: Args) => void): () => void {
      const subscription = { callback }
      subscribers.add(subscription)
      return () => { subscribers.delete(subscription) }
    },
    publish(...args: Args): unknown[] {
      const errors: unknown[] = []
      // New subscriptions start with the next publication; removals take effect immediately.
      for (const subscription of [...subscribers]) {
        if (!subscribers.has(subscription)) continue
        try {
          subscription.callback(...args)
        } catch (error) {
          errors.push(error)
        }
      }
      return errors
    },
  }
}

export function waitFor<T>(p: Promise<{wait: () => Promise<T>}>): Promise<T> {
  return p.then((t) => t.wait());
}

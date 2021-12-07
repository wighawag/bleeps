export function waitFor<T>(p: Promise<{wait: () => Promise<T>}>): Promise<T> {
  return p.then((t) => t.wait());
}

export function pause(numSeconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 1000 * numSeconds);
  });
}

export function wait<T>(numSeconds: number, v: T): Promise<T> {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), numSeconds * 1000);
  });
}

export function time2text(numSeconds: number): string {
  if (numSeconds < 120) {
    return `${numSeconds} seconds`;
  } else if (numSeconds < 7200) {
    return `${Math.floor(numSeconds / 60)} minutes and ${numSeconds % 60} seconds`;
  } else {
    return `${Math.floor(numSeconds / 60 / 60)} hours`;
  }
}

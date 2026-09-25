export function encode(value) {
  return JSON.stringify(value);
}

export function decode(value) {
  if (typeof value !== "string") {
    throw new TypeError("JSON message must be a string");
  }

  return JSON.parse(value);
}

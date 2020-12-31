import uuid from "uuid-by-string";

export function generateKey(input: string): string {
  return uuid(input);
}

export function toFixedLengthChunks(str: string, size: number) {
  let i = 0;
  let line = "";
  const lines = [];

  do {
    line = str.substr(i, size);
    if (line) {
      lines.push(line);
    }
    i += size;
  } while (line !== "");

  return lines;
}

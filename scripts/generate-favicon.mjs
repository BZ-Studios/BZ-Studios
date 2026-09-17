import { readFileSync, writeFileSync } from 'node:fs';

// Package the existing brand PNG in an ICO container without changing its pixels.
const png = readFileSync(new URL('../public/favicon.png', import.meta.url));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== height || width > 256 || width < 1) {
  throw new Error('The favicon must be square and no larger than 256 pixels.');
}

const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // ICO image type.
header.writeUInt16LE(1, 4); // One image.
header.writeUInt8(width === 256 ? 0 : width, 6);
header.writeUInt8(height === 256 ? 0 : height, 7);
header.writeUInt16LE(1, 10); // Color planes.
header.writeUInt16LE(32, 12); // RGBA bit depth.
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(header.length, 18);
writeFileSync(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, png]));

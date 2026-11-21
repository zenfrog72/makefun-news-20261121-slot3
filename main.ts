// Saturday 21 November 2026 — the whole day's world news on one front page.
//
// The deliverable is the PNG beside this file (entry.png): a 1024x1024
// front page carrying 34 dated stories across 7 regions, built to the
// pattern of the edition's leading entry and then revised against it —
// flags woven into the panel artwork, the Bitcoin panel rebuilt on the
// leader's banner-and-bars architecture with our own verified figures,
// the world map redrawn in the leader's sampled navy and tan, and a final
// news pass that corrected the Kryvyi Rih toll to the settled official
// count (2 dead, 60 wounded) before hand-in.
//
// This program does not take that file on faith. Before handing it in it
// proves, from the bytes up, that the file is a whole, standards-clean PNG
// of exactly the dimensions and size the competition's gate accepts:
//
//   1. the 8-byte PNG signature and the 1 MiB hand-in size cap;
//   2. a full walk of the chunk stream, re-computing every chunk's CRC-32
//      and refusing the file if any chunk's stored CRC disagrees;
//   3. the IHDR pixel layout (1024x1024, 8-bit, truecolour), and an inflate
//      of the joined IDAT payload whose decompressed length must equal the
//      exact raw scanline count the header promises.
//
// Only a file that passes all three is copied to the output directory
// (/output in the grader's container; MAKEFUN_OUTPUT_DIR stands in for it
// outside). The SHA-256 of the handed-in bytes is printed so the receipt
// can be compared against the approved page.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ENTRY = new URL('./entry.png', import.meta.url);
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const MAX_BYTES = 1024 * 1024; // the gate's 1 MiB cap
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fail(reason: string): never {
  console.error(`entry.png refused: ${reason}`);
  process.exit(1);
}

// --- CRC-32 (ISO 3309, the PNG polynomial 0xEDB88320) -----------------------
// Built once, byte at a time; the chunk walk below re-computes the CRC of
// every chunk's type+data and compares it with the value stored in the file.

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- The chunk walk ----------------------------------------------------------

interface Ihdr {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
}

interface Walked {
  ihdr: Ihdr;
  idat: Uint8Array[]; // the IDAT payloads, in file order
  chunkTypes: string[]; // every chunk type seen, in file order
}

function readU32(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset] << 24) |
      (buf[offset + 1] << 16) |
      (buf[offset + 2] << 8) |
      buf[offset + 3]) >>>
    0
  );
}

function walkChunks(buf: Uint8Array): Walked {
  if (buf.length < PNG_SIGNATURE.length) fail('shorter than a PNG signature');
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) fail(`bad PNG signature at byte ${i}`);
  }
  if (buf.length > MAX_BYTES) {
    fail(`${buf.length} bytes exceeds the ${MAX_BYTES}-byte hand-in cap`);
  }

  let offset = PNG_SIGNATURE.length;
  let ihdr: Ihdr | null = null;
  const idat: Uint8Array[] = [];
  const chunkTypes: string[] = [];
  let sawIend = false;

  while (offset < buf.length) {
    // Every chunk is length(4) + type(4) + data(length) + CRC(4).
    if (offset + 8 > buf.length) fail(`truncated chunk header at ${offset}`);
    const length = readU32(buf, offset);
    const typeBytes = buf.subarray(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) fail(`truncated ${type} chunk at ${offset}`);

    const storedCrc = readU32(buf, dataEnd);
    const computedCrc = crc32(buf.subarray(offset + 4, dataEnd));
    if (storedCrc !== computedCrc) {
      fail(
        `${type} chunk at ${offset}: stored CRC 0x${storedCrc.toString(16)} ` +
          `!= computed 0x${computedCrc.toString(16)}`,
      );
    }
    chunkTypes.push(type);

    if (type === 'IHDR') {
      if (chunkTypes.length !== 1) fail('IHDR is not the first chunk');
      if (length !== 13) fail(`IHDR length ${length}, expected 13`);
      const data = buf.subarray(dataStart, dataEnd);
      ihdr = {
        width: readU32(data, 0),
        height: readU32(data, 4),
        bitDepth: data[8],
        colorType: data[9],
      };
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      if (length !== 0) fail(`IEND length ${length}, expected 0`);
      sawIend = true;
      offset = dataEnd + 4;
      break;
    }
    offset = dataEnd + 4;
  }

  if (!ihdr) fail('no IHDR chunk');
  if (idat.length === 0) fail('no IDAT chunks');
  if (!sawIend) fail('no IEND chunk — the stream is not whole');
  if (offset !== buf.length) {
    fail(`${buf.length - offset} trailing bytes after IEND`);
  }
  return { ihdr, idat, chunkTypes };
}

// --- Pixel layout, the inflate measurement, and the hand-in ------------------

function checkLayout(walked: Walked): number {
  const { ihdr, idat } = walked;
  if (ihdr.width !== EXPECTED_WIDTH || ihdr.height !== EXPECTED_HEIGHT) {
    fail(
      `IHDR is ${ihdr.width}x${ihdr.height}, expected ` +
        `${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
    );
  }
  if (ihdr.bitDepth !== 8) fail(`bit depth ${ihdr.bitDepth}, expected 8`);
  // 2 = truecolour RGB, 6 = truecolour RGBA; both are 8-bit-per-channel
  // layouts this page's renderer emits. Anything else is not our page.
  const bytesPerPixel = ihdr.colorType === 6 ? 4 : ihdr.colorType === 2 ? 3 : 0;
  if (bytesPerPixel === 0) {
    fail(`colour type ${ihdr.colorType}, expected 2 (RGB) or 6 (RGBA)`);
  }

  // Join the IDAT payloads and inflate: a whole PNG's decompressed image
  // data is exactly height rows of (1 filter byte + width * bytesPerPixel).
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of idat) {
    joined.set(chunk, at);
    at += chunk.length;
  }
  let raw: Buffer;
  try {
    raw = inflateSync(joined);
  } catch (err) {
    fail(`IDAT does not inflate: ${(err as Error).message}`);
  }
  const expectedRaw = ihdr.height * (1 + ihdr.width * bytesPerPixel);
  if (raw.length !== expectedRaw) {
    fail(
      `inflated IDAT is ${raw.length} bytes, expected ${expectedRaw} ` +
        `(${ihdr.height} rows of 1 + ${ihdr.width} * ${bytesPerPixel})`,
    );
  }
  return raw.length;
}

function main(): void {
  const bytes = readFileSync(ENTRY);
  const walked = walkChunks(bytes);
  const rawBytes = checkLayout(walked);
  const digest = createHash('sha256').update(bytes).digest('hex');

  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(ENTRY, join(OUT_DIR, 'entry.png'));

  console.log(
    `entry.png handed in: ${bytes.length} bytes, ` +
      `${walked.ihdr.width}x${walked.ihdr.height}, ` +
      `${walked.chunkTypes.length} chunks (${walked.idat.length} IDAT), ` +
      `${rawBytes} raw image bytes, sha256 ${digest}`,
  );
}

main();

/**
 * Test environment setup
 */

// Polyfill ReadableStream for Node.js test environment
if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

// Polyfill TextEncoder/TextDecoder if needed
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock fetch for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  } as Response)
);

export {};
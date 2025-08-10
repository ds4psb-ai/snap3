import '@testing-library/jest-dom'

// Add Web Streams API polyfill for streaming tests
if (!globalThis.ReadableStream) {
  try {
    const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
    globalThis.WritableStream = WritableStream;
    globalThis.TransformStream = TransformStream;
  } catch (error) {
    try {
      require('web-streams-polyfill');
    } catch (error) {
      console.warn('Web Streams polyfill not available, using mock...');
      // Basic mock for tests
      globalThis.ReadableStream = class ReadableStream {
        constructor(underlyingSource) {
          this._controller = null;
          this._reader = null;
          if (underlyingSource?.start) {
            const controller = {
              enqueue: (chunk) => {
                if (this._reader) {
                  this._reader._chunks.push(chunk);
                }
              },
              close: () => {
                if (this._reader) {
                  this._reader._closed = true;
                }
              }
            };
            this._controller = controller;
            underlyingSource.start(controller);
          }
        }
        getReader() {
          this._reader = {
            _chunks: [],
            _closed: false,
            read: async function() {
              if (this._chunks.length > 0) {
                return { value: this._chunks.shift(), done: false };
              }
              if (this._closed) {
                return { done: true };
              }
              // Wait for more chunks
              return new Promise(resolve => {
                setTimeout(() => resolve({ done: true }), 0);
              });
            }
          };
          return this._reader;
        }
      };
    }
  }
}

// Add TextEncoder/TextDecoder polyfill for streaming tests
if (!globalThis.TextEncoder || !globalThis.TextDecoder) {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill for Response and Headers in Node environment
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new Headers(init.headers);
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }
  };
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = {};
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = value;
        });
      }
    }

    get(name) {
      return this._headers[name.toLowerCase()] || null;
    }

    set(name, value) {
      this._headers[name.toLowerCase()] = value;
    }

    has(name) {
      return name.toLowerCase() in this._headers;
    }

    delete(name) {
      delete this._headers[name.toLowerCase()];
    }

    forEach(callback) {
      Object.entries(this._headers).forEach(([key, value]) => {
        callback(value, key, this);
      });
    }
    
    append(name, value) {
      const existing = this._headers[name.toLowerCase()];
      if (existing) {
        this._headers[name.toLowerCase()] = existing + ', ' + value;
      } else {
        this._headers[name.toLowerCase()] = value;
      }
    }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this._url = url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
    }

    get url() {
      return this._url;
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }
  };
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_GA_ID = 'G-TEST123'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'

// Mock Next.js server components
jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    constructor(body, init = {}) {
      super(body, init);
      
      // Add headers.set method that returns this
      const originalSet = this.headers.set.bind(this.headers);
      this.headers.set = (name, value) => {
        originalSet(name, value);
        return this;
      };
    }
    
    static json(body, init) {
      // Let init.headers override default content-type  
      const headers = {};
      
      // Set default content-type first
      headers['content-type'] = 'application/json';
      
      // Override with init headers if provided
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          headers[key.toLowerCase()] = value;
        });
      }
      
      const response = new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers
      });
      
      // Add headers.set method for our tests
      const originalSet = response.headers.set.bind(response.headers);
      response.headers.set = (name, value) => {
        originalSet(name, value);
        return response;
      };
      
      return response;
    }
  }

  return {
    NextRequest: class {
      constructor(url, init = {}) {
        this._url = url;
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers);
        this.body = init.body;
      }
      
      get url() {
        return this._url;
      }
      
      async json() {
        return JSON.parse(this.body);
      }
    },
    NextResponse: MockNextResponse,
  };
})

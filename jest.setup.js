import '@testing-library/jest-dom'

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
jest.mock('next/server', () => ({
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
  NextResponse: {
    json: (body, init) => {
      return new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers: { 'content-type': 'application/json' }
      });
    },
  },
}))

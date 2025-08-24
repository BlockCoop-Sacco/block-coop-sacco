// Polyfills for Node.js modules in browser environment

// Make global available
(window as any).global = window;

// Create a minimal Buffer polyfill without importing the buffer module
class BufferPolyfill extends Uint8Array {
  static from(data: any, encoding?: string): BufferPolyfill {
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      return new BufferPolyfill(encoder.encode(data));
    }
    if (data instanceof ArrayBuffer) {
      return new BufferPolyfill(data);
    }
    if (Array.isArray(data)) {
      return new BufferPolyfill(data);
    }
    return new BufferPolyfill(data);
  }

  static alloc(size: number, fill?: any): BufferPolyfill {
    const buffer = new BufferPolyfill(size);
    if (fill !== undefined) {
      buffer.fill(fill);
    }
    return buffer;
  }

  static isBuffer(obj: any): boolean {
    return obj instanceof BufferPolyfill || obj instanceof Uint8Array;
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    const decoder = new TextDecoder();
    return decoder.decode(this);
  }
}

// Make Buffer available globally
(window as any).Buffer = BufferPolyfill;
(window as any).process = {
  env: {},
  version: '',
  platform: 'browser',
  nextTick: (fn: Function) => setTimeout(fn, 0),
};

export {};

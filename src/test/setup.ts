// Unit tests run in plain node; the modules under test only need a minimal `window`.
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    location: { host: 'localhost:4500', href: '' },
    localStorage: {},
  };
}

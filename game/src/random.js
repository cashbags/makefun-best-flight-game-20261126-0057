// Seeded randomness for Emberwing Air: every island, gust and ring sits where
// the seed says, so the same seed replays the same frame. No Math.random here.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  function nextUint32() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next() {
      return nextUint32();
    },
    range(min, max) {
      return min + nextUint32() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + nextUint32() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(nextUint32() * list.length)];
    },
    // Smooth value noise in one dimension, for gusts and ridge wobble.
    noise1(x) {
      const xi = Math.floor(x);
      const xf = x - xi;
      const a = Math.sin(xi * 127.1 + seed * 0.013) * 43758.5453;
      const b = Math.sin((xi + 1) * 127.1 + seed * 0.013) * 43758.5453;
      const fa = a - Math.floor(a);
      const fb = b - Math.floor(b);
      const u = xf * xf * (3 - 2 * xf);
      return (fa + (fb - fa) * u) * 2 - 1;
    },
  };
}

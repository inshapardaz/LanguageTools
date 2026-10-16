// The app's accent colours. Mantine's palette for each is generated from a single hex value: five
// tints, the colour itself, and three shades.

export const DEFAULT_ACCENT = '#b8863a';
// Accent for the plain white/black themes: a neutral blue.
export const PLAIN_ACCENT = '#1c7ed6';

const HEX = /^#[0-9a-f]{6}$/i;

export const isValidAccent = (value: unknown): value is string => typeof value === 'string' && HEX.test(value);

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// Mixes `amount` (0..1) of `target` into `hex`.
const mix = (hex: string, target: string, amount: number) => {
  const from = toRgb(hex);
  const to = toRgb(target);
  return toHex(from.map((v, i) => v + (to[i] - v) * amount));
};

// Index 6 is the accent itself (Mantine's primary shade); lower indexes are lighter, higher darker.
export const makeAccentPalette = (hex: string): [string, string, string, string, string, string, string, string, string, string] => {
  const base = isValidAccent(hex) ? hex.toLowerCase() : DEFAULT_ACCENT;
  return [
    mix(base, '#ffffff', 0.92),
    mix(base, '#ffffff', 0.84),
    mix(base, '#ffffff', 0.7),
    mix(base, '#ffffff', 0.54),
    mix(base, '#ffffff', 0.34),
    mix(base, '#ffffff', 0.16),
    base,
    mix(base, '#000000', 0.1),
    mix(base, '#000000', 0.24),
    mix(base, '#000000', 0.4),
  ];
};

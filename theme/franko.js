// Shared visual language for every Franko shopping, account, order and help screen.
// Keep semantic status colors separate from brand accents: failed payments and
// destructive actions should remain visually distinct from shopping CTAs.
export const franko = Object.freeze({
  forest: '#073A2A',
  primary: '#086942',
  primaryDark: '#06472F',
  bright: '#0A9560',
  lime: '#D8FF85',
  red: '#B21F36',
  canvas: '#F7F8F3',
  surface: '#FFFFFF',
  soft: '#E7F5EA',
  border: '#E5EEE6',
  ink: '#163A29',
  muted: '#738579',
});

export const frankoCard = {
  backgroundColor: franko.surface,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: franko.border,
};

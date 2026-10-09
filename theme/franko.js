// Shared visual language for every Franko shopping, account, order and help screen.
// Keep semantic status colors separate from brand accents: failed payments and
// destructive actions should remain visually distinct from shopping CTAs.
export const franko = Object.freeze({
  forest: '#086942',
  primary: '#086942',
  primaryDark: '#086942',
  bright: '#086942',
  mint: '#84e8b9',
  lime: '#84e8b9',
  red: '#B21F36',
  canvas: '#F7FAF8',
  surface: '#FFFFFF',
  soft: '#F7FAF8',
  border: '#DCE8DF',
  ink: '#163A29',
  muted: '#738579',
});

export const frankoCard = {
  backgroundColor: franko.surface,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: franko.border,
};

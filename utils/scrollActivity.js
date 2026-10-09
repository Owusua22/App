// A small event bus lets the global support button respond to nested lists
// without putting scroll coordinates in Redux or rerendering the whole app.
const listeners = new Set();
export function notifyScrollActivity() {
  listeners.forEach((listener) => listener());
}
export function subscribeScrollActivity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

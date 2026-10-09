// Native and modern browsers expose requestIdleCallback. Use a short timer on
// platforms without it, instead of the deprecated InteractionManager API.
export function scheduleIdle(task, timeout = 1200) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(task, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(task, 160);
  return () => clearTimeout(id);
}

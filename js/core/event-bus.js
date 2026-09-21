export function createEventBus() {
  const listeners = new Map();

  return {
    emit(type, detail = {}) {
      listeners.get(type)?.forEach((listener) => listener({ type, detail }));
    },
    on(type, listener) {
      const typeListeners = listeners.get(type) ?? new Set();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
      return () => typeListeners.delete(listener);
    },
  };
}
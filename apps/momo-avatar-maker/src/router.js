const listeners = new Set();

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/editor';
  const [pathPart] = raw.split('?');
  const route = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return route === '/' ? '/editor' : route;
}

export function navigate(path) {
  const normalized = path === '/' ? '/editor' : path.startsWith('/') ? path : `/${path}`;
  const next = normalized.startsWith('#') ? normalized : `#${normalized}`;
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  location.hash = next;
}

export function onRoute(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startRouter() {
  const emit = () => {
    const route = parseHash();
    listeners.forEach((listener) => listener(route));
  };

  window.addEventListener('hashchange', emit);
  if (!location.hash || location.hash === '#/' || location.hash === '#') {
    location.hash = '#/editor';
  } else {
    emit();
  }
}

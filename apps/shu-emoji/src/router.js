const listeners = new Set();

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path, query, raw };
}

export function getRoute() {
  return parseHash();
}

export function navigate(to) {
  const next = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`;
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  location.hash = next;
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startRouter() {
  const emit = () => {
    const route = parseHash();
    listeners.forEach((fn) => fn(route));
  };
  window.addEventListener('hashchange', emit);
  if (!location.hash) {
    // 只用 hash 赋值初始化，避免 location.replace 触发容器导航告警
    location.hash = '#/';
  } else {
    emit();
  }
}

export function matchRoute(path) {
  if (path === '/' || path === '') return { name: 'home' };
  if (path === '/search') return { name: 'search' };
  if (path === '/favorites') return { name: 'favorites' };
  if (path === '/wander') return { name: 'wander' };
  if (path === '/category' || path.startsWith('/category/')) {
    const name = decodeURIComponent(path.replace(/^\/category\/?/, '') || '');
    return { name: 'category', params: { category: name } };
  }
  if (path.startsWith('/emoji/')) {
    const char = decodeURIComponent(path.slice('/emoji/'.length));
    return { name: 'detail', params: { emoji: char } };
  }
  return { name: 'home' };
}

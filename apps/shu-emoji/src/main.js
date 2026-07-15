import './styles/app.css';
import { startRouter, onRoute, matchRoute } from './router.js';
import { renderHome } from './pages/home.js';
import { renderSearch } from './pages/search.js';
import { renderDetail } from './pages/detail.js';
import { renderCategory } from './pages/category.js';
import { renderFavorites } from './pages/favorites.js';
import { renderWander } from './pages/wander.js';

const pageEl = document.getElementById('page');

let lastRouteName = '';

async function render(route) {
  const matched = matchRoute(route.path);
  const sameSection = matched.name === lastRouteName;
  lastRouteName = matched.name;

  // 同分区内细切换（如分类 Tab）不重播整页进场动画，减少跳动感
  if (!sameSection) {
    pageEl.classList.remove('fade-slide');
    void pageEl.offsetWidth;
    pageEl.classList.add('fade-slide');
  }

  switch (matched.name) {
    case 'search':
      await renderSearch(pageEl, { query: route.query });
      break;
    case 'detail':
      await renderDetail(pageEl, { emoji: matched.params.emoji });
      break;
    case 'category':
      await renderCategory(pageEl, { category: matched.params.category });
      break;
    case 'favorites':
      await renderFavorites(pageEl);
      break;
    case 'wander':
      await renderWander(pageEl, { emoji: route.query.e });
      break;
    case 'home':
    default:
      await renderHome(pageEl);
      break;
  }
  if (!sameSection) {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
}

onRoute(render);
startRouter();

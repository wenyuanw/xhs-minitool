import './styles/app.css';
import avatarOptions from './data/avatar-options.json';
import { drawAvatar, renderAvatarToDataUrl } from './lib/avatar-renderer.js';
import { saveStoredState } from './lib/storage.js';
import { renderEditor } from './pages/editor.js';
import { renderResult } from './pages/result.js';
import { navigate, onRoute, startRouter } from './router.js';

const page = document.querySelector('#page');

function createRandomState() {
  const preset = pickRandom(avatarOptions.presets);
  return {
    partColors: { ...preset.partColors },
    resultImage: ''
  };
}

let state = createRandomState();

function saveAndClearResult(next) {
  state = { ...next, resultImage: '' };
  saveStoredState(state);
}

async function refreshPreview() {
  const canvas = document.querySelector('#avatar-preview');
  if (canvas) await drawAvatar(canvas, state, avatarOptions);
}

function rerender() {
  const route = getCurrentRoute();
  const ctx = createContext();
  if (route === '/result') {
    renderResult(page, ctx);
    return;
  }
  renderEditor(page, ctx);
}

function createContext() {
  return {
    state,
    options: avatarOptions,
    actions: {
      goEditor: () => navigate('/editor'),
      setPartColor(partId, color, remount) {
        saveAndClearResult({
          ...state,
          partColors: { ...state.partColors, [partId]: color }
        });
        if (remount) {
          rerender();
          return;
        }
        return refreshPreview();
      },
      randomizeCurrent() {
        saveAndClearResult(createRandomState());
        rerender();
      },
      async generateResult() {
        const resultImage = await renderAvatarToDataUrl(state, avatarOptions);
        state = { ...state, resultImage };
        saveStoredState(state);
        navigate('/result');
      }
    }
  };
}

function getCurrentRoute() {
  const hash = location.hash.replace(/^#/, '') || '/editor';
  const route = hash.startsWith('/') ? hash : `/${hash}`;
  return route === '/' ? '/editor' : route;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

onRoute(() => rerender());
startRouter();

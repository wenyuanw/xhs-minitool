import './styles/app.css';
import { showToast } from './lib/toast.js';

const page = document.querySelector('#page');

page.innerHTML = `
  <header class="hero">
    <p class="eyebrow">小红书小工具</p>
    <h1>{{title}}</h1>
    <p class="slogan">{{slogan}}</p>
  </header>
  <section class="card">
    <p>从这里开始写你的离线工具。构建后会打成符合容器规范的 zip。</p>
    <button type="button" class="btn" id="hello-btn">点一下试试</button>
  </section>
`;

document.querySelector('#hello-btn')?.addEventListener('click', () => {
  showToast('你好，{{title}}');
});

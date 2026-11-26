import {categories, element, imageSource, money, normalize} from './catalog.js?v=painel-1';
import {configured, listProducts, loadTheme, recordView, recordProductView} from './repository.js?v=painel-2';

const grids = {
  marmitas: '#marmita-grid', sexta: '#sexta-grid', porcoes: '#porcoes-list',
  sobremesas: '#copos-grid', kits: '#kits-grid', lanches: '#lanches-grid'
};
const siteRoot = new URL('../../', import.meta.url);
const status = document.querySelector('#catalog-status');
const search = document.querySelector('#menu-search');
const results = document.querySelector('#menu-results');
let catalog = [];

function draw() {
  const term = normalize(search.value.trim());
  const matches = catalog.filter(product => normalize([
    product.name, product.description, categories[product.category], ...product.tags
  ].join(' ')).includes(term));
  for (const [category, selector] of Object.entries(grids)) {
    const grid = document.querySelector(selector);
    const items = matches.filter(product => product.category === category);
    grid.replaceChildren(...items.map(renderProduct));
    const hide = !items.length && (Boolean(term) || category === 'lanches');
    document.getElementById(category).hidden = hide;
    document.querySelector('a[href="#' + category + '"]').hidden = hide;
    if (!hide && !items.length) grid.append(element('p', 'Sem opções disponíveis no momento.'));
  }
  results.textContent = term ? (matches.length ? matches.length + ' produto(s) encontrado(s).' : 'Nenhum produto encontrado.') : '';
}
search.addEventListener('input', draw);

function renderProduct(product) {
  const name = product.name;
  const contactName = categories[product.category] + ' — ' + name;
  const action = element('a', product.starting ? 'Consultar' : 'Pedir', 'order');
  const message = product.starting ? 'Olá! Gostaria de consultar o valor de ' : 'Olá! Gostaria de pedir ';
  action.href = 'https://wa.me/5511976372101?text=' + encodeURIComponent(message + contactName + '.');
  action.setAttribute('aria-label', action.textContent + ' ' + name + ' pelo WhatsApp');
  const price = element('span', (product.starting ? 'A partir de ' : '') + money(product.price_cents), 'price');
  if (product.category === 'porcoes' && !product.description && !product.image && !product.tags.includes('Mais vendido')) {
    const row = element('article', null, 'row');
    row.dataset.product = product.id;
    row.append(element('strong', name), price, action);
    return row;
  }
  const card = element('article', null, 'card');
  const src = imageSource(product.image, siteRoot);
  if (src) {
    const photo = element('img');
    photo.src = src;
    photo.alt = '';
    photo.loading = 'lazy';
    card.append(photo);
  }
  const body = element('div', null, 'card-body');
  if (product.tags.includes('Mais vendido')) body.append(element('span', 'Mais vendido', 'small'));
  body.append(element('h3', name));
  if (product.description) body.append(element('p', product.description));
  const buy = element('div', null, 'buy');
  buy.append(price, action);
  body.append(buy);
  card.dataset.product = product.id;
  card.append(body);
  return card;
}

async function render() {
  try {
    catalog = await listProducts();
    draw();
    document.dispatchEvent(new Event('storefront-rendered'));
    status.textContent = '';
  } catch {
    status.textContent = 'Cardápio temporariamente indisponível. Consulte as opções pelo WhatsApp.';
  }
}
render();

if (configured) {
  loadTheme().then(theme=>{
    if (!theme) return;
    document.documentElement.style.setProperty('--red',theme.primary_color);
    document.documentElement.style.setProperty('--green',theme.secondary_color);
    document.documentElement.style.setProperty('--store-font',theme.font);
  }).catch(()=>{});

  const consent = document.getElementById('analytics-choice');
  const consentKey = 'cantinho-metrics-consent';
  const visitorKey = 'cantinho-visitor';
  const sections = new Set(['doces','marmitas','sexta','porcoes','sobremesas','kits','lanches','pedidos']);
  let visitor;
  let lastPath;
  const seen = new Set();
  const observer = new IntersectionObserver(entries=>{
    if (!visitor) return;
    for (const entry of entries) {
      const id = entry.target.dataset.product;
      if (!entry.isIntersecting || seen.has(id)) continue;
      seen.add(id);
      observer.unobserve(entry.target);
      recordProductView(visitor,id).catch(()=>seen.delete(id));
    }
  },{threshold:0.35});
  function observeProducts() {
    observer.disconnect();
    if (visitor) document.querySelectorAll('[data-product]').forEach(card=>{ if (!seen.has(card.dataset.product)) observer.observe(card); });
  }
  document.addEventListener('storefront-rendered',observeProducts);

  function register(path) {
    if (!visitor || path === lastPath) return;
    lastPath = path;
    recordView(visitor,path).catch(()=>{ if (lastPath === path) lastPath = undefined; });
  }
  function enable() {
    visitor = localStorage.getItem(visitorKey) || crypto.randomUUID();
    localStorage.setItem(visitorKey, visitor);
    localStorage.setItem(consentKey, 'yes');
    consent.hidden = true;
    register('/');
    trackSection();
    observeProducts();
  }
  function trackSection() {
    const section = location.hash.slice(1);
    if (sections.has(section)) register('/#'+section);
  }

  try {
    if (localStorage.getItem(consentKey) === 'yes') enable();
    else if (localStorage.getItem(consentKey) !== 'no') consent.hidden = false;
  } catch {}
  consent.querySelector('[data-allow]').onclick = ()=>{ try { enable(); } catch { consent.hidden = true; } };
  consent.querySelector('[data-decline]').onclick = ()=>{
    try { localStorage.setItem(consentKey,'no'); } catch {}
    consent.hidden = true;
  };
  document.getElementById('analytics-settings').hidden = false;
  document.getElementById('analytics-settings').onclick = ()=>{
    visitor = undefined;
    observer.disconnect();
    seen.clear();
    lastPath = undefined;
    try { localStorage.removeItem(visitorKey); localStorage.removeItem(consentKey); } catch {}
    consent.hidden = false;
    consent.querySelector('button').focus();
  };
  window.addEventListener('hashchange', trackSection);
}

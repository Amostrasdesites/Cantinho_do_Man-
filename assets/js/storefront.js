import {categories, element, imageSource, money} from './catalog.js';
import {demo, listProducts} from './repository.js';

const grids = {
  marmitas: '#marmita-grid', sexta: '#sexta-grid', porcoes: '#porcoes-list',
  sobremesas: '#copos-grid', kits: '#kits-grid', lanches: '#lanches-grid'
};
const siteRoot = new URL('../../', import.meta.url);
const status = document.querySelector('#catalog-status');

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
  card.append(body);
  return card;
}

async function render() {
  try {
    const products = await listProducts();
    for (const [category, selector] of Object.entries(grids)) {
      const grid = document.querySelector(selector);
      const items = products.filter(product => product.category === category);
      grid.replaceChildren(...items.map(renderProduct));
      if (category === 'lanches') {
        document.querySelector('#lanches').hidden = !items.length;
        document.querySelector('a[href="#lanches"]').hidden = !items.length;
      } else if (!items.length) grid.append(element('p', 'Sem opções disponíveis no momento.'));
    }
    status.textContent = '';
  } catch {
    status.textContent = 'Cardápio temporariamente indisponível. Consulte as opções pelo WhatsApp.';
  }
}
render();
if (demo) window.addEventListener('storage', event => {
  if (event.key === 'cantinho-catalog-v1') render();
});

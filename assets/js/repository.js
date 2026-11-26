import {config} from './config.js';
import {originalCatalog} from './catalog-data.js';

export const demo = !config.supabaseUrl || !config.publishableKey;
const catalogKey = 'cantinho-catalog-v1';
let session = null;

function localCatalog() {
  return JSON.parse(localStorage.getItem(catalogKey) ?? 'null') ?? structuredClone(originalCatalog);
}

async function request(path, method = 'GET', body, token, prefer = '') {
  const headers = {apikey: config.publishableKey, 'Content-Type': 'application/json'};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 204) return;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) session = null;
    throw new Error(result.message ?? result.msg ?? result.error_description ?? 'Falha ao acessar o catálogo.');
  }
  return result;
}

async function adminRequest(path, method, body, prefer) {
  if (!session) throw new Error('Entre novamente para continuar.');
  if (Date.now() >= session.expiresAt - 30000) {
    const token = await request('/auth/v1/token?grant_type=refresh_token', 'POST', {refresh_token: session.refresh_token});
    session = {...token, expiresAt: Date.now() + token.expires_in * 1000};
  }
  return request(path, method, body, session.access_token, prefer);
}

export async function login(email, password) {
  const token = await request('/auth/v1/token?grant_type=password', 'POST', {email, password});
  session = {...token, expiresAt: Date.now() + token.expires_in * 1000};
  try {
    if (!await adminRequest('/rest/v1/rpc/is_catalog_admin', 'POST', {})) {
      throw new Error('Esta conta não tem acesso ao painel.');
    }
  } catch (error) {
    session = null;
    throw error;
  }
}

export async function logout() {
  const token = session?.access_token;
  session = null;
  if (token) await request('/auth/v1/logout', 'POST', {}, token);
}

export async function listProducts(privateFields = false) {
  if (demo) {
    const products = localCatalog();
    if (privateFields) return products;
    return products.filter(product => product.active).map(({cost_cents, ...product}) => product);
  }
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const page = privateFields
      ? await adminRequest('/rest/v1/products?select=*&order=position,id&limit=100&offset=' + offset)
      : await request('/rest/v1/rpc/catalog_public?order=position,id&limit=100&offset=' + offset);
    all.push(...page);
    if (page.length < 100) return all;
  }
}

export async function saveProduct(product, editing) {
  if (demo) {
    const products = localCatalog();
    const index = products.findIndex(item => item.id === product.id);
    if (editing && index < 0) throw new Error('Produto já excluído.');
    if (editing) products[index] = product;
    else products.push(product);
    localStorage.setItem(catalogKey, JSON.stringify(products));
    return;
  }
  const result = await adminRequest('/rest/v1/products' + (editing ? '?id=eq.' + encodeURIComponent(product.id) : ''),
    editing ? 'PATCH' : 'POST', product, 'return=representation');
  if (result.length !== 1) throw new Error('Produto indisponível para edição.');
}

export async function deleteProduct(id) {
  if (demo) {
    localStorage.setItem(catalogKey, JSON.stringify(localCatalog().filter(product => product.id !== id)));
    return;
  }
  const result = await adminRequest('/rest/v1/products?id=eq.' + encodeURIComponent(id), 'DELETE', undefined, 'return=representation');
  if (result.length !== 1) throw new Error('Produto já excluído ou indisponível.');
}

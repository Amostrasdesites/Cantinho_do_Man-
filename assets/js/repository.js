import {config} from './config.js';
import {originalCatalog} from './catalog-data.js';

export const configured = Boolean(config.supabaseUrl && config.publishableKey);

async function request(path, method = 'GET', body) {
  const headers = {apikey: config.publishableKey, 'Content-Type': 'application/json'};
  const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 204) return;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message ?? result.msg ?? result.error_description ?? 'Falha ao acessar o catálogo.');
  }
  return result;
}

export async function listProducts() {
  if (!configured) return structuredClone(originalCatalog);
  const products=[];
  for (let offset=0; ; offset+=100) {
    const page=await request('/rest/v1/rpc/catalog_public?order=position,id&limit=100&offset='+offset);
    products.push(...page);
    if (page.length<100) return products;
  }
}
export async function loadTheme() {
  const [theme]=await request('/rest/v1/store_theme?select=primary_color,secondary_color,font&id=eq.true');
  return theme;
}
export function recordView(visitor,path) {
  return request('/rest/v1/rpc/store_record_view','POST',{p_visitor:visitor,p_path:path});
}
export function recordProductView(visitor,product) {
  return request('/rest/v1/rpc/store_record_product_view','POST',{p_visitor:visitor,p_product:product});
}

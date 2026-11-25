const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync("work/cantinho-do-mana/dist/index.html","utf8");
const nodes = {};
vm.runInNewContext(html.match(/<script>([\s\S]+)<\/script>/)[1], {document:{querySelector(id){return nodes[id] ??= {};}}});
const expected = [
  ["#marmita-grid", [20,20,20,20,20,20]], ["#sexta-grid",[15,15]],
  ["#porcoes-list",[17.99,24.99,34.99,39.99,69.99,98.99]],
  ["#copos-grid",[20,20,22.9,20,22.9,22.9,22.9,22.9,22.9,22.9]],
  ["#kits-grid",[130,240,440]]
];
const money = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
for(const [id, prices] of expected){
  const markup = nodes[id].innerHTML;
  assert.deepEqual([...markup.matchAll(/class="price">(?:A partir de )?([^<]+)/g)].map(m=>m[1]),prices.map(n=>money.format(n)));
  const urls = [...markup.matchAll(/href="([^"]+)"/g)].map(m=>new URL(m[1]));
  assert.equal(urls.length,prices.length);
  for(const url of urls){
    assert.equal(url.origin,"https://wa.me");
    assert.equal(url.pathname,"/5511976372101");
    assert.ok(url.searchParams.get("text").includes("Gostaria"));
  }
}
assert.ok(!html.includes("@@"));
for(const [, image] of html.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)){
  assert.equal(Buffer.from(image,"base64").subarray(8,12).toString(),"WEBP");
}
console.log("27 preços, links de pedido e imagens validados.");

# Cantinho do Maná

Vitrine e painel administrativo responsivos. O link **Área administrativa** fica no rodapé da vitrine.

## Experimentar

Na pasta que contém `index.html`, execute `python -m http.server 8080 --bind 127.0.0.1`. Abra `http://127.0.0.1:8080/admin/`. A vitrine fica em `http://127.0.0.1:8080/`.

Na demonstração em localhost e no endereço de apresentação do GitHub Pages, o painel pede o usuário Mana e a senha de apresentação combinada. O acesso é validado no navegador e serve para demonstrar o fluxo. A validação real e a proteção dos dados começam quando o Supabase é configurado. Em outros endereços o painel fica fechado até o banco ser configurado. Os dados da apresentação ficam no navegador. Os preços originais vêm preenchidos e os custos começam vazios. Use apenas dados de teste. As alterações locais não são migradas automaticamente.

## Ativar o catálogo compartilhado

1. Crie um projeto Supabase. No **SQL Editor**, execute `database/01-estrutura.sql` e depois `database/02-catalogo-inicial.sql` e `database/03-fotos.sql`.
2. Em **Authentication → Users**, crie a conta da proprietária com e-mail e senha, confirme a conta e copie seu UUID. Desative novos cadastros caso o projeto seja dedicado ao catálogo.
3. Execute a consulta abaixo no SQL Editor com o UUID da proprietária no lugar do exemplo.

   ```sql
   insert into public.catalog_admins (user_id)
   values ('00000000-0000-0000-0000-000000000000');
   ```

4. Em `assets/js/config.js`, preencha `supabaseUrl` com a URL HTTPS do projeto e `publishableKey` com a chave pública que começa por `sb_publishable_`. Guarde senhas e chaves secretas fora do repositório.
5. Suba o conteúdo desta pasta na raiz do repositório. Em **Settings → Pages**, selecione **Deploy from a branch**, `main`, `/ (root)`, e salve.
6. Abra `admin/` no endereço publicado, entre com a conta da proprietária e edite um produto. Confira a alteração na vitrine em uma janela anônima.

O preço de custo fica na tabela protegida pela política de acesso do Postgres. A vitrine consulta uma função que retorna apenas os campos públicos de produtos ativos. Para preservar uma ficha fora da vitrine, desmarque **Mostrar na vitrine**. Use **Excluir produto** para remoção definitiva.

## Manutenção

- `index.html` e `admin/index.html` definem a estrutura das páginas.
- `assets/css/` guarda os estilos separados da vitrine e do painel.
- `assets/js/catalog.js` define categorias, etiquetas e formatação.
- `assets/js/catalog-data.js` guarda o catálogo inicial da demonstração.
- `assets/js/repository.js` conecta o armazenamento local e o banco.
- `assets/js/storefront.js` e `assets/js/admin.js` controlam as interfaces.
- `assets/img/` guarda as imagens do catálogo. Na ficha do produto, selecione uma foto JPG, PNG ou WebP de até 3 MB. As fotos enviadas ficam no Supabase Storage e podem ser exibidas na vitrine.
- `database/` contém a estrutura SQL e a carga dos 27 produtos iniciais.

Referências oficiais: [Supabase Auth](https://supabase.com/docs/guides/auth), [políticas de acesso](https://supabase.com/docs/guides/database/postgres/row-level-security) e [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

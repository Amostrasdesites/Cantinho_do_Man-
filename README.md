# Cantinho do Maná

Vitrine pública e painel exclusivo deste cardápio. Acesso pelo link **Área administrativa**, no rodapé. O painel oferece produtos, fotos, métricas, aparência e troca de senha.

## Ativar o painel

1. No projeto Supabase dedicado ao Cantinho do Maná, execute os arquivos SQL numerados de `database/` em ordem, começando pelos ainda pendentes.
2. Desative novos cadastros em Authentication. Crie duas contas com e-mails distintos e senhas escolhidas pelos titulares. Adicione os UUIDs das duas contas à lista de acesso no SQL Editor.

   ```sql
   insert into public.catalog_admins (user_id)
   values ('<uuid-1>'), ('<uuid-2>');
   ```

3. Preencha `assets/js/config.js` com a URL HTTPS do projeto e a chave **pública** Supabase. Guarde as senhas e as chaves secretas no serviço.
4. Publique a raiz do repositório no GitHub Pages. A vitrine carrega os produtos ativos do mesmo banco em que o painel faz alterações. Os preços de custo e as métricas são protegidos pelos controles de acesso do banco.
5. Em uma janela anônima, abra a vitrine e o painel. Confirme que só os e-mails autorizados conseguem abrir as ferramentas e que as alterações aparecem na vitrine.

Sem conexão ao banco, a vitrine usa o catálogo inicial e o painel fica fechado. O navegador registra visitas e seções abertas só após autorização do visitante. Cada navegador conta como um visitante estimado por período. O endereço autorizado para a coleta está em `database/04-painel.sql`.

## Manutenção

- `assets/js/repository.js` centraliza a comunicação com o Supabase.
- `assets/js/admin.js` controla o catálogo no painel.
- `assets/js/panel-tools.js` controla visitas, tema e senha.
- `assets/js/storefront.js` renderiza a vitrine, aplica o tema e registra visitas autorizadas.

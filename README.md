# 🛡️ OmniQuest

> *Aprenda jogando. Bilíngue PT/SV.*

**Live →** `https://omniquest.vercel.app` *(placeholder — atualize depois do deploy)*

OmniQuest é um modelo reaproveitável de jogo educacional gamificado, construído sobre a arquitetura do DroidGuard Quest. Todos os mecanismos de jogo, integridade de save, anti-tamper, PWA e *build pipeline* permanecem fixos — para virar um novo curso, basta trocar o conteúdo em `src/js/data.js`, `src/js/library.js` e `src/assets/library/**`.

A versão presente neste repositório é instanciada com **matemática básica para a Bryannah**: 12 níveis em PT/SV, cobrindo frações, decimais, simplificação & MDC, operações com frações, velocidade & tempo, porcentagem, divisão, multiplicação, sistema posicional, geometria, simetria & escala, e estatística. Cada nível guarda 20 questões; o quiz puxa 5 ao acaso por sessão.

## Princípio

OmniQuest separa **engine** de **conteúdo**. A engine é uma página única em JavaScript baunilha: SVG + CSS, sem React, sem bundler de módulos, sem CDN em runtime. O conteúdo é declarativo: arrays de níveis e arquivos Markdown para o Codex. A produção passa por um *build script* curto que minifica, ofusca, renomeia classes/IDs e adiciona *cache-busting* automático.

A premissa: **um aluno típico deve concluir uma sessão em poucos minutos**, ver progresso visual claro, e ter o save protegido contra acidentes ou desejos pequenos de "trapacear". O Codex existe para quem quer ir além do quiz e ler aprofundamentos curtos com *flavor* das franquias temáticas (Brawl Stars, Genshin Impact, Fruits Basket, Blue Lock).

## Como rodar

Pré-requisitos: Node 18+ e npm.

```bash
npm install
npm run dev      # build + servidor local em http://localhost:3000
npm run build    # apenas constrói public/
npm start        # serve public/ existente
npm run clean    # remove public/
```

O servidor (`server.js`) é Express, com headers de segurança e *cache-control* iguais aos do `vercel.json`. Sem servidor algum também funciona: rode `npm run build` e abra `public/index.html` em `file://` — splash e mapa renderizam.

### Layout do projeto

```
OmniQuest/
├── src/                    # fonte — nunca servida
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js               # service worker mínimo
│   ├── css/styles.css
│   ├── js/
│   │   ├── anti-tamper.js  # defesas em produção
│   │   ├── integrity.js    # XOR + FNV-1a no localStorage
│   │   ├── state.js        # progressão com bounds
│   │   ├── markdown.js     # render Markdown → HTML mínimo
│   │   ├── data.js         # 12 níveis + bancos de questões
│   │   ├── library.js      # catálogo do Codex
│   │   ├── achievements.js # 13 conquistas
│   │   ├── quiz.js         # construtor de sessão de 5 perguntas
│   │   ├── fx.js           # CRT + glitch + presets
│   │   ├── map.js          # SVG path map
│   │   ├── splash.js       # intro + PWA install
│   │   └── app.js          # views, modais, toasts, init
│   └── assets/
│       ├── favicon.svg
│       ├── library/<area>/<book>.md
│       └── paths/<style>.svg
├── api/health.js           # exemplo de função serverless
├── build.js                # pipeline src/ → public/
├── server.js               # Express dev/local
├── package.json
├── vercel.json
└── README.md
```

### Build pipeline

| Estágio                | Ferramenta                | Notas |
|------------------------|---------------------------|-------|
| Renomear classes/IDs   | regex próprio em `build.js` | Constrói alfabeto `_a, _b, …` e reescreve CSS, HTML e referências em JS (`getElementById`, `querySelector`, `classList.*`, *template literals*, `url(#id)` em SVG). Protege classes de estado dinâmico (`is-locked`, `is-current`, etc). |
| Minificar JS           | `terser`                  | Dois passes, *drop* `console.*`. **Não** dropa `debugger` (anti-tamper depende). |
| Ofuscar JS             | `javascript-obfuscator`   | Perfil **pesado** (string array em base64, control-flow flattening 0,6, self-defending, *mangled-shuffled*) para `data`, `library`, `integrity`, `state`, `quiz`. **Leve** para o resto. *Seed* fixa em ambos para hashes estáveis. |
| Empacotar em IIFE      | pós-ofuscação             | `(function(){ … })()` por arquivo, evita colisão de helpers entre arquivos. |
| Minificar HTML         | `html-minifier-terser`    | `collapseWhitespace`, `removeComments`, `minifyCSS`, `minifyJS`. |
| Minificar CSS          | `csso({ restructure:false })` | `restructure:true` lifta regras `@media` para o escopo global e quebra layout. |
| *Cache-bust*           | hashes md5 (8 chars)      | Após escrever `js/`/`css/`, o pipeline computa `md5(file)[0..8]` e reescreve `<script src="js/X.js">` para `…?v=<hash>`. Mesmo conteúdo = mesmo URL = *hit* de cache. |
| Cópia verbatim         |                           | `src/assets/`, `manifest.json`, `sw.js`. Pula dotfiles e `.DS_Store`. |

### Segurança em runtime

- **Integridade do save**: pacote XOR + checksum FNV-1a em base64 com salt embutido. Falha de checksum → reset silencioso. Validação de bounds (level 1..12, stars 0..5, etc) aplicada em toda leitura.
- **Anti-tamper** (`anti-tamper.js`, ativo apenas em hosts não-locais; `?dev=1` faz *bypass* para o mantenedor):
  - `console.*` substituído por *no-ops* via `Object.defineProperty` não-gravável.
  - Trap `setInterval(() => debugger, 1500)`.
  - Heurística de *DevTools* abertas (delta `outer-inner > 320 px`, *getter trick* em `console.log`) — **dois sinais correlacionados** antes de reagir, para evitar falsos positivos.
  - Sinais fortes (Frida hooks em `Function.prototype.toString`, globals de userscript, scripts em `chrome-extension://`) → `documentElement` substituído por aviso e `fetch`/`XHR` selados.
  - PrintScreen + `Cmd+Shift+(3|4|5)` limpam clipboard e disparam véu de 1.2 s.
  - Guardas CSS: `user-select:none` e `@media print { display:none !important }`.
- **Headers** (mirror em `vercel.json` e `server.js`): CSP `default-src 'self'` (sem `unsafe-eval`/`unsafe-inline` em script), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` desabilita câmera/microfone/geolocalização/pagamento/USB.

## Créditos

### Currículo

- [Khan Academy](https://www.khanacademy.org/) — frações, decimais, porcentagens
- Skolverket / Matte Direkt (referência) — programa sueco anos 6–9
- [BBC Bitesize](https://www.bbc.co.uk/bitesize) — geometria e estatística básica

### Codex (referências temáticas)

- *Brawl Stars* — Supercell
- *Genshin Impact* — HoYoverse
- *Fruits Basket* — Natsuki Takaya
- *Blue Lock* — Muneyuki Kaneshiro / Yusuke Nomura

Citações de jogabilidade são fictícias, usadas apenas para criar contexto nas questões.

### Prática / leitura adicional

- *Matte Direkt 6–9* — coleção sueca tradicional para 6º ao 9º ano
- *The Joy of x* (Steven Strogatz) — ensaios curtos sobre matemática do dia-a-dia
- [3Blue1Brown](https://www.youtube.com/c/3blue1brown) — vídeos visuais para frações, geometria e álgebra

Tutor de referência: **Jackson Mafra**.

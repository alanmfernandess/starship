# DA42NG — Aero UI / Engineering Performance Lab

Aplicação mobile-first estática (PWA) para análise experimental de:

1. Takeoff Performance — corrida e distância sobre 50 ft
2. Climb Performance — dois motores
3. One Engine Inoperative — climb/descent

**Atenção: NÃO UTILIZAR PARA OPERAÇÃO AERONÁUTICA.** A reprodução dos pontos de exemplo não representa validação de uma ferramenta de planejamento de voo. O modelo de interpolação usa amostras gráficas limitadas extraídas de um raster das cartas, com ajuste de registro aos três exemplos impressos. A digitalização e verificação independentes de todas as curvas permanecem pendentes.

## Fonte primária

Diamond Aircraft, *DA 42 NG Airplane Flight Manual*, Doc. **7.01.15-E**, **Rev. 1 — 18-Feb-2009**.

- Takeoff Distances: p. 5-13 (PDF p. 271, índice zero 270)
- Climb Performance, Two Engines: p. 5-15 (PDF p. 273, índice zero 272)
- One Engine Inoperative Climb/Descent: p. 5-17 (PDF p. 275, índice zero 274)

Fonte pública de conferência: https://www.keilir.net/static/files/Flugakademian/Diamond/DA42-NG-AFM-r1.pdf

**Verificar revisão aplicável, matrícula, configurações e suplementos antes de qualquer uso técnico.**

## Motor matemático

O núcleo da interface (`index.html`, função `compute`) calcula a sequência do nomograma:

- interpolação por segmentos entre curvas de altitude de pressão e temperatura;
- interpolação de retas extraídas graficamente nos painéis de massa e vento;
- interpolação das correções de altura de 0 ft e 50 ft;
- conversão das ordenadas das cartas para distância ou razão de subida;
- registro de escala pelos exemplos publicados nas próprias cartas.

Parte dos pontos foi lida manualmente e outra obtida por detecção de segmentos em raster; não houve transcrição completa/independente das curvas. Os três pontos de referência **não são testes independentes**, pois participaram do registro do modelo. Novas condições devem ser cotejadas contra o AFM gráfico.

### Testes

`node test.cjs` — regressões de referência, domínio e tendências físicas.

`python test_browser.py` — testes de renderização Chromium em modo mobile/touch, com navegação, geometria e ausência de erros de script. Requer Python, Playwright e Chromium instalado; em sistemas diferentes, ajustar o caminho do executável.

Os testes foram executados em dimensões 320×690, 390×667, 390×844, 430×932 e 706×1200. Isso é **emulação Chromium**, e não ensaio em dispositivos móveis físicos, Safari/iOS ou Android real. Não há laudo de equivalência pixel-perfect.

## Publicação

Publicação temporária em `alanmfernandess/starship/da42/` via GitHub Pages já existente no repositório Starship. O aplicativo permanece isolado em subpasta e poderá ser migrado posteriormente para um repositório independente.

URL temporária (confirmar deploy): `https://alanmfernandess.github.io/starship/da42/`.

## Condições das cartas

- Takeoff: flaps UP, ambos MAX @ 2300 RPM, VR 80 KIAS, 85 KIAS, pista pavimentada.
- Climb: flaps UP, ambos 92%, trem recolhido, 90 KIAS.
- OEI: flaps UP, motor remanescente 92%, motor inoperante embandeirado/assegurado, 85 KIAS.

## Requisitos pendentes antes de validação técnica

- Digitalização exaustiva de todas as curvas da página original em resolução apropriada;
- leituras independentes em matriz de pressão/OAT/massa/vento;
- quantificação de erros, incerteza e arredondamento;
- bloqueio de extrapolação também nas descontinuidades de domínio;
- testes em navegadores e aparelhos reais;
- verificação de conformidade de layout com os mockups aprovados em viewports de referência;
- revisão aeronáutica independente do AFM atual e respectivos suplementos.
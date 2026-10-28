# DA42NG — Aero UI / Engineering Performance Lab

Aplicação mobile-first estática (PWA) para análise experimental de:

1. Takeoff Performance — corrida e distância sobre 50 ft
2. Climb Performance — dois motores
3. One Engine Inoperative — climb/descent
4. Cruising — True Airspeed (TAS) / two engines

**Atenção: NÃO UTILIZAR PARA OPERAÇÃO AERONÁUTICA.** A reprodução dos pontos de exemplo não representa validação de uma ferramenta de planejamento de voo. O modelo de interpolação usa amostras gráficas limitadas extraídas de um raster das cartas, com ajuste de registro aos três exemplos impressos nos módulos anteriores. A digitalização e verificação independentes de todas as curvas permanecem pendentes.

## Fonte primária

Diamond Aircraft, *DA 42 NG Airplane Flight Manual*, Doc. **7.01.15-E**, **Rev. 1 — 18-Feb-2009**.

- Takeoff Distances: p. 5-13 (PDF p. 271, índice zero 270)
- Climb Performance, Two Engines: p. 5-15 (PDF p. 273, índice zero 272)
- One Engine Inoperative Climb/Descent: p. 5-17 (PDF p. 275, índice zero 274)
- Cruising (TAS): p. 5-19 (PDF p. 277, índice zero 276)

Fonte pública de conferência: https://www.keilir.net/static/files/Flugakademian/Diamond/DA42-NG-AFM-r1.pdf

**Verificar revisão aplicável, matrícula, configurações e suplementos antes de qualquer uso técnico.**

## Motor matemático

O núcleo da interface (`index.html`, função `compute`) calcula a sequência do nomograma:

- interpolação por segmentos entre curvas de altitude de pressão e temperatura;
- interpolação de retas extraídas graficamente nos painéis de massa e vento;
- interpolação das correções de altura de 0 ft e 50 ft;
- conversão das ordenadas das cartas para distância ou razão de subida;
- registro de escala pelos exemplos publicados nas próprias cartas.

Parte dos pontos foi lida manualmente e outra obtida por detecção de segmentos em raster; não houve transcrição completa/independente das curvas. Os quatro pontos de referência **não são testes independentes**, pois participaram do registro do modelo. Novas condições devem ser cotejadas contra o AFM gráfico.

### Testes

`npm test` — executa três conjuntos de testes sem dependências externas:

- `node test.cjs`: regressão dos quatro exemplos, limites e tendências dos módulos;
- `node validate_cruise.cjs`: 23 pontos do gráfico TAS fora dos pontos de ancoragem do ajuste, comparando leituras visuais independentes com o motor (erro máximo observado **0,456 KTAS**, erro absoluto médio **0,101 KTAS**);
- `node validate_grid.cjs`: 650 configurações dentro do domínio, continuidade/tendências e oito entradas inválidas. Os testes não medem a exatidão física fora dos pontos digitalizados.

`python test_browser.py` — testes de renderização Chromium em modo mobile/touch, com navegação, geometria e ausência de erros de script. Requer Python, Playwright e Chromium instalado; em sistemas diferentes, ajustar o caminho do executável.

Os testes foram executados em dimensões 320×690, 390×667, 390×844, 430×932 e 706×1200. Isso é **emulação Chromium**, e não ensaio em dispositivos móveis físicos, Safari/iOS ou Android real. Não há laudo de equivalência pixel-perfect.

### TAS — quarto módulo

**Limites corrigidos da carta:** ΔISA −10 a +30 °C; TAS 120–180 kt; carga 50–92%; PA 0–18.000 ft. Nem toda combinação desses limites é necessariamente válida; a calculadora rejeita TAS fora da escala da carta.



Apenas no módulo Cruising/TAS, o campo de temperatura tem um seletor compacto **OAT ↔ ΔISA**. No modo ΔISA, insere-se o desvio relativo à ISA padrão no nível de pressão: `OAT = 15 - 0,0019812 × PA(ft) + ΔISA`. Ao alterar PA no modo ΔISA, OAT é recalculada automaticamente mantendo o mesmo desvio. Nos outros módulos, a interface permanece OAT.



A carta Cruising / True Airspeed fornecida pelo usuário foi parcialmente digitalizada por amostras das curvas ISA STD nos grupos 50, 60, 70, 80 e 92% de carga. Interpolação entre altitude (0–18.000 ft), carga e desvios ISA (-10 a +30°C). Referência de leitura: 164 KTAS a 10.000 ft/ISA STD/80% (2 motores). A extensão acima de 14.000 ft utiliza novas leituras gráficas das curvas em 16.000 e 18.000 ft (incluindo a inflexão da curva de 92% de carga). A variação com temperatura é interpolada usando separações em pixels estimadas das curvas. Os 23 pontos de verificação independentes dos pontos de calibração mostraram concordância numérica com essas leituras dentro de 0,456 KTAS; **isso não quantifica a incerteza do procedimento de leitura nem garante erro inferior a esse limite em outros pontos**. O motor rejeita valores fora do eixo TAS de 120–180 kt. Massa não aparece como entrada nesta carta. Dois motores é condição fixa.

## Publicação

Publicação temporária em `alanmfernandess/starship/da42/` via GitHub Pages já existente no repositório Starship. O aplicativo permanece isolado em subpasta e poderá ser migrado posteriormente para um repositório independente.

URL temporária (**o envio do código ao GitHub não confirma propagação do Pages**): `https://alanmfernandess.github.io/starship/da42/`.

## Condições das cartas

- Takeoff: flaps UP, ambos MAX @ 2300 RPM, VR 80 KIAS, 85 KIAS, pista pavimentada.
- Climb: flaps UP, ambos 92%, trem recolhido, 90 KIAS.
- OEI: flaps UP, motor remanescente 92%, motor inoperante embandeirado/assegurado, 85 KIAS.
- TAS: ambos os motores, carga 50–92%, altitude de pressão e desvio ISA conforme carta.

## Requisitos pendentes antes de validação técnica

- Digitalização exaustiva de todas as curvas da página original em resolução apropriada;
- leituras independentes em matriz de pressão/OAT/massa/vento;
- quantificação de erros, incerteza e arredondamento;
- bloqueio de extrapolação também nas descontinuidades de domínio;
- testes em navegadores e aparelhos reais;
- verificação de conformidade de layout com os mockups aprovados em viewports de referência;
- revisão aeronáutica independente do AFM atual e respectivos suplementos.
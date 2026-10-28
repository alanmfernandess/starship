# Evidências de teste — DA42NG v0.9 (Cruising / TAS)

**Fonte primária:** DA42 NG AFM, Doc. 7.01.15-E, Rev. 1, 18-Feb-2009. Módulo TAS: p. 5-19; demais módulos: p. 5-13, p. 5-15 e p. 5-17.

- **Exemplos impressos:** 370 m / 610 m; 1.150 ft/min; 212 ft/min; **164 KTAS** em 10.000 ft / ISA STD / 80% carga, dois motores.
- **23 pontos TAS fora das ancoragens**: comparação da curva interpolada com pixels traçados separadamente da carta fornecida. Maior diferença entre cálculo e leitura: **0,456 KTAS**; erro absoluto médio **0,101 KTAS**.
- **850 combinações**: pontos da região implementada e testes de continuidade, resultado finito, tendências de carga, temperatura e altitude.
- **8 entradas inválidas**: rejeição de altitude, carga, desvio ISA, configuração de motores e números não finitos.
- **85 testes de interface**: Chromium emulado mobile/touch em cinco viewports (320×690, 390×667, 390×844, 430×932, 706×1200), verificando os quatro módulos e interações.
- **Guarda de extrapolação TAS**: somente 0–18.000 ft, carga 50–92%, ISA −10/+30 °C, TAS da escala 120–180 kt, configuração de dois motores.
- **Pipeline repetível**: `npm test` executa regressão, 23 holdouts e a malha de 850 pontos; `python test_browser.py` testa o frontend quando Chromium/Playwright estiverem instalados.

**Limitação essencial:** leituras de uma única figura rasterizada não quantificam a incerteza de digitalização nem cobrem exaustivamente todas as curvas; a concordância de 0,456 KTAS NÃO é precisão garantida, erro máximo global ou tolerância de segurança. A revisão correta do AFM e suplementos da aeronave devem ser verificados separadamente. Nenhum módulo está aprovado para planejamento ou execução de voo.

**Status:** VALIDADO QUANTO A REGRESSÃO E LEITURAS GRÁFICAS AMOSTRAIS; **NÃO VALIDADO PARA USO OPERACIONAL**.

- **UI/Cruise:** seletor OAT ↔ ΔISA (somente Cruising); teste de atualização do TAS, preservação do desvio durante mudança de altitude, persistência na navegação e domínio das curvas; 100 verificações locais Chromium em cinco viewports para a alteração.

- **Correção v0.6 (carta original):** PA estendida de 14.000 até 18.000 ft, usando leituras dos traços em 16.000/18.000 ft para cargas 50/60/70/80/92%, com inflexão do grupo 92%. ΔISA −10/+30 °C, carga 50–92%, eixo TAS 120–180 kt. Testes adicionais em cinco resoluções móveis nas bordas do domínio.

- **Landing v0.7:** módulo FLAPS LDG com gráfico segmentado 50 ft → touchdown → parada, 4 entradas, saída ground roll e distância sobre 50 ft. Ponto do AFM (p. 5-23): **248 m e 480 m**; trecho aéreo de **232 m** calculado por diferença.
- **Regressão Landing:** 1.375 combinações de PA/OAT/massa/vento dentro dos limites, 10 casos inválidos, 4 relações de tendência e consistência total > ground roll. Ensaios de navegador adicionados para 5 tamanhos de tela na CI; a simples disponibilização do arquivo não prova execução CI.
- **Aplicabilidade:** Flaps LDG, ambos IDLE, pista nivelada/dura/seca, 84 KIAS; >1.805 kg constitui procedimento anormal conforme AFM Rev.1. Aproximações do nomograma não foram validadas independentemente para desempenho operacional.

## Módulos 06–07 · Revisão v0.8

- Abnormal Landing (Flaps UP/APP): ponto publicado **418/722 m** (trecho aéreo por diferença = 304 m). Digitalização **parcial e aproximada** de carta própria, calibração no exemplo; não há verificação independente de exatidão física.
- Em uma malha de 1375 condições cobertas por limites de entrada, o modelo computa **1369 condições** e rejeita **6 casos** cuja distância excede o eixo da carta (1400 m). Verificações de massa, vento, temperatura e altitude; rejeição de entradas inválidas.
- Go-Around: exclusivamente **1805 kg = 7,5%, 4,3°, 612 ft/min**; **1900 kg = 6,7%, 3,8°, 547 ft/min**. ISA/MSL, 84 KIAS, flaps LDG, gear extended, both MAX. Sem interpolação ou extrapolação.
- UI: quatro cards, gráfico de trechos proporcionais no Landing anormal e indicador de gradiente de subida no Go-Around; seletor tátil de massa 1805/1900; não modifica o restante do Aero UI.
- Testes de navegador para ambas as telas adicionados ao script Playwright em cinco resoluções; a execução do GitHub Actions ainda precisa ser observada separadamente.

**Ferramenta experimental; NÃO USAR PARA VOO.**


## v0.9 — Weight & Balance

- Referência primária: figuras e tabelas fornecidas pelo usuário, seções AFM 2.7, 2.8, 6.4.1–6.4.5.
- Exemplo oficial reproduzido: empty 1450 kg e 3488 kg·m; Zero Fuel 1655,5 kg / 3958,72 kg·m / CG 2,391 m; Takeoff 1898,5 kg / 4645,69 kg·m / CG 2,447 m.
- Cálculo direto por somatório de massas e momentos; envelope CG por interpolação exata dos pontos numéricos da seção 2.8, em vez de digitalização de pixels.
- Limites individuais de bagagens, combinado cabin+extension, MZFM 1765 kg, MTOM 1900 kg, MLW normal 1805 kg e mínimo de voo 1510 kg.
- Cargas individuais de piloto/copiloto, passageiros traseiros, compartimentos, quatro tanques de combustível utilizável e fluido de degelo.
- Sem previsão de combustível remanescente no pouso: somente massa de combustível atualmente carregada, e cenários de CG com combustível vazio/cheio e fluido carregado/retirado.
- Testes: \`validate_wb.cjs\` (motor, limites, regressão oficial, combinação de cargas), \`test_wb_browser.py\` (tela mobile, limites, persistência da entrada, envelope e cenário).
- Código W&B na pasta \`da42\` do repositório Starship em \`wb.html\` e \`wb-engine.js\`, sem modificar a aplicação Starship principal.

**Escopo:** precisão matemática das fórmulas do exemplo e limites documentados, não aprovação operacional da aeronave. O relatório de peso e balanceamento atualizado e suplementos são imprescindíveis para uso específico. O dispositivo e o software não são certificados. 

## v0.9.1 — Escopo corrigido do W&B

- Eliminados os quatro campos de Landing Fuel, estado de massa previsto para pouso, ponto Landing CG no gráfico e mensagens de combustível de pouso pendente.
- Preservados os pontos Zero Fuel e Takeoff, além das quatro combinações estáticas combustível vazio/cheio e degelo carregado/vazio.
- Regressão ajustada para verificar que entradas antigas de pouso não afetam cálculos de massa e CG e que perfis salvos são saneados; não há funcionalidade de autonomia.

## v0.10 — Gerador de carregamento simulado

- Botão "OTIMIZAR" apenas no Módulo 08. Busca estocástica amostral para Pilot/Copilot/Passenger 1/Passenger 2/Nose/Cabin/Extension; nenhum resultado é aplicado sem passar no motor existente de limitações de massa/CG e quatro cenários estáticos.
- Combustível Main/Aux L/R **sempre manual**, deicing e dados vazios preservados; se forem incompatíveis, o gerador rejeita.
- Após otimização, pesos fictícios de ocupantes/bagagens ficam somente leitura, até restauração explícita da carga manual anterior ou do exemplo AFM.
- O aplicativo identifica de forma visível que os valores são **SIMULADOS**, não registros de pessoas reais ou um plano de carregamento seguro. Não usar para operação.
- Testes JS estocásticos reproduzíveis adicionados a `npm test` e testes de UI às cinco viewports do script Playwright. A execução da CI depende de confirmação independente do pipeline.

## v0.11 — Takeoff AFM §5.3.6

- Digitalização tabular direta de 6 matrizes (Normal UP / Short APP × 1700/1900/1999 kg), 11 altitudes, seis temperaturas OAT mais coluna ISA, Ground Roll / 15 m 50 ft. Null em todas as células riscadas.
- Verificação de interpolação de massa, altitude e temperatura em células publicadas; comparação com referências exatas e modo ISA independente.
- MTOW fixo 1900kg conforme AFM §2.7 recebido; gráfico 1999kg retido somente para rastreabilidade até aplicação de suplemento apropriado.
- AFM wind corrections headwind 10% por14kt, tailwind +10% por3kt; grass dry 10/15/25%; wet grass 10%; soft ground 45%; uphill slope 12% por 1%.
- Testes automáticos novos `validate_takeoff_tables.cjs`; teste browser `test_browser.py` deve carregar script externo em origem file://, exercitar seleção de procedimento, ISA, grama e rejeição de 1999kg.
- Dados amostrados de tabelas e verificações matemáticas **não constituem aprovação para uso aeronáutico real**.

## v0.12 — Climb AFM e 1999kg

- Six grids from AFM 5.3.7 all-engines-operating climb: Flaps UP/APP at 1700, 1900 and 1999 kg, 10 pressure altitudes, eight temperatures plus separate ISA.
- Retain invalid crossed-out cells as null; exact chart anchors, in-domain multilinear interpolation and no extrapolation.
- Verify speed schedules, both engines 92%, gear retracted; 100%-power MSL/ISA notes not mixed with tabular engine.
- Takeoff performance range expanded through AFM's 1999kg published tables, while Weight & Balance continues to require the appropriate mass/CG supplement for extending its 1900kg envelope.
- Numerical checks: `validate_climb_tables.cjs` and extended `validate_takeoff_tables.cjs`. Browser checks include flap selection, 1999kg, ISA, hot/missing cells, legacy modules.
- Software remains experimental and is not a validated operational performance reference.

## v0.13.0 — OEI AFM §5.3.8

- OEI 92%, remaining engine loaded, dead engine feathered/secured, UP, gear retracted, VYSE 85 KIAS, half ball out.
- 3 grids at 1700/1900/1999 kg; 10 altitudes, eight OAT temperatures and separate ISA; 228 published numerical anchors, 42 unsupported cells.
- Preserve 71 negative ROC reference cells and 101 values <50 ft/min, including zero. UI warns for the AFM's grey shaded area.
- Exact table and interpolated-point numerical regression in `validate_oei_tables.cjs`; dedicated negative/zero and no-data browser checks added.
- Existing Takeoff/Climb/other modules unchanged except test harness loading the OEI engine.
- 1999kg performance results do not constitute certification of aircraft weight-and-balance limits; require applicable AFM supplements.

## v0.13.3 — Climb / OEI Plot Direction

- Result chart plots altitude difference against time in one minute at constant current ROC: positive upward, negative downward, zero level. Removes temperature-sensitivity ROC curve from main result only. Dedicated sensitivity interactions are not used to imply a flightpath.
- Uses a fixed y scale (Climb 1400 ft/min, OEI ±320 ft/min) so distinct rates cannot appear identical through per-result rescaling.
- Computational interpolation/tables unaffected. Uses `data-roc`, `data-direction`, `data-baseline-y`, `data-end-y` SVG properties for directional regression without interpreting screenshots.
- Adds numerical assertions to `npm test` and browser checks in five viewports. This is a chart of **instantaneous vertical rate**, not time-to-climb or a flightpath prediction. Not for operational use.

## v0.13.4 — Aero UI curve styling

- Climb and OEI primary result charts switched from linear SVG paths to monotonic cubic Bézier curves (`C`) consistent with Cruise stroke styling.
- Constrained control point ordinates between original and final values: positive ROC ascends, negative ROC descends, zero ROC remains horizontal.
- Chart represents a stylized one-minute altitude difference rather than an integrated physical trajectory; no synthetic second performance data series.
- Regression: `validate_vertical_plots.cjs` tests cubic control values and signed direction across the reference grid; mobile Chromium smoke checks the path command on five viewports. No AFM interpolation or performance result changes.

## v0.14.0 — AFM 5.3.9 Time / Fuel / Distance to Climb

- Three cumulative table grids: 1700, 1900, 1999 kg, 0–18000 ft in 2000ft steps; official TAS, ROC, time (min), fuel (US gal) and distance (NM).
- Strict ascending start/target range validation; bilinear mass/altitude interpolation, subtraction of cumulative start from target. No ROC integration or fuel-flow inference.
- Default AFM example 2000ft/11°C to 16000ft at 1900kg exactly 15min / 4.2 US gal / 26NM.
- Warmer OAT correction only: +10% per +10°C versus table's ISA, no credit for colder OAT; for this prototype ΔISA>+30°C unsupported.
- Aero UI 2×2 cards and a curved chart of altitude against cumulative elapsed climb time; outputs three metrics. Zero wind and engine 92%, UP, gear retracted.
- New `validate_time_to_climb.cjs`, five-viewports mobile checks; software not approved for flight.

## v0.15 — AFM 5.3.10 Cruise Performance

- New separate Cruise Performance module, 1999 kg, 9 altitudes × 5 ΔISA bands × 4 power/FF/TAS rows = 180 published anchors.
- Exact tabular interpolation in power, altitude and ΔISA; reject mass outside 1999kg, power beyond local max/min and off-table OAT/altitudes. Fixed UP flaps and retracted gear.
- Cruise performance note: optional 2% reduction when OÄM 42-278 installed and OÄM 42-193 absent. TAS adjusted only in prototype; FF remains original tabulation pending equipment applicability confirmation.
- Aero UI four cards with fixed mass, OAT/ΔISA input switch, configuration toggle and smoothed TAS vs pressure altitude curve.
- Regression: `validate_cruise_performance.cjs`; five viewport browser checks plus prior modules. Not approved for flight.

## v0.16.0 — Official AFM landing tabular upgrade

- AFM §5.3.11 2 flap configurations (LDG, APP/UP), 3 masses (1700/1900/1999kg), 11 altitude rows (0-10000ft), six OAT anchors (0..50°C) plus separate published ISA column. 420 published pairs of ground/total distances (840 numerical anchors) and 42 unavailable pairs of cells.
- Strict no extrapolation on mass/altitude/OAT, no interpolation through crossed-out cells, and published ISA numbers used independently.
- Headwind -10%/14kt; tailwind +10%/3kt, applied once. Pavement wet +15% to full landing distance. Grass 5cm/5-10cm/>10cm and wet/soft plus downhill 9%/1% applied to ground roll and added to total distance.
- Strong warning: grass >10cm minimum +25% only; wet/soft conditions, unusually uneven runway or adverse meteorology may greatly increase actual distance. Results are not approved or operational predictions.
- Aero UI unchanged four parameter cards, ISA/OAT switch, dedicated runway sheet including slope control. Landing and Abnormal older digitized nomograms no longer used for computation. Regression and browser tests updated.

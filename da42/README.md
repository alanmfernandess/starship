# DA42NG — Aero UI / Engineering Performance Lab

Aplicação mobile-first estática (PWA) para análise experimental de:

1. Takeoff Performance — corrida e distância sobre 50 ft
2. Climb Performance — dois motores
3. One Engine Inoperative — climb/descent
4. Cruising — True Airspeed (TAS) / two engines
5. Landing Distances — Flaps LDG / 50 ft obstacle
6. Abnormal Landing Distances — Flaps UP / APP, 86 KIAS
7. Go-Around Gradient of Climb — ISA/MSL, 1.805/1.900 kg
8. Weight & Balance — occupant loading, fuel, de-icing and CG envelope

**Atenção: NÃO UTILIZAR PARA OPERAÇÃO AERONÁUTICA.** A reprodução dos pontos de exemplo não representa validação de uma ferramenta de planejamento de voo. O modelo de interpolação usa amostras gráficas limitadas extraídas de um raster das cartas, com ajuste de registro aos três exemplos impressos nos módulos anteriores. A digitalização e verificação independentes de todas as curvas permanecem pendentes.

## Fonte primária

Diamond Aircraft, *DA 42 NG Airplane Flight Manual*, Doc. **7.01.15-E**, **Rev. 1 — 18-Feb-2009**.

- Takeoff Distances: p. 5-13 (PDF p. 271, índice zero 270)
- Climb Performance, Two Engines: p. 5-15 (PDF p. 273, índice zero 272)
- One Engine Inoperative Climb/Descent: p. 5-17 (PDF p. 275, índice zero 274)
- Cruising (TAS): p. 5-19 (PDF p. 277, índice zero 276)
- Landing Distances — Flaps LDG: p. 5-23 (Rev. 1, 18-Feb-2009)
- Landing Distances — Abnormal Flap Position: carta enviada pelo usuário
- Gradient of Climb on Go-Around: AFM §5.3.11, tabela enviada pelo usuário

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

### Landing Distances — quinto módulo

Entradas: PA 0–10.000 ft, OAT −35 a +50 °C limitada também pela curva ISA +35, massa de pouso 1.500–1.900 kg, vento longitudinal de −10 kt (cauda) a +20 kt (proa). Condições fixas da carta: **flaps LDG, ambos os motores IDLE, pista nivelada, dura e seca, aproximação 84 KIAS, obstáculo de 50 ft**.

O cálculo percorre a carta em quatro etapas (pressão/temperatura, massa, vento e altura), com leitura parcial das curvas rasterizadas e calibração pelo ponto publicado: PA 0 ft, OAT 15 °C, 1.800 kg, 10 kt proa → **248 m de ground roll** e **480 m sobre 50 ft**.

O gráfico horizontal aprovado representa **airborne segment = landing distance over 50 ft − ground roll**, seguido de ground roll. Segmentos proporcionais, com touchdown e parada; não é uma trajetória temporal ou cinemática. O valor 232 m no exemplo é diferença calculada, não leitura separada da carta.

**Acima de 1.805 kg até 1.900 kg**, a revisão do AFM descreve pouso como procedimento anormal; a interface exibe aviso, sem invalidar automaticamente o valor interpolado.

**Limitação:** as curvas e inclinações de correção foram lidas parcialmente da imagem, e o exemplo foi usado para registrar a saída. Isso não é validação independente; nenhum resultado deste módulo pode fundamentar a operação da aeronave. `node validate_landing.cjs` verifica o exemplo, tendências, 1.375 combinações dentro do domínio e entradas inválidas.

### TAS — quarto módulo

**Limites corrigidos da carta:** ΔISA −10 a +30 °C; TAS 120–180 kt; carga 50–92%; PA 0–18.000 ft. Nem toda combinação desses limites é necessariamente válida; a calculadora rejeita TAS fora da escala da carta.



Apenas no módulo Cruising/TAS, o campo de temperatura tem um seletor compacto **OAT ↔ ΔISA**. No modo ΔISA, insere-se o desvio relativo à ISA padrão no nível de pressão: `OAT = 15 - 0,0019812 × PA(ft) + ΔISA`. Ao alterar PA no modo ΔISA, OAT é recalculada automaticamente mantendo o mesmo desvio. Nos outros módulos, a interface permanece OAT.



A carta Cruising / True Airspeed fornecida pelo usuário foi parcialmente digitalizada por amostras das curvas ISA STD nos grupos 50, 60, 70, 80 e 92% de carga. Interpolação entre altitude (0–18.000 ft), carga e desvios ISA (-10 a +30°C). Referência de leitura: 164 KTAS a 10.000 ft/ISA STD/80% (2 motores). A extensão acima de 14.000 ft utiliza novas leituras gráficas das curvas em 16.000 e 18.000 ft (incluindo a inflexão da curva de 92% de carga). A variação com temperatura é interpolada usando separações em pixels estimadas das curvas. Os 23 pontos de verificação independentes dos pontos de calibração mostraram concordância numérica com essas leituras dentro de 0,456 KTAS; **isso não quantifica a incerteza do procedimento de leitura nem garante erro inferior a esse limite em outros pontos**. O motor rejeita valores fora do eixo TAS de 120–180 kt. Massa não aparece como entrada nesta carta. Dois motores é condição fixa.

### Módulos 06 e 07 — implementação 0.8

**Abnormal Landing (Flaps UP ou APP).** Quatro parâmetros: Pressure Altitude, OAT, landing mass e headwind (vento de cauda como valor negativo). Os demais parâmetros são fixos: ambos IDLE, pista nivelada/dura/seca e 86 KIAS. O módulo utiliza um conjunto de amostras gráficas *separado* do Landing LDG e registra os resultados pelo único ponto de exemplo publicado: PA 0 ft, OAT 15°C, 1800 kg, vento 10 kt de proa → **418 m Ground Roll** e **722 m sobre 50 ft**. O desenho segmentado mostra 304 m de trecho aéreo por diferença. **Não é validação independente** do modelo ao longo de toda a carta. Bloqueio explícito de total acima de 1400 m, limite do eixo gráfico.

**Go-Around — Gradient of Climb.** Reprodução fiel da tabela do AFM §5.3.11: apenas **1805 kg** (7,5%, 4,3°, 612 ft/min) ou **1900 kg** (6,7%, 3,8°, 547 ft/min). Conditions: ISA, MSL, flaps LDG, landing gear extended, both MAX, 84 KIAS. O seletor de massa alterna os dois valores; PA, ISA e velocidade são fixos. O aplicativo rejeita massas intermediárias e outras condições, sem interpolação ou extrapolação. A faixa 1805–1900 kg constitui procedimento operacional anormal conforme a nota do AFM.

**Validação e ressalvas:** `node validate_modules67.cjs` verifica os exemplos, rejeições, integridade dos módulos anteriores, a geometria das telas e uma malha de condições do gráfico de pouso. Esses testes são de implementação e não certificam a precisão do desempenho. Não utilizar qualquer módulo para planejamento ou execução de voo.

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

### Módulo 08 — Weight & Balance

Tela integrada ao menu de módulos do DA42 NG em \`wb.html\`, com motor matemático isolado em \`wb-engine.js\`. Visual Aero UI Master Design 1.0. Entrada de massa individual para Pilot, Copilot, Passenger 1 e Passenger 2, com braços dianteiros de 2,30 m e traseiros de 3,25 m. Painel de carregamento para bagagens (nose 0,60 m; cabin 3,89 m; extension 4,54 m), fuel mains L/R (2,63 m), aux L/R (3,20 m) e fluido de degelo (1,00 m).

O perfil inicial é **AFM EXAMPLE**, com Empty Mass 1450 kg / Empty Moment 3488 kg·m. O exemplo oficial reproduz Zero Fuel Mass 1655,5 kg / 3958,7 kg·m / CG 2,391 m e Takeoff Mass 1898,5 kg / 4645,7 kg·m / CG 2,447 m. O perfil é editável e salvo no navegador, mas os números oficiais do exemplo **não descrevem automaticamente qualquer aeronave real**.

**CG envelope (m):** forward 2,357 @1510 kg até 2,418 @1900 kg (interpolação linear), aft 2,460 @1510 kg a 2,480 @1700 kg (linear), depois 2,480 até 1900 kg. Verificações numéricas independentes de ZFM <=1765 kg, takeoff mass <=1900 kg e min flight mass >=1510 kg. O limite normal de pouso de 1805 kg permanece como referência do AFM, mas este módulo não calcula massa de pouso nem estima consumo. Bagagens: nose 30 kg, cabin 45 kg, extension 18 kg e cabin+extension 45 kg no total.

**Fuel:** entrada em kg por tanque para casar exatamente com o exemplo AFM (main 79,5 kg × 2, aux 42,0 kg × 2), correspondendo a valores arredondados da tabela do fabricante; densidade de referência 0,84 kg/L. O combustível não utilizável já faz parte do peso vazio; somente o utilizável é adicionado. Os quatro tanques representam exclusivamente a quantidade de combustível utilizável carregada no momento do balanceamento. Não há campos de combustível para pouso, previsão de consumo, autonomia nem CG estimado para pouso.

**De-icing:** fluido editável, valor inicial de 27,5 kg do AFM example; quatro cenários exibidos com combustível utilizável vazio/cheio e fluido carregado/retirado. Não interpretar 27,5 kg como capacidade máxima certificada sem o suplemento do sistema de degelo. Simulações de limites de combustível/fluido dependem da configuração real.

**Validação:** \`node validate_wb.cjs\` cobre exemplos, limites de envelope, massa, bagagens, combustível e centenas de combinações. \`python test_wb_browser.py\` verifica a interface em cinco resoluções com Chromium instalado; configurado na CI. Não é certificação e não substitui o Mass and Balance Report específico da aeronave, o AFM vigente e seus suplementos. **NÃO UTILIZAR PARA PLANEJAMENTO OU EXECUÇÃO DE VOO.**

**Revisão v0.9.1:** removidos os quatro campos de combustível de pouso e a estimativa de Landing CG. Permanecem apenas a condição de carregamento, Zero Fuel/Takeoff e os quatro cenários extremos requeridos pelo AFM. Perfis salvos em versão anterior descartam automaticamente as antigas propriedades de Landing Fuel.

### v0.10 — Otimizar (W&B)

O botão **OTIMIZAR** gera um **cenário hipotético randômico**, variando somente Pilot, Copilot, Passenger 1, Passenger 2 e bagagens Nose/Cabin/Extension. Cada sugestão é avaliada pelo motor matemático: ZFM <=1765 kg, MTOM <=1900 kg, mínimo de voo >=1510 kg, CG de Zero Fuel e Takeoff dentro do envelope, todos os limites de bagagens, e as quatro combinações extremas fuel/de-ice. Caso nenhuma configuração cumpra os critérios com as condições fixas informadas, a ferramenta informa a impossibilidade e **não altera os dados**.

**Otimizar nunca altera:** combustível Main L/R, Aux L/R, de-icing, empty mass, empty moment. Combustível permanece exclusivamente manual, inclusive após otimizar. Ocupantes/bagagens passam a ser campos somente leitura no modo AUTO; botão OTIMIZAR pode gerar outra sugestão. Para retornar ao carregamento manual anterior, em Perfil selecione **RESTAURAR CARGA MANUAL** (sem alterar combustível). Os valores anteriores são preservados localmente, enquanto o modo AUTO persistir.

**IMPORTANTE:** os pesos de ocupantes são inventados para explorar a geometria do envelope. Não representam pessoas reais, não corrigem fisicamente uma aeronave nem podem ser usados como manifesto de carga; a UI identifica o resultado como **SIMULAÇÃO**. O algoritmo não deve ser utilizado para aprovar um carregamento real fora do CG.

Validação: `node validate_optimizer.cjs` com gerador reproduzível, imutabilidade dos inputs fixos, variação de cenários, limites e insatisfatibilidade; `test_wb_browser.py` verifica botões, campos bloqueados, manutenção da edição do fuel e persistência.

### v0.10.2 — Weight & Balance labels

Interface reduzida aos valores **CG**, **ZFW** e **TOW**, além dos indicadores de limites de massa/centro de gravidade. CG exibido em metros com vírgula decimal brasileira (ex.: 2,423 m), e massas em kg com separação brasileira (ex.: 1.815,5 kg). A visualização não traz explicações sobre a localização do Datum Plane. Permanecem os dados de massa vazia, momento, combustível editável, cenários de degelo e aviso resumido de caráter experimental.

### v0.10.3 — Redução do painel W&B

Removidos do cartão de resultados o cabeçalho/valor numérico principal de CG, a mensagem de CG WITHIN LIMITS/OUT OF LIMITS e o rodapé CG · ZFW com valor em metros, conforme marcações do usuário. Mantidos o gráfico do envelope, os pontos de Zero Fuel e Takeoff CG, a legenda ZFW/TOW, os dois cartões ZFW/TOW e o indicador de massa dentro/fora dos limites. A validação de CG continua ativa no motor e no otimizador; pontos com CG fora dos limites são realçados em vermelho no gráfico. O módulo continua experimental, não homologado para planejamento ou execução de voo.

### v0.10.4 — ZFW/TOW sem decimais

As massas ZFW/TOW são **exibidas arredondadas ao quilograma inteiro** nos cartões principais e nos cenários (exemplo AFM: 1.656 kg e 1.899 kg). Os somatórios de massa e momento, validação MZFM/MTOM, cálculos de CG e otimizador mantêm integralmente os valores numéricos originais sem arredondamento intermediário.

### v0.11 — Módulo 01 Takeoff, AFM §5.3.6

Reimplementado o modelo de distância de decolagem a partir das **seis tabelas enviadas pelo usuário**, com dois procedimentos: **Normal / Flaps UP (VR 80 KIAS, V50 85 KIAS)** e **Short Field / Flaps APP (VR 76 KIAS, V50 82 KIAS)**, ambos MAX, pista seca e nivelada como referência. A interface permite alternar Normal/Short, selecionar coluna ISA ou OAT tabular, e configurar as correções de grama seca 5 cm (+10% corrida), 5–10 cm (+15%), 25 cm (+25%), grama molhada (+10% cálculo seco), solo macio (+45% corrida adicional) e aclive (+12% corrida por 1%). Vento de proa: −10% a cada 14 kt; vento de cauda: +10% a cada 3 kt, conforme AFM. Não aplicar uma segunda correção para frações de vento, já incorporadas nos fatores.

O motor independente `takeoff-tables.js` contém dados completos para **1.700, 1.900 e 1.999 kg**, altitudes 0–10.000 ft, OAT 0/10/20/30/40/50°C e coluna ISA. Células riscadas/sem valores são `null` e nunca são extrapoladas. Interpolação linear somente entre pontos publicados válidos. **Regras de limitação:** cálculo restrito a 1.700–1.900 kg, de acordo com o MTOW 1.900 kg do AFM §2.7 fornecido. Os números de 1.999 kg são mantidos como dados da carta de referência, mas não habilitados na calculadora sem demonstração de aplicabilidade de um suplemento/certificação de massa superior. Valores fora do envelope tabular são rejeitados.

Resultado inclui Ground Roll e distância sobre 50 ft, com gráfico proporcional. Referência de teste: massa 1.900 kg, SL, OAT 10°C, vento zero, pista pavimentada: Normal 450/710 m, Short 430/640 m. Em ISA (SL) Normal 458/734 m e Short 445/657 m; valores da coluna ISA usados diretamente. Ponto da interface original (1.800 kg, SL, 15°C, vento de proa 10kt): 406,25m corrida e 638,393m total, agora derivados da tabela e correção de vento.

**Nota de validade:** fatores de superfície e declive são típicos, e condições de pista molhada, irregular ou macia podem causar distâncias muito superiores. A distância disponível deve ser comparada com a distância sobre 50 ft; este software não está aprovado para cálculo operacional. Testes adicionais em `validate_takeoff_tables.cjs` e `test_browser.py`.

### v0.11.1 — Ajustes de Runway

Removido o rótulo redundante `RUNWAY SURFACE` da janela Runway no Takeoff. O antigo campo numérico de `UPHILL SLOPE (%)` foi substituído por slider de 0% a 5%, passos de 0,5%, mostrando o valor atual e os dois extremos. Cálculo e gráfico atualizados durante o ajuste, mantendo o painel aberto. Os limites são do controle experimental atual, não um limite de declive homologado no AFM. Regressão mobile adicionada em `test_browser.py`.

### v0.12.0 — Climb AFM 5.3.7 e referência de 1999 kg

A referência de massa de **1.999 kg** foi confirmada pelo usuário para as tabelas de performance da aeronave; a implementação tabular de **Takeoff e Climb** aceita até 1.999 kg dentro das células publicadas. A modificação MÄM 42-678, limites de massa/centro de gravidade e suplementos do AFM devem ser verificados para o uso operacional. O **Weight & Balance** não foi automaticamente estendido além de 1.900 kg, porque o envelope de CG recebido até agora termina em 1.900 kg.

O motor `climb-tables.js` digitaliza diretamente seis matrizes publicadas na seção 5.3.7 do AFM: **Flaps UP/APP × 1700/1900/1999 kg**, altitude de pressão 0–18.000 ft, OAT −20,−10,0,10,20,30,40,50 °C e coluna ISA específica. Cada célula riscada é `null` e não é extrapolada. Interpolação apenas entre dados publicados adjacentes, sem inventar valores além dos limites.

**Condições:** ambos motores 92%, trem recolhido; UP: VY 90 KIAS até 1900 kg e 92 KIAS acima de 1900 kg, APP: VY 85 KIAS. Notas de velocidade vertical do AFM com 100% de potência são distintas e **não** usadas na tabela de 92%. Conversão ft/min × 0,00508 para m/s. Interface Aero UI com botão flaps UP/APP e seletor OAT/ISA preservando os quatro cartões.

**Referências exatas em MSL/ISA:** UP 1999 kg = 982 ft/min, APP 1999 kg = 953 ft/min; UP 1900 kg = 1065 ft/min, APP 1900 kg = 1034 ft/min. A 1800kg MSL OAT 15°C, UP 1147,5 ft/min, APP 1120 ft/min. Testes `validate_climb_tables.cjs` conferem dados e domínio; `validate_takeoff_tables.cjs` agora cobre os 1999kg.

**Não aprovado para planejamento de voo.** O perfil individual e os limites de CG e MZFM/MLM devem ser compatíveis com o suplemento e o relatório de peso e balanceamento aplicáveis.

### v0.13.0 — OEI Climb AFM 5.3.8

Novo motor OEI separado em `oei-tables.js`, com três matrizes tabuladas do AFM §5.3.8 para **1.700 kg, 1.900 kg e 1.999 kg**, altitudes de pressão de 0 a 18.000 ft a cada 2.000 ft, temperaturas OAT −20/−10/0/10/20/30/40/50°C e coluna ISA independente. **Valores negativos e zero permanecem válidos**, representando performance de descida/nula: nunca são convertidos em zero nem em subida positiva. **Células riscadas são indisponíveis** (`null`); interpolação linear de massa, altitude e temperatura somente quando todos os pontos adjacentes necessários foram publicados.

Condições fixas AFM: motor remanescente com carga de 92%, motor inoperante embandeirado e assegurado, flaps UP, trem recolhido, VYSE 85 KIAS e sideslip half ball out. Referências ISA/MSL: 1.700 kg = 252 ft/min, 1.900 kg = 175 ft/min e 1.999 kg = 140 ft/min. A 1.999 kg, 18.000 ft ISA, o valor é **−169 ft/min** (descida). O valor zero também é permitido, exemplo 1.999 kg / 4.000 ft / 50°C. Interpolação no exemplo anterior (1.800 kg, SL, 15°C) = 211,25 ft/min (em lugar da aproximação 212 ft/min).

A UI mantém quatro cartões Aero UI, o seletor OAT/ISA, a taxa em ft/min e m/s, e sinaliza em amarelo **ROC inferior a 50 ft/min**, conforme área cinza escura do AFM. ROC negativo é exibido com sinal e identificação de descida. O gráfico marca referências de 0 e 50 ft/min. Regressões em `validate_oei_tables.cjs` incluem todos os valores tabulados, negativos, zeros, 42 células sem dados, interpolação e rejeição de extrapolações. Os testes móveis foram estendidos.

**Atenção:** valores de performance para 1.999 kg não atualizam automaticamente os limites de massa/CG do módulo Weight & Balance; a documentação aplicável à configuração da aeronave e MÄM 42-678 deve ser verificada. Ferramenta experimental, **não usar para voo**.

### v0.13.1 — Aero UI OAT/ISA alignment

Conformidade visual dos cartões de parâmetros: o cabeçalho OAT ocupa a mesma altura que os outros rótulos e o botão ISA fica posicionado independentemente dentro do cartão, sem deslocar o campo numérico. Removido o subtítulo redundante `ONE ENGINE (REMAINING)` do cartão de potência do OEI. Mantidos os quatro parâmetros, tamanhos, espaçamentos gerais, dimensões dos cartões e todos os motores de performance. Regressão em cinco viewports para alinhamento de rótulos e entradas OAT/Pressure Alt, em ambos os modos OAT/ISA.

### v0.13.2 — Engine Power typography

A fonte numérica de `ENGINE POWER` foi unificada às demais entradas do Aero UI por uma **única declaração CSS compartilhada**, incluindo tamanho responsivo, altura de linha, peso, espaçamento e numerais tabulares. Corrigida também a regra específica para telas com largura de até 355px, sem alterar dimensões dos cartões, conteúdo, posições, quatro parâmetros ou resultados aeronáuticos. O teste móvel confere as propriedades tipográficas calculadas em cinco viewports, nos módulos OEI e Cruise.

### v0.13.3 — Climb / OEI Vertical Plots

Os gráficos de resultado de Climb e OEI passaram a representar **a variação de altitude durante um minuto, com a razão de subida (ROC) atual assumida constante nesse minuto**. Um ROC positivo é visualmente ascendente, zero gera linha horizontal e ROC negativo (possível no OEI) gera linha descendente. O sentido visual não é mais a curva de sensibilidade do ROC à temperatura, cujo declínio com OAT crescente era correto numericamente mas podia parecer uma trajetória de voo. Mantidos sem modificações as taxas calculadas das tabelas AFM §5.3.7 e §5.3.8, velocidades, advertência abaixo de 50 ft/min, escala numérica e cartões Aero UI.

A escala do gráfico é **fixa por módulo** (Climb 0–1400 ft e OEI ±320 ft por minuto); não autoajusta para fazer qualquer taxa parecer equivalente. O gráfico é apenas uma visualização linear de taxa instantânea, não representa ângulo de trajetória, altitude realmente alcançável, TAS ou previsão operacional de subida. Testes numéricos de sentido e escala em `validate_vertical_plots.cjs` e testes móveis de Climb positivo, OEI positivo, negativo e nulo em `test_browser.py`.

### v0.13.4 — Curvas Aero UI para Climb e OEI

Os gráficos de resultado de **Climb** e **OEI** foram padronizados com a linguagem visual curva do **Cruise**, usando traçado cúbico Bézier suave de extremidades arredondadas, com ponto final destacado e grade sutil. A curva é esquemática: seus pontos inicial e final permanecem ancorados na variação de altitude equivalente a um minuto à ROC atual, sem representar uma trajetória real ou uma ROC variável. Os controles do traçado não ultrapassam os extremos: subida positiva permanece ascendente, OEI negativo descendente e razão zero horizontal. Os motores de performance e os resultados numéricos continuam inalterados.

Gráficos de **Cruise** já eram curvas suaves e permanecem. Barras segmentadas de **Takeoff/Landing** e linha de gradiente do **Go-Around** permanecem com representação física apropriada, sem curvas decorativas que induzam interpretação incorreta. Novas verificações garantem comandos SVG cúbicos sem segmentos lineares no traçado principal, orientação monotônica e precisão dos extremos; os testes de navegador foram atualizados para os cinco tamanhos de tela.

### v0.14.0 — AFM 5.3.9 Time, Fuel and Distance to Climb

Novo módulo de performance **09 · TIME / FUEL / DISTANCE TO CLIMB**, após Weight & Balance (08), preservando Aero UI Master Design 1.0 (quatro campos e gráfico Bézier suavizado). Entradas: altitude de partida [ft], altitude de destino [ft], massa inicial de subida [kg], OAT na altitude de partida [°C]. Resultados: tempo [min], combustível [US gal] e distância [NM] entre as altitudes informadas.

Tabelas do AFM §5.3.9 para **1700/1900/1999 kg**, altitude 0–18.000 ft a cada 2.000 ft, com cinco colunas digitais por linha: TAS [kt], ROC [ft/min], tempo acumulado [min], combustível acumulado [US gal] e distância acumulada [NM]. O motor `time-to-climb.js` usa exclusivamente interpolação linear entre pesos/altitudes publicados, subtraindo os acumulados da altitude inicial dos acumulados da altitude final; não aproxima o tempo integrando ROC de outra seção.

Condições AFM: ambos 92%, flaps UP, trem recolhido, VY 90 KIAS até 1900 kg ou 92 KIAS acima. Tabelas em ISA e vento zero; não incluem combustível de partida, táxi e decolagem. Para OAT de partida acima da ISA local (ISA = 15 − 2°C por 1000 ft, consistente com as colunas OAT do AFM), a nota AFM adiciona **10% ao tempo, combustível e distância por +10°C**, aplicada aos totais do trecho. Para OAT abaixo da ISA, o aplicativo não concede redução não especificada pelo AFM; OAT excessivamente alta (ΔISA acima de +30°C) é rejeitada como domínio experimental conservador. É assumido desvio ISA constante ao longo da subida para o fator aplicado ao trecho. Não há cálculo de vento, início/táxi/decolagem ou estimativa de autonomia.

**Teste oficial do manual:** altitude de partida 2000 ft/OAT 11°C, destino 16000 ft, massa 1900 kg: acumulados iniciais (2 min, 0,5 US gal, 3 NM), finais (17 min, 4,7 US gal, 29 NM) e resultado **15 min, 4,2 US gal, 26 NM**, sem correção de temperatura. Teste adicional +10°C sobre ISA: 16,5 min, 4,62 US gal, 28,6 NM. Outros cenários entre dados tabulados são interpolados; valores finais não estão aprovados para voo.

Validação em `validate_time_to_climb.cjs` e testes de interface móvel em `test_browser.py`. **Não substitui o AFM e as limitações de massa/CG aplicáveis à aeronave.**

### v0.14.1 — Menu PERFORMANCE com nomes apenas

Menu de módulos simplificado segundo Aero UI Master Design: nove acessos identificados apenas pelo nome funcional (Takeoff, Climb, One Engine Climb / Descent, Cruise, Landing, Abnormal Landing, Go-Around, Weight & Balance e Time/Fuel/Distance to Climb). Removidos integralmente ordinais 01–09, subtítulos operacionais e complementos técnicos dos títulos, mantendo botões, dimensões, destaque do selecionado, link de Weight & Balance e motores de cálculo. Testes móveis exigem nove opções, ausência de subtítulos e texto correto em cinco viewports.

### v0.15.0 — AFM §5.3.10 Cruise Performance

Novo módulo autônomo **CRUISE PERFORMANCE**, preservando o módulo CRUISE anterior e o Aero UI 2×2: altitude de pressão [ft], OAT [°C] ou ΔISA, potência [%, por motor] e massa de referência fixa de **1.999 kg**. Resultados: **TRUE AIRSPEED (KTAS)** e **FUEL FLOW (US gal/h)**. Gráfico suave de TAS versus altitude com indicação da condição selecionada.

Tabela exata fornecida na seção 5.3.10: **9 altitudes (2.000–18.000 ft) × 5 temperaturas (ISA−10, ISA, ISA+10, ISA+20, ISA+30) × 4 linhas de potência**, 180 células Power% / FF / TAS. A potência máxima disponível varia com altitude e temperatura: o modelo usa valores tabulados adjacentes e **não extrapola** fora do envelope de potência. Os pontos tabulados são preservados; interpolação linear apenas entre valores publicados válidos. O sistema considera ISA=15°C−2°C/1.000ft, tal como as tabelas do AFM. Massa, flaps UP e trem recolhido são condições fixas do gráfico.

A nota de instalação **OÄM 42-278 presente e OÄM 42-193 ausente** pode ser representada pelo botão `STANDARD` / `OÄM −2%`, por decisão explícita. O protótipo aplica a redução de 2% sobre TAS calculada, mas conserva o consumo tabulado: a nota não fornece correção independente de fuel flow; a aplicabilidade e interpretação precisam ser confirmadas nas publicações suplementares da aeronave. O modo padrão não presume os equipamentos instalados.

Exemplos exatos: 10.000 ft/ISA/75% = **156 KTAS, 13,0 US gal/h**; 18.000 ft/ISA/85% = **169 KTAS, 15,0 US gal/h**; 18.000 ft/ISA+30/75% = **168 KTAS, 13,0 US gal/h**. Potência de 92% a 18.000 ft ISA não é publicada e é rejeitada.

Testes automatizados: `validate_cruise_performance.cjs` para as 180 células, potência disponível e rejeição de extrapolação; `test_browser.py` para gráficos, controle OAT/ΔISA e mudança da configuração em cinco viewports. **Ferramenta experimental, não aprovada para planejamento ou execução de voo.**

### v0.16.0 — AFM §5.3.11 Landing and Abnormal Landing

Os módulos existentes **LANDING** (Flaps LDG) e **ABNORMAL LANDING** (Flaps APP/UP) agora usam exclusivamente as tabelas oficiais do AFM §5.3.11 para massas **1700/1900/1999 kg**. Altitude de pressão de 0 a 10.000 ft a cada 1.000 ft, OAT 0/10/20/30/40/50°C e coluna ISA **independente**. Cada entrada possui corrida no solo e distância total sobre obstáculo de 15m/50ft. Foram codificados **420 valores publicados e 42 pares de células riscadas**. Células riscadas produzem `CÉLULA NÃO PUBLICADA NO AFM`; nenhuma extrapolação em massa, altitude ou temperatura é permitida.

Parâmetros principais permanecem em quatro cards Aero UI: pressão, OAT (toggle ISA), massa e vento. No seletor RUNWAY ficam pista pavimentada/grama e um slider de **DOWNHILL SLOPE** (controle experimental 0–5%). Aplicação de correções §5.3.11: vento de proa −10% a cada 14 kt e vento de cauda +10% a cada 3 kt (já incluem os ajustes dos componentes 50%/150%); pista pavimentada molhada +15% na distância; grama seca 5cm +10% na corrida, grama 5–10cm +15% na corrida, grama >10cm pelo menos +25% na corrida; grama molhada ou pista macia +10% na corrida; declive +9% na corrida para cada 1%. Os ajustes sobre a corrida são também acrescentados à distância sobre obstáculo. Combinações usam soma de percentuais sobre a corrida base, sem reaplicar componente do vento. **ATENÇÃO:** fatores são típicos, superfície molhada/macia pode exceder estas distâncias e a faixa >10cm é apenas um valor mínimo, não uma previsão precisa. Não é permitida combinação de solo macio com pavimento.

Condições AFM: dois motores IDLE, pista seca/pavimentada/nivelada de referência; `VREF` LDG 84 KIAS até 1900kg, 86 KIAS em 1999kg; APP/UP 86 KIAS até 1900kg, 92 KIAS em 1999kg. Valores acima da massa normal de pouso e configurações de 1999kg dependem da aeronave e suplementos aplicáveis. As configurações da pista são alteradas por controles de interface mantendo a representação proporcional do trecho aéreo e do solo. **Não utilizar para voo.**

Exemplo atualizado LDG 1800kg/SL/15°C/headwind 10kt: **557 m** distância sobre 50ft, **330 m** corrida; abnormal mesma condição: **761 m** e **453 m**. Antigos resultados 480/248 m e 722/418 m eram provenientes de aproximações nomográficas, não das presentes tabelas. Regressão integral em `validate_landing_tables.cjs`, além de testes `validate_landing.cjs`, `validate_modules67.cjs` e navegador `test_browser.py`.

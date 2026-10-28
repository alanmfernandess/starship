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

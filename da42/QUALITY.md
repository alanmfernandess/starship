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

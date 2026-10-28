# Evidências de teste — DA42NG v0.4 (Cruising / TAS)

**Fonte primária:** DA42 NG AFM, Doc. 7.01.15-E, Rev. 1, 18-Feb-2009. Módulo TAS: p. 5-19; demais módulos: p. 5-13, p. 5-15 e p. 5-17.

- **Exemplos impressos:** 370 m / 610 m; 1.150 ft/min; 212 ft/min; **164 KTAS** em 10.000 ft / ISA STD / 80% carga, dois motores.
- **23 pontos TAS fora das ancoragens**: comparação da curva interpolada com pixels traçados separadamente da carta fornecida. Maior diferença entre cálculo e leitura: **0,456 KTAS**; erro absoluto médio **0,101 KTAS**.
- **650 combinações**: pontos da região implementada e testes de continuidade, resultado finito, tendências de carga, temperatura e altitude.
- **8 entradas inválidas**: rejeição de altitude, carga, desvio ISA, configuração de motores e números não finitos.
- **85 testes de interface**: Chromium emulado mobile/touch em cinco viewports (320×690, 390×667, 390×844, 430×932, 706×1200), verificando os quatro módulos e interações.
- **Guarda de extrapolação TAS**: somente 0–14.000 ft, carga 50–92%, ISA −10/+30 °C, TAS da escala 120–180 kt, configuração de dois motores.
- **Pipeline repetível**: `npm test` executa regressão, 23 holdouts e a malha de 650 pontos; `python test_browser.py` testa o frontend quando Chromium/Playwright estiverem instalados.

**Limitação essencial:** leituras de uma única figura rasterizada não quantificam a incerteza de digitalização nem cobrem exaustivamente todas as curvas; a concordância de 0,456 KTAS NÃO é precisão garantida, erro máximo global ou tolerância de segurança. A revisão correta do AFM e suplementos da aeronave devem ser verificados separadamente. Nenhum módulo está aprovado para planejamento ou execução de voo.

**Status:** VALIDADO QUANTO A REGRESSÃO E LEITURAS GRÁFICAS AMOSTRAIS; **NÃO VALIDADO PARA USO OPERACIONAL**.

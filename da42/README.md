# DA42 NG — Aero UI Performance Lab

Protótipo de engenharia de três módulos: **Takeoff Performance**, **Climb Performance (two engines)** e **One Engine Inoperative Climb / Descent**.

**AVISO IMPORTANTE:** os modelos são aproximações paramétricas preliminares inferidas das imagens dos nomogramas fornecidos. Não houve digitalização integral de cada curva nem validação com a revisão aplicável do AFM. **Nunca utilizar os valores para planejamento, despacho ou execução de voo.**

Os três exemplos publicados nas cartas são reproduzidos: Takeoff 370 m (Ground Roll) e 610 m (sobre 50 ft); Climb 1.150 ft/min; OEI 212 ft/min, todos em PA 0 ft, OAT 15°C e massa 1.800 kg (com vento de proa 10 kt apenas no Takeoff). Os demais pontos carecem de validação.

UI mobile-first Aero UI Master Design 1.0: PWA estática offline, campos editáveis, navegação entre módulos, histórico no navegador, curvas de sensibilidade, restrição de intervalos e de ISA+35.

O app está em `da42/index.html` e não modifica `index.html` da ferramenta Starship. Implantação esperada via GitHub Pages deste repositório.

## Desenvolvimento
Abrir os arquivos em um servidor HTTPS estático. Para validação aeronáutica futura: digitalizar as curvas, implementar interpolação por estágio do nomograma, controlar domínio e aplicabilidade do AFM, construir matriz de testes com múltiplos pontos por carta e conduzir revisão independente.

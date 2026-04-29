# MDC pelo Algoritmo de Euclides

## Capítulo 1 — O que é MDC e por que importa

MDC = Maior Divisor Comum entre dois ou mais números. Em sueco: **SGD** (största gemensamma delaren). Em inglês: **GCD** (greatest common divisor).

O MDC é o maior número que divide os dois sem deixar resto. MDC(12, 18) = 6, porque 6 divide tanto o 12 quanto o 18, e nenhum número maior faz o mesmo.

**Por que isso importa?** Por uma razão prática: simplificar frações. Para deixar uma fração na **forma mais simples** (em sueco, *enklaste form*), você divide numerador e denominador pelo MDC. 12/18 ÷ 6/6 = 2/3.

Outra aplicação: dividir conjuntos em grupos iguais. "Tenho 36 doces e 48 salgados, quero bandejas iguais — quantas bandejas no máximo?" MDC(36,48) = 12. Resposta: 12 bandejas (cada com 3 doces e 4 salgados).

Existem três jeitos de calcular MDC: listar divisores (lento), fatoração em primos (médio) e o **Algoritmo de Euclides** (rápido). Os três dão o mesmo resultado, mas Euclides escala melhor para números grandes.

## Capítulo 2 — Listando divisores e fatorando

**Método do listão**: liste todos os divisores de cada número e procure o maior em comum.

Divisores de 12: 1, 2, 3, 4, 6, 12.
Divisores de 18: 1, 2, 3, 6, 9, 18.
Comuns: 1, 2, 3, 6. Maior: 6. → MDC(12,18) = 6.

Funciona perfeitamente para números pequenos. Para 84 e 108, já fica trabalhoso.

**Método da fatoração em primos**: decomponha cada número em produto de primos, depois pegue os comuns elevados ao **menor** expoente.

12 = 2² · 3.
18 = 2 · 3².
Comuns: 2 (menor expoente entre 2² e 2¹ é 2¹) e 3 (menor expoente entre 3¹ e 3² é 3¹).
MDC = 2 · 3 = 6.

Outro exemplo: 60 e 84.
60 = 2² · 3 · 5.
84 = 2² · 3 · 7.
Comuns: 2² e 3.
MDC = 4 · 3 = 12.

A fatoração ensina a ver os números como blocos. Entendendo isso, MDC e MMC ficam intuitivos: MDC pega expoentes **mínimos**; MMC pega expoentes **máximos**.

## Capítulo 3 — O Algoritmo de Euclides

O método do matemático grego (300 a.C.) é elegante e veloz. Você divide o maior pelo menor, anota o **resto**, depois divide o que era divisor pelo novo resto, e segue até obter resto zero. O **último divisor** (aquele que produziu resto zero) é o MDC.

**Exemplo**: MDC(48, 36).

- 48 ÷ 36 → quociente 1, resto 12.
- 36 ÷ 12 → quociente 3, resto 0. ✓
- MDC = 12.

**Outro**: MDC(252, 105).

- 252 ÷ 105 → quociente 2, resto 42.
- 105 ÷ 42 → quociente 2, resto 21.
- 42 ÷ 21 → quociente 2, resto 0. ✓
- MDC = 21.

Note como o algoritmo "dribla" qualquer fatoração. Você nem precisa saber em quais primos os números se decompõem.

Funciona com três ou mais números também: faça MDC de dois e leve o resultado para o terceiro. MDC(a, b, c) = MDC(MDC(a, b), c).

Em provas suecas, o termo **algoritmen från Euklides** aparece. É bom reconhecer.

**Lycka till.**

# Play Cacheta Defold - Pacote Revisado (Etapa com Assets Integrados)

Este pacote revisa a base anterior e já integra os assets enviados para aproximar o projeto de um teste real no Defold.

## O que foi integrado nesta revisão

- Assets reais copiados para o projeto
- Mesa principal (`assets/table.png`)
- Fundo (`assets/background.png`)
- Verso da carta (`assets/card_back.png`)
- Sprite sheet original (`assets/cards_sheet.png`)
- Cartas já recortadas para arquivos individuais em `assets/images/cards/`
- Fontes Roboto em `assets/fonts/`
- Botões PNG originais em `assets/buttons/`
- Áudios (`shuffle.wav`, `cut.wav`, `midnight_deal.mp3`)
- Arquivo `cards.atlas` inicial
- Recursos `.sprite` iniciais
- Recurso `game/card_factory.factory`

## Estrutura importante

- `assets/images/cards/`: cartas recortadas com ids compatíveis com o código (`4_ouros`, `A_paus`, etc.)
- `assets/atlases/cards.atlas`: atlas inicial para ligar no editor
- `game/*.sprite`: recursos sprite básicos
- `game/card_factory.factory`: prototype de carta

## Observação importante

Este pacote está **mais próximo do teste real**, mas ainda pode exigir pequenos ajustes manuais no editor do Defold, especialmente em:

1. Confirmar se o `cards.atlas` gerado atende ao formato do editor na sua versão do Defold
2. Revisar `hud.gui` e criar/posicionar os nodes esperados pelo `hud.gui_script`
3. Confirmar os componentes `sprite` e `factory` nos game objects e coleção principal
4. Ajustar escala/posição final de mesa, HUD e cartas
5. Ajustar o recurso visual da mesa (`table.sprite`) para usar `table.png` em vez do atlas de cartas, se preferir separar recursos

## Mapeamento dos assets integrados

### Cartas
- Origem: `assets/cards_sheet.png`
- Saída recortada: `assets/images/cards/*.png`

### Mesa e fundo
- `assets/table.png`
- `assets/background.png`

### Botões
- `assets/buttons/*.png`

### Fontes
- `assets/fonts/Roboto-Regular.ttf`
- `assets/fonts/Roboto-Medium.ttf`
- `assets/fonts/Roboto-Bold.ttf`

### Áudio
- `assets/shuffle.wav`
- `assets/cut.wav`
- `assets/midnight_deal.mp3`

## Próximo passo recomendado

Abrir este pacote no Defold e fazer a ligação final dos recursos do editor. Depois disso, o ideal é gerar uma nova revisão com o que foi validado dentro do editor.

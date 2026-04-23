## Ligações finais recomendadas no Defold

### main/main.collection
Confirme os ids:
- controller
- deck_pile
- discard_pile
- table
- hud

### controller.go
Confirme o component factory:
- id: card_factory
- prototype: /game/card.go

### card.go
Confirme:
- script: /game/card.script
- sprite: /game/card.sprite

### deck_pile.go
Confirme:
- script: /game/deck_pile.script
- sprite: /game/deck_pile.sprite

### discard_pile.go
Confirme:
- script: /game/discard_pile.script
- sprite: /game/discard_pile.sprite

### table.go
Use `assets/table.png` como base visual. O ideal é criar um atlas separado de mesa/UI depois.

### gui/hud.gui
Crie estes nodes:
- status_label
- turn_label
- deck_label
- discard_label
- melds_label
- deadwood_label
- ready_label
- round_label
- score_label
- melds_table_label
- mode_label
- btn_laydown
- btn_knock
- btn_next_round
- btn_reorder

# nuty

Strona-dysk z nutami na trąbkę.

## Dodawanie nut

1. Wrzuć PDF do `img/`.
2. (opcjonalnie) w `tools/meta.json` ustaw ładny tytuł i kategorię:
   `"nazwa pliku.pdf": {"title": "Tytuł", "tag": "Jazz"}`
3. Uruchom `python tools/build.py` (wymaga `pip install pymupdf pillow`) – wygeneruje miniatury w `thumbs/` i listę `nuty.js`.
4. Commit + push.

Plik wpisany w `ignore` w `tools/meta.json` jest pomijany (np. `Untitled.pdf`, 38 MB).

## Motywy

Każda nuta ma motyw (kolory, znak tekstowy, motto i efekt przy otwarciu okna): pole `"theme"` w `tools/meta.json`.
Gotowe motywy i ich efekty są w `themes.js` – można tam dopisać własne i potem użyć ich nazwy w `meta.json`.

## Wygląd

Kierunek wizualny, paleta, typografia i powody decyzji są w `DESIGN.md`. Strona ma tryb jasny (domyślny) i ciemny (przełącznik w nagłówku, wybór zapamiętany w przeglądarce).

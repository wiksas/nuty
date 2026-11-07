# DESIGN.md

Kierunek wizualny strony z nutami. Każda zmiana wyglądu ma pasować do tego pliku albo go świadomie zmienić.

## Odczyt

Prywatna biblioteka nut na trąbkę dla jednego muzyka i znajomych. Styl: śpiewnik i druk nutowy z mosiężnym akcentem.
Dial: ENERGY 2 / RHYTHM 2 / MOTION 2.

- **ENERGY 2**: duży szeryfowy nagłówek i trąbka na pół ekranu mówią „dzień dobry”, reszta jest spokojna, bo treścią są kartki z nutami.
- **RHYTHM 2**: hero jest asymetryczne (tytuł z lewej, trąbka z prawej), biblioteka to równa siatka, bo nuty są równorzędne.
- **MOTION 2**: trąbka rysuje się raz przy wczytaniu i reaguje na przewijanie oraz kliknięcie; karty tylko unoszą się na hover; okno nut ma jeden przelot cząsteczek motywu przy otwarciu. Bez pętli, bez odsłaniania kart.

## Paleta

| Rola | Jasny | Ciemny | Powód |
|---|---|---|---|
| Papier (tło) | `#f4eee1` | `#14110d` | Kolor kartki śpiewnika; nuty (białe PDF-y) wyglądają na nim naturalnie |
| Karta | `#fbf8f1` | `#1c1813` | O stopień jaśniejsza od tła, żeby kartka odcinała się bez cienia |
| Tusz (tekst) | `#221c15` | `#eee5d3` | Ciepła czerń druku, 14,6:1 / 15:1 |
| Szary tekst | `#5e5446` | `#a89b85` | Opisy i liczniki, 6,4:1 / 6,9:1 |
| Mosiądz (jedyny akcent) | `#8a5c0c` | `#d8aa48` | Kolor instrumentu. Tylko: „trąbkę” w tytule, aktywny filtr, kategoria na karcie, przycisk ▶. 5:1 / 8,8:1 |
| Linie | `#d9cfbc` / `#8c7f6a` | `#3a3226` / `#7f7260` | Jasne linie dzielą sekcje (pięciolinia), ciemniejsze obramowują kontrolki (≥ 3:1) |

Kolory motywów utworów (`themes.js`) pojawiają się tylko w oknie nut (znak, pasek odsłuchu, cząsteczki), nie w siatce. Siatka ma jeden akcent: mosiądz.

Tryb jasny jest domyślny, bo treścią są białe kartki nut. Tryb ciemny jest dla grania wieczorem; wybór zapamiętuje przeglądarka.

## Typografia

- **Cormorant Garamond** (tytuły, kategorie, liczniki, podpowiedzi kursywą): wygląda jak grawerowane tytuły na wydaniach nutowych. Hostowany lokalnie w `fonts/`, żeby nie blokować renderowania.
- **Krój systemowy** (`system-ui`) do tekstu i kontrolek: czytelny na każdym urządzeniu, zero pobierania, nie konkuruje z Cormorantem.
- Bez wersalików z rozstrzeleniem. Etykiety to kursywa szeryfowa, nie „EYEBROW”.

## Kształty i głębia

- Promienie: 4 px kontrolki (filtry, pole wyszukiwania, przyciski), 8 px karty i okno. Bez pigułek i kółek.
- Cień: tylko karta na hover (kartka podniesiona z pulpitu = ta, którą otworzysz) i okno nut (leży nad stroną). Reszta płaska.
- Bez gradientów w interfejsie. Gradient zostaje tylko w rysunku trąbki, gdzie oddaje połysk mosiądzu.

## Motyw rozpoznawczy

Pięciolinia: pięć cienkich linii oddziela trąbkę od biblioteki. Znaki muzyczne (♪ ♫ ♯ ♮) jako znaki motywów zamiast emoji, w tym samym kolorze co tekst pomocniczy.

## Kompozycja

1. Hero: tytuł i jedno zdanie z liczbą utworów po lewej, trąbka po prawej na zakładkę (klikalna, gra). Mieści się w jednym ekranie, pięciolinia jest widoczna pod spodem.
2. Biblioteka: nagłówek z licznikiem i wyszukiwarką w jednym rzędzie, filtry kategorii, siatka kart. Karty są jednakowe, bo nuty są równorzędne.
3. Stopka: jedna linia z opisem i jedna z licencją dźwięku.

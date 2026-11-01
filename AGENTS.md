# AGENTS.md

Statyczna strona-dysk z nutami na trąbkę (GitHub Pages, repo `wiksas/nuty`, gałąź `main`). Bez frameworków i bez bundlera: HTML + CSS + zwykły JS. Język strony i komunikatów: polski.

## Struktura

| Plik / folder | Rola |
|---|---|
| `index.html` | Markup: nagłówek, hero z trąbką (SVG), biblioteka, okno podglądu PDF |
| `style.css` | Cały wygląd. Efekty motywów (`.fx`, `@keyframes fx-*`) są na końcu pliku |
| `app.js` | Scroll-efekty, trąbka (dźwięk), filtry/wyszukiwarka, karty, okno podglądu |
| `themes.js` | Definicje motywów utworów (kolory, emblem, motto, efekt w tle okna) |
| `nuty.js` | **GENEROWANY** przez `tools/build.py`. Nie edytować ręcznie |
| `thumbs/*.webp` | **GENEROWANE** miniatury 1. strony PDF. Nie edytować ręcznie |
| `img/*.pdf` | Źródłowe nuty (PDF) |
| `logo/` | Logo WIKSAS (`logo bez biale.png` jest używane na stronie) |
| `tools/build.py` | Skanuje `img/`, robi miniatury, generuje `nuty.js` |
| `tools/meta.json` | Tytuł, kategoria i motyw każdej nuty (ręcznie edytowany) |

## Dodawanie nowej nuty (standardowa procedura)

1. Wrzuć PDF do `img/`. Nazwa pliku dowolna (spacje i polskie znaki OK, ale zalecane bez polskich znaków).
2. Dopisz wpis w `tools/meta.json` → `pieces`, kluczem jest **dokładna nazwa pliku**:
   ```json
   "nazwa pliku.pdf": {"title": "Ładny tytuł", "tag": "Jazz", "theme": "jazz"}
   ```
   - `title` – wyświetlany tytuł. Brak → tytuł z nazwy pliku.
   - `tag` – kategoria (chip filtra). Brak → `default_tag` („Pozostałe”).
   - `theme` – klucz z `themes.js`. Brak → `default_theme` („default”).
   - Istniejące kategorie: Film i gry, Jazz, Pop i musicale, Sakralne i polskie, Święta, Ćwiczenia, Pozostałe. Nowa kategoria działa automatycznie, ale dopisz ją do `tag_order` w `meta.json`, żeby miała miejsce w kolejności (inaczej ląduje na końcu).
3. Uruchom `python tools/build.py` (wymaga `pip install pymupdf pillow`). Skrypt:
   - tworzy brakujące/nieaktualne `thumbs/<id>.webp` (id = zlatynizowana nazwa pliku),
   - usuwa miniatury po usuniętych PDF-ach,
   - przepisuje `nuty.js` (lista posortowana alfabetycznie po tytule).
4. Zweryfikuj lokalnie: `python -m http.server 8765` w katalogu projektu → `http://127.0.0.1:8765`. Sprawdź kartę, miniaturę, motyw, otwarcie okna. Przy testach zmieniaj URL (np. `?v=2`), bo zmiana samego `#hash` nie przeładowuje strony i zobaczysz starą wersję.
5. Commit + push na `main` (GitHub Pages sam wdroży). Commituj razem: PDF, `thumbs/`, `nuty.js`, `tools/meta.json`.

Usunięcie nuty: skasuj PDF z `img/`, usuń wpis z `meta.json` (opcjonalnie), uruchom `build.py`.

## Dodawanie / zmiana motywu

Motyw to wpis w `window.THEMES` w `themes.js`:

```js
nazwa: { c1: '#hex', c2: '#hex', emblem: '🎺', motto: 'Podpis w oknie (może być pusty).',
         fx: { type: 'fall', glyphs: ['❄', '❅'], n: 40, size: [10, 28], dur: [5, 10], drift: 80 } }
```

- `c1` – główny akcent (obramowanie karty, kategoria, poświata okna), `c2` – kolor dodatkowy cząsteczek.
- `fx.type`: `fall` (opada), `rise` (unosi się), `twinkle` (migocze), `drift` (dryfuje w bok). `drift` w pikselach = rozrzut poziomy dla `fall`/`rise`.
- `n` = liczba cząsteczek, `size` = px [min, max], `dur` = sekundy [min, max].
- Efekty są rysowane tylko po bokach okna i wyłączone na telefonie oraz przy `prefers-reduced-motion` – nie dodawaj efektów nad PDF-em.
- Po dodaniu motywu użyj jego nazwy w `theme` w `meta.json` i uruchom `build.py`.

## Reguły i pułapki

- **Nie edytuj ręcznie** `nuty.js` ani `thumbs/` – zostaną nadpisane.
- **`img/Untitled.pdf`** (38 MB) jest celowo pominięty (`ignore` w `meta.json`) i nie jest commitowany. Nie dodawaj go do repo.
- Strona działa po wrzuceniu na hosting statyczny i po otwarciu z dysku (`file://`); nie używaj `fetch()`/ES modules do własnych plików (nie działają na `file://`) – dlatego dane są w `nuty.js` jako `window.NUTY`, a nie w `.json`.
- Wydajność (wcześniej były lagi przy otwieraniu nut) – nie wprowadzaj z powrotem:
  - `backdrop-filter` / `filter: blur()` na wielu elementach lub na dużych powierzchniach,
  - `filter` na obrazach kart i na SVG trąbki,
  - ładowania PDF do `iframe` w trakcie animacji otwarcia (jest celowe opóźnienie 380 ms w `openViewer`).
  Animuj tylko `transform` i `opacity`.
- Elementy scroll-efektów hero: `.hero` ma 200vh, `.hero-stage` jest `sticky`; postęp `p` (0–1) liczy `update()` w `app.js` i ustawia zmienne CSS `--p`, `--sc`, `--rot`, `--tx`, `--ty`.
- Okno podglądu używa natywnego viewera PDF w `iframe`. Gdy `navigator.pdfViewerEnabled === false` (część mobilnych przeglądarek), pokazuje przycisk „Otwórz nuty” w nowej karcie.
- Adres nuty to `index.html#<id>` (id = slug nazwy pliku PDF). Zmiana nazwy pliku zmienia link do nuty.
- Zmiany tekstów/UI po polsku, w stylu istniejącym (krótko, bez emoji w komunikatach – emoji tylko jako emblematy motywów).

## Commity

Krótkie komunikaty po polsku, np. `nowe nuty`, `motyw: <nazwa>`, `fix: <co>`. Przed pushem upewnij się, że `git status` nie zawiera `img/Untitled.pdf` ani plików tymczasowych.

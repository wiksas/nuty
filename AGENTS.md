# AGENTS.md

Statyczna strona-dysk z nutami na trąbkę (GitHub Pages, repo `wiksas/nuty`, gałąź `main`). Bez frameworków i bez bundlera: HTML + CSS + zwykły JS. Język strony i komunikatów: polski.

## Struktura

| Plik / folder | Rola |
|---|---|
| `index.html` | Markup: nagłówek z przełącznikiem motywu, hero z trąbką (SVG w `<button>`), biblioteka, okno podglądu PDF |
| `style.css` | Cały wygląd (tokeny jasny/ciemny w `:root` i `[data-theme="dark"]`). Efekty motywów (`.fx`, `@keyframes fx-*`) są na końcu pliku |
| `DESIGN.md` | Kierunek wizualny, paleta, typografia, diale i powody decyzji. Czytaj przed zmianą wyglądu |
| `app.js` | Motyw jasny/ciemny, scroll hero, trąbka (dźwięk), filtry/wyszukiwarka, karty, okno podglądu |
| `themes.js` | Definicje motywów utworów (kolory, znak `mark`, motto, efekt przy otwarciu okna) |
| `nuty.js` | **GENEROWANY** przez `tools/build.py`. Nie edytować ręcznie |
| `thumbs/*.webp` | **GENEROWANE** miniatury 1. strony PDF. Nie edytować ręcznie |
| `img/*.pdf` | Źródłowe nuty (PDF) |
| `logo/` | Logo WIKSAS: `logo bez czarne.png` (czarny napis) w trybie jasnym, `logo bez biale.png` (biały napis) w ciemnym i jako favicon |
| `fonts/*.woff2` | Cormorant Garamond (lokalnie, latin + latin-ext, prosty i kursywa) |
| `anti-slop/` | Raporty audytu antislop (`audit-NNN-RRRR-MM-DD.md`) |
| `tools/build.py` | Skanuje `img/`, robi miniatury, generuje `nuty.js` |
| `tools/meta.json` | Tytuł, kategoria i motyw każdej nuty (ręcznie edytowany) |
| `tools/melodies.json` | Zapis początku melodii (do odsłuchu), klucz = id nuty |
| `samples/trumpet.js` | Próbki prawdziwej trąbki (po jednej na półton, MIDI 48–89), ładowane przy pierwszym odsłuchu |
| `audio/<id>.mp3` | Opcjonalne nagranie nuty (też `.ogg`, `.m4a`, `.wav`); ma pierwszeństwo przed melodią z `melodies.json` |

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

## Odsłuch fragmentu (przycisk ▶ w oknie nut)

Przycisk jest widoczny, gdy nuta ma `audio` (nagranie) albo `melody` (syntezator). Oba pola dodaje `build.py`.

- **Nagranie (najlepsza opcja):** wrzuć plik do `audio/` pod nazwą `<id>.mp3`, gdzie `<id>` = slug nazwy PDF (widać go w `nuty.js` w polu `id` albo w adresie `index.html#<id>`). Uruchom `build.py`.
- **Syntezator:** wpis w `tools/melodies.json`:
  ```json
  "<id>": {"bpm": 76, "notes": "B3:1 E4:2 F#4:1.5 R:1 ..."}
  ```
  `notes` = tokeny `NUTA:DŁUGOŚĆ` oddzielone spacją. Wysokość jak **zapisana w nutach** trąbki w B (środkowe C = `C4`, krzyżyki/bemole jawnie, np. `F#4`, `Bb4`), długość w ćwierćnutach (`0.5` ósemka, `1.5` ćwierćnuta z kropką, `0.3333` triola ósemkowa), pauza `R:2`. Nuty złączone ligą sumuj w jedną. Odtwarzacz sam obniża całość o wielką sekundę (trąbka w B brzmi niżej niż zapis; np. zapisane C4 = 261,63 Hz brzmi jak B♭3 = 233,08 Hz).
- **Dźwięk:** nuty grają próbki prawdziwej trąbki z `samples/trumpet.js` (FluidR3_GM, licencja CC BY 3.0 – wymaga podania autora, jest w stopce strony; opakowane przez `gleitz/midi-js-soundfonts`, MIT). Każda próbka jest dostrojona do tabeli Hz równomiernej skali A4 = 440 Hz (`HZ4` w `app.js`; sprawdzone autokorelacją). Gdy próbki się nie wczytają, działa syntezator awaryjny (`playNote`).
- Melodie w `melodies.json` zostały przepisane z obrazów pierwszych taktów (około 10–30 s) i sprawdzone drugi raz, ale nadal mogą zawierać błędy; nagranie w `audio/` je zastępuje. Nuty bez melodii i bez nagrania (Ściągawka, Skale) nie mają przycisku.

### Dodawanie melodii nowej nuty (workflow)

1. Wyrenderuj górną połowę 1. strony PDF (PyMuPDF, ok. 1400–1800 px szerokości) i przepisz początek partii trąbki do `tools/melodies.json` (ok. 8 taktów, maks. ~40 ćwierćnut; pomiń początkowe pauzy; przy partyturze weź górną linię trąbki; ligi tej samej wysokości sumuj).
2. **Sprawdź sumę każdego taktu** (musi dać metrum; takt przedtaktu jest krótszy) i wysokości (zapis w kluczu wiolinowym, uwzględnij znaki przykluczowe i znaki w takcie). Najczęstsze błędy: brakujące całotaktowe pauzy w środku frazy (przesuwają resztę), pomylone C#4/B3 na linii dodanej, pominięty krzyżyk z przykluczy.
3. Zrób niezależną drugą weryfikację (drugi przegląd obrazu nuta po nucie); poprzednio drugi przegląd wyłapał 3 błędy w 26 utworach.
4. Tempo `bpm` weź z oznaczenia w nutach, a gdy go nie ma – dobierz wg charakteru utworu; nie zmieniaj go bez prośby (obecne tempa zostały zaakceptowane).
5. `python tools/build.py` i przetestuj przycisk ▶ w oknie nuty.

Pułapki odsłuchu:
- Próbki mają ciche poziomy (RMS ≈ 0,025) – stała `SAMPLE_GAIN` w `app.js` je podbija; po zmianie źródła próbek sprawdź poziom wyjścia, żeby nie przesterować.
- Pogłos (`ConvolverNode`) jest opcjonalny (`try/catch` w `masterIn`), bo przeglądarki bez ekranu (testy automatyczne) zgłaszają niezgodny `sampleRate` i rzucają wyjątek. Nie usuwaj `try/catch`.
- Zmiana tabeli Hz lub transpozycji (`TRANSPOSE = -2` w `app.js`) zmienia brzmienie wszystkich melodii. Trąbka w B: zapisane C brzmi jak B♭ poniżej.
- Nie wczytuj `samples/trumpet.js` synchronnie w `<head>` – to 1,4 MB; ładuje się leniwie / w czasie bezczynności.

## Dodawanie / zmiana motywu

Motyw to wpis w `window.THEMES` w `themes.js`:

```js
nazwa: { c1: '#hex', c2: '#hex', mark: '♪', motto: 'Podpis w oknie (może być pusty).',
         fx: { type: 'fall', glyphs: ['❄', '❅'], n: 40, size: [10, 28], dur: [5, 10], drift: 80 } }
```

- `c1` – kolor motywu: znak i pasek odsłuchu w oknie (mieszany z kolorem tekstu, żeby był czytelny na jasnym tle), cząsteczki. `c2` – drugi kolor cząsteczek. Kolor motywu nie trafia na karty w siatce (jeden akcent na stronie: mosiądz).
- `mark` – jeden znak tekstowy (Unicode, nie emoji), np. `♫ ⚓ ☾ ✝ ♜`. Kod dokleja `U+FE0E`, żeby system nie podmienił go na kolorowe emoji. Znak, który ma tylko wersję emoji (np. 🦆), się nie nada.
- `fx.type`: `fall` (opada), `rise` (unosi się), `twinkle` (migocze), `drift` (dryfuje w bok). `drift` w pikselach = rozrzut poziomy dla `fall`/`rise`.
- `n` = liczba cząsteczek (rysowana jest połowa), `size` = px [min, max], `dur` = sekundy [min, max], przycinane do 10 s.
- Efekt to **jeden przelot przy otwarciu okna** (bez pętli), tylko po bokach okna, wyłączony na telefonie i przy `prefers-reduced-motion`. Nie dodawaj efektów nad PDF-em ani nieskończonych animacji.
- `glyphs` też tylko znaki tekstowe, bez emoji.
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
- Hero: zwykła sekcja (bez `sticky` i bez `200vh`). Postęp `p` (0–1) liczy `update()` w `app.js` z przewinięcia hero i ustawia zmienną CSS `--p` na `.hero`; z niej idzie ruch trąbki, a wentyle/fale/nutki są sterowane bezpośrednio. Przy `prefers-reduced-motion` `update()` nie rusza trąbki.
- Motyw jasny/ciemny: atrybut `data-theme` na `<html>`, zapis w `localStorage` (`theme`). Skrypt w `<head>` ustawia zapisany tryb przed malowaniem; domyślnie jasny. Nowe kolory dodawaj jako zmienne w obu blokach (`:root` i `[data-theme="dark"]`) i sprawdzaj kontrast (≥ 4,5:1 dla tekstu) w obu.
- Filtry kategorii to przyciski z `aria-pressed` (nie zakładki). Trąbka jest w `<button id="trumpetBtn">`, działa z klawiatury.
- Przycisk ▶ i efekty w oknie nut korzystają z jednego `AudioContext` (`getAudio()`); wszystko trafia przez `masterIn()` (kompresor + pogłos). Nowe dźwięki podłączaj tam, nie do `ctx.destination`.
- Okno podglądu używa natywnego viewera PDF w `iframe`. Gdy `navigator.pdfViewerEnabled === false` (część mobilnych przeglądarek), pokazuje przycisk „Otwórz nuty” w nowej karcie.
- Adres nuty to `index.html#<id>` (id = slug nazwy pliku PDF). Zmiana nazwy pliku zmienia link do nuty.
- Zmiany tekstów/UI po polsku, w stylu istniejącym (krótko, bez emoji, bez em dashy). Przed zmianą wyglądu przeczytaj `DESIGN.md`.

## Commity

Krótkie komunikaty po polsku, np. `nowe nuty`, `motyw: <nazwa>`, `fix: <co>`. Przed pushem upewnij się, że `git status` nie zawiera `img/Untitled.pdf` ani plików tymczasowych.

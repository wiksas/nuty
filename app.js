(() => {
    'use strict';

    document.documentElement.classList.add('js');

    const $ = (s, r = document) => r.querySelector(s);
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const NUTY = window.NUTY || [];
    const TAGS = window.NUTY_TAGS || [];

    /* ====================== Scroll: pasek, topbar, hero, ambient ====================== */
    const progress = $('#progress');
    const topbar = $('#topbar');
    const toTop = $('#toTop');
    const hero = $('.hero');
    const stage = $('#heroStage');
    const trumpet = $('#trumpet');
    const valves = [...document.querySelectorAll('.valve')];
    const waves = [...document.querySelectorAll('.waves path')];
    const notesLayer = $('#trumpetNotes');

    // Nutki wylatujące z dzwonu w rytm scrolla: [glif, start, dx, dy, obrót, skala]
    const FLY = [
        ['♪', .06, 1.0, 1.0, 18, 1.0], ['♫', .16, .8, 1.5, -14, 1.1], ['♩', .26, 1.1, .6, 22, .9],
        ['♬', .36, .9, 1.3, -20, 1.2], ['♪', .46, 1.0, .8, 12, 1.0], ['♫', .56, .7, 1.6, -10, 1.15],
        ['♩', .66, 1.2, 1.0, 25, .95], ['♬', .76, .85, 1.4, -16, 1.1],
    ].map(([g, s, dx, dy, r, sc]) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        el.textContent = g;
        notesLayer.appendChild(el);
        return { el, s, dx, dy, r, sc };
    });

    // Tło: unoszące się nutki z paralaksą
    const ambient = $('#ambient');
    const AMB = Array.from({ length: 12 }, (_, i) => {
        const el = document.createElement('span');
        el.textContent = ['♪', '♫', '♩', '♬', '𝄞'][i % 5];
        const size = 28 + ((i * 37) % 60);
        el.style.fontSize = size + 'px';
        el.style.left = ((i * 83) % 96) + 'vw';
        ambient.appendChild(el);
        return { el, base: (i * 211) % 100, speed: .08 + ((i * 29) % 40) / 100, rot: ((i * 53) % 50) - 25 };
    });

    let ticking = false;
    function update() {
        ticking = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const max = document.documentElement.scrollHeight - vh;

        progress.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;
        topbar.classList.toggle('solid', y > 40);
        toTop.classList.toggle('show', y > vh * .8);

        // Hero: p = 0..1 przez cały sticky-scroll
        const span = hero.offsetHeight - vh;
        const p = reduceMotion || span <= 0 ? 0 : clamp(y / span);
        stage.style.setProperty('--p', p.toFixed(4));
        stage.style.setProperty('--sc', (1 + p * .14).toFixed(4));
        stage.style.setProperty('--rot', (-p * 5).toFixed(3));
        stage.style.setProperty('--tx', (-p * 40).toFixed(2));
        stage.style.setProperty('--ty', (p * 30).toFixed(2));

        if (y < hero.offsetHeight) {
            // wentyle naciskane kolejno
            let pulseSum = 0;
            valves.forEach((v, i) => {
                const s = .1 + i * .2;
                const pulse = Math.max(0, Math.sin(Math.PI * clamp((p - s) / .2)));
                pulseSum += pulse;
                v.style.setProperty('--press', pulse.toFixed(3));
            });
            waves.forEach((w, i) => {
                const o = clamp(pulseSum * .9 - i * .12);
                w.style.opacity = o.toFixed(3);
                w.style.transform = `translateX(${(1 - o) * -10 + p * 20}px)`;
            });
            FLY.forEach(n => {
                const t = clamp((p - n.s) / .32);
                const x = 835 + t * 190 * n.dx;
                const yy = 170 - t * 210 * n.dy + Math.sin(t * 7) * 14;
                n.el.setAttribute('transform', `translate(${x.toFixed(1)} ${yy.toFixed(1)}) rotate(${(n.r * t).toFixed(1)}) scale(${(n.sc * (.6 + t * .6)).toFixed(2)})`);
                n.el.style.opacity = (Math.sin(Math.PI * t) * .95).toFixed(3);
            });
        }

        AMB.forEach(a => {
            const range = vh + 240;
            let ty = ((a.base / 100) * range - y * a.speed) % range;
            if (ty < 0) ty += range;
            a.el.style.transform = `translate3d(0, ${(ty - 120).toFixed(1)}px, 0) rotate(${a.rot + y * .02}deg)`;
        });
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    update();

    /* ====================== Kliknięcie w trąbkę: dźwięk ====================== */
    let audio;
    const MELODY = [ // [numer MIDI (brzmienie), wentyle (indeksy)]
        [60, []], [64, [1]], [67, [0]], [72, []], [67, [0]], [64, [1]],
    ];
    let melodyI = 0;

    function getAudio() {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') audio.resume();
        return audio;
    }

    // Częstotliwości (Hz) nut oktawy 4, równomierna skala, A4 = 440 Hz (pianogrid.com, tunableapp.com).
    // Inne oktawy = mnożenie/dzielenie przez 2. Numer MIDI: C4 = 60, A4 = 69.
    const HZ4 = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];
    const midiHz = m => HZ4[((m % 12) + 12) % 12] * Math.pow(2, Math.floor(m / 12) - 5);

    // Prawdziwa trąbka: próbki FluidR3 (samples/trumpet.js), po jednej na półton; ładowane przy pierwszym użyciu
    const bufCache = new Map();
    let samplesLoading;
    function loadSamples() {
        if (window.TRUMPET_SAMPLES) return Promise.resolve();
        samplesLoading = samplesLoading || new Promise((ok, fail) => {
            const s = document.createElement('script');
            s.src = 'samples/trumpet.js';
            s.onload = ok;
            s.onerror = () => { samplesLoading = null; fail(new Error('brak próbek')); };
            document.head.appendChild(s);
        });
        return samplesLoading;
    }
    async function sampleFor(midi) {
        const keys = Object.keys(window.TRUMPET_SAMPLES).map(Number);
        const key = keys.reduce((a, k) => Math.abs(k - midi) < Math.abs(a - midi) ? k : a);
        if (!bufCache.has(key)) {
            bufCache.set(key, (async () => {
                const bin = atob(window.TRUMPET_SAMPLES[key].split(',')[1]);
                const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
                return getAudio().decodeAudioData(bytes.buffer);
            })());
        }
        return { buf: await bufCache.get(key), rate: Math.pow(2, (midi - key) / 12) };
    }
    // wspólny tor wyjściowy: lekki pogłos + kompresor (próbki są ciche i bez „sali”)
    let chain;
    function masterIn() {
        const ctx = getAudio();
        if (chain && chain.ctx === ctx) return chain.input;
        const input = ctx.createGain();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .2;
        const conv = ctx.createConvolver();
        const len = Math.floor(ctx.sampleRate * 1.3);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const d = ir.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        input.connect(comp);
        try { // pogłos opcjonalny (niektóre środowiska raportują niezgodny sampleRate)
            conv.buffer = ir;
            const wet = ctx.createGain();
            wet.gain.value = .2;
            input.connect(conv); conv.connect(wet); wet.connect(comp);
        } catch { /* sam kompresor */ }
        comp.connect(ctx.destination);
        chain = { ctx, input };
        return input;
    }

    const SAMPLE_GAIN = 6; // próbki mają RMS ok. 0.025
    function playSample(s, dur, at = 0, dest) {
        const ctx = getAudio();
        const t = ctx.currentTime + at;
        const src = ctx.createBufferSource();
        src.buffer = s.buf;
        src.playbackRate.value = s.rate;
        if (dur + .1 > s.buf.duration / s.rate) { // dłuższa nuta niż próbka: zapętl stabilny środek
            src.loop = true; src.loopStart = 1; src.loopEnd = s.buf.duration - .1;
        }
        // "tonguing": filtr otwiera się w ~90 ms, jak przy zadęciu
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = .7;
        lp.frequency.setValueAtTime(1100, t);
        lp.frequency.exponentialRampToValueAtTime(14000, t + .09);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(SAMPLE_GAIN, t + .03);
        g.gain.linearRampToValueAtTime(SAMPLE_GAIN * .88, t + .25);
        g.gain.setValueAtTime(SAMPLE_GAIN * .88, Math.max(t + .26, t + dur - .06));
        g.gain.linearRampToValueAtTime(0, t + dur + .05);
        src.connect(lp).connect(g).connect(dest || masterIn());
        src.start(t);
        src.stop(t + dur + .08);
    }
    async function honk(midi) {
        try { await loadSamples(); playSample(await sampleFor(midi), .9); }
        catch { playNote(midiHz(midi)); }
    }
    (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => loadSamples().catch(() => {}));

    // at – opóźnienie (s) od teraz; sustain – nuta trzymana (odsłuch fragmentu), inaczej krótkie "dmuchnięcie"
    function playNote(freq, dur = .7, at = 0, sustain = false, dest) {
        const ctx = getAudio();
        const t = ctx.currentTime + at;
        const out = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 4;
        const vib = ctx.createOscillator();
        const vibAmt = ctx.createGain();
        vib.frequency.value = 5.2;
        if (sustain) {
            filter.frequency.setValueAtTime(freq * 2.2, t);
            filter.frequency.linearRampToValueAtTime(freq * 6, t + .08);
            filter.frequency.linearRampToValueAtTime(freq * 4, t + dur);
            out.gain.setValueAtTime(.0001, t);
            out.gain.linearRampToValueAtTime(.3, t + .035);
            out.gain.setValueAtTime(.27, Math.max(t + .04, t + dur - .07));
            out.gain.linearRampToValueAtTime(.0001, t + dur);
            vibAmt.gain.setValueAtTime(0, t);
            vibAmt.gain.linearRampToValueAtTime(freq * .005, t + Math.max(.05, Math.min(.4, dur * .7)));
        } else {
            filter.frequency.setValueAtTime(freq * 1.5, t);
            filter.frequency.linearRampToValueAtTime(freq * 7, t + .09);
            filter.frequency.exponentialRampToValueAtTime(freq * 3, t + dur);
            out.gain.setValueAtTime(0, t);
            out.gain.linearRampToValueAtTime(.34, t + .05);
            out.gain.exponentialRampToValueAtTime(.001, t + dur);
            vibAmt.gain.value = freq * .006;
        }
        vib.connect(vibAmt);
        [['sawtooth', 0], ['square', 4]].forEach(([type, detune]) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type; o.detune.value = detune; g.gain.value = type === 'square' ? .35 : 1;
            vibAmt.connect(o.frequency);
            o.connect(g).connect(filter);
            o.start(t); o.stop(t + dur + .05);
        });
        filter.connect(out).connect(dest || masterIn());
        vib.start(t); vib.stop(t + dur + .05);
    }

    function spawnNote() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        el.textContent = ['♪', '♫', '♩', '♬'][Math.random() * 4 | 0];
        el.setAttribute('x', 830); el.setAttribute('y', 180);
        el.style.fill = '#f4d77f'; el.style.fontSize = '46px';
        el.style.fontFamily = "'Segoe UI Symbol','Noto Sans Symbols 2',serif";
        trumpet.appendChild(el);
        const dx = 120 + Math.random() * 140, dy = -(60 + Math.random() * 160);
        el.animate([
            { transform: 'translate(0,0) scale(.5) rotate(0deg)', opacity: 0 },
            { opacity: 1, offset: .2 },
            { transform: `translate(${dx}px,${dy}px) scale(1.2) rotate(${Math.random() * 60 - 30}deg)`, opacity: 0 },
        ], { duration: 1500, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => el.remove();
    }

    trumpet.addEventListener('click', () => {
        const [midi, hit] = MELODY[melodyI++ % MELODY.length];
        honk(midi);
        hit.forEach(i => { valves[i].classList.add('hit'); setTimeout(() => valves[i].classList.remove('hit'), 320); });
        trumpet.classList.remove('honk'); void trumpet.getBoundingClientRect(); trumpet.classList.add('honk');
        spawnNote(); if (Math.random() > .4) setTimeout(spawnNote, 120);
    });

    /* ====================== Reveal ====================== */
    const io = new IntersectionObserver((entries) => {
        const vis = entries.filter(e => e.isIntersecting);
        vis.forEach((e, i) => {
            const el = e.target;
            el.style.setProperty('--d', (Math.min(i, 8) * .07).toFixed(2) + 's');
            el.classList.add('in');
            io.unobserve(el);
            if (el.classList.contains('sheet-card')) {
                // po wejściu zdejmij reveal, żeby hover miał własny, szybki transition
                setTimeout(() => el.classList.remove('reveal', 'in'), 1100 + i * 70);
            }
            if (el.classList.contains('section-head')) countTo(NUTY.length, 900);
        });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    const observeReveals = (root = document) => root.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));

    /* ====================== Biblioteka ====================== */
    const gallery = $('#gallery');
    const chipsEl = $('#chips');
    const searchEl = $('#search');
    const emptyEl = $('#empty');
    const countNum = $('#countNum');
    const countLabel = $('#countLabel');

    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').toLowerCase();
    const plural = n => n === 1 ? 'utwór' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'utwory' : 'utworów';

    let countAnim = 0;
    function countTo(n, ms = 450) {
        cancelAnimationFrame(countAnim);
        const from = parseInt(countNum.textContent, 10) || 0;
        const t0 = performance.now();
        countLabel.textContent = plural(n);
        const step = now => {
            const k = clamp((now - t0) / ms);
            countNum.textContent = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)));
            if (k < 1) countAnim = requestAnimationFrame(step);
        };
        countAnim = requestAnimationFrame(step);
    }

    const state = { tag: 'all', q: '' };
    let visible = NUTY.slice();

    function buildChips() {
        const make = (key, label, n) => {
            const b = document.createElement('button');
            b.className = 'chip' + (state.tag === key ? ' active' : '');
            b.dataset.tag = key;
            b.setAttribute('role', 'tab');
            b.textContent = `${label} · ${n}`;
            return b;
        };
        chipsEl.replaceChildren(
            make('all', 'Wszystkie', NUTY.length),
            ...TAGS.map(t => make(t, t, NUTY.filter(n => n.tag === t).length)),
        );
    }

    function card(n) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sheet-card reveal';
        b.dataset.id = n.id;
        b.setAttribute('aria-label', `Otwórz nuty: ${n.title}`);
        const theme = (window.THEMES || {})[n.theme] || (window.THEMES || {}).default || { c1: '#f4d77f', emblem: '🎺' };
        b.style.setProperty('--accent', theme.c1);

        const thumb = document.createElement('div');
        thumb.className = 'sheet-thumb';
        const img = document.createElement('img');
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
        img.addEventListener('load', () => img.classList.add('loaded'));
        img.src = encodeURI(n.thumb);
        if (img.complete && img.naturalWidth) img.classList.add('loaded');
        const open = document.createElement('span');
        open.className = 'sheet-open'; open.textContent = 'Otwórz';
        const pages = document.createElement('span');
        pages.className = 'sheet-pages'; pages.textContent = n.pages + ' str.';
        const emblem = document.createElement('span');
        emblem.className = 'sheet-emblem'; emblem.textContent = theme.emblem; emblem.setAttribute('aria-hidden', 'true');
        thumb.append(img, open, pages, emblem);

        const meta = document.createElement('div');
        meta.className = 'sheet-meta';
        const tag = document.createElement('span');
        tag.className = 'sheet-tag'; tag.textContent = n.tag;
        const h = document.createElement('h3');
        h.className = 'sheet-title'; h.textContent = n.title;
        meta.append(tag, h);

        b.append(thumb, meta);
        return b;
    }

    function render(animateCount = true) {
        const q = norm(state.q.trim());
        visible = NUTY.filter(n => (state.tag === 'all' || n.tag === state.tag) && (!q || norm(n.title + ' ' + n.tag).includes(q)));
        gallery.replaceChildren(...visible.map(card));
        emptyEl.hidden = visible.length > 0;
        if (animateCount) countTo(visible.length);
        observeReveals(gallery);
    }

    chipsEl.addEventListener('click', e => {
        const b = e.target.closest('.chip');
        if (!b) return;
        state.tag = b.dataset.tag;
        chipsEl.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        render();
    });

    let searchTimer;
    searchEl.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { state.q = searchEl.value; render(); }, 120);
    });

    // rozgrzewka: pobierz PDF do cache, zanim klikniesz
    const warmed = new Set();
    const warm = e => {
        const c = e.target.closest && e.target.closest('.sheet-card');
        if (!c || warmed.has(c.dataset.id)) return;
        warmed.add(c.dataset.id);
        const n = NUTY.find(x => x.id === c.dataset.id);
        if (n) fetch(encodeURI(n.file), { priority: 'low' }).catch(() => {});
    };
    gallery.addEventListener('pointerover', warm);
    gallery.addEventListener('touchstart', warm, { passive: true });

    // spotlight + lekki tilt na kartach
    gallery.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const c = e.target.closest('.sheet-card');
        if (!c) return;
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        c.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
        c.style.setProperty('--rx', (-(y - .5) * 7).toFixed(2) + 'deg');
    });
    gallery.addEventListener('pointerout', e => {
        const c = e.target.closest('.sheet-card');
        if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    });

    gallery.addEventListener('click', e => {
        const c = e.target.closest('.sheet-card');
        if (c) openViewer(c.dataset.id, c);
    });

    /* ====================== Przeglądarka nut ====================== */
    const viewer = $('#viewer');
    const panel = $('#viewerPanel');
    const frame = $('#vFrame');
    const loading = $('#vLoading');
    const fallback = $('#vFallback');
    const canInline = navigator.pdfViewerEnabled !== false;
    let current = -1;
    let list = NUTY;
    let lastFocus = null;
    let loadTimer, closeTimer;

    const fxEl = $('#viewerFx');
    const rnd = (a, b) => a + Math.random() * (b - a);
    let srcTimer;

    function spawnFx(t) {
        fxEl.replaceChildren();
        const panelW = Math.min(960, innerWidth * .96);
        const side = (100 - panelW / innerWidth * 100) / 2; // % szerokości po każdej stronie okna
        if (reduceMotion || innerWidth <= 640 || side < 6) return;
        const f = t.fx, frag = document.createDocumentFragment();
        for (let i = 0; i < f.n; i++) {
            const el = document.createElement('span');
            const dur = rnd(f.dur[0], f.dur[1]);
            el.className = 'fx ' + f.type;
            el.textContent = f.glyphs[Math.random() * f.glyphs.length | 0];
            const left = Math.random() < .5;
            const s = el.style;
            s.setProperty('--x', (left ? rnd(0, side) : rnd(100 - side, 100)).toFixed(1) + '%');
            s.setProperty('--s', rnd(f.size[0], f.size[1]).toFixed(0) + 'px');
            s.setProperty('--dur', dur.toFixed(1) + 's');
            s.setProperty('--delay', (-rnd(0, dur)).toFixed(1) + 's');
            s.setProperty('--o', rnd(.35, .9).toFixed(2));
            s.setProperty('--c', i % 2 ? t.c1 : t.c2);
            s.setProperty('--a', 'fx-' + f.type);
            s.setProperty('--dx', rnd(-(f.drift || 60), f.drift || 60).toFixed(0) + 'px');
            s.setProperty('--r', rnd(-180, 180).toFixed(0) + 'deg');
            s.setProperty('--y', rnd(0, 95).toFixed(0) + '%');
            s.setProperty('--dy', rnd(-80, 80).toFixed(0) + 'px');
            frag.appendChild(el);
        }
        fxEl.appendChild(frag);
    }

    function applyTheme(n) {
        const T = window.THEMES || {};
        const t = T[n.theme] || T.default;
        if (!t) return;
        viewer.style.setProperty('--accent', t.c1);
        viewer.style.setProperty('--accent2', t.c2);
        $('#viewerEmblem').textContent = t.emblem;
        $('#viewerMotto').textContent = t.motto;
        $('#vPlaceholder').src = encodeURI(n.thumb);
        spawnFx(t);
    }

    function show(i, delay = 0) {
        current = (i + list.length) % list.length;
        const n = list[current];
        $('#viewerTitle').textContent = n.title;
        $('#viewerTag').textContent = `${n.tag} · ${n.pages} str.`;
        applyTheme(n);
        stopPlayer();
        vPlay.hidden = !(n.audio || n.melody);
        vPlay.title = n.audio ? 'Posłuchaj nagrania' : 'Posłuchaj początku (syntezator)';
        const href = encodeURI(n.file);
        const name = n.file.split('/').pop();
        $('#vNewTab').href = href;
        const dl = $('#vDownload'); dl.href = href; dl.setAttribute('download', name);
        $('#vFallbackLink').href = href;
        $('#vPrev').disabled = $('#vNext').disabled = list.length < 2;

        clearTimeout(loadTimer);
        frame.classList.remove('ready');
        if (canInline) {
            fallback.hidden = true;
            loading.classList.remove('done');
            frame.hidden = false;
            clearTimeout(srcTimer);
            // PDF ładujemy dopiero po animacji otwarcia – inaczej viewer przycina animację
            srcTimer = setTimeout(() => {
                frame.src = href + '#view=FitH&navpanes=0';
                loadTimer = setTimeout(done, 3500);
            }, delay);
        } else {
            frame.hidden = true; frame.removeAttribute('src');
            fallback.hidden = false;
            loading.classList.add('done');
        }
    }
    function done() { clearTimeout(loadTimer); frame.classList.add('ready'); loading.classList.add('done'); }
    frame.addEventListener('load', () => {
        if (frame.getAttribute('src') === 'about:blank') return;
        done();
        // wbudowany viewer PDF kradnie fokus i połyka Esc / strzałki
        if (viewer.classList.contains('open')) $('#vClose').focus({ preventScroll: true });
    });

    function openViewer(id, originEl, fromHash = false) {
        let idx = visible.findIndex(n => n.id === id);
        list = visible;
        if (idx < 0) { list = NUTY; idx = NUTY.findIndex(n => n.id === id); }
        if (idx < 0) return;

        clearTimeout(closeTimer);
        lastFocus = document.activeElement;

        // animacja "wyrasta z karty"
        const pw = panel.offsetWidth, ph = panel.offsetHeight;
        const left = (innerWidth - pw) / 2, top = (innerHeight - ph) / 2;
        if (originEl) {
            const r = originEl.getBoundingClientRect();
            panel.style.setProperty('--ox', (r.left + r.width / 2 - left) + 'px');
            panel.style.setProperty('--oy', (r.top + r.height / 2 - top) + 'px');
        } else {
            panel.style.setProperty('--ox', '50%'); panel.style.setProperty('--oy', '50%');
        }

        const wasOpen = viewer.classList.contains('open');
        show(idx, wasOpen ? 0 : 380);
        viewer.classList.add('open');
        viewer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('viewer-open');
        $('#vClose').focus({ preventScroll: true });

        const url = '#' + list[current].id;
        if (!wasOpen && !fromHash) history.pushState({ viewer: true }, '', url);
        else history.replaceState(history.state, '', url);
    }

    function hideViewer() {
        if (!viewer.classList.contains('open')) return;
        viewer.classList.remove('open');
        viewer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('viewer-open');
        clearTimeout(loadTimer);
        clearTimeout(srcTimer);
        stopPlayer();
        closeTimer = setTimeout(() => { frame.src = 'about:blank'; frame.classList.remove('ready'); fxEl.replaceChildren(); }, 450);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    function closeViewer() {
        hideViewer();
        if (history.state && history.state.viewer) history.back(); // cofnij wpis z hashem
        else history.replaceState(null, '', location.pathname + location.search);
    }

    addEventListener('popstate', () => {
        const id = decodeURIComponent(location.hash.slice(1));
        if (id && NUTY.some(n => n.id === id)) openViewer(id, null, true);
        else hideViewer();
    });

    viewer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeViewer(); });
    $('#vClose').addEventListener('click', closeViewer);
    $('#vPrev').addEventListener('click', () => { show(current - 1); history.replaceState(history.state, '', '#' + list[current].id); });
    $('#vNext').addEventListener('click', () => { show(current + 1); history.replaceState(history.state, '', '#' + list[current].id); });

    addEventListener('keydown', e => {
        if (!viewer.classList.contains('open')) return;
        if (e.key === 'Escape') closeViewer();
        else if (e.key === 'ArrowLeft') $('#vPrev').click();
        else if (e.key === 'ArrowRight') $('#vNext').click();
        else if (e.key === 'Tab') { // zamknięty obieg fokusu w oknie
            const f = [...viewer.querySelectorAll('button:not([disabled]), a[href]')].filter(x => !x.closest('[hidden]'));
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* ====================== Odsłuch fragmentu nut ====================== */
    const vPlay = $('#vPlay');
    const progressEl = $('#viewerProgress');
    const emblemEl = $('#viewerEmblem');
    const TRANSPOSE = -2; // trąbka w B brzmi o sekundę wielką niżej niż zapis
    const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let player = null;

    function parseMelody(m) {
        const ev = [];
        let beat = 0;
        for (const tok of m.notes.trim().split(/\s+/)) {
            const [p, d] = tok.split(':');
            const b = parseFloat(d);
            if (!(b > 0)) continue;
            const mm = /^([A-G])([#b]?)(-?\d)$/.exec(p);
            if (mm) ev.push({ beat, b, midi: 12 * (+mm[3] + 1) + SEMI[mm[1]] + (mm[2] === '#' ? 1 : mm[2] === 'b' ? -1 : 0) + TRANSPOSE });
            beat += b;
        }
        return { ev, total: beat };
    }

    function stopPlayer() {
        if (!player) return;
        player.stop();
        player = null;
        vPlay.classList.remove('playing');
        progressEl.style.transform = 'scaleX(0)';
        emblemEl.style.transform = '';
    }

    async function startPlayer(n) {
        stopPlayer();
        vPlay.classList.add('playing');
        const me = { cancelled: false, stop() { this.cancelled = true; } };
        player = me;
        if (n.audio) {
            const a = new Audio(encodeURI(n.audio));
            a.addEventListener('timeupdate', () => {
                progressEl.style.transform = `scaleX(${a.duration ? clamp(a.currentTime / a.duration) : 0})`;
            });
            a.addEventListener('ended', stopPlayer);
            a.play().catch(stopPlayer);
            me.stop = () => { a.pause(); a.removeAttribute('src'); a.load(); };
            return;
        }
        const ctx = getAudio();
        const spb = 60 / n.melody.bpm;
        const { ev, total } = parseMelody(n.melody);

        // prawdziwa trąbka; gdy próbki się nie wczytają – syntezator
        vPlay.classList.add('loading');
        let samples = null;
        try {
            await loadSamples();
            samples = new Map(await Promise.all([...new Set(ev.map(e => e.midi))].map(async m => [m, await sampleFor(m)])));
        } catch { /* syntezator */ }
        vPlay.classList.remove('loading');
        if (me.cancelled) return;

        const bus = ctx.createGain();
        bus.gain.value = .9;
        bus.connect(masterIn());
        const lead = .12;
        ev.forEach(e => {
            const dur = e.b * spb * .96, at = lead + e.beat * spb;
            if (samples) playSample(samples.get(e.midi), dur, at, bus);
            else playNote(midiHz(e.midi), dur, at, true, bus);
        });
        const t0 = ctx.currentTime + lead;
        let raf = 0;
        const loop = () => {
            const el = ctx.currentTime - t0;
            progressEl.style.transform = `scaleX(${clamp(el / (total * spb))})`;
            const cur = ev.findLast ? ev.findLast(e => e.beat * spb <= el) : null;
            if (cur) emblemEl.style.transform = `scale(${1 + .16 * Math.max(0, 1 - (el - cur.beat * spb) / .3)})`;
            if (el >= total * spb) stopPlayer(); else raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        me.stop = () => {
            me.cancelled = true;
            cancelAnimationFrame(raf);
            bus.gain.setTargetAtTime(0, ctx.currentTime, .03);
            setTimeout(() => bus.disconnect(), 300);
        };
    }

    vPlay.addEventListener('click', () => {
        if (player) stopPlayer();
        else if (current >= 0) startPlayer(list[current]);
    });

    /* ====================== Start ====================== */
    $('#year').textContent = new Date().getFullYear();
    buildChips();
    render(false);
    countNum.textContent = '0';
    countLabel.textContent = plural(NUTY.length);
    observeReveals();

    const hashId = decodeURIComponent(location.hash.slice(1));
    if (hashId && NUTY.some(n => n.id === hashId)) {
        requestAnimationFrame(() => openViewer(hashId, null, true));
    }
})();

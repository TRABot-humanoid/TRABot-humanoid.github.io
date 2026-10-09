(() => {
  const $ = (id) => document.getElementById(id);
  const CASES = window.TRABOT_CASES || [];

  /* ── hero video: plays only on request, with sound ── */
  const hero = $('heroVideo'), heroSound = $('heroSound'), heroPlay = $('heroPlay'), heroBig = $('heroBig');
  const toggleHero = () => (hero.paused ? hero.play() : hero.pause());
  heroBig.addEventListener('click', toggleHero);
  heroPlay.addEventListener('click', toggleHero);
  hero.addEventListener('click', toggleHero);
  const heroState = () => {
    hero.parentNode.classList.toggle('is-playing', !hero.paused);
    heroPlay.textContent = hero.paused ? 'Play' : 'Pause';
  };
  hero.addEventListener('play', heroState);
  hero.addEventListener('pause', heroState);
  heroSound.addEventListener('click', () => {
    hero.muted = !hero.muted;
    heroSound.textContent = hero.muted ? 'Sound off' : 'Sound on';
    heroSound.setAttribute('aria-pressed', String(!hero.muted));
  });
  // only one thing makes sound at a time
  const film = document.querySelector('.film');
  film.addEventListener('play', () => hero.pause());
  hero.addEventListener('play', () => { film.pause(); if (typeof setPlaying === 'function' && playing) setPlaying(false); });

  /* ── conditions ── */
  const CONDS = [
    { key: 'speech', name: 'Speech', note: 'No face, neutral body' },
    { key: 'face', name: 'Speech + Face', note: 'Animated face, neutral body' },
    { key: 'simple', name: 'Simple Motion', note: 'Face + a few preset gestures in random order' },
    { key: 'random', name: 'Random Motion', note: 'Face + approved atoms, chosen at random' },
    { key: 'full', name: 'TRABot', note: 'Face + semantically planned atoms' },
  ];
  const SIMPLE = { joint_presentation_gesture: 'preset A', joint_presentation_gesture_b: 'preset B', joint_presentation_gesture_c: 'preset C' };

  const tiles = $('tiles');
  const vids = {};
  CONDS.forEach((c) => {
    const el = document.createElement('article');
    el.className = 'tile tile--' + c.key;
    el.innerHTML = `<div class="tile__view"><video muted playsinline preload="auto"></video></div><h3>${c.name}</h3><p>${c.note}</p><p class="seq"></p>`;
    tiles.appendChild(el);
    vids[c.key] = el.querySelector('video');
    c.seq = el.querySelector('.seq');
  });
  const master = vids.full;

  /* ── case list ── */
  const list = $('caseList');
  CASES.forEach((c, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"><i>${String(c.n).padStart(2, '0')}</i><span>${c.user}</span></button>`;
    li.firstChild.addEventListener('click', () => select(i, true));
    list.appendChild(li);
  });

  /* ── score ── */
  const playBtn = $('playBtn'), muteBtn = $('muteBtn'), playhead = $('playhead'), hit = $('scoreHit');
  let cur = null, playing = false, muted = false, raf = 0;
  const pct = (t) => ((t - cur.win[0]) / (cur.win[1] - cur.win[0])) * 100;

  function drawScore() {
    const [t0, t1] = cur.win, span = t1 - t0;
    const n = cur.wave.length;
    $('wave').setAttribute('viewBox', `0 0 ${n} 100`);
    $('wave').innerHTML = cur.wave.map((v, i) => {
      const h = Math.max(2, v * 84);
      return `<rect x="${i + 0.15}" y="${50 - h / 2}" width="0.7" height="${h}" rx="0.3"/>`;
    }).join('');

    const fb = $('faceBar');
    fb.style.left = pct(cur.face[0]) + '%';
    fb.style.width = ((cur.face[1] - cur.face[0]) / span) * 100 + '%';

    $('actTrack').innerHTML = cur.actions.map((a, i) => {
      const w = a.e - a.s, b = Math.min(a.bridge, w) / w * 100;
      const label = a.fn === 'neutral' ? 'neutral' : a.fn;
      return `<div class="act${a.fn === 'neutral' ? ' act--neutral' : ''}" data-i="${i}" title="${label} · ${w.toFixed(2)} s${a.atom ? ' · ' + a.atom : ''}" style="left:${pct(a.s)}%;width:calc(${(w / span) * 100}% - 2px)"><span class="act__bar"><span class="act__bridge" style="width:${b}%"></span><span class="act__atom"></span></span><span class="act__label">${label}</span></div>`;
    }).join('');

    const zero = cur.speech[0];
    let ticks = '';
    for (let s = Math.ceil(t0 - zero); s <= t1 - zero; s++) {
      if (s % 2 && span > 9) continue;
      ticks += `<span class="tick${s === 0 ? ' tick--zero' : ''}" style="left:${pct(zero + s)}%">${s === 0 ? '0 s' : (s > 0 ? '+' : '−') + Math.abs(s)}</span>`;
    }
    $('axis').innerHTML = ticks;
    $('tiouNote').textContent = cur.tiou ? `Speech and gesture overlap for ${cur.tiou.toFixed(1)}% of this reply.` : '';
  }

  function paint(t) {
    playhead.style.left = Math.min(100, Math.max(0, pct(t))) + '%';
    hit.setAttribute('aria-valuenow', String(Math.round(pct(t))));
    const rel = t - cur.speech[0];
    $('clock').textContent = (rel < 0 ? '−' : '+') + Math.abs(rel).toFixed(1) + ' s';
    let on = -1;
    cur.actions.forEach((a, i) => { if (t >= a.s && t < a.e) on = i; });
    document.querySelectorAll('#actTrack .act').forEach((el, i) => el.classList.toggle('is-on', i === on));
    $('nowFn').textContent = on >= 0 ? '▸ ' + cur.actions[on].fn : '';
  }

  function seekAll(t) {
    Object.values(vids).forEach((v) => { try { v.currentTime = Math.min(t, (v.duration || t + 1) - 0.05); } catch (e) {} });
    paint(t);
  }

  function setPlaying(p) {
    playing = p;
    playBtn.textContent = p ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play');
    cancelAnimationFrame(raf);
    if (p) {
      hero.pause(); film.pause();
      if (master.currentTime >= cur.win[1] - 0.05) seekAll(cur.win[0]);
      master.muted = muted;
      Object.values(vids).forEach((v) => v.play().catch(() => {}));
      raf = requestAnimationFrame(loop);
    } else {
      Object.values(vids).forEach((v) => v.pause());
    }
  }

  function loop() {
    const t = master.currentTime;
    if (t >= cur.win[1] || master.ended) { setPlaying(false); paint(cur.win[1]); return; }
    // keep the four muted clips locked to the one that carries audio
    for (const k in vids) {
      const v = vids[k];
      if (v === master || v.ended) continue;
      if (Math.abs(v.currentTime - t) > 0.12) v.currentTime = t;
    }
    paint(t);
    raf = requestAnimationFrame(loop);
  }

  function select(i, autoplay) {
    setPlaying(false);
    cur = CASES[i];
    [...list.children].forEach((li, j) => li.firstChild.setAttribute('aria-current', String(i === j)));
    $('userText').textContent = cur.user;
    $('replyText').textContent = cur.reply;
    drawScore();
    let ready = 0;
    CONDS.forEach((c) => {
      const v = vids[c.key], clip = cur.clips[c.key];
      const acts = clip.actions || (c.key === 'full' ? cur.actions.filter((a) => a.fn !== 'neutral').map((a) => a.fn) : []);
      c.seq.textContent = acts.map((a) => SIMPLE[a] || a).join(' → ');
      v.onloadeddata = () => {
        v.currentTime = cur.win[0];
        if (++ready === CONDS.length && autoplay) setPlaying(true);
      };
      v.src = clip.src;
      v.load();
    });
    paint(cur.win[0]);
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  muteBtn.addEventListener('click', () => {
    muted = !muted; master.muted = muted;
    muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
    muteBtn.setAttribute('aria-pressed', String(muted));
  });

  /* scrub */
  const toTime = (ev) => {
    const r = hit.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    return cur.win[0] + f * (cur.win[1] - cur.win[0]);
  };
  let dragging = false;
  hit.addEventListener('pointerdown', (ev) => { dragging = true; hit.setPointerCapture(ev.pointerId); seekAll(toTime(ev)); });
  hit.addEventListener('pointermove', (ev) => { if (dragging) seekAll(toTime(ev)); });
  hit.addEventListener('pointerup', () => { dragging = false; });
  hit.addEventListener('keydown', (ev) => {
    const d = ev.key === 'ArrowRight' ? 0.25 : ev.key === 'ArrowLeft' ? -0.25 : 0;
    if (d) { ev.preventDefault(); seekAll(Math.min(cur.win[1], Math.max(cur.win[0], master.currentTime + d))); }
    if (ev.key === ' ') { ev.preventDefault(); setPlaying(!playing); }
  });

  if (CASES.length) select(4, false); // open on the basketball turn

  /* ── user study table ── */
  const STUDY = [
    ['Speech', 'no face, no gesture', 1.0958, 1.1042, 1.0958, null, 0.83],
    ['Speech + Face', 'adds the animated face', 2.1042, 2.0958, 2.0833, null, 0.42],
    ['Simple Motion', 'adds preset gestures', 3.1458, 3.1333, 3.1583, 3.1458, 0.42],
    ['Random Motion', 'our atoms, random choice', 3.8667, 3.9083, 3.8708, 3.8625, 13.75],
    ['TRABot', 'our atoms, semantic planner', 4.7875, 4.7583, 4.7917, 4.7708, 84.58],
  ];
  const body = document.querySelector('#studyTable tbody');
  STUDY.forEach((r, i) => {
    const cells = r.slice(2, 6).map((v) => v == null
      ? '<td><span class="cell--na">n/a</span></td>'
      : `<td><span class="cell" style="--v:${v / 5}"><b>${v.toFixed(2)}</b><i></i></span></td>`).join('');
    const pref = `<td><span class="cell" style="--v:${r[6] / 100}"><b>${r[6]}%</b><i></i></span></td>`;
    body.insertAdjacentHTML('beforeend', `<tr${i === 4 ? ' class="is-ours"' : ''}><th scope="row">${r[0]}<small>${r[1]}</small></th>${cells}${pref}</tr>`);
  });

  /* ── bibtex ── */
  $('copyBib').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('bibtex').textContent); $('copyBib').textContent = 'Copied'; }
    catch (e) { $('copyBib').textContent = 'Select & copy'; }
    setTimeout(() => { $('copyBib').textContent = 'Copy'; }, 1600);
  });
})();

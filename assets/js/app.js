/* ==========================================================================
   Тест: органічні речовини — логіка
   Дані зберігаються локально в браузері користувача (localStorage).
   ========================================================================== */
(function () {
  'use strict';

  var DB_KEY = 'organika-test-v1';
  var THEME_KEY = 'organika-test-theme';
  var Q = window.QUESTIONS || [];

  /* ---------- дрібні помічники ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function load() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || { users: {}, current: null }; }
    catch (e) { return { users: {}, current: null }; }
  }
  function save(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { toast('Браузер не дає зберегти дані — перевір налаштування приватності'); }
  }
  var db = load();

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 400);
    }, 2600);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function gradeOf(pct) {
    if (pct >= 95) return 12;
    if (pct >= 90) return 11;
    if (pct >= 85) return 10;
    if (pct >= 78) return 9;
    if (pct >= 70) return 8;
    if (pct >= 62) return 7;
    if (pct >= 52) return 6;
    if (pct >= 42) return 5;
    if (pct >= 32) return 4;
    if (pct >= 22) return 3;
    if (pct >= 12) return 2;
    return 1;
  }

  function verdictOf(pct) {
    if (pct >= 90) return { t: 'Відмінно!', p: 'Матеріал ти знаєш. До дошки можна виходити хоч зараз.' };
    if (pct >= 75) return { t: 'Дуже добре', p: 'Основне тримаєш упевнено. Пробіжись по питаннях, де помилився — і буде ідеально.' };
    if (pct >= 60) return { t: 'Непогано', p: 'База є, але кілька тем пливуть. Подивись розбір помилок і спробуй ще раз.' };
    if (pct >= 40) return { t: 'Треба підтягнути', p: 'Половина відповідей мимо. Перечитай матеріал і повертайся — спроб необмежено.' };
    return { t: 'Поки що слабко', p: 'Схоже, тему ще не читав. Це не страшно: розбір нижче, а потім спробуй заново.' };
  }

  /* ---------- тема ---------- */
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    savedTheme = 'dark';
  }
  document.documentElement.setAttribute('data-theme', savedTheme || 'light');

  $('#themeBtn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  /* ---------- навігація між екранами ---------- */
  function go(name) {
    $$('.screen').forEach(function (s) { s.classList.remove('is-active'); });
    var el = $('#screen-' + name);
    if (el) el.classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'profile') renderProfile();
  }
  $$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var target = b.getAttribute('data-go');
      if (target === 'auth') {
        if (me()) { go('profile'); return; }
        renderKnown();
      }
      go(target);
    });
  });

  /* ---------- поточний користувач ---------- */
  function me() { return db.current ? db.users[db.current] : null; }

  function paintUser() {
    var u = me();
    var chip = $('#userChip'), navProf = $('#navProfile'), loginLink = $('#loginLink');
    if (u) {
      chip.hidden = false;
      navProf.hidden = false;
      if (loginLink) loginLink.hidden = true;
      $('#userName').textContent = u.name;
      $('#userAva').textContent = u.name.trim().charAt(0).toUpperCase();
    } else {
      chip.hidden = true;
      navProf.hidden = true;
      if (loginLink) loginLink.hidden = false;
    }
  }

  $('#logoutBtn').addEventListener('click', function () {
    db.current = null; save(db); paintUser();
    renderKnown(); go('auth');
    toast('Впиши інше ім\'я');
  });

  /* ---------- «представся»: тільки ім'я, без паролів ---------- */
  function showErr(msg) {
    var e = $('#authErr');
    e.textContent = msg;
    e.hidden = false;
  }

  function keyOf(name) { return name.trim().toLowerCase().replace(/\s+/g, ' '); }

  function useUser(key, name, group) {
    if (!db.users[key]) {
      db.users[key] = { name: name, group: group || '—', attempts: [] };
    } else if (group) {
      db.users[key].group = group;
    }
    db.current = key;
    save(db);
    paintUser();
  }

  function renderKnown() {
    var keys = Object.keys(db.users);
    var box = $('#known'), list = $('#knownList');
    if (!keys.length) { box.hidden = true; return; }
    list.innerHTML = '';
    keys.slice(-6).reverse().forEach(function (k) {
      var u = db.users[k];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'known-btn';
      b.innerHTML = '<span class="ava">' + u.name.trim().charAt(0).toUpperCase() + '</span>' + u.name;
      b.addEventListener('click', function () {
        useUser(k, u.name, u.group);
        toast('Вітаю, ' + u.name.split(' ')[0] + '!');
        go('profile');
      });
      list.appendChild(b);
    });
    box.hidden = false;
  }

  $('#authForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim();
    var group = $('#fGroup').value.trim();

    if (name.length < 3) return showErr('Впиши ім\'я — хоча б 3 символи.');
    if (name.length > 40) return showErr('Задовге ім\'я. Вкороти, будь ласка.');

    $('#authErr').hidden = true;
    useUser(keyOf(name), name, group);
    $('#authForm').reset();
    go('quiz');
    startQuiz();
  });

  /* ---------- тест ---------- */
  var qi = 0, correct = 0, answers = [], t0 = 0, tick = null;

  function startQuiz() {
    qi = 0; correct = 0; answers = [];
    $('#qTotal').textContent = Q.length;
    t0 = Date.now();
    clearInterval(tick);
    tick = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      $('#qTimer').textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
    }, 1000);
    $('#qTimer').textContent = '00:00';
    renderQ();
  }

  function renderQ() {
    var q = Q[qi];
    var card = $('#qCard');
    card.classList.remove('swap');
    void card.offsetWidth;
    card.classList.add('swap');

    $('#qNow').textContent = qi + 1;
    $('#qBar').style.width = (qi / Q.length * 100) + '%';
    $('#qText').textContent = q.q;
    $('#qScore').textContent = 'Правильних: ' + correct;
    $('#qWhy').hidden = true;
    $('#qNext').hidden = true;

    var letters = ['А', 'Б', 'В', 'Г'];
    var box = $('#qOpts');
    box.innerHTML = '';
    q.o.forEach(function (text, i) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.type = 'button';
      b.innerHTML = '<span class="k">' + (letters[i] || i + 1) + '</span><span>' + text + '</span>';
      b.addEventListener('click', function () { answer(i); });
      box.appendChild(b);
    });
  }

  function answer(chosen) {
    var q = Q[qi];
    var opts = $$('.opt', $('#qOpts'));
    opts.forEach(function (b, i) {
      b.disabled = true;
      if (i === q.ok) b.classList.add('right');
      else if (i === chosen) b.classList.add('wrong');
    });

    var good = chosen === q.ok;
    if (good) correct++;
    answers.push({ chosen: chosen, ok: good });

    var why = $('#qWhy');
    why.className = 'explain ' + (good ? 'ok' : 'no');
    why.innerHTML = '<b>' + (good ? 'Правильно.' : 'Не так.') + '</b> ' + q.why;
    why.hidden = false;

    $('#qScore').textContent = 'Правильних: ' + correct;
    var nb = $('#qNext');
    nb.textContent = qi === Q.length - 1 ? 'Побачити результат' : 'Далі';
    nb.hidden = false;
    nb.onclick = function () {
      qi++;
      if (qi >= Q.length) finish(); else renderQ();
    };
  }

  function finish() {
    clearInterval(tick);
    var pct = Math.round(correct / Q.length * 100);
    var grade = gradeOf(pct);
    var v = verdictOf(pct);
    var secs = Math.floor((Date.now() - t0) / 1000);

    var u = me();
    if (u) {
      u.attempts.push({
        ts: Date.now(), correct: correct, total: Q.length,
        pct: pct, grade: grade, secs: secs
      });
      save(db);
    }

    $('#resPct').textContent = pct + '%';
    $('#resRaw').textContent = correct + ' / ' + Q.length;
    $('#resGrade').textContent = grade + ' балів за 12-бальною шкалою';
    $('#resTitle').textContent = v.t;
    $('#resText').textContent = v.p;

    var ring = $('#ringFg');
    ring.style.strokeDashoffset = 540.35;
    $('#review').hidden = true;
    $('#review').innerHTML = '';
    go('result');
    setTimeout(function () {
      ring.style.strokeDashoffset = 540.35 * (1 - pct / 100);
    }, 220);
    countUp($('#resPct'), pct);
  }

  function countUp(el, target) {
    var start = performance.now(), dur = 1200;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + '%';
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  $('#startBtn').addEventListener('click', function () {
    if (!me()) { renderKnown(); go('auth'); return; }
    go('quiz'); startQuiz();
  });
  $('#againBtn').addEventListener('click', function () { go('quiz'); startQuiz(); });
  $('#profStart').addEventListener('click', function () { go('quiz'); startQuiz(); });

  $('#reviewBtn').addEventListener('click', function () {
    var box = $('#review');
    if (!box.hidden) { box.hidden = true; return; }
    box.innerHTML = '';
    var letters = ['А', 'Б', 'В', 'Г'];
    answers.forEach(function (a, i) {
      var q = Q[i];
      var d = document.createElement('div');
      d.className = 'rev-item' + (a.ok ? '' : ' bad');
      d.innerHTML =
        '<div class="rev-q">' + (i + 1) + '. ' + q.q + '</div>' +
        (a.ok
          ? '<div class="rev-line"><span class="rev-ok">Твоя відповідь правильна:</span> ' + q.o[q.ok] + '</div>'
          : '<div class="rev-line"><span class="rev-no">Ти вибрав:</span> ' + letters[a.chosen] + ' — ' + q.o[a.chosen] + '</div>' +
            '<div class="rev-line"><span class="rev-ok">Правильно:</span> ' + letters[q.ok] + ' — ' + q.o[q.ok] + '</div>') +
        '<div class="rev-line">' + q.why + '</div>';
      box.appendChild(d);
    });
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- кабінет ---------- */
  function renderProfile() {
    var u = me();
    if (!u) { go('auth'); return; }

    $('#profName').textContent = u.name;
    $('#profGroup').textContent = u.group && u.group !== '—' ? 'Група ' + u.group : 'Група не вказана';

    var a = u.attempts || [];
    var best = a.reduce(function (m, x) { return Math.max(m, x.grade); }, 0);
    var last = a.length ? a[a.length - 1] : null;
    var avg = a.length ? Math.round(a.reduce(function (s, x) { return s + x.pct; }, 0) / a.length) : null;

    $('#stBest').textContent = a.length ? best : '—';
    $('#stLast').textContent = last ? last.grade : '—';
    $('#stTries').textContent = a.length;
    $('#stAvg').textContent = avg === null ? '—' : avg + '%';

    var h = $('#history');
    h.innerHTML = '';
    if (!a.length) {
      h.innerHTML = '<div class="empty">Спроб ще не було. Натисни «Пройти тест» — результат з\'явиться тут.</div>';
    } else {
      a.slice().reverse().forEach(function (x) {
        var d = new Date(x.ts);
        var row = document.createElement('div');
        row.className = 'hrow';
        row.innerHTML =
          '<span class="when">' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
          ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span>' +
          '<span class="pct">' + x.correct + '/' + x.total + ' · ' + x.pct + '%</span>' +
          '<span class="bal">' + x.grade + '</span>';
        h.appendChild(row);
      });
    }

    var board = $('#board');
    board.innerHTML = '';
    var rows = Object.keys(db.users).map(function (k) {
      var uu = db.users[k];
      var b = (uu.attempts || []).reduce(function (m, x) { return Math.max(m, x.grade); }, 0);
      return { key: k, name: uu.name, group: uu.group, best: b, tries: (uu.attempts || []).length };
    }).filter(function (r) { return r.tries > 0; })
      .sort(function (x, y) { return y.best - x.best; });

    if (!rows.length) {
      board.innerHTML = '<div class="empty">Поки що ніхто не проходив тест на цьому пристрої.</div>';
    } else {
      rows.forEach(function (r, i) {
        var row = document.createElement('div');
        row.className = 'brow' + (r.key === db.current ? ' me' : '');
        row.innerHTML =
          '<span class="rank">' + (i + 1) + '</span>' +
          '<span class="who">' + r.name + (r.group && r.group !== '—' ? ' · ' + r.group : '') + '</span>' +
          '<span class="bal">' + r.best + '</span>';
        board.appendChild(row);
      });
    }
  }

  /* ---------- поява блоків при прокручуванні ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          setTimeout(function () { en.target.classList.add('in'); }, i * 90);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- клавіатура під час тесту ---------- */
  document.addEventListener('keydown', function (e) {
    if (!$('#screen-quiz').classList.contains('is-active')) return;
    var opts = $$('.opt:not(:disabled)', $('#qOpts'));
    var idx = ['1', '2', '3', '4'].indexOf(e.key);
    if (idx > -1 && opts[idx]) { opts[idx].click(); return; }
    if (e.key === 'Enter' && !$('#qNext').hidden) $('#qNext').click();
  });

  /* ---------- старт ---------- */
  paintUser();
  renderKnown();
})();

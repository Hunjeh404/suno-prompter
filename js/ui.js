/* =====================================================================
   SUNO PROMPT GENERATOR — UI LAYER (3층)
   ---------------------------------------------------------------------
   화면만 담당. 프롬프트 조립은 SUNO_RULES, 저장은 SUNO_STORAGE, LLM은 SUNO_LLM.
   ===================================================================== */
(function () {
  "use strict";
  const D = window.SUNO_DATA, R = window.SUNO_RULES, S = window.SUNO_STORAGE, L = window.SUNO_LLM;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let state = R.defaultState();
  let layersAuto = true;            // 레이어가 자동 제안 상태인지 (장르 바꾸면 갱신)
  let tab = "base";
  let project = { id: null, name: "" };
  let checkDone = {};
  let built = null;

  /* ================= 폼 스키마 ================= */
  const opt = list => list.map(x => ({ v: x.id, t: x.ko }));
  const genreChips = D.genres.map(g => ({ v: g.id, t: g.ko }));

  const SCHEMA = [
    { no: "01", title: "Song", note: "무엇을 만들지", fields: [
      { k: "title", label: "곡 제목", type: "text", ph: "비워도 됨" },
      { k: "theme", label: "곡 주제", type: "area", ph: "예) 새벽 두 시, 다 식은 커피 앞에서 옛 연인을 떠올리는 마음. 스타일 추천을 켜면 이 문장을 사운드 묘사로 번역합니다." },
      { k: "usage", label: "용도", type: "select", opts: opt(D.usage) },
      { k: "length", label: "목표 길이", type: "select", opts: D.lengths.map(x => ({ v: x, t: x })) },
      { k: "lang", label: "가사 언어", type: "select", opts: opt(D.languages) },
      { k: "model", label: "모델", type: "select", opts: opt(D.models), helpFn: () => (D.models.find(m => m.id === state.model) || {}).note },
      { k: "explore", label: "탐색 모드", type: "select", opts: [{ v: "", t: "끄기 (발매용 — Variety 고정)" }, { v: "1", t: "켜기 (실험 — Variety 개방)" }], help: "켜면 Variety를 열고 Style Influence를 낮춰 변주를 유도합니다. 발매용은 끄는 것이 맞습니다." }
    ]},
    { no: "02", title: "Sound", note: "장르와 템포", fields: [
      { k: "genre1", label: "장르 1", type: "genre", chips: genreChips, help: "칩을 누르면 프리셋(BPM·레이어 순서)이 따라옵니다. 직접 입력도 됩니다." },
      { k: "genre2", label: "장르 2", type: "genre", chips: genreChips, help: "선택. 2개까지가 스위트스폿, 3개 이상은 충돌." },
      { k: "blend", label: "장르 비중", type: "select", opts: opt(D.genreBlend), help: "퍼센트가 아니라 순서와 수식어로 표현됩니다. 수노가 숫자를 읽는다는 근거가 없습니다." },
      { k: "bpm", label: "BPM", type: "text", ph: "비우면 장르 기본값", chips: ["72","84","96","104","110","128","132"] },
      { k: "mainInst", label: "주요 악기", type: "mainpicker", help: "채널마다 곡 전체·구간만·빼기를 고릅니다. 곡 전체는 Style 박스로 들어가 장르 기본 악기를 대체하고(최대 4개), 구간만은 가사창 섹션 태그로, 빼기는 Exclude와 섹션 태그로 들어갑니다. 비워두면 장르 기본 악기를 씁니다." },
      { k: "vocalRange", label: "음역", type: "rangegrid", helpFn: rangeHelp },
      { k: "intensity", label: "곡 강도", type: "select", opts: opt(D.intensity) },
      { k: "mood", label: "분위기", type: "select", opts: opt(D.mood) },
      { k: "introCheat", label: "인트로", type: "select", opts: opt(D.introCheats), help: "AI 음악의 인트로는 빌드업이 아니라 임팩트 구간. 스템 모드에선 레이어 단계에서 다룹니다." }
    ]},
    { no: "03", title: "Split", note: "분리할 스템", splitOnly: true, fields: [
      { k: "splitTargets", label: "Advanced Split", type: "stems", help: "곡에 실제로 존재하는 악기만 고를 것. 없는 악기를 지정하면 크레딧만 소모된다. 스템당 10크레딧." }
    ]},
    { no: "04", title: "Vocal", note: "목소리 설계", fields: [
      { k: "gender", label: "보컬 구성", type: "select", opts: opt(D.vocal.gender), help: "성별은 항상 명시. 비우면 랜덤." },
      { k: "age", label: "보컬 나이", type: "select", opts: opt(D.vocal.age) },
      { k: "tone", label: "보이스 톤", type: "select", opts: opt(D.vocal.tone) },
      { k: "range", label: "음역 / 창법", type: "text", ph: "예) alto, comfortable low-mid register", chips: D.vocal.rangeChips },
      { k: "mic", label: "마이크 거리감", type: "select", opts: opt(D.micDistance), help: "효과가 큽니다. 스템 모드는 밀착/드라이 권장 — Remove FX로 나중에 벗길 수도 있습니다." }
    ]},
    { no: "05", title: "Stem Ops", note: "스템 작업", splitOnly: true, fields: [
      { k: "layers", label: "작업 목록", type: "layers", help: "완곡에서 고칠 파트만 넣습니다. 재생성·교체·추가·제거를 각각 고를 수 있습니다." }
    ]},
    { no: "06", title: "Lyrics", note: "직접 입력", fields: [
      { k: "structure", label: "곡 구성", type: "select", opts: opt(D.structures), help: "가사를 비우면 이 구성대로 음절 틀(ㅇ)을 만들어 줍니다." },
      { k: "lyrics", label: "가사", type: "lyrics", ph: "[Verse 1]\n창문 너머 번지는, 노을 빛.\n\n비우면 오른쪽 Lyrics 탭에 음절 틀이 나옵니다. 그 틀을 복사해 채워 넣으세요.\n대괄호 [ ]는 지시, 소괄호 ( )는 실제로 부를 소리만." }
    ]},
    { no: "07", title: "Finish", note: "제외", fields: [
      { k: "userExclude", label: "제외할 요소", type: "text", ph: "쉼표 구분. 예) rap, autotune, choir", help: "부정어 없이 대상만. 자동으로 5개까지 잘립니다 — 그 이상은 모델이 제외를 포기합니다." }
    ]}
  ];

  /* ================= 폼 렌더 ================= */
  const form = $("form");
  function renderForm() {
    form.innerHTML = "";
    SCHEMA.forEach(blk => {
      const sec = el("section", "blk");
      sec.dataset.splitOnly = blk.splitOnly ? "1" : "";
      sec.innerHTML = `<div class="blk-head"><span class="blk-no" aria-hidden="true"></span><h2 class="blk-title">${blk.title}</h2><span class="blk-note">${blk.note}</span></div>`;
      blk.fields.forEach(f => {
        const row = el("div", "row"); row.dataset.key = f.k;
        const id = "f_" + f.k;
        let ctl = "";
        if (f.type === "select") ctl = `<select id="${id}">${f.opts.map(o => `<option value="${esc(o.v)}"${o.v === state[f.k] ? " selected" : ""}>${esc(o.t)}</option>`).join("")}</select>`;
        else if (f.type === "text") ctl = `<input type="text" id="${id}" placeholder="${esc(f.ph || "")}" value="${esc(state[f.k] || "")}">` + (f.chips ? `<div class="chips">${f.chips.map(c => `<button class="chip" type="button" data-chip="${esc(c)}" data-for="${id}">${esc(c)}</button>`).join("")}</div>` : "");
        else if (f.type === "genre") ctl = `<input type="text" id="${id}" placeholder="${f.k === "genre2" ? "없으면 비워두세요" : "칩 선택 또는 직접 입력"}" value="${esc(genreLabel(state[f.k]))}"><div class="chips">${f.chips.map(c => `<button class="chip" type="button" data-genre="${c.v}" data-for="${f.k}" aria-pressed="${state[f.k] === c.v}">${esc(c.t)}</button>`).join("")}</div>`;
        else if (f.type === "area") ctl = `<textarea id="${id}" placeholder="${esc(f.ph || "")}">${esc(state[f.k] || "")}</textarea>`;
        else if (f.type === "lyrics") ctl = `<textarea id="${id}" class="lyrics" placeholder="${esc(f.ph || "")}" spellcheck="false">${esc(state[f.k] || "")}</textarea>`;
        else if (f.type === "stems") ctl = `<div class="chips stems" id="stemBox">${D.stemTargets.map(t => `<button class="chip" type="button" data-stem="${esc(t.id)}" aria-pressed="${(state.splitTargets||[]).includes(t.id)}" title="${esc(D.stemQuality[t.quality])}">${esc(t.ko)}${t.quality === "weak" ? " ·" : ""}</button>`).join("")}</div><div class="help" id="stemCost"></div>`;
        else if (f.type === "layers") ctl = `<div class="layers" id="layersBox"></div>${pickerHTML("st")}`;
        else if (f.type === "mainpicker") ctl = `<div class="mi-head"><span class="mi-count" id="miCount"></span><button type="button" class="btn sm" id="miToggle" aria-expanded="false" aria-controls="miPicker"><svg aria-hidden="true"><use href="#t-plus"/></svg>악기 추가</button></div><div class="mi-list" id="miList"></div>${pickerHTML("mi")}`;
        else if (f.type === "rangegrid") ctl = `<div class="rg" id="rangeGrid"></div>`;
        const help = f.helpFn ? f.helpFn() : f.help;
        const lab = ["rangegrid", "mainpicker", "stems", "layers"].includes(f.type) ? `<span class="k">${f.label}</span>` : `<label class="k" for="${id}">${f.label}</label>`;
        row.innerHTML = `${lab}<div class="ctl">${ctl}${help ? `<div class="help" id="help_${f.k}">${esc(help)}</div>` : ""}</div>`;
        sec.appendChild(row);
      });
      form.appendChild(sec);
    });
    renderLayers();
    renderMainInst();
    renderRange();
    renderPicker("st");
    renderPicker("mi");
    updateStemCost();
    applyMode();
  }

  function genreLabel(v) { const g = D.genres.find(x => x.id === v); return g ? g.ko : (v || ""); }
  function genreFromInput(text) { const t = text.trim(); const g = D.genres.find(x => x.ko === t || x.en.toLowerCase() === t.toLowerCase() || x.id === t); return g ? g.id : t; }

  function renderLayers() {
    const box = $("layersBox"); if (!box) return;
    box.innerHTML = "";
    if (!state.layers.length) { box.innerHTML = `<div class="empty">작업 없음. 아래에서 고칠 파트를 고르세요.</div>`; return; }
    state.layers.forEach((l, i) => {
      const card = el("div", "layer");
      card.innerHTML = `<div class="num">${String(i + 1).padStart(2, "0")}</div>
        <div class="body">
          <div class="name"><input type="text" value="${esc(l.ko)}" data-li="${i}" data-lk="ko" aria-label="파트 이름">
            <select data-li="${i}" data-lk="op" aria-label="작업 유형">${D.stemOps.map(o => `<option value="${o.id}"${(l.op || "regen") === o.id ? " selected" : ""}>${esc(o.ko)}</option>`).join("")}</select></div>
          <input type="text" class="detail" placeholder="세부 지정 (비우면 기존 곡을 따라감) — 예) 브러시로, 2절부터" value="${esc(l.detail || "")}" data-li="${i}" data-lk="detail">
        </div>
        <div class="ops">
          <button type="button" data-op="up" data-li="${i}" aria-label="${esc(l.ko)} 위로" title="위로" ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-op="down" data-li="${i}" aria-label="${esc(l.ko)} 아래로" title="아래로" ${i === state.layers.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="del" data-op="del" data-li="${i}" aria-label="${esc(l.ko)} 삭제" title="삭제">×</button>
        </div>`;
      box.appendChild(card);
    });
  }

  function applyMode() {
    const split = state.mode === "split";
    $("modeOneshot").setAttribute("aria-pressed", !split);
    $("modeSplit").setAttribute("aria-pressed", split);
    let n = 0;
    document.querySelectorAll("section.blk").forEach(s => {
      s.hidden = (s.dataset.splitOnly === "1" && !split);
      if (!s.hidden) { n++; const no = s.querySelector(".blk-no"); if (no) no.textContent = "SYS_" + String(n).padStart(2, "0"); }
    });
    syncNav();
    $("tabLayers").hidden = !split;
    if (!split && tab === "layers") tab = "base";
    $("subline").textContent = split
      ? "완곡을 뽑은 뒤 스템으로 파트를 고칩니다"
      : "설정을 Suno에 붙여넣을 프롬프트로 바꿉니다";
  }

  /* ================= 이벤트 ================= */
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.li !== undefined && t.dataset.lk) { state.layers[+t.dataset.li][t.dataset.lk] = t.value; layersAuto = false; refresh(); return; }
    if (!t.id || !t.id.startsWith("f_")) return;
    const k = t.id.slice(2);
    if (k === "genre1" || k === "genre2") { state[k] = genreFromInput(t.value); syncGenreChips(); if (k === "genre1") maybeSuggest(); }
    else if (k === "explore") state.explore = !!t.value;
    else state[k] = t.value;
    if (k === "gender") renderRange();
    if (k === "model") { const h = $("help_model"); if (h) h.textContent = (D.models.find(m => m.id === state.model) || {}).note || ""; }
    refresh();
  });
  form.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.chip) { const inp = $(b.dataset.for); inp.value = inp.value.trim() ? inp.value.trim().replace(/,\s*$/, "") + ", " + b.dataset.chip : b.dataset.chip; if (inp.id === "f_bpm" || inp.id === "f_key") inp.value = b.dataset.chip; inp.dispatchEvent(new Event("input", { bubbles: true })); return; }
    if (b.dataset.genre) { const k = b.dataset.for; const same = state[k] === b.dataset.genre; state[k] = same ? "" : b.dataset.genre; $("f_" + k).value = genreLabel(state[k]); syncGenreChips(); if (k === "genre1") maybeSuggest(); refresh(); return; }
    if (b.dataset.stem) { const id = b.dataset.stem; const t = state.splitTargets || (state.splitTargets = []);
      const i = t.indexOf(id); if (i >= 0) t.splice(i, 1); else t.push(id);
      b.setAttribute("aria-pressed", t.includes(id)); updateStemCost(); refresh(); return; }
    if (b.dataset.op) { const i = +b.dataset.li; const L = state.layers;
      if (b.dataset.op === "del") L.splice(i, 1);
      if (b.dataset.op === "up" && i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]];
      if (b.dataset.op === "down" && i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]];
      layersAuto = false; renderLayers(); refresh(); return; }
    if (b.id === "layerAddBtn") { const inp = $("layerNew"); const v = inp.value.trim(); if (!v) return;
      const [ko, prompt] = v.split("/").map(s => s.trim());
      state.layers.push({ id: "custom" + Date.now(), ko: ko || v, op: "regen", prompt: prompt ? "Add " + prompt : "Add " + (ko || v), detail: "" });
      inp.value = ""; layersAuto = false; renderLayers(); refresh(); }
  });
  function syncGenreChips() { document.querySelectorAll("[data-genre]").forEach(c => c.setAttribute("aria-pressed", state[c.dataset.for] === c.dataset.genre)); }
  function maybeSuggest() { /* 완곡이 기준이라 레이어 자동 제안은 하지 않는다 */ }

  $("modeOneshot").onclick = () => { state.mode = "oneshot"; applyMode(); refresh(); };
  $("modeSplit").onclick = () => { state.mode = "split"; applyMode(); refresh(); };
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => { tab = b.dataset.tab; refresh(); });


  /* ================= 악기 선택기 (두 곳: mi = 주요 악기, st = 스템 작업) ================= */
  const INS = window.SUNO_INSTRUMENTS;
  const pks = {
    st: { fam: null, ins: null, artic: null, range: "all", q: "", intent: "in" },
    mi: { fam: null, ins: null, artic: null, range: "all", q: "", intent: "in" }
  };

  function pickerHTML(p) {
    const mi = p === "mi";
    return `<div class="picker" id="${p}Picker"${mi ? " hidden" : ""}>
      <div class="picker-head"><span>${mi ? "악기 고르기" : "파트 추가"}</span><input type="text" id="${p}Search" data-pp="${p}" aria-label="악기 검색" placeholder="색소폰, sax…" autocomplete="off"></div>
      <div class="pk-row" id="${p}FamRow"><div class="pk-lab">계열</div><div class="pk-opts" id="${p}Fam"></div></div>
      <div class="pk-row" id="${p}InsRow" hidden><div class="pk-lab">악기</div><div class="pk-opts" id="${p}Ins"></div></div>
      <div class="pk-row" id="${p}ArtRow" hidden><div class="pk-lab">주법·역할</div><div class="pk-opts" id="${p}Art"></div></div>
      <div class="pk-row" id="${p}RngRow" hidden><div class="pk-lab">구간</div><div class="pk-opts" id="${p}Rng"></div></div>
      <div class="pk-foot" id="${p}Foot" hidden>
        <div class="pk-prev">${mi ? `<span class="pk-where" id="${p}Where"></span>` : ""}<pre id="${p}Preview"></pre></div>
        <button class="btn accent sm" type="button" id="${p}Add" data-pp="${p}"><svg aria-hidden="true"><use href="#i-${mi ? "note" : "layers"}"/></svg>${mi ? "주요 악기에 추가" : "작업에 추가"}</button>
      </div>
      ${mi ? "" : `<div class="pk-manual"><input type="text" id="layerNew" aria-label="파트 직접 입력" placeholder="예) 색소폰 / sax melody in the bridge" autocomplete="off"><button class="btn sm" type="button" id="layerAddBtn">추가</button></div>`}
    </div>`;
  }
  function pkChips(p, nodeId, list, sel, dataKey) {
    const box = $(p + nodeId); if (!box) return;
    box.innerHTML = list.map(o => `<button class="chip" type="button" data-pp="${p}" data-pk="${dataKey}" data-v="${esc(o.v)}" aria-pressed="${sel === o.v}">${esc(o.t)}</button>`).join("");
  }
  function pkSearchHits(q) {
    const t = q.trim().toLowerCase(); if (t.length < 1) return null;
    const hits = [];
    INS.tree.forEach(f => f.items.forEach(i => {
      if (i.ko.toLowerCase().includes(t) || i.en.toLowerCase().includes(t)) hits.push({ fam: f.id, item: i });
    }));
    return hits.slice(0, 24);
  }
  function currentItem(p) {
    const k = pks[p]; if (!k.ins) return null;
    for (const f of INS.tree) { const i = f.items.find(x => x.en === k.ins); if (i) return i; }
    return null;
  }
  function renderPicker(p) {
    if (!$(p + "Picker")) return;
    const k = pks[p], mi = p === "mi";
    const hits = pkSearchHits(k.q);
    if (hits) {
      $(p + "FamRow").hidden = true; $(p + "InsRow").hidden = false;
      $(p + "Ins").innerHTML = hits.length
        ? hits.map(h => `<button class="chip" type="button" data-pp="${p}" data-pk="hit" data-v="${esc(h.fam)}|${esc(h.item.en)}" aria-pressed="${k.ins === h.item.en}">${esc(h.item.ko)}</button>`).join("")
        : `<span class="empty">검색 결과 없음.${mi ? "" : " 아래 직접 입력을 쓰세요."}</span>`;
    } else {
      $(p + "FamRow").hidden = false;
      pkChips(p, "Fam", INS.tree.map(f => ({ v: f.id, t: f.ko })), k.fam, "fam");
      const fam = INS.tree.find(f => f.id === k.fam);
      $(p + "InsRow").hidden = !fam;
      if (fam) pkChips(p, "Ins", fam.items.map(i => ({ v: i.en, t: i.ko })), k.ins, "ins");
    }
    const item = currentItem(p);
    const arts = item ? (INS.artic[item.a] || []) : [];
    const showArt = item && arts.length;
    $(p + "ArtRow").hidden = !showArt;
    if (showArt) pkChips(p, "Art", [{ v: "", t: "지정 안 함" }].concat(arts.map(a => ({ v: a.id, t: a.ko }))), k.artic || "", "artic");
    $(p + "RngRow").hidden = !item || mi;   // 주요 악기는 추가한 뒤 채널 카드에서 구간을 고른다
    if (item && !mi) pkChips(p, "Rng", INS.range.map(r => ({ v: r.id, t: r.ko })), k.range, "range");
    $(p + "Foot").hidden = !item;
    if (!item) return;
    if (mi) {
      const pv = R.mainInstPreview({ en: item.en, a: item.a, artic: k.artic, range: "all", intent: "in" }, INS);
      $(p + "Where").textContent = "곡 전체로 추가됩니다. 구간·빼기는 추가한 뒤 채널에서 바꿉니다.";
      $(p + "Preview").textContent = pv.text;
    } else {
      $(p + "Preview").textContent = R.composeInstrument({ en: item.en, articType: item.a, artic: k.artic, range: k.range }, INS);
    }
  }
  function resetPicker(p) {
    // 추가할 때마다 새로 시작 — 앞 악기의 구간·넣기/빼기가 다음 악기로 새지 않게
    const k = pks[p]; k.ins = null; k.artic = null; k.q = ""; k.range = "all"; k.intent = "in";
    const sb = $(p + "Search"); if (sb) sb.value = "";
  }

  /* 고른 주요 악기 — 채널 카드. 카드 안에서 적용 위치(곡 전체 / 구간만 / 빼기)를 바로 바꾼다 */
  let miOpen = false;
  const ROUTES = [
    { v: "all", t: "곡 전체", d: "Style" },
    { v: "sec", t: "구간만", d: "섹션" },
    { v: "out", t: "빼기", d: "Exclude" }
  ];
  const routeOf = m => m.intent === "out" ? "out" : m.range === "all" ? "all" : "sec";
  function renderMainInst() {
    const box = $("miList"); if (!box) return;
    const list = state.mainInst || [];
    const core = list.filter(m => m.intent !== "out" && m.range === "all").length;
    const cnt = $("miCount");
    if (cnt) { cnt.textContent = `곡 전체 ${core}/4`; cnt.classList.toggle("over", core > 4); }
    const tg = $("miToggle"), pk = $("miPicker");
    const open = miOpen || !list.length;
    if (pk) pk.hidden = !open;
    if (tg) { tg.setAttribute("aria-expanded", open); tg.hidden = !list.length; tg.lastChild.textContent = miOpen ? "닫기" : "악기 추가"; }
    if (!list.length) { box.innerHTML = `<div class="empty">고른 악기 없음. 장르 기본 악기가 쓰입니다. 아래에서 골라 채널에 올리세요.</div>`; return; }
    box.innerHTML = list.map((m, i) => {
      const r = routeOf(m);
      const arts = INS.artic[m.a] || [];
      const ch = String(i + 1).padStart(2, "0");
      const pv = R.mainInstPreview(m, INS);
      const rangeSel = r === "all" ? "" : `<select class="ch-rng" data-mi="${i}" data-mk="range" aria-label="${esc(m.ko)} 구간">${INS.range.filter(x => r === "out" || x.id !== "all").map(x => `<option value="${x.id}"${x.id === m.range ? " selected" : ""}>${esc(r === "out" && x.id === "all" ? "곡 전체에서" : x.ko)}</option>`).join("")}</select>`;
      const artSel = r !== "out" && arts.length ? `<select class="ch-art" data-mi="${i}" data-mk="artic" aria-label="${esc(m.ko)} 주법">${[{ id: "", ko: "주법 지정 안 함" }].concat(arts).map(a => `<option value="${a.id}"${(m.artic || "") === a.id ? " selected" : ""}>${esc(a.ko)}</option>`).join("")}</select>` : "";
      return `<div class="ch${r === "out" ? " out" : ""}">
        <div class="ch-top">
          <span class="ch-no">CH ${ch}</span>
          <span class="ch-name">${esc(m.ko)}</span><span class="ch-en">${esc(m.en)}</span>
          <button type="button" class="ch-del" data-mi-del="${i}" aria-label="${esc(m.ko)} 채널 삭제"><svg aria-hidden="true"><use href="#t-x"/></svg></button>
        </div>
        <div class="ch-route" role="group" aria-label="${esc(m.ko)} 적용 위치">
          ${ROUTES.map(o => `<button type="button" class="rt rt-${o.v}" data-mi="${i}" data-route="${o.v}" aria-pressed="${r === o.v}">${o.t}<small>${o.d}</small></button>`).join("")}
        </div>
        ${rangeSel || artSel ? `<div class="ch-opts">${rangeSel}${artSel}</div>` : ""}
        <div class="ch-out"><span>${esc(pv.where)}</span><code>${esc(pv.text)}</code></div>
      </div>`;
    }).join("") + (core > 4 ? `<div class="warn"><div><span>곡 전체 악기 ${core}개. 4개 이하가 안전합니다.</span></div></div>` : "");
  }
  form.addEventListener("click", e => {
    const rt = e.target.closest("[data-route]");
    if (rt) {
      const m = state.mainInst[+rt.dataset.mi], v = rt.dataset.route;
      if (v === "all") { m.intent = "in"; m.range = "all"; }
      if (v === "sec") { m.intent = "in"; if (m.range === "all") m.range = "chorus"; }
      if (v === "out") { m.intent = "out"; m.range = "all"; }
      renderMainInst(); refresh(); return;
    }
    if (e.target.closest("#miToggle")) { miOpen = !miOpen; renderMainInst(); if (miOpen) { const s = $("miSearch"); if (s) s.focus(); } return; }
  });
  form.addEventListener("change", e => {
    const t = e.target; if (t.dataset.mi === undefined || !t.dataset.mk) return;
    state.mainInst[+t.dataset.mi][t.dataset.mk] = t.value || null;
    renderMainInst(); refresh();
  });

  /* 음역 — 저음·고음 각 4칸 */
  function rangeHelp() {
    const h = D.vocalRange.high.find(x => x.id === state.rangeHigh);
    return h && h.quiet ? "잔잔형: 억제 서술과 저에너지 마커가 자동으로 들어갑니다. 분위기·강도에 에너지 단어가 있으면 경고가 뜹니다." : "성부 명칭으로 조절됩니다. 음정 숫자(C3 등)는 Suno가 무시하므로 쓰지 않습니다.";
  }
  function renderRange() {
    const box = $("rangeGrid"); if (!box) return;
    const V = D.vocalRange;
    const cell = (x, key) => { const m = x.ko.match(/^(.*?)\s*\((.*)\)$/) || [0, x.ko, ""];
      return `<button type="button" class="rg-b" data-rg="${key}" data-v="${x.id}" aria-pressed="${state[key] === x.id}"><b>${esc(m[1])}</b><small>${esc(m[2])}</small></button>`; };
    const phrase = R.rangePhrase(state, D);
    box.innerHTML = `
      <div class="rg-row"><div class="rg-lab" id="rgLo">저음</div><div class="rg-grid" role="group" aria-labelledby="rgLo">${V.low.map(x => cell(x, "rangeLow")).join("")}</div></div>
      <div class="rg-row"><div class="rg-lab" id="rgHi">고음</div><div class="rg-grid" role="group" aria-labelledby="rgHi">${V.high.map(x => cell(x, "rangeHigh")).join("")}</div></div>
      <div class="rg-out"><span>Style에 들어가는 표현</span><code>${esc(phrase || "보컬 구성이 인스트루멘탈이면 넣지 않습니다")}</code></div>`;
    const h = $("help_vocalRange"); if (h) h.textContent = rangeHelp();
  }
  form.addEventListener("click", e => {
    const b = e.target.closest("[data-rg]"); if (!b) return;
    state[b.dataset.rg] = b.dataset.v; renderRange(); refresh();
  });

  form.addEventListener("click", e => {
    const del = e.target.closest("[data-mi-del]");
    if (del) { state.mainInst.splice(+del.dataset.miDel, 1); renderMainInst(); refresh(); return; }
    const add = e.target.closest("#miAdd, #stAdd");
    if (add) {
      const p = add.dataset.pp, k = pks[p], item = currentItem(p); if (!item) return;
      if (p === "mi") {
        (state.mainInst || (state.mainInst = [])).push({ ko: item.ko, en: item.en, a: item.a,
          artic: k.artic, range: "all", intent: "in" });
        resetPicker(p); miOpen = false; renderMainInst(); renderPicker(p); refresh();
        flash($("toast"), `CH ${String(state.mainInst.length).padStart(2, "0")}에 올림`);
      } else {
        const prompt = R.composeInstrument({ en: item.en, articType: item.a, artic: k.artic, range: k.range }, INS);
        state.layers.push({ id: "pk" + Date.now(), ko: item.ko, op: "add", prompt, detail: "" });
        resetPicker(p); layersAuto = false; renderLayers(); renderPicker(p); refresh();
      }
      return;
    }
    const b = e.target.closest("[data-pk]"); if (!b) return;
    const p = b.dataset.pp, k = pks[p], key = b.dataset.pk, v = b.dataset.v;
    if (key === "intent") { k.intent = v; if (v === "out") k.artic = null; }
    if (key === "fam") { k.fam = k.fam === v ? null : v; k.ins = null; k.artic = null; }
    if (key === "ins") { k.ins = k.ins === v ? null : v; k.artic = null; }
    if (key === "hit") { const [fam, en] = v.split("|"); k.fam = fam; k.ins = k.ins === en ? null : en; k.artic = null; }
    if (key === "artic") k.artic = v || null;
    if (key === "range") k.range = v;
    renderPicker(p);
  });
  form.addEventListener("input", e => {
    const p = e.target.dataset && e.target.dataset.pp;
    if (p && e.target.id === p + "Search") { pks[p].q = e.target.value; renderPicker(p); }
  });

  function updateStemCost() {
    const el = $("stemCost"); if (!el) return;
    const p = R.buildSplitPlan(state, D);
    el.textContent = p && p.list.length
      ? `${p.list.length}개 선택 · ${p.credits}크레딧` + (p.weak.length ? ` · 품질 약함: ${p.weak.join(", ")}` : "")
      : "곡에 실제로 존재하는 악기만 고를 것. 없는 악기를 지정하면 크레딧만 소모된다. 스템당 10크레딧.";
  }

  /* ================= 출력 ================= */
  const out = $("out");
  function copyBtn(text, label) { return `<button class="btn sm" type="button" data-copy="${esc(text)}"><svg aria-hidden="true"><use href="#i-copy"/></svg>${label || "복사"}</button>`; }
  function warnBox(ws) { return ws && ws.length ? `<div class="warn">${ws.map(w => `<div><span>${esc(w)}</span></div>`).join("")}</div>` : ""; }
  /* 채널 스트립 미터 — 남은 예산을 눈으로 본다. 수치는 옆에 글자로도 있으므로 보조 표시 */
  function meter(used, limit) {
    const pct = Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
    const cls = used > limit ? " over" : pct >= 85 ? " warn" : "";
    return `<div class="meter${cls}" aria-hidden="true"><i style="--v:${(pct / 100).toFixed(3)}"></i></div>`;
  }
  function pips(used, total) {
    let s = `<div class="pips${used >= total ? " full" : ""}" aria-hidden="true">`;
    for (let i = 0; i < total; i++) s += `<i class="${i < used ? "on" : ""}"></i>`;
    return s + `</div>`;
  }

  function renderBase(b) {
    const over = b.styleChars > D.limits.styleChars;
    return `
      <div class="block"><div class="block-head"><span class="t">Style of Music</span><span class="meta${over ? " over" : ""}">${b.styleChars} / ${D.limits.styleChars}</span>${copyBtn(b.style)}</div>${meter(b.styleChars, D.limits.styleChars)}<pre>${esc(b.style)}</pre></div>
      <div class="block"><div class="block-head"><span class="t">Exclude Styles</span><span class="meta">${b.exclude.length} / ${D.limits.excludeMax}</span>${b.exclude.length ? copyBtn(b.exclude.join(", ")) : ""}</div>${pips(b.exclude.length, D.limits.excludeMax)}<pre>${esc(b.exclude.join(", ") || "(없음)")}</pre></div>
      <div class="block"><div class="block-head"><span class="t">Advanced Options</span></div>
        <div class="kv">
          <span class="k">모델</span><span>${esc(b.model.ko)}</span>
          <span class="k">Vocal Gender</span><span>${b.vocalGender || "지정 안 함 (인스트루멘탈/듀엣)"}</span>
          <span class="k">Weirdness</span><span>${b.sliders.weirdness}</span>
          <span class="k">Style Influence</span><span>${b.sliders.styleInfluence}</span>
          <span class="k">Variety</span><span>${esc(b.sliders.variety)}</span>
          <span class="k">Audio Influence</span><span>${b.sliders.audioInfluence}</span>
        </div></div>
      ${warnBox(b.warnings)}`;
  }
  function renderLyrics(l) {
    return `<div class="block"><div class="block-head"><span class="t">Lyrics${l.isTemplate ? " (음절 틀)" : ""}</span><span class="meta">${l.chars} / ${D.limits.lyricsChars}</span>${copyBtn(l.text)}</div>${meter(l.chars, D.limits.lyricsPracticalChars)}<pre class="lyr">${esc(l.text)}</pre></div>
      ${warnBox(l.warnings)}
      <div class="lnotes">${D.koreanRules.rules.slice(0, 4).map(r => `<div>${esc(r)}</div>`).join("")}
        <div>v6 신규: ${esc(D.sectionCues.note)} 예) ${esc(D.sectionCues.examples[0])}</div></div>`;
  }
  function renderLayersOut(ls, sp) {
    let out = "";
    if (sp) {
      out += `<div class="block"><div class="block-head"><span class="t">Advanced Split에 지정할 악기</span><span class="meta">${sp.list.length}개, ${sp.credits}크레딧</span>${sp.list.length ? copyBtn(sp.list.join(", ")) : ""}</div>${pips(Math.min(sp.list.length, 6), 6)}<pre>${esc(sp.ko.join(", ") || "(선택 없음)")}</pre>${warnBox(sp.warnings)}</div>`;
    }
    if (!ls.length) return out + `<div class="empty">스템 작업이 없습니다. 왼쪽 05 Stem Ops에서 고칠 파트를 추가하세요.</div>`;
    out += `<div class="empty" style="margin-bottom:10px">Studio 2.0 Chat Bar에 한 줄씩 붙입니다. 재생성·교체는 그 트랙을 먼저 선택하고, 추가는 아무 트랙도 선택하지 않은 상태에서.</div>`;
    out += ls.map(l => `<div class="lcard"><div class="lh"><span class="n">${String(l.order).padStart(2, "0")}</span><span class="nm">${esc(l.name)}</span><span class="opb">${esc(l.op)}</span>${l.opId === "remove" ? "" : copyBtn(l.prompt)}</div><pre>${esc(l.prompt)}</pre><div class="lnotes"><div>${esc(l.opNote)}</div></div>${warnBox(l.warnings)}</div>`).join("");
    out += `<div class="lnotes">${D.layerRules.postNotes.map(n => `<div>${esc(n)}</div>`).join("")}</div>`;
    return out;
  }
  function renderCheck(c) {
    return `<ul class="check">${c.items.map(it => `<li class="${it.critical ? "crit" : ""}${checkDone[it.id] ? " done" : ""}"><label><input type="checkbox" data-check="${esc(it.id)}" ${checkDone[it.id] ? "checked" : ""}><span class="txt">${esc(it.text)}</span></label></li>`).join("")}</ul>
      <div class="check-meta">
        <div>경로: ${esc(c.route)}</div>
        <div>v6: ${esc(c.v6)}</div>
        <div>크레딧: ${esc(c.credits)}</div>
        <div>다운로드: ${esc(c.downloadCap)}</div>
        <div>Exclude 확인: ${esc(c.excludeVerify)}</div>
        <div>${esc(c.korean)}</div>
        ${c.sliderDebug.map(x => `<div>슬라이더: ${esc(x)}</div>`).join("")}
      </div>`;
  }

  function refresh() {
    built = R.buildAll(state);
    document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    if (tab === "base") out.innerHTML = renderBase(built.base);
    else if (tab === "lyrics") out.innerHTML = renderLyrics(built.lyrics);
    else if (tab === "layers") out.innerHTML = renderLayersOut(built.layers, built.split);
    else out.innerHTML = renderCheck(built.check);
    $("stampMode").textContent = state.mode === "split" ? "SPLIT" : "ONE-SHOT";
    $("stampName").textContent = project.name ? project.name.slice(0, 28) : "TAKE 01";
    syncNav();
    const cur = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (cur) out.setAttribute("aria-labelledby", cur.id);
    renderDock();
    const mb = $("modelBadge"); if (mb) { const m = D.models.find(x => x.id === state.model); mb.textContent = (state.model || "v6").toUpperCase(); mb.title = m ? m.ko : ""; }
  }

  out.addEventListener("click", async e => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); flash($("toast"), "복사됨"); }
    catch { flash($("toast"), "직접 복사하세요"); }
  });
  out.addEventListener("change", e => {
    const c = e.target.closest("[data-check]"); if (!c) return;
    checkDone[c.dataset.check] = c.checked; S.saveCheck(project.id, checkDone); refresh();
  });
  function flash(node, msg) { const sp = node.querySelector("span"); if (sp) sp.textContent = msg; else node.textContent = msg; node.classList.add("on"); setTimeout(() => node.classList.remove("on"), 1400); }

  /* ================= 하단 실행 바 · 내비 ================= */
  /* Style · Lyrics 복사를 나란히 */
  function renderDock() {
    if (!built) return;
    const used = built.base.styleChars, lim = D.limits.styleChars;
    const st = $("dockStat");
    if (st) st.innerHTML = `Style <b>${used}</b>/${lim}<span class="ly-n"><span class="sep"></span>가사 <b>${built.lyrics.chars}</b></span>`;
    const vu = $("dockVu");
    if (vu) { const segs = 12, on = Math.min(segs, Math.ceil(used / lim * segs));
      let h = ""; for (let i = 0; i < segs; i++) h += `<i class="${i < on ? (used > lim ? "over" : i >= segs - 2 ? "hot" : "on") : ""}"></i>`; vu.innerHTML = h; }
  }
  // 가사칸에서 눌러도 커서와 키보드가 유지되게
  document.querySelectorAll("[data-dock]").forEach(b => {
    b.addEventListener("pointerdown", e => { if (document.activeElement && document.activeElement.id === "f_lyrics") e.preventDefault(); });
    b.onclick = async () => {
      const ly = b.dataset.dock === "lyrics", text = ly ? built.lyrics.text : built.base.style;
      try { await navigator.clipboard.writeText(text); flash($("toast"), ly ? "가사 복사됨" : "Style 복사됨"); flashDock(b); }
      catch { tab = ly ? "lyrics" : "base"; refresh(); goOut(); }
    };
  });
  function flashDock(b) { b.classList.add("done"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("done"), 1200); }

  /* 모바일 브라우저 하단 툴바가 고정 바를 덮는 문제 — 실제로 보이는 영역(visualViewport) 기준으로 끌어올린다 */
  const dock = $("dock"), vv = window.visualViewport;
  function placeDock() {
    if (!vv) return;
    const hidden = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
    dock.style.transform = hidden ? `translateY(${-hidden}px)` : "";
    // 키보드가 올라오면 내비 줄은 접고 복사 줄만 남긴다
    dock.classList.toggle("kb", vv.height < window.innerHeight * 0.72 || hidden > 150);
  }
  if (vv) { vv.addEventListener("resize", placeDock); vv.addEventListener("scroll", placeDock); window.addEventListener("resize", placeDock); placeDock(); }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function goOut() { $("outCard").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
  let inOut = false;
  function syncNav() {
    const split = state.mode === "split";
    const on = { navOneshot: !inOut && !split, navSplit: !inOut && split, navOut: inOut && tab !== "check", navCheck: inOut && tab === "check" };
    Object.entries(on).forEach(([id, v]) => { const b = $(id); if (b) { if (v) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); } });
  }
  document.querySelector(".bnav").addEventListener("click", e => {
    const b = e.target.closest("[data-nav]"); if (!b) return;
    const v = b.dataset.nav;
    if (v === "oneshot" || v === "split") {
      state.mode = v; applyMode(); refresh();
      $("main").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } else {
      tab = v === "check" ? "check" : (tab === "check" ? "base" : tab); refresh(); goOut();
    }
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { es.forEach(x => { inOut = x.isIntersecting; }); syncNav(); }, { rootMargin: "0px 0px -55% 0px" }).observe($("outCard"));
  }

  /* ================= 프로젝트 ================= */
  async function renderProjects() {
    const list = await S.list(); const ul = $("plist"); ul.innerHTML = "";
    if (!list.length) { ul.innerHTML = `<li><span class="nm empty">저장된 프로젝트 없음. 저장하면 여기 쌓이고, 불러오면 보컬·질감 설정을 그대로 이어받습니다.</span></li>`; }
    list.forEach(p => {
      const li = el("li", p.id === project.id ? "cur" : "");
      const nm = esc(p.name || "(이름 없음)");
      li.innerHTML = `<button class="nm" type="button" data-load="${p.id}" title="${nm} 불러오기">${nm}</button><span class="dt">${(p.mode || "").toUpperCase()} ${new Date(p.updatedAt).toLocaleDateString("ko-KR")}</span><button class="btn sm danger" type="button" data-del="${p.id}" aria-label="${nm} 삭제"><svg aria-hidden="true"><use href="#i-trash"/></svg>삭제</button>`;
      ul.appendChild(li);
    });
    $("projHelp").textContent = S.persistent ? "이 기기에만 저장됩니다. 다른 기기로 옮기려면 내보내기 파일을 쓰세요." : "이 환경에서는 저장이 유지되지 않습니다. 내보내기로 파일을 받아두세요.";
  }
  $("plist").addEventListener("click", async e => {
    const ld = e.target.closest("[data-load]"), dl = e.target.closest("[data-del]");
    if (ld) { const p = await S.load(ld.dataset.load); if (!p) return; loadProject(p); }
    if (dl) { if (!confirm("이 프로젝트를 삭제할까요?")) return; await S.remove(dl.dataset.del); if (project.id === dl.dataset.del) { project = { id: null, name: "" }; $("projName").value = ""; } renderProjects(); refresh(); }
  });
  async function loadProject(p) {
    state = Object.assign(R.defaultState(), p.state); layersAuto = false;
    project = { id: p.id, name: p.name }; $("projName").value = p.name || "";
    checkDone = await S.loadCheck(p.id);
    renderForm(); syncGenreChips(); renderProjects(); refresh();
    await S.setCurrent(p.id);
  }
  $("saveBtn").onclick = async () => {
    const name = $("projName").value.trim() || state.title.trim() || "제목 없음 " + new Date().toLocaleDateString("ko-KR");
    project.name = name;
    const r = await S.save({ id: project.id, name, state });
    project.id = r.id; await S.saveCheck(project.id, checkDone);
    $("projName").value = name; renderProjects(); refresh(); flash($("toast"), "저장됨");
  };
  $("newBtn").onclick = () => { if (!confirm("새 곡을 시작할까요? 저장하지 않은 입력은 사라집니다.")) return; state = R.defaultState(); project = { id: null, name: "" }; checkDone = {}; $("projName").value = ""; renderForm(); renderProjects(); refresh(); };
  $("resetBtn").onclick = () => { if (!confirm("입력을 초기화할까요? 프로젝트 이름은 유지됩니다.")) return; const m = state.mode; state = R.defaultState(); state.mode = m; renderForm(); refresh(); };
  $("exportBtn").onclick = async () => {
    const json = await S.exportAll(); const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `suno-projects-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = await S.importAll(await f.text(), true); flash($("toast"), `${n}개 가져옴`); renderProjects(); }
    catch (err) { alert(err.message); }
    e.target.value = "";
  };

  /* ================= LLM ================= */
  const provSel = $("llmProvider");
  Object.entries(L.PROVIDERS).forEach(([id, p]) => provSel.appendChild(el("option", "", esc(p.name))).value = id);
  async function loadKeyUI() { const keys = await S.getKeys(); const k = keys[provSel.value]; $("llmKey").value = k ? k.key : ""; $("llmModel").value = k ? k.model : ""; $("llmModel").placeholder = "기본: " + L.PROVIDERS[provSel.value].defaultModel; }
  provSel.onchange = loadKeyUI;
  $("llmSaveKey").onclick = async () => { await S.setKey(provSel.value, $("llmKey").value.trim(), $("llmModel").value.trim()); flash($("llmToast"), "이 기기에 저장됨"); };
  $("llmClearKey").onclick = async () => { await S.setKey(provSel.value, ""); $("llmKey").value = ""; flash($("llmToast"), "삭제됨"); };
  $("llmRun").onclick = async () => {
    const key = $("llmKey").value.trim(); if (!key) { flash($("llmToast"), "키가 없음"); return; }
    const btn = $("llmRun"); btn.disabled = true; btn.textContent = "생각 중…";
    try {
      const r = await L.enhance({ provider: provSel.value, key, model: $("llmModel").value.trim(), state, built, data: D });
      state.extraStyle = r.styleAdditions;
      state.sectionOverrides = r.sectionDirecting;
      Object.entries(r.layerHints).forEach(([id, hint]) => { const l = state.layers.find(x => x.id === id); if (l && !l.detail) l.detail = hint; });
      renderLayers(); refresh();
      const note = $("llmNote"); note.hidden = false;
      note.innerHTML = `<div>${esc(r.note || "제안을 반영했습니다.")}</div><div class="help">추가된 디스크립터: ${r.styleAdditions.length ? esc(r.styleAdditions.join(", ")) : "없음"} · 섹션 디렉팅 ${Object.keys(r.sectionDirecting).length}개 · 레이어 힌트 ${Object.keys(r.layerHints).length}개. <button class="btn sm" type="button" id="llmUndo">제안 되돌리기</button></div>`;
      $("llmUndo").onclick = () => { state.extraStyle = []; state.sectionOverrides = {}; state.layers.forEach(l => { if (r.layerHints[l.id] === l.detail) l.detail = ""; }); renderLayers(); refresh(); note.hidden = true; };
      flash($("llmToast"), "반영됨");
    } catch (err) { $("llmNote").hidden = false; $("llmNote").textContent = "추천 실패: " + err.message + " — 키와 모델명을 확인하고 다시 시도하세요."; }
    finally { btn.disabled = false; btn.textContent = "추천 받기"; }
  };

  /* ================= 시작 ================= */
  (async function init() {
    $("dataver").textContent = `데이터 ${D.version}, ${D.targetModel} 기준`;
    const cur = await S.currentId(); const p = cur ? await S.load(cur) : null;
    if (p) await loadProject(p);
    else { renderForm(); renderProjects(); refresh(); }
    await loadKeyUI();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
})();

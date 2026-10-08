/* =====================================================================
   SUNO PROMPT GENERATOR — RULES LAYER (2층)
   ---------------------------------------------------------------------
   순수 함수. DOM을 모른다. window.SUNO_DATA 또는 인자로 받은 data를 읽는다.
   UI를 갈아엎어도 그대로 남고, 서버/네이티브로 통째 이식 가능.
   ===================================================================== */
(function (root) {
  "use strict";

  const D = () => (typeof root.SUNO_DATA !== "undefined" ? root.SUNO_DATA : null);

  /* ---------- 유틸 ---------- */
  const has = v => v !== undefined && v !== null && String(v).trim() !== "" && v !== "none";
  const trim = v => (v == null ? "" : String(v).trim());
  const find = (list, id) => (list || []).find(x => x.id === id) || null;
  const dedup = arr => { const s = new Set(); return arr.filter(x => { const k = x.toLowerCase(); if (s.has(k)) return false; s.add(k); return true; }); };
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));

  /* ---------- 기본 state ---------- */
  function defaultState() {
    return {
      mode: "oneshot",              // "oneshot" | "split"
      model: "v6",                  // "v6" | "v6-wild" | "v6-mini"
      explore: false,               // 탐색 모드 (Variety 개방)
      title: "", theme: "", usage: "song", length: "3분",
      genre1: "citypop", genre2: "", blend: "lead",
      bpm: "", rangeLow: "L2", rangeHigh: "H2", intensity: "none", mood: "none",
      gender: "female", age: "adult", range: "", tone: "honest", mic: "close",
      lang: "ko", structure: "poprock", introCheat: "none",
      splitTargets: [],             // Advanced Split으로 뽑을 스템 id 배열
      layers: [],                   // 스템 작업 [{id, ko, op, prompt, detail}]
      userExclude: "",
      lyrics: "",
      styleLang: "en",
      useRef: "none",               // "none" | "sampleLead" | "tagLead"
      mainInst: [],                 // 주요 악기 [{ko,en,a,artic,range,intent:'in'|'out'}]
      extraStyle: [],               // LLM 제안 디스크립터 (사용자가 수락한 것)
      sectionOverrides: {}          // LLM 제안 섹션 디렉팅 {tag: text}
    };
  }

  /* ---------- 장르 ---------- */
  function genreName(id, data) {
    const g = find(data.genres, id);
    if (g) return g.en;
    return trim(id); // 자유 입력
  }
  function genrePhrase(state, data) {
    const g1 = genreName(state.genre1, data), g2 = genreName(state.genre2, data);
    if (!g1 && !g2) return "";
    if (g1 && g2) {
      const b = find(data.genreBlend, state.blend) || data.genreBlend[0];
      return fill(b.pattern, { g1, g2 });
    }
    return g1 || g2;
  }

  /* ---------- 보컬 ---------- */
  function vocalPhrase(state, data) {
    const gender = find(data.vocal.gender, state.gender);
    if (!gender || !gender.en) return "";
    const age = find(data.vocal.age, state.age);
    const parts = [];
    if (age && age.en) parts.push(age.en);
    parts.push(gender.en);
    let s = parts.join(" ");
    const tone = find(data.vocal.tone, state.tone);
    if (tone && tone.en) s += ", " + tone.en;
    if (has(state.range)) s += ", " + trim(state.range);
    return s;
  }
  function vocalToggle(state, data) {
    const g = find(data.vocal.gender, state.gender);
    return g ? g.toggle : null;
  }


  /* ---------- 보컬 음역 ---------- */
  function isWideRange(state) {
    return ["L3","L4"].includes(state.rangeLow) && ["H3","H4"].includes(state.rangeHigh);
  }
  function rangePhrase(state, data) {
    const V = data.vocalRange;
    const lo = find(V.low, state.rangeLow), hi = find(V.high, state.rangeHigh);
    if (!lo || !hi || state.gender === "none") return "";
    const g = state.gender === "male" || state.gender === "mduet" ? "male"
            : state.gender === "female" || state.gender === "fduet" ? "female" : "neutral";
    const parts = [lo[g] || lo.neutral, hi.en];
    if (hi.quiet) parts.push(V.quietMarkers.join(", "));
    if (isWideRange(state)) parts.unshift("wide vocal range");
    return parts.filter(Boolean).join(", ");
  }
  function rangeWarnings(state, data, styleText) {
    const V = data.vocalRange, out = [];
    const hi = find(V.high, state.rangeHigh);
    if (state.rangeLow === "L4" && state.rangeHigh === "H4") out.push(V.warnings.wide);
    if (state.rangeHigh === "H4") out.push(V.warnings.whistle);
    if (hi && hi.quiet) {
      const hit = V.energyWords.filter(w => styleText.toLowerCase().includes(w.toLowerCase()));
      if (hit.length) out.push(V.warnings.quietConflict + " (" + hit.join(", ") + ")");
    }
    return out;
  }


  /* ---------- 주요 악기 ----------
     구간 = 곡 전체  + 넣기 → Style 박스 (장르 기본 악기를 대체)
     구간 = 특정 구간 + 넣기 → 가사창 해당 섹션 태그
     빼기 + 곡 전체 → Exclude 칸 + 모든 섹션 태그 ("no X")
     빼기 + 특정 구간 → 해당 섹션 태그 ("X out" — 편곡 표기 관례)
     Style 박스에는 부정어를 넣지 않는다 (v6에서도 '포함'으로 읽힘) */
  const RANGE_TAGS = { chorus: ["Chorus", "Final Chorus", "Hook"], verse: ["Verse"], bridge: ["Bridge"],
                       final: ["Final Chorus"], intro: ["Intro"], outro: ["Outro"] };
  const MAIN_INST_MAX = 4;

  function instPhrase(sel, INS) {
    INS = INS || root.SUNO_INSTRUMENTS;
    if (!sel || !sel.en) return "";
    const art = INS ? (INS.artic[sel.a] || []).find(a => a.id === sel.artic) : null;
    let core = trim(sel.en);
    if (art && art.pos === "pre") core = art.en + " " + core;
    if (art && art.pos === "post") core += " " + art.en;
    return core.replace(/\s+/g, " ").trim();
  }
  function mainInstPlace(sel) {
    const out = sel.intent === "out", all = sel.range === "all";
    if (out && all) return "exclude";
    if (all) return "style";
    return "section";
  }
  function mainInstPreview(sel, INS) {
    INS = INS || root.SUNO_INSTRUMENTS;
    const rng = INS ? (INS.range || []).find(r => r.id === sel.range) : null;
    const where = mainInstPlace(sel);
    if (where === "style") return { where: "Style 박스", text: instPhrase(sel, INS) };
    if (where === "exclude") return { where: "Exclude 칸 + 모든 섹션 태그", text: `${sel.en}  /  [Verse: no ${sel.en}] …` };
    const label = rng ? rng.ko : "";
    const cue = sel.intent === "out" ? `${sel.en} out` : instPhrase(sel, INS);
    return { where: `가사창 섹션 태그 (${label})`, text: cue };
  }
  function sectionCues(key, afterV2, state) {
    const INS = root.SUNO_INSTRUMENTS, cues = [];
    (state.mainInst || []).forEach(m => {
      let hit = false;
      if (m.range === "all") hit = m.intent === "out";
      else if (m.range === "v2") hit = afterV2;
      else hit = (RANGE_TAGS[m.range] || []).includes(key);
      if (!hit) return;
      if (m.intent === "out") cues.push(m.range === "all" ? `no ${m.en}` : `${m.en} out`);
      else cues.push(instPhrase(m, INS));
    });
    return cues;
  }
  function joinDir(base, cues) {
    return dedup([base, ...cues].join(", ").split(",").map(trim).filter(Boolean)).join(", ");
  }
  function mainInstWarnings(state, data) {
    const w = [], mi = state.mainInst || [];
    const core = mi.filter(m => m.intent !== "out" && m.range === "all");
    if (core.length > MAIN_INST_MAX) w.push(`곡 전체 주요 악기 ${core.length}개. 핵심 악기는 3~5개가 한계 — 넘치면 편곡이 혼잡해지고 서로 묻힌다. ${MAIN_INST_MAX}개 이하로 줄일 것.`);
    // 같은 악기를 넣고 빼는데 구간이 겹칠 때만 경고 (인트로 빼기 + 2절부터 넣기 같은 건 정상)
    const overlap = (a, b) => a === "all" || b === "all" || a === b;
    const clash = mi.filter(o => o.intent === "out" && mi.some(i => i.intent !== "out" &&
      i.en.toLowerCase() === o.en.toLowerCase() && overlap(i.range, o.range))).map(m => m.ko);
    if (clash.length) w.push(`같은 악기를 같은 구간에서 넣기와 빼기로 동시에 지정했다: ${[...new Set(clash)].join(", ")}. 하나만 남길 것.`);
    const outAll = mi.filter(m => m.intent === "out" && m.range === "all");
    const genre = find(data.genres, state.genre1);
    if (outAll.length && genre && !core.length) {
      const hit = outAll.filter(m => genre.oneShotTags.join(" ").toLowerCase().includes(m.en.split(" ").pop().toLowerCase()));
      if (hit.length) w.push(`장르 기본 악기에 '${hit.map(m => m.ko).join(", ")}'가 들어 있는데 빼기로 지정했다. 곡 전체 주요 악기를 직접 골라 기본 악기를 대체하면 충돌이 사라진다.`);
    }
    return w;
  }

  /* ---------- 익스클루드 ---------- */
  function normalizeExcludeItem(raw, data) {
    let s = trim(raw).toLowerCase();
    if (!s) return "";
    // 부정어 제거
    for (const p of data.excludeRules.negationPrefixes) {
      const pl = p.toLowerCase();
      if (s.startsWith(pl)) s = s.slice(pl.length).trim();
      if (s.endsWith(pl.trim())) s = s.slice(0, s.length - pl.trim().length).trim();
    }
    s = s.replace(/^-+/, "").trim();
    // 동의어 정규화
    const n = data.excludeRules.normalize;
    if (n[s]) s = n[s];
    return s;
  }
  function buildExclude(baseList, userText, data, baseFirst) {
    const warnings = [];
    const user = trim(userText).split(/[,\n]/).map(x => normalizeExcludeItem(x, data)).filter(Boolean);
    const base = (baseList || []).map(x => normalizeExcludeItem(x, data)).filter(Boolean);
    const merged = dedup(baseFirst ? [...base, ...user] : [...user, ...base]);
    if (merged.length <= data.excludeRules.maxCount) return { list: merged, warnings };
    // 우선순위대로 자르기: 사용자 항목은 먼저 보존, 나머지는 priority 순
    const pri = data.excludeRules.priority;
    const rank = x => { const i = pri.indexOf(x); return i < 0 ? 999 : i; };
    const userSet = new Set(baseFirst ? base : user);
    const sorted = [...merged].sort((a, b) => {
      const ua = userSet.has(a) ? 0 : 1, ub = userSet.has(b) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return rank(a) - rank(b);
    });
    const kept = sorted.slice(0, data.excludeRules.maxCount);
    const dropped = sorted.slice(data.excludeRules.maxCount);
    warnings.push(`익스클루드 ${merged.length}개 → ${data.excludeRules.maxCount}개로 잘림. 제외됨: ${dropped.join(", ")}. (5개 초과 시 모델이 제외를 포기함)`);
    return { list: kept, warnings };
  }

  /* ---------- 슬라이더 ---------- */
  function sliderFor(state, data) {
    if (state.useRef === "sampleLead") return data.sliders.refSampleLead;
    if (state.useRef === "tagLead") return data.sliders.refTagLead;
    if (state.explore) return data.sliders.explore;
    return data.sliders[state.mode] || data.sliders.oneshot;
  }
  function fmtRange(r) { return r ? `${r[0]}~${r[1]}` : "—"; }

  /* ---------- BASE 프롬프트 ---------- */
  function buildBasePrompt(state, data) {
    data = data || D();
    const warnings = [];
    const parts = [];
    const mode = state.mode === "split" ? "split" : "oneshot";
    const lang = find(data.languages, state.lang);
    const mic = find(data.micDistance, state.mic);
    const mood = find(data.mood, state.mood);
    const inten = find(data.intensity, state.intensity);
    const usage = find(data.usage, state.usage);
    const genre = find(data.genres, state.genre1);
    const bpm = has(state.bpm) ? trim(state.bpm) : (genre ? String(genre.defaultBpm) : "");
    let excludeBase = [];

    // 완곡 프롬프트 (원샷·스플릿 공통 — 스플릿도 완곡부터 뽑는다)
    parts.push(genrePhrase(state, data));
    if (mood && mood.en) parts.push(mood.en);
    if (inten && inten.en) parts.push(inten.en);
    const coreIns = (state.mainInst || []).filter(m => m.intent !== "out" && m.range === "all");
    if (coreIns.length) parts.push(coreIns.map(m => instPhrase(m)).join(", "));
    else if (genre) parts.push(genre.oneShotTags.join(", "));
    parts.push(vocalPhrase(state, data));
    parts.push(rangePhrase(state, data));
    if (mic && mic.en) parts.push(mic.en);
    const ic = find(data.introCheats, state.introCheat);
    if (ic && ic.en) parts.push(ic.en);
    (state.extraStyle || []).forEach(x => parts.push(x));
    if (bpm) parts.push(`${bpm} BPM`);
    if (lang && lang.en && state.gender !== "none") parts.push(lang.en);
    if (usage && usage.en) parts.push(usage.en);
    if (state.gender === "none") { parts.unshift("instrumental, no vocals"); excludeBase = ["vocals","singing","humming"]; }

    const style = dedup(parts.map(trim).filter(Boolean).join(", ").split(",").map(trim).filter(Boolean)).join(", ");
    const outAll = (state.mainInst || []).filter(m => m.intent === "out" && m.range === "all").map(m => m.en);
    const userEx = [outAll.join(", "), trim(state.userExclude)].filter(Boolean).join(", ");
    const ex = buildExclude(excludeBase, userEx, data, false);
    warnings.push(...mainInstWarnings(state, data));
    warnings.push(...ex.warnings);

    // 디스크립터 개수 점검
    warnings.push(...rangeWarnings(state, data, style));
    const count = parts.map(trim).filter(x => x && !/\bBPM\b|^singing in|^no /i.test(x)).length;
    const lim = data.limits.descriptors[mode];
    if (count > lim.max) warnings.push(`디스크립터 ${count}개. ${mode === "stem" ? "베이스 트랙" : "통짜"} 권장 ${lim.min}~${lim.max}개. 너무 많으면 충돌한다.`);
    if (style.length > data.limits.styleChars) warnings.push(`Style ${style.length}자. 한도 ${data.limits.styleChars}자 — 초과분은 경고 없이 잘린다.`);

    if (state.model === "v6-wild") warnings.push("v6-wild는 결과 편차가 크다. 발매용이면 v6로 두는 것이 안전하다.");
    if (state.model === "v6-mini") warnings.push("v6-mini는 무료 플랜 포함 모델. 무료 플랜 출력에는 상업권이 없다.");
    const sl = sliderFor(state, data);
    if (sl.audioInfluence && sl.styleInfluence && (sl.audioInfluence[1] + sl.styleInfluence[1]) >= 150)
      warnings.push("Style Influence + Audio Influence 합이 과도. 둘 다 높이면 결과가 붕괴한다.");

    return {
      style,
      styleChars: style.length,
      exclude: ex.list,
      sliders: { weirdness: fmtRange(sl.weirdness), styleInfluence: fmtRange(sl.styleInfluence), variety: sl.variety || "0 (고정)", audioInfluence: fmtRange(sl.audioInfluence) },
      model: (data.models.find(m => m.id === state.model) || data.models[0]),
      vocalGender: vocalToggle(state, data),
      warnings
    };
  }

  /* ---------- 가사 ---------- */
  const HANGUL = /[\uAC00-\uD7A3]/g;
  const LATIN  = /[A-Za-z]/;
  const DIGIT  = /[0-9]/;

  function countSyllables(line, lang) {
    const clean = line.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "");
    if (lang === "ko") return (clean.match(HANGUL) || []).length;
    if (lang === "ja") return (clean.match(/[\u3040-\u30FF\u4E00-\u9FFF]/g) || []).length;
    // 영어: 모음 덩어리 근사
    return (clean.toLowerCase().match(/[aeiouy]+/g) || []).length;
  }

  function validateLyrics(text, lang, data) {
    data = data || D();
    const warnings = [];
    const lines = trim(text).split("\n");
    const kr = data.koreanRules.syllablesPerLine;
    lines.forEach((line, i) => {
      const t = trim(line);
      if (!t) return;
      const isTag = /^\[.*\]$/.test(t);
      if (isTag) return;
      const n = i + 1;
      const syl = countSyllables(t, lang);
      if (lang === "ko") {
        if (syl > kr.max) warnings.push(`${n}행: ${syl}음절. 한국어는 8~10음절 권장(최대 12). 줄을 나누거나 쉼표로 호흡을 끊을 것.`);
        if (LATIN.test(t.replace(/\([^)]*\)/g, ""))) warnings.push(`${n}행: 로마자 혼입. 순수 한글로 쓸 것 (로마자 병기는 최후수단).`);
      }
      if (DIGIT.test(t)) warnings.push(`${n}행: 아라비아 숫자. 한글/문자로 풀어 쓸 것 (1234 → 천이백삼십사).`);
      // 소괄호 안 지시어
      const parens = t.match(/\(([^)]*)\)/g) || [];
      parens.forEach(p => {
        const inner = p.slice(1, -1).toLowerCase();
        if (data.directiveWords.some(w => inner.includes(w.toLowerCase())))
          warnings.push(`${n}행: 소괄호 ${p} 안에 지시어. 소괄호는 실제로 부를 소리만. 지시는 [${p.slice(1,-1)}] 처럼 대괄호로.`);
      });
    });
    return warnings;
  }

  function sectionBase(tag) {
    // "Verse 1" → "Verse", "Final Chorus" 그대로
    if (/^Final Chorus/i.test(tag)) return "Final Chorus";
    if (/^Verse/i.test(tag)) return "Verse";
    if (/^Chorus/i.test(tag)) return "Chorus";
    if (/^Pre-Chorus/i.test(tag)) return "Pre-Chorus";
    return tag;
  }

  function directFor(tag, state, data) {
    const table = data.sectionDirecting[state.mode] || data.sectionDirecting.oneshot;
    const key = sectionBase(tag);
    const tpl = table[key] !== undefined ? table[key] : table._default;
    let out = trim(tpl);
    if (isWideRange(state)) {
      const L = data.vocalRange.ladder;
      if (key === "Verse") out = out ? out + ", " + L.verse : L.verse;
      if (key === "Chorus" || key === "Final Chorus") out = out ? out + ", " + L.chorus : L.chorus;
    }
    return dedup(out.split(",").map(trim).filter(Boolean)).join(", ");
  }

  function syllableTemplate(state, data) {
    const st = find(data.structures, state.structure) || data.structures[0];
    const ideal = data.koreanRules.syllablesPerLine.ideal;
    const out = [];
    let verses = 0;
    st.sections.forEach(sec => {
      const key = sectionBase(sec.tag);
      if (key === "Verse") verses++;
      const base = (state.sectionOverrides || {})[sec.tag] || directFor(sec.tag, state, data);
      const dir = joinDir(base, sectionCues(key, verses >= 2, state));
      out.push(dir ? `[${sec.tag}: ${dir}]` : `[${sec.tag}]`);
      for (let i = 0; i < sec.lines; i++) {
        const n = ideal[i % 2];                       // 8, 10 번갈아
        const half = Math.ceil(n / 2);
        out.push("ㅇ".repeat(half) + ", " + "ㅇ".repeat(n - half) + ".");
      }
      out.push("");
    });
    return out.join("\n").trim();
  }

  function decorateLyrics(text, state, data) {
    let verses = 0;
    return trim(text).split("\n").map(line => {
      const m = line.match(/^\[([^\]:]+)(?::([^\]]*))?\]$/);
      if (!m) return line;
      const tag = trim(m[1]), userDir = trim(m[2] || "");
      const key = sectionBase(tag);
      if (key === "Verse") verses++;
      const autoDir = directFor(tag, state, data);
      const ov = (state.sectionOverrides || {})[tag] || "";
      const dir = joinDir(userDir || ov || autoDir, sectionCues(key, verses >= 2, state));
      return dir ? `[${tag}: ${dir}]` : `[${tag}]`;
    }).join("\n");
  }

  function buildLyrics(state, data) {
    data = data || D();
    const empty = !has(state.lyrics);
    const text = empty ? syllableTemplate(state, data) : decorateLyrics(state.lyrics, state, data);
    const warnings = empty ? ["가사 미입력. ㅇ 자리에 맞춰 작사하면 섹션별 보컬 디렉팅이 자동으로 붙는다."] : validateLyrics(state.lyrics, state.lang, data);
    if (isWideRange(state)) warnings.push(data.vocalRange.ladder.note);
    if ((state.mainInst || []).some(m => m.range === "final") && !/\[Final Chorus/i.test(text))
      warnings.push("'마지막 코러스'로 지정한 악기가 들어갈 [Final Chorus] 태그가 없다. 마지막 [Chorus]를 [Final Chorus]로 바꿔 쓰거나 곡 구성을 발라드·K-pop으로 고를 것.");
    if ((state.mainInst || []).some(m => m.range === "intro") && !/\[Intro/i.test(text))
      warnings.push("'인트로에만'으로 지정한 악기가 들어갈 [Intro] 태그가 없다.");
    if (text.length > data.limits.lyricsPracticalChars) warnings.push(`가사 ${text.length}자. 약 ${data.limits.lyricsPracticalChars}자 넘으면 서두르거나 건너뛴다.`);
    return { text, chars: text.length, isTemplate: empty, warnings };
  }


  /* ---------- 악기 선택기 → 영문 문장 ---------- */
  function composeInstrument(sel, INS) {
    INS = INS || root.SUNO_INSTRUMENTS;
    if (!INS || !sel || !sel.en) return "";
    const art = (INS.artic[sel.articType] || []).find(a => a.id === sel.artic);
    const rng = (INS.range || []).find(r => r.id === sel.range);
    let core = trim(sel.en);
    if (art && art.pos === "pre") core = art.en + " " + core;
    let s = "Add " + core;
    if (art && art.pos === "post") s += " " + art.en;
    if (rng && rng.en) s += " " + rng.en;
    return s.replace(/\s+/g, " ").trim();
  }

  /* ---------- 레이어 ---------- */
  function suggestLayers(genreId, data) {
    data = data || D();
    const g = find(data.genres, genreId);
    if (!g) return [];
    return g.layers.map(l => ({ id: l.id, ko: l.ko, prompt: l.prompt, detail: "" }));
  }

  function buildLayers(state, data) {
    data = data || D();
    if (state.mode !== "split") return [];
    const genre = find(data.genres, state.genre1);
    const bpm = has(state.bpm) ? trim(state.bpm) : (genre ? String(genre.defaultBpm) : "");
    const R = data.layerRules;
    return (state.layers || []).map((l, i) => {
      const warnings = [];
      const op = find(data.stemOps, l.op) || data.stemOps[0];
      const nameBlob = (l.ko + " " + (l.prompt || "") + " " + (l.detail || "")).toLowerCase();
      if (op.id === "add" && R.harmonyKeywords.some(k => nameBlob.includes(k.toLowerCase()))) warnings.push(R.harmonyWarning);

      let prompt;
      if (op.id === "remove") {
        prompt = `(Chat Bar 불필요) Advanced Split으로 ${l.ko} 스템을 분리한 뒤 뮤트. 재생성하지 않으므로 크레딧은 분리분만 소모된다.`;
      } else {
        const body = trim(l.prompt) || `Add ${l.ko}`;
        const core = body.replace(/^Add /, "");
        const verb = op.id === "regen" ? "Regenerate this part as" : op.id === "replace" ? "Replace this part with" : "Add";
        const detail = has(l.detail) ? " " + trim(l.detail).replace(/\.?$/, ".") : "";
        const tech = bpm ? ` ${bpm} BPM.` : "";
        prompt = `${verb} ${core}.${detail} ${R.detailRelation}${tech}`.replace(/\s+/g, " ").trim();
      }
      return { order: i + 1, id: l.id, name: l.ko, op: op.ko, opId: op.id, opNote: op.note, prompt, notes: R.postNotes, warnings };
    });
  }

  /* ---------- Advanced Split 지정 목록 ---------- */
  function buildSplitPlan(state, data) {
    data = data || D();
    if (state.mode !== "split") return null;
    const picked = (state.splitTargets || []).map(id => find(data.stemTargets, id)).filter(Boolean);
    const weak = picked.filter(x => x.quality === "weak");
    return {
      list: picked.map(x => x.en),
      ko: picked.map(x => x.ko),
      credits: picked.length * 10,
      weak: weak.map(x => x.ko),
      warnings: [
        picked.length === 0 ? "분리할 스템을 하나도 고르지 않았다." : "",
        picked.length > 5 ? "스템이 많을수록 아티팩트·크로스토크가 늘어난다. 필요한 것만 고를 것." : "",
        weak.length ? `품질이 약한 스템: ${weak.map(x => x.ko).join(", ")}. baked-in 이펙트에 잠기거나 힘이 빠질 수 있으니 DAW 재작업 대안을 준비할 것.` : ""
      ].filter(Boolean)
    };
  }

  /* ---------- 체크리스트 ---------- */
  function buildChecklist(state, data) {
    data = data || D();
    const mode = state.mode === "split" ? "split" : "oneshot";
    return {
      items: data.checklist[mode].map(x => ({ ...x })),
      credits: data.checklist.credits,
      v6: data.checklist.v6,
      korean: data.checklist.korean,
      route: data.checklist.route,
      downloadCap: data.checklist.downloadCap,
      excludeVerify: data.excludeRules.howToVerify,
      sliderDebug: data.sliders.debug
    };
  }

  /* ---------- 전체 빌드 ---------- */
  function buildAll(state, data) {
    data = data || D();
    return {
      base: buildBasePrompt(state, data),
      lyrics: buildLyrics(state, data),
      layers: buildLayers(state, data),
      split: buildSplitPlan(state, data),
      check: buildChecklist(state, data)
    };
  }

  root.SUNO_RULES = { instPhrase, mainInstPreview, mainInstPlace, composeInstrument, rangePhrase, isWideRange, buildSplitPlan, defaultState, buildAll, buildBasePrompt, buildLyrics, buildLayers, buildChecklist, validateLyrics, suggestLayers, countSyllables, genrePhrase };
})(typeof window !== "undefined" ? window : globalThis);

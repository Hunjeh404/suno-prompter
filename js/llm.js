/* =====================================================================
   SUNO PROMPT GENERATOR — LLM LAYER (2층, 선택 기능)
   ---------------------------------------------------------------------
   사용자 키로 브라우저에서 직접 호출. 서버 없음. 키는 기기 밖으로 나가지 않는다.
   어댑터 A: OpenAI 규격 (OpenAI, Grok)  /  어댑터 B: Anthropic
   Gemini 제외 (OpenAI 호환 엔드포인트 CORS 문제). 필요 시 OpenRouter를 A 규격으로 추가.
   ===================================================================== */
(function (root) {
  "use strict";

  const PROVIDERS = {
    openai: { name: "OpenAI",  adapter: "A", url: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
    grok:   { name: "Grok (xAI)", adapter: "A", url: "https://api.x.ai/v1/chat/completions", defaultModel: "grok-3-mini" },
    claude: { name: "Claude", adapter: "B", url: "https://api.anthropic.com/v1/messages", defaultModel: "claude-sonnet-4-6" }
  };

  function systemPrompt(data) {
    return [
      "You are a Suno v5.5 prompt engineer. Return ONLY a JSON object, no markdown, no prose.",
      "Rules you must follow (verified, non-negotiable):",
      "- Style descriptors: front-load genre. Do NOT use percentages for genre blending. Avoid contradictory moods.",
      "- Do not write technical mixing terms (sidechain, compression ratio). Suno ignores them in Style.",
      "- Section directing goes inside square brackets after the tag: [Verse 1: whispered, guitar only]. Never put directives inside parentheses — parentheses are sung.",
      "- Never use note names or octave numbers (C3, G4, \"A2 to E5\"). Suno ignores them. Describe range with voice-type and register words only.",
      "- Korean lyrics: keep 8-10 syllables per line, keep commas/periods for breathing, no romanization, no Arabic numerals.",
      "- In STEM mode the base track must stay minimal: ONE accompaniment instrument + vocal. Do not suggest adding instruments to the Style; those go to Studio layers.",
      "- Never suggest AI harmony vocal layering (sync drifts). Backing vocals are regenerated whole.",
      "Output schema: {\"styleAdditions\": [up to 3 short descriptors that sharpen mood/texture, or empty], \"sectionDirecting\": {\"<tag as in lyrics>\": \"<short directing in the lyric language>\"}, \"layerHints\": {\"<layer id>\": \"<one short phrase>\"}, \"note\": \"<one sentence for the producer, in Korean>\"}"
    ].join("\n");
  }

  function userPrompt(state, built, data) {
    const g = (data.genres.find(x => x.id === state.genre1) || {}).en || state.genre1;
    return JSON.stringify({
      mode: state.mode,
      theme: state.theme,
      genre: g, genre2: state.genre2, blend: state.blend,
      bpm: state.bpm, vocalRange: { low: state.rangeLow, high: state.rangeHigh }, mood: state.mood, language: state.lang,
      vocal: { gender: state.gender, tone: state.tone, mic: state.mic },
      mainInstruments: (state.mainInst || []).map(m => ({ name: m.en, articulation: m.artic, range: m.range, intent: m.intent })),
      currentStyle: built.base.style,
      lyrics: state.lyrics ? state.lyrics.slice(0, 2500) : "(none yet)",
      layers: built.layers.map(l => ({ id: l.id, name: l.name }))
    });
  }

  async function callA(p, key, model, sys, usr) {
    const r = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ model, temperature: 0.4, messages: [{ role: "system", content: sys }, { role: "user", content: usr }] })
    });
    if (!r.ok) throw new Error(`${p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "";
  }

  async function callB(p, key, model, sys, usr) {
    const r = await fetch(p.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model, max_tokens: 1200, system: sys, messages: [{ role: "user", content: usr }] })
    });
    if (!r.ok) throw new Error(`${p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
  }

  function parseJSON(text) {
    const clean = text.replace(/```json|```/g, "").trim();
    const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
    return JSON.parse(clean.slice(s, e + 1));
  }

  async function enhance({ provider, key, model, state, built, data }) {
    const p = PROVIDERS[provider];
    if (!p) throw new Error("알 수 없는 프로바이더: " + provider);
    if (!key) throw new Error("API 키가 없음");
    const m = model || p.defaultModel;
    const sys = systemPrompt(data), usr = userPrompt(state, built, data);
    const raw = p.adapter === "A" ? await callA(p, key, m, sys, usr) : await callB(p, key, m, sys, usr);
    const out = parseJSON(raw);
    return {
      styleAdditions: Array.isArray(out.styleAdditions) ? out.styleAdditions.slice(0, 3).map(String) : [],
      sectionDirecting: out.sectionDirecting && typeof out.sectionDirecting === "object" ? out.sectionDirecting : {},
      layerHints: out.layerHints && typeof out.layerHints === "object" ? out.layerHints : {},
      note: out.note ? String(out.note) : ""
    };
  }

  /* ---------- 음원 분석 (Gemini 네이티브 엔드포인트 — 오디오 입력, 브라우저 직접 호출 가능) ----------
     선택지 id만 고르게 해서 폼을 그대로 조작한다. 가사·가수명·곡명은 받지 않는다. */
  const GEMINI = { name: "Gemini", defaultModel: "gemini-flash-latest", maxBytes: 14 * 1024 * 1024,
    url: m => "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent" };

  function analyzePrompt(data, ins) {
    const ids = l => l.map(x => x.id + " (" + (x.en || x.ko) + ")").join("; ");
    const V = data.vocalRange;
    return [
      "Listen to the attached song and describe its STYLE and STRUCTURE for a Suno prompt builder.",
      "Return ONLY a JSON object. Use generic musical terms only: never output artist names, song titles, or lyrics.",
      "Every field marked [id] must be exactly one id from its list.",
      "- genre1: [id] if one fits: " + ids(data.genres) + ". Otherwise a short English genre name (2-3 words).",
      "- genre2: a secondary genre in the same form, or \"\" if there is none.",
      "- blend [id]: " + ids(data.genreBlend),
      "- bpm: integer tempo.",
      "- length [id]: nearest of " + data.lengths.join("; "),
      "- lang [id]: " + ids(data.languages) + ". Use \"\" for instrumental or another language.",
      "- intensity [id] (not none): " + ids(data.intensity),
      "- mood [id] (not none): " + ids(data.mood),
      "- introCheat [id]: " + ids(data.introCheats),
      "- gender [id] (none = instrumental): " + ids(data.vocal.gender),
      "- age [id]: " + ids(data.vocal.age),
      "- tone [id]: " + ids(data.vocal.tone),
      "- mic [id]: " + ids(data.micDistance),
      "- rangeLow [id] (how low the vocal goes): " + ids(V.low),
      "- rangeHigh [id] (how high the vocal goes): " + ids(V.high),
      "- range: one of " + data.vocal.rangeChips.join("; ") + ", or \"\".",
      "- instruments: up to 6 objects {en, artic, range}, most prominent first. Do not list the lead vocal.",
      "    en: exactly one of: " + ins.tree.map(f => f.items.map(i => i.en + " <" + i.a + ">").join(", ")).join(", "),
      "    artic: playing style id for that instrument's <type>, or \"\": " + Object.entries(ins.artic).filter(([, v]) => v.length).map(([k, v]) => k + " = " + v.map(a => a.id + " (" + a.en + ")").join(", ")).join(" | "),
      "    range [id]: \"all\" if it plays through the whole song (at most 4 of these), else: " + ids(ins.range.filter(r => r.id !== "all")),
      "- sections: the song's sections in order, as {tag, lines}. tag is one of Intro, Verse 1, Verse 2, Verse 3, Pre-Chorus, Chorus, Final Chorus, Bridge, Hook, Dance Break, Instrumental, Outro. lines = number of sung lyric lines in that section (0 if instrumental).",
      "- extraStyle: up to 3 short English descriptors of texture or production that the fields above do not cover. No mixing jargon."
    ].join("\n");
  }

  const pick = (list, v, fb) => list.some(x => x.id === v) ? v : fb;

  async function analyze({ key, model, file, data, ins }) {
    if (!key) throw new Error("Gemini API 키가 없음");
    if (!file) throw new Error("음원 파일이 없음");
    if (file.size > GEMINI.maxBytes) throw new Error("파일이 14MB를 넘음. mp3로 변환해 올리세요.");
    const b64 = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = () => no(new Error("파일을 읽지 못함")); fr.readAsDataURL(file); });
    const r = await fetch(GEMINI.url(model || GEMINI.defaultModel), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: file.type || "audio/mpeg", data: b64 } }, { text: analyzePrompt(data, ins) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const o = parseJSON((j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join(""));

    const genre = v => { const t = String(v || "").trim(); const g = data.genres.find(x => x.id === t || x.en.toLowerCase() === t.toLowerCase()); return g ? g.id : t; };
    const items = [].concat(...ins.tree.map(f => f.items));
    const V = data.vocalRange, bpm = Math.round(+o.bpm);
    let whole = 0;
    const mainInst = (Array.isArray(o.instruments) ? o.instruments : []).map(m => {
      const it = items.find(i => i.en.toLowerCase() === String(m && m.en || "").toLowerCase()); if (!it) return null;
      let range = pick(ins.range, m.range, "all");
      if (range === "all" && ++whole > 4) range = "chorus";
      return { ko: it.ko, en: it.en, a: it.a, artic: (ins.artic[it.a] || []).some(a => a.id === m.artic) ? m.artic : null, range, intent: "in" };
    }).filter(Boolean).slice(0, 6);
    const sections = (Array.isArray(o.sections) ? o.sections : []).filter(s => s && s.tag)
      .map(s => ({ tag: String(s.tag).replace(/[\[\]:]/g, "").trim().slice(0, 24), lines: Math.max(0, Math.min(12, Math.round(+s.lines) || 0)) })).slice(0, 16);
    return {
      fields: {
        genre1: genre(o.genre1), genre2: genre(o.genre2), blend: pick(data.genreBlend, o.blend, "lead"),
        bpm: bpm > 0 ? String(bpm) : "",
        length: data.lengths.includes(o.length) ? o.length : "3분",
        intensity: pick(data.intensity, o.intensity, "none"), mood: pick(data.mood, o.mood, "none"),
        introCheat: pick(data.introCheats, o.introCheat, "none"),
        gender: pick(data.vocal.gender, o.gender, "none"), age: pick(data.vocal.age, o.age, "none"),
        tone: pick(data.vocal.tone, o.tone, "none"), mic: pick(data.micDistance, o.mic, "none"),
        rangeLow: pick(V.low, o.rangeLow, "L2"), rangeHigh: pick(V.high, o.rangeHigh, "H2"),
        range: data.vocal.rangeChips.includes(o.range) ? o.range : ""
      },
      lang: pick(data.languages, o.lang, ""),
      mainInst, sections,
      extraStyle: (Array.isArray(o.extraStyle) ? o.extraStyle : []).slice(0, 3).map(String)
    };
  }

  root.SUNO_LLM = { PROVIDERS, enhance, GEMINI, analyze };
})(typeof window !== "undefined" ? window : globalThis);

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

  root.SUNO_LLM = { PROVIDERS, enhance };
})(typeof window !== "undefined" ? window : globalThis);

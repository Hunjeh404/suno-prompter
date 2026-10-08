/* =====================================================================
   SUNO PROMPT GENERATOR — STORAGE LAYER (2층)
   ---------------------------------------------------------------------
   로직과 UI는 이 인터페이스만 안다. 구현체(localStorage)는 모른다.
   2단계에서 Supabase 등으로 갈아끼울 때 이 파일의 impl만 교체한다.
   API 키는 절대 동기화 대상에 넣지 않는다 (별도 키 공간).
   ===================================================================== */
(function (root) {
  "use strict";

  const NS = "suno-gen:";
  const K = { projects: NS + "projects", current: NS + "current", keys: NS + "apikeys", check: NS + "check:" };

  const hasLS = (() => { try { const t = "__t"; localStorage.setItem(t, t); localStorage.removeItem(t); return true; } catch { return false; } })();
  const mem = {};
  const get = k => { if (hasLS) { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } return mem[k] ?? null; };
  const set = (k, v) => { if (hasLS) localStorage.setItem(k, JSON.stringify(v)); else mem[k] = v; };
  const del = k => { if (hasLS) localStorage.removeItem(k); else delete mem[k]; };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- 프로젝트 ---------- */
  const Storage = {
    persistent: hasLS,

    async list() {
      return (get(K.projects) || []).map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, mode: p.state && p.state.mode }));
    },
    async load(id) {
      return (get(K.projects) || []).find(p => p.id === id) || null;
    },
    async save(project) {
      const all = get(K.projects) || [];
      const now = new Date().toISOString();
      if (!project.id) project.id = uid();
      project.updatedAt = now;
      const i = all.findIndex(p => p.id === project.id);
      if (i >= 0) all[i] = project; else all.unshift(project);
      set(K.projects, all);
      set(K.current, project.id);
      return { id: project.id };
    },
    async remove(id) {
      set(K.projects, (get(K.projects) || []).filter(p => p.id !== id));
      del(K.check + id);
      if (get(K.current) === id) del(K.current);
    },
    async currentId() { return get(K.current); },
    async setCurrent(id) { set(K.current, id); },

    async exportAll() {
      return JSON.stringify({ app: "suno-prompt-generator", version: 1, exportedAt: new Date().toISOString(), projects: get(K.projects) || [] }, null, 2);
    },
    async importAll(json, merge) {
      const data = typeof json === "string" ? JSON.parse(json) : json;
      if (!data || !Array.isArray(data.projects)) throw new Error("가져올 수 없는 파일. suno-prompt-generator 내보내기 파일이 아님.");
      const incoming = data.projects.filter(p => p && p.id && p.state);
      if (merge) {
        const all = get(K.projects) || [];
        incoming.forEach(p => { const i = all.findIndex(x => x.id === p.id); if (i >= 0) all[i] = p; else all.push(p); });
        set(K.projects, all);
      } else set(K.projects, incoming);
      return incoming.length;
    },

    /* 체크리스트 진행 상황 (프로젝트별) */
    async loadCheck(id) { return get(K.check + (id || "draft")) || {}; },
    async saveCheck(id, obj) { set(K.check + (id || "draft"), obj); },

    /* API 키 — 이 기기에만. 동기화 대상 아님. */
    async getKeys() { return get(K.keys) || {}; },
    async setKey(provider, key, model) {
      const all = get(K.keys) || {};
      if (!key) delete all[provider]; else all[provider] = { key, model: model || "" };
      set(K.keys, all);
    },
    async clearKeys() { del(K.keys); }
  };

  /* ---------- 인증 자리 (1단계: 항상 미로그인) ---------- */
  const Auth = {
    async currentUser() { return null; },
    async signIn() { throw new Error("로그인은 아직 지원하지 않음"); },
    async signOut() {}
  };

  root.SUNO_STORAGE = Storage;
  root.SUNO_AUTH = Auth;
})(typeof window !== "undefined" ? window : globalThis);

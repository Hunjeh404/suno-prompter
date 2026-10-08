/* =====================================================================
   SUNO PROMPT GENERATOR — 악기 트리 (레이어 추가 선택기용)
   ---------------------------------------------------------------------
   Suno Studio Chat Bar는 자유 입력이므로 이 목록은 Suno의 스템 분리 목록을
   흉내내는 것이 아니라, 악기 이름을 영어로 떠올리지 않고 고르기 위한 도구다.
   2단(악기)은 Advanced Split 목록 기준, 3단(주법/역할)은 새로 만든 것.

   구조:
   - ARTIC: 주법 유형 정의. 악기마다 다시 쓴다 (보잉현은 전부 같은 축을 쓰는 식).
   - TREE:  계열 → 악기. 각 악기는 artic 유형 하나를 가리킨다.
   - RANGE: 구간 (곡 전체 / 2절부터 / 코러스만 …)
   ===================================================================== */

window.SUNO_INSTRUMENTS = {

  /* ---------- 3단: 주법 / 역할 유형 ---------- */
  /* en은 "Add {en}" 문장에 들어갈 수식어. 악기명 앞뒤 어디에 붙는지는 pos로. */
  artic: {
    none: [],

    /* 드럼 킷 — 그루브 종류 */
    kit: [
      { id:"tight",    ko:"타이트하게",        en:"tight",                    pos:"pre" },
      { id:"laidback", ko:"뒤로 눕혀서",        en:"laid-back, behind-the-beat", pos:"pre" },
      { id:"brush",    ko:"브러시로",          en:"played with brushes",       pos:"post" },
      { id:"four",     ko:"포온더플로어",      en:"four-on-the-floor",         pos:"pre" },
      { id:"halftime", ko:"하프타임",          en:"with a half-time feel",       pos:"post" },
      { id:"twostep",  ko:"2-스텝 개러지",     en:"in a UK garage 2-step pattern", pos:"post" },
      { id:"fill",     ko:"필인 위주",         en:"playing mostly fills and transitions", pos:"post" },
      { id:"minimal",  ko:"아주 단순하게",     en:"minimal, sparse",           pos:"pre" }
    ],

    /* 단일 타악기 */
    perc: [
      { id:"steady",   ko:"일정하게 깔기",     en:"steady, supportive",        pos:"pre" },
      { id:"accent",   ko:"악센트만",          en:"as accents only",           pos:"post" },
      { id:"offbeat",  ko:"엇박으로",          en:"on the offbeats",           pos:"post" },
      { id:"build",    ko:"고조시키며",        en:"building through the section", pos:"post" },
      { id:"sparse",   ko:"드문드문",          en:"sparse",                    pos:"pre" }
    ],

    /* 베이스 계열 */
    bass: [
      { id:"root",     ko:"루트 위주로",       en:"simple root-note",          pos:"pre" },
      { id:"melodic",  ko:"멜로딕하게",        en:"playing a melodic line with fills", pos:"post" },
      { id:"sync",     ko:"싱코페이션",        en:"funky and syncopated",      pos:"pre" },
      { id:"walking",  ko:"워킹 베이스",       en:"playing a walking line",       pos:"post" },
      { id:"slap",     ko:"슬랩으로",          en:"played slap style",            pos:"post" },
      { id:"sub",      ko:"묵직한 저역",       en:"deep sub-heavy",            pos:"pre" },
      { id:"slide",    ko:"슬라이드 섞어",     en:"with slides and glides",    pos:"post" }
    ],

    /* 일렉 기타 — 가장 갈래가 많다 */
    egtr: [
      { id:"cutting",  ko:"커팅 (긁기)",       en:"playing cutting rhythm chords", pos:"post" },
      { id:"arp",      ko:"아르페지오",        en:"playing arpeggiated figures",  pos:"post" },
      { id:"lead",     ko:"리드 멜로디",       en:"playing a lead melody line",   pos:"post" },
      { id:"power",    ko:"파워코드",          en:"playing power chords",         pos:"post" },
      { id:"mute",     ko:"뮤트 주법",         en:"palm-muted",                pos:"pre" },
      { id:"ambient",  ko:"앰비언트 (리버브)", en:"playing ambient reverb-drenched swells", pos:"post" },
      { id:"lick",     ko:"짧은 릭",           en:"playing short licks between vocal phrases", pos:"post" },
      { id:"solo",     ko:"솔로",              en:"playing a solo",               pos:"post" }
    ],

    /* 어쿠스틱/플럭현 */
    agtr: [
      { id:"finger",   ko:"핑거스타일",        en:"fingerpicked",              pos:"pre" },
      { id:"strum",    ko:"스트러밍",          en:"strummed",                  pos:"pre" },
      { id:"arp",      ko:"아르페지오",        en:"arpeggiated",               pos:"pre" },
      { id:"lick",     ko:"짧은 릭",           en:"playing short licks between vocal phrases", pos:"post" },
      { id:"double",   ko:"기존 파트 겹치기",  en:"doubling the existing part", pos:"post" }
    ],

    /* 보잉현 (바이올린~더블베이스, 신스 스트링 포함) */
    bowed: [
      { id:"legato",   ko:"레가토",            en:"legato, sustained",         pos:"pre" },
      { id:"stacc",    ko:"스타카토",          en:"staccato",                  pos:"pre" },
      { id:"pizz",     ko:"피치카토",          en:"pizzicato",                 pos:"pre" },
      { id:"trem",     ko:"트레몰로",          en:"tremolo",                   pos:"pre" },
      { id:"swell",    ko:"스웰 (부풀리며)",   en:"swelling underneath",       pos:"post" },
      { id:"counter",  ko:"대선율",            en:"playing a counter-melody",     pos:"post" },
      { id:"pad",      ko:"패드처럼 깔기",     en:"as a sustained pad underneath", pos:"post" }
    ],

    /* 관악 공통 (목관/금관) */
    wind: [
      { id:"solo",     ko:"솔로 멜로디",       en:"playing a solo melody line",   pos:"post" },
      { id:"stab",     ko:"스탭 (짧게 찌르기)", en:"short stabs",              pos:"post" },
      { id:"counter",  ko:"대선율",            en:"playing a counter-melody",     pos:"post" },
      { id:"sustain",  ko:"길게 깔기",         en:"holding long sustained notes underneath", pos:"post" },
      { id:"mute",     ko:"뮤트로",            en:"muted",                     pos:"pre" },
      { id:"section",  ko:"섹션으로 (여러 대)", en:"as a section, harmonized", pos:"post" }
    ],

    /* 건반 */
    keys: [
      { id:"chord",    ko:"코드 반주",         en:"comping chords",               pos:"post" },
      { id:"arp",      ko:"아르페지오",        en:"playing arpeggiated figures",  pos:"post" },
      { id:"melody",   ko:"멜로디",            en:"playing a melody line",        pos:"post" },
      { id:"jazzy",    ko:"확장 화성으로",     en:"with extended jazzy voicings", pos:"post" },
      { id:"stab",     ko:"스탭",              en:"playing short chord stabs",    pos:"post" },
      { id:"pad",      ko:"패드처럼 깔기",     en:"as a sustained bed underneath", pos:"post" }
    ],

    /* 유율 타악 (글로켄슈필, 마림바 등) */
    mallet: [
      { id:"melody",   ko:"멜로디",            en:"playing a melody line",        pos:"post" },
      { id:"arp",      ko:"아르페지오",        en:"playing arpeggiated figures",  pos:"post" },
      { id:"accent",   ko:"악센트만",          en:"as sparse accents",         pos:"post" },
      { id:"roll",     ko:"롤 (굴리기)",       en:"with rolls",                pos:"post" }
    ],

    /* 신스 리드 */
    synthlead: [
      { id:"hook",     ko:"훅 멜로디",         en:"playing a hook melody",        pos:"post" },
      { id:"counter",  ko:"대선율",            en:"playing a counter-melody",     pos:"post" },
      { id:"stab",     ko:"스탭",              en:"playing short stabs",          pos:"post" },
      { id:"arp",      ko:"아르페지오",        en:"arpeggiated",               pos:"pre" },
      { id:"solo",     ko:"솔로",              en:"playing a solo",               pos:"post" }
    ],

    /* 신스 패드 */
    pad: [
      { id:"wide",     ko:"넓게 깔기",         en:"wide and sustained underneath", pos:"post" },
      { id:"evolve",   ko:"서서히 변화",       en:"slowly evolving",           pos:"pre" },
      { id:"swell",    ko:"스웰",              en:"swelling into the section", pos:"post" },
      { id:"subtle",   ko:"아주 은은하게",     en:"very subtle, barely audible", pos:"post" }
    ],

    /* 보컬 계열 (백보컬·합창) */
    vox: [
      { id:"harm",     ko:"화음 쌓기",         en:"singing stacked harmonies",    pos:"post" },
      { id:"call",     ko:"콜앤리스폰스",      en:"singing call-and-response answers", pos:"post" },
      { id:"adlib",    ko:"애드립",            en:"singing ad-libs",              pos:"post" },
      { id:"chop",     ko:"보컬 챕 (텍스처)",  en:"as chopped rhythmic texture", pos:"post" },
      { id:"unison",   ko:"유니즌으로",        en:"in unison with the lead",   pos:"post" }
    ],

    /* 텍스처 / FX */
    fx: [
      { id:"bed",      ko:"바닥에 깔기",       en:"as a background bed",       pos:"post" },
      { id:"transition", ko:"전환부에만",      en:"at section transitions only", pos:"post" },
      { id:"accent",   ko:"포인트로",          en:"as occasional accents",     pos:"post" },
      { id:"riser",    ko:"고조시키며",        en:"rising into the next section", pos:"post" }
    ]
  },

  /* ---------- 구간 ---------- */
  range: [
    { id:"all",     ko:"곡 전체",       en:"" },
    { id:"v2",      ko:"2절부터",       en:"entering at the second verse" },
    { id:"chorus",  ko:"코러스에서만",  en:"in the chorus only" },
    { id:"verse",   ko:"벌스에서만",    en:"in the verses only" },
    { id:"bridge",  ko:"브릿지에서만",  en:"in the bridge only" },
    { id:"final",   ko:"마지막 코러스", en:"in the final chorus only" },
    { id:"intro",   ko:"인트로에만",    en:"in the intro only" },
    { id:"outro",   ko:"아웃트로에만",  en:"in the outro only" }
  ],

  /* ---------- 1단 계열 → 2단 악기 ---------- */
  /* a = artic 유형 키. 없으면 none. */
  tree: [
    { id:"drums", ko:"드럼 · 타악", items:[
      { ko:"드럼 킷",      en:"drums",           a:"kit" },
      { ko:"킥",           en:"kick drum",       a:"perc" },
      { ko:"스네어",       en:"snare",           a:"perc" },
      { ko:"하이햇",       en:"hi-hats",         a:"perc" },
      { ko:"심벌",         en:"cymbals",         a:"perc" },
      { ko:"클랩",         en:"claps",           a:"perc" },
      { ko:"탬버린",       en:"tambourine",      a:"perc" },
      { ko:"셰이커",       en:"shaker",          a:"perc" },
      { ko:"콩가",         en:"congas",          a:"perc" },
      { ko:"봉고",         en:"bongos",          a:"perc" },
      { ko:"카우벨",       en:"cowbell",         a:"perc" },
      { ko:"팀파니",       en:"timpani",         a:"perc" },
      { ko:"스틸 드럼",    en:"steel drums",     a:"mallet" },
      { ko:"젬베",         en:"djembe",          a:"perc" },
      { ko:"타이코",       en:"taiko drums",     a:"perc" },
      { ko:"타블라",       en:"tabla",           a:"perc" },
      { ko:"퍼커션 (통칭)", en:"percussion",     a:"perc" }
    ]},
    { id:"bass", ko:"베이스", items:[
      { ko:"베이스 기타",   en:"bass guitar",    a:"bass" },
      { ko:"업라이트 베이스", en:"upright bass", a:"bass" },
      { ko:"신스 베이스",   en:"synth bass",     a:"bass" },
      { ko:"서브 베이스",   en:"sub bass",       a:"bass" },
      { ko:"808",          en:"808 bass",        a:"bass" }
    ]},
    { id:"egtr", ko:"일렉 기타", items:[
      { ko:"클린 일렉기타", en:"clean electric guitar", a:"egtr" },
      { ko:"오버드라이브 기타", en:"overdriven electric guitar", a:"egtr" },
      { ko:"리드 기타",     en:"lead guitar",    a:"egtr" },
      { ko:"리듬 기타",     en:"rhythm electric guitar", a:"egtr" },
      { ko:"앰비언트 기타", en:"ambient guitar", a:"egtr" },
      { ko:"슬라이드 기타", en:"slide guitar",   a:"egtr" }
    ]},
    { id:"agtr", ko:"어쿠스틱 · 플럭현", items:[
      { ko:"어쿠스틱 기타", en:"acoustic guitar", a:"agtr" },
      { ko:"나일론 기타",   en:"nylon-string guitar", a:"agtr" },
      { ko:"12현 기타",     en:"12-string acoustic guitar", a:"agtr" },
      { ko:"만돌린",       en:"mandolin",        a:"agtr" },
      { ko:"밴조",         en:"banjo",           a:"agtr" },
      { ko:"우쿨렐레",     en:"ukulele",         a:"agtr" },
      { ko:"시타르",       en:"sitar",           a:"agtr" },
      { ko:"하프",         en:"harp",            a:"agtr" },
      { ko:"코토",         en:"koto",            a:"agtr" }
    ]},
    { id:"bowed", ko:"현악 (활)", items:[
      { ko:"바이올린",     en:"violin",          a:"bowed" },
      { ko:"비올라",       en:"viola",           a:"bowed" },
      { ko:"첼로",         en:"cello",           a:"bowed" },
      { ko:"더블베이스",   en:"double bass",     a:"bowed" },
      { ko:"피들",         en:"fiddle",          a:"bowed" },
      { ko:"스트링 앙상블", en:"string ensemble", a:"bowed" },
      { ko:"신스 스트링",  en:"synth strings",   a:"bowed" }
    ]},
    { id:"wood", ko:"목관", items:[
      { ko:"플루트",       en:"flute",           a:"wind" },
      { ko:"피콜로",       en:"piccolo",         a:"wind" },
      { ko:"클라리넷",     en:"clarinet",        a:"wind" },
      { ko:"오보에",       en:"oboe",            a:"wind" },
      { ko:"바순",         en:"bassoon",         a:"wind" },
      { ko:"색소폰",       en:"saxophone",       a:"wind" },
      { ko:"테너 색소폰",  en:"tenor saxophone", a:"wind" },
      { ko:"알토 색소폰",  en:"alto saxophone",  a:"wind" },
      { ko:"바리톤 색소폰", en:"baritone saxophone", a:"wind" },
      { ko:"하모니카",     en:"harmonica",       a:"wind" },
      { ko:"멜로디카",     en:"melodica",        a:"wind" },
      { ko:"백파이프",     en:"bagpipes",        a:"wind" }
    ]},
    { id:"brass", ko:"금관", items:[
      { ko:"트럼펫",       en:"trumpet",         a:"wind" },
      { ko:"트롬본",       en:"trombone",        a:"wind" },
      { ko:"프렌치 호른",  en:"French horn",     a:"wind" },
      { ko:"튜바",         en:"tuba",            a:"wind" },
      { ko:"브라스 섹션",  en:"brass section",   a:"wind" },
      { ko:"신스 브라스",  en:"synth brass",     a:"wind" }
    ]},
    { id:"keys", ko:"건반", items:[
      { ko:"피아노",       en:"piano",           a:"keys" },
      { ko:"일렉트릭 피아노", en:"electric piano", a:"keys" },
      { ko:"로즈",         en:"warm Rhodes electric piano", a:"keys" },
      { ko:"오르간",       en:"organ",           a:"keys" },
      { ko:"신스 키",      en:"synth keys",      a:"keys" },
      { ko:"하프시코드",   en:"harpsichord",     a:"keys" },
      { ko:"첼레스타",     en:"celesta",         a:"keys" },
      { ko:"뮤직박스",     en:"music box",       a:"keys" },
      { ko:"아코디언",     en:"accordion",       a:"keys" }
    ]},
    { id:"mallet", ko:"유율 타악", items:[
      { ko:"글로켄슈필",   en:"glockenspiel",    a:"mallet" },
      { ko:"마림바",       en:"marimba",         a:"mallet" },
      { ko:"비브라폰",     en:"vibraphone",      a:"mallet" },
      { ko:"실로폰",       en:"xylophone",       a:"mallet" },
      { ko:"벨",           en:"bells",           a:"mallet" }
    ]},
    { id:"synth", ko:"신스", items:[
      { ko:"신스 리드",    en:"synth lead",      a:"synthlead" },
      { ko:"신스 패드",    en:"synth pad",       a:"pad" },
      { ko:"아르페지에이터", en:"arpeggiator",   a:"synthlead" },
      { ko:"보코더",       en:"vocoder",         a:"vox" },
      { ko:"테레민",       en:"theremin",        a:"synthlead" },
      { ko:"드론",         en:"drone",           a:"pad" }
    ]},
    { id:"vox", ko:"보컬 · 코러스", items:[
      { ko:"백보컬",       en:"backing vocals",  a:"vox" },
      { ko:"합창",         en:"choir",           a:"vox" },
      { ko:"휘슬 (휘파람)", en:"whistling",      a:"vox" },
      { ko:"보컬 챕",      en:"vocal chops",     a:"vox" }
    ]},
    { id:"fx", ko:"텍스처 · FX", items:[
      { ko:"라이저",       en:"risers",          a:"fx" },
      { ko:"바이닐 노이즈", en:"vinyl crackle",  a:"fx" },
      { ko:"앰비언스 / 필드 레코딩", en:"ambient field-recording texture", a:"fx" },
      { ko:"디저리두",     en:"didgeridoo",      a:"fx" }
    ]}
  ]
};

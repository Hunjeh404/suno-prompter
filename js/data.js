/* =====================================================================
   SUNO PROMPT GENERATOR — DATA LAYER (1층)
   ---------------------------------------------------------------------
   수노가 업데이트되면 이 파일만 고친다. 코드(rules.js / ui.js)는 건드리지 않는다.
   모든 값은 리서치 리포트·매뉴얼 v2에서 검증된 것을 기준으로 한다.
   [unverified] 표기는 1차 근거가 확인되지 않은 항목 — 시도 가치는 있으나 보장 없음.
   ===================================================================== */

window.SUNO_DATA = {

  version: "2026-09-14b",
  targetModel: "Suno v6 / Studio 2.0",

  /* ---------- 모델 (2026-09-09 v6 출시, v4~v5.5 전부 은퇴) ---------- */
  models: [
    { id:"v6",      ko:"v6 (기본)",   note:"플래그십. 발매용 기본값. Pro/Premier 전용." },
    { id:"v6-wild", ko:"v6-wild",     note:"실험적 아이디어용. 결과 편차가 크다. Pro/Premier 전용." },
    { id:"v6-mini", ko:"v6-mini",     note:"빠르고 가벼운 버전. 무료 포함 전 플랜. 무료 플랜은 상업권 없음." }
  ],

  /* ---------- 글자수 한도 (v5 / v5.5) ---------- */
  limits: {
    styleChars: 1000,
    lyricsChars: 5000,
    lyricsPracticalChars: 3000,
    titleChars: 100,
    excludeMax: 5,          // 커뮤니티 테스트 기준 깨끗한 처리 한계
    descriptors: {
      oneshot: { min: 6, max: 11 },  // 개념 블록 기준 (음역 서술 전체가 1블록)
      split:   { min: 6, max: 11 }
    }
  },

  /* ---------- 슬라이더 권장값 ---------- */
  /* Variety는 v6 신규 슬라이더. 0으로 두면 스타일 태그가 고정된다.
     v6 기본값: Weirdness 50 / Style Influence 50 / Variety Normal. */
  sliders: {
    oneshot:       { weirdness: [35, 50], styleInfluence: [70, 85], variety: "0 (고정)",   audioInfluence: null },
    split:         { weirdness: [35, 50], styleInfluence: [70, 85], variety: "0 (고정)",   audioInfluence: null },
    explore:       { weirdness: [50, 70], styleInfluence: [40, 60], variety: "Normal 이상", audioInfluence: null },
    refSampleLead: { weirdness: [30, 45], styleInfluence: [30, 40], variety: "0 (고정)",   audioInfluence: [60, 70] },
    refTagLead:    { weirdness: [30, 45], styleInfluence: [60, 70], variety: "0 (고정)",   audioInfluence: [30, 40] },
    warnings: [
      "Variety를 0으로 두지 않으면 Suno가 스타일 태그 자체를 변형한다. 프롬프트 수정 효과를 비교하려면 반드시 0.",
      "Style Influence와 Audio Influence를 둘 다 높이면 입력이 서로 충돌한다. v6에서도 개선됐다는 근거 없음.",
      "v6 기본값은 Style Influence 50. 그대로 두면 정밀 프롬프트의 절반이 버려진다."
    ],
    debug: [
      "결과가 제네릭하면 Style Influence를 60 → 75 → 90으로 단계 상향.",
      "그래도 평범하면 Weirdness를 5~10만 올린다. 한 번에 하나씩.",
      "테이크 간 편차가 프롬프트 수정 효과보다 클 수 있다. Variety 0으로 고정하고 비교할 것.",
      "섹션이 지시를 무시하면 [Verse | 세부지시] 형태로 섹션 큐 안에 직접 넣는다."
    ]
  },

  /* ---------- 익스클루드 규칙 ---------- */
  excludeRules: {
    maxCount: 8,   // v5.5 기준 5개였음. v6에서 한계선 재검증 필요 — 보수적으로 8.
    // 자를 때 남기는 우선순위 (앞이 우선)
    priority: ["drums","bass","synth","strings","guitar","piano","backing vocals","brass","percussion","choir","autotune","reverb-heavy","distortion","rap","electronic"],
    // 사용자 입력에서 벗겨낼 부정어
    negationPrefixes: ["no ","without ","-","제외","없음","빼고","없이"],
    // 동의어 정규화 (영문 소문자 기준)
    normalize: {
      "drum":"drums","드럼":"drums","퍼커션":"percussion",
      "베이스":"bass","bass guitar":"bass",
      "신스":"synth","synthesizer":"synth","synths":"synth",
      "스트링":"strings","string":"strings","스트링스":"strings",
      "기타":"guitar","guitars":"guitar","electric guitar":"guitar",
      "피아노":"piano",
      "백보컬":"backing vocals","백킹보컬":"backing vocals","harmonies":"backing vocals","harmony":"backing vocals",
      "브라스":"brass","horns":"brass",
      "합창":"choir","crowd vocals":"choir","group vocals":"choir",
      "오토튠":"autotune","auto-tune":"autotune",
      "리버브":"reverb-heavy","reverb":"reverb-heavy",
      "디스토션":"distortion",
      "랩":"rap",
      "일렉":"electronic","edm":"electronic"
    },
    howToVerify: "곡 페이지 Styles 섹션에 -drums 처럼 마이너스 부호가 붙어 있으면 적용된 것. 안 보이면 아예 들어가지 않은 것.",
    v6note: "[v6 재검증 필요] 5개 초과 붕괴 보고는 v5.5 기준. v6 검증 자료 없음. 부정어는 반드시 이 필드에 — Style 박스에 쓰면 v6에서도 '포함' 지시로 읽힌다.",
    note: "익스클루드는 하드 필터가 아니라 확률 가중치. 장르 정체성에 속하는 악기(시티팝의 드럼·베이스 등)는 단독 제외로는 계속 비집고 들어온다. Style 긍정 서술 + Exclude 필드 + 가사 섹션 태그, 세 곳이 같은 말을 해야 통한다."
  },

  /* ---------- Advanced Split 지정 가능 스템 (2안) ----------
     Suno Studio 2.0 Advanced Split의 정식 지원 목록. 곡에 실제로 존재하는 악기만
     지정해야 한다 — 없는 악기를 지정하면 크레딧만 소모된다(공식 경고).
     스템당 10크레딧. Premier 전용. */
  stemTargets: [
    { id:"lead-vocal",   ko:"리드 보컬",     en:"Lead Vocal",      quality:"good" },
    { id:"backing",      ko:"백보컬",        en:"Backing Vocals",  quality:"mid" },
    { id:"drums",        ko:"드럼",          en:"Drums",           quality:"good" },
    { id:"percussion",   ko:"퍼커션",        en:"Percussion",      quality:"mid" },
    { id:"bass",         ko:"베이스",        en:"Bass",            quality:"weak" },
    { id:"piano",        ko:"피아노",        en:"Piano",           quality:"mid" },
    { id:"epiano",       ko:"일렉트릭 피아노", en:"Electric Piano", quality:"mid" },
    { id:"keys",         ko:"키보드",        en:"Keyboards",       quality:"mid" },
    { id:"organ",        ko:"오르간",        en:"Organ",           quality:"mid" },
    { id:"egtr",         ko:"일렉 기타",     en:"Electric Guitar", quality:"weak" },
    { id:"lead-gtr",     ko:"리드 기타",     en:"Lead Guitar",     quality:"weak" },
    { id:"rhythm-gtr",   ko:"리듬 일렉기타", en:"Rhythm Electric Guitar", quality:"weak" },
    { id:"agtr",         ko:"어쿠스틱 기타", en:"Acoustic Guitar", quality:"weak" },
    { id:"strings",      ko:"스트링",        en:"Strings",         quality:"mid" },
    { id:"brass",        ko:"브라스",        en:"Brass",           quality:"mid" },
    { id:"synth",        ko:"신스",          en:"Synth",           quality:"mid" },
    { id:"synth-pad",    ko:"신스 패드",     en:"Synth Pad",       quality:"mid" },
    { id:"synth-bass",   ko:"신스 베이스",   en:"Synth Bass",      quality:"weak" },
    { id:"synth-keys",   ko:"신스 키",       en:"Synth Keys",      quality:"mid" },
    { id:"upright",      ko:"업라이트 베이스", en:"Upright Bass",  quality:"weak" },
    { id:"other",        ko:"그 외",         en:"Other",           quality:"mid" }
  ],

  /* 스템 품질 실사용 평가 (27파일 v6 테스트) */
  stemQuality: {
    good: "쓸 만함",
    mid:  "보통 — 확인 필요",
    weak: "약함 — baked-in 이펙트에 잠기거나 힘이 빠질 수 있음. DAW 대안 준비 권장"
  },

  /* 스템 작업 유형 (2안) */
  stemOps: [
    { id:"regen",   ko:"재생성 (이 파트만 다시)", verb:"Regenerate", note:"트랙을 선택한 뒤 지시할 것. 선택 안 하면 새 파트가 추가된다." },
    { id:"replace", ko:"교체 (다른 악기로)",     verb:"Replace",    note:"원래 파트를 뮤트하고 새 파트를 같은 자리에 생성." },
    { id:"add",     ko:"추가 (없던 악기)",       verb:"Add",        note:"아무 트랙도 선택하지 않은 상태에서 지시." },
    { id:"remove",  ko:"제거 (빼기만)",          verb:"Remove",     note:"스템을 분리해 뮤트하면 끝. 재생성 불필요, 크레딧 절약." }
  ],

  /* ---------- 보컬 음역대 제어 (조성 대체) ----------
     [검증됨] 음정·옥타브 숫자 표기(C3, "A2 to E5")는 Suno가 파싱하지 않는다.
     음역은 성부 명칭 + register 단어 + 딜리버리 단어로만 근사 조절된다.
     저음축과 고음축을 독립적으로 지정하고, style 박스 앞쪽에 배치한다.
     출처: HookGenius 400+ 생성 테스트 티어표, jackrighteous, tagasong, songsmith. */
  vocalRange: {
    note: "음정 숫자(C3, G4 등)는 절대 쓰지 말 것. 무시된다.",

    /* 저음축 — 성부 명칭이 핵심 레버. 성별에 따라 다른 명칭을 쓴다. */
    low: [
      { id:"L1", ko:"저음 없음 (가볍게)",
        male:"light male vocals, no low end",
        female:"light airy female vocals, no low end",
        neutral:"light vocals, no low end" },
      { id:"L2", ko:"보통 (자연스럽게)",
        male:"warm male vocals, natural mid register",
        female:"warm female vocals, natural mid register",
        neutral:"warm vocals, natural mid register" },
      { id:"L3", ko:"낮음 (가슴 소리)",
        male:"deep male baritone, low chest register",
        female:"low female alto, warm chest voice",
        neutral:"deep vocals, low chest register" },
      { id:"L4", ko:"아주 낮음 (최저역)",
        male:"deep bass-baritone, lowest chest register",
        female:"deep contralto, lowest chest register",
        neutral:"bass-heavy vocals, lowest chest register" }
    ],

    /* 고음축 — 유무와 강도. H1은 억제 서술이 핵심. */
    high: [
      { id:"H1", ko:"없음 (잔잔하게)",
        en:"restrained gentle delivery, stays in a narrow range, no belting",
        quiet:true },
      { id:"H2", ko:"중고음 (밝게)",
        en:"bright clear hooks in the upper mid range" },
      { id:"H3", ko:"높음 (벨팅·가성)",
        en:"soaring belted chorus, head voice on the highs" },
      { id:"H4", ko:"아주 높음 (초고음)",
        en:"soaring belt with whistle-register flourishes",
        unstable:true }
    ],

    /* 잔잔형(H1)일 때 함께 넣는 저에너지 마커 */
    quietMarkers: ["airy","conversational delivery"],

    /* H1일 때 style에서 빼야 하는 에너지 단어 — 있으면 경고 */
    energyWords: ["powerful","anthemic","explosive","high energy","epic","driving","aggressive"],

    /* 넓은 음역(저 L3+ & 고 H3+)일 때 가사창 섹션 사다리 */
    ladder: {
      verse:  "low register, chest voice, intimate",
      chorus: "octave up, belted, soaring",
      note:"구간 대비가 필요한 넓은 음역은 style 박스만으로 부족하다. 가사창 섹션 태그에 사다리를 같이 넣고 두 필드를 일치시킬 것. 남성 보컬에서 옥타브 점프가 더 잘 먹힌다."
    },

    warnings: {
      wide:"아주 넓은 음역(L4+H4)은 재생성 의존도가 높다. 4~6회 뽑아 베스트를 고를 것. v6가 v5.5보다 넓은 음역에서 안정적이다.",
      whistle:"휘슬·초고음은 준수율이 낮다. 안 나오면 성부 명칭을 soprano 쪽으로 더 밀거나 재생성할 것.",
      quietConflict:"고음 억제(잔잔)를 골랐는데 강한 에너지 단어가 함께 들어가 있다. 잔잔하게 만들려면 에너지 단어 제거가 억제어 추가만큼 중요하다.",
      persona:"Persona / Voices(음성 클론)를 쓰면 음역이 원본에 종속된다. 이때는 성별·성부 서술을 빼야 충돌이 안 난다."
    }
  },

  /* ---------- 마이크 거리감 / 녹음 질감 ---------- */
  micDistance: [
    { id:"none",     ko:"지정 안 함",          en:"" },
    { id:"close",    ko:"밀착 (극도로 가까운)",  en:"recorded extremely close to the mic with dry intimate presence" },
    { id:"dry",      ko:"드라이 (리버브 없음)",  en:"dry vocal without reverb" },
    { id:"room",     ko:"라이브 룸",           en:"intimate live room feel" },
    { id:"minimal",  ko:"최소 리버브",         en:"minimal reverb" },
    { id:"stadium",  ko:"스타디움 리버브",      en:"stadium-sized reverb" }
  ],

  /* ---------- 드라이 소스 확보용 억제 지시어 [unverified] ---------- */
  restraintTags: {
    default: ["restrained delivery","minimal processing"],
    ballad:  ["restrained delivery","soft chest voice","no soaring chorus"],
    note:"[unverified] 효과의 1차 근거 미확인. 무해하고 시도 가치 있음. 리버브가 남으면 Studio의 Remove FX로 벗길 수 있으므로 프롬프트로만 싸울 필요 없음."
  },

  /* ---------- 보컬 ---------- */
  vocal: {
    gender: [
      { id:"none",   ko:"없음 (인스트루멘탈)", en:"" , toggle:null },
      { id:"female", ko:"여자",  en:"female vocal", toggle:"Female" },
      { id:"male",   ko:"남자",  en:"male vocal",   toggle:"Male" },
      { id:"duet",   ko:"남녀 듀엣", en:"male-female duet", toggle:null },
      { id:"fduet",  ko:"여성 듀엣", en:"female duet", toggle:"Female" },
      { id:"mduet",  ko:"남성 듀엣", en:"male duet",   toggle:"Male" },
      { id:"group",  ko:"혼성 그룹", en:"mixed group vocals", toggle:null }
    ],
    age: [
      { id:"none",  ko:"없음",   en:"" },
      { id:"young", ko:"청소년", en:"youthful" },
      { id:"adult", ko:"성인",   en:"adult" },
      { id:"mature",ko:"중년",   en:"mature" }
    ],
    tone: [
      { id:"none",     ko:"없음", en:"" },
      { id:"honest",   ko:"감정적으로 솔직한", en:"emotionally honest tone" },
      { id:"bright",   ko:"밝고 쾌활한",       en:"bright and cheerful tone" },
      { id:"cool",     ko:"시크하고 쿨한",     en:"cool and detached tone" },
      { id:"dreamy",   ko:"몽환적이고 부드러운", en:"dreamy soft tone" },
      { id:"warm",     ko:"따뜻하고 포근한",   en:"warm tone" },
      { id:"husky",    ko:"허스키한",          en:"husky tone" },
      { id:"powerful", ko:"에너지 넘치고 파워풀한", en:"powerful tone" },
      { id:"clear",    ko:"맑고 깨끗한",       en:"clear tone" },
      { id:"whisper",  ko:"섬세하고 속삭이는", en:"whispery tone" },
      { id:"deep",     ko:"깊고 성숙한",       en:"deep mature tone" },
      { id:"natural",  ko:"담백하고 자연스러운", en:"natural understated tone" },
      { id:"breathy",  ko:"숨결이 느껴지는",   en:"airy delivery" }
    ],
    rangeChips: ["soprano","alto","tenor","baritone","falsetto-leaning","comfortable low-mid register"]
  },

  /* ---------- 언어 ---------- */
  languages: [
    { id:"ko", ko:"한국어", en:"singing in Korean with natural pronunciation" },
    { id:"en", ko:"영어",   en:"singing in English" },
    { id:"ja", ko:"일본어", en:"singing in Japanese" }
  ],

  /* ---------- 분위기 / 강도 / 용도 ---------- */
  mood: [
    { id:"none",       ko:"랜덤",        en:"" },
    { id:"dreamy",     ko:"몽환적",      en:"dreamy" },
    { id:"emotional",  ko:"감성적",      en:"emotional" },
    { id:"bright",     ko:"밝고 청량함", en:"bright and refreshing" },
    { id:"dark",       ko:"어둡고 강렬함", en:"dark and intense" },
    { id:"nocturnal",  ko:"밤의 정서",   en:"nocturnal late-night mood" },
    { id:"nostalgic",  ko:"노스탤직",    en:"nostalgic" },
    { id:"melancholic",ko:"멜랑콜리",    en:"melancholic" },
    { id:"cinematic",  ko:"시네마틱",    en:"cinematic" },
    { id:"retro",      ko:"레트로",      en:"retro" },
    { id:"chill",      ko:"편안한",      en:"chill and relaxed" },
    { id:"summer",     ko:"여름",        en:"summer vibe" },
    { id:"rainy",      ko:"비 오는 날",  en:"rainy day mood" }
  ],
  intensity: [
    { id:"none",   ko:"랜덤", en:"" },
    { id:"calm",   ko:"차분", en:"calm" },
    { id:"mid",    ko:"보통", en:"moderate energy" },
    { id:"high",   ko:"강함", en:"high energy" }
  ],
  usage: [
    { id:"song",     ko:"노래",         en:"" },
    { id:"bgm",      ko:"BGM",          en:"background music" },
    { id:"video",    ko:"영상음악",      en:"score for video" },
    { id:"short",    ko:"숏폼/릴스",    en:"short-form hook" },
    { id:"cafe",     ko:"카페/매장",    en:"cafe playlist" },
    { id:"healing",  ko:"힐링 배경음악", en:"healing ambience" },
    { id:"game",     ko:"게임 배경음악", en:"game background music" },
    { id:"ad",       ko:"광고 음악",     en:"commercial jingle" }
  ],
  lengths: ["1분","1분 30초","2분","2분 30초","3분","3분 30초","4분","5분"],

  /* ---------- 장르 비중 (퍼센트 아님) ---------- */
  genreBlend: [
    { id:"lead",    ko:"장르1 중심",      pattern:"{g1}, with subtle {g2} phrasing" },
    { id:"balanced",ko:"균형",            pattern:"{g1} meets {g2}" },
    { id:"tint",    ko:"장르2 색채만",    pattern:"{g1}, faint {g2} feel" }
  ],

  /* ---------- 인트로 치트키 (통짜 모드 전용) ---------- */
  introCheats: [
    { id:"none",   ko:"지정 안 함",     en:"" },
    { id:"vocal",  ko:"보컬 선입",      en:"cold open with dry vocal and no long intro" },
    { id:"groove", ko:"그루브 선입",    en:"drop immediately into groove with no intro buildup" },
    { id:"sig",    ko:"시그니처 사운드", en:"open with a single signature sound for immediate mood definition" }
  ],

  /* ---------- 장르 프리셋 ---------- */
  /* layers: 스템 모드 레이어 자동 제안 (순서대로). prompt는 Studio Chat Bar용 영문 서술. */
  genres: [
    { id:"citypop", ko:"시티팝", en:"city pop", bpm:[96,118], defaultBpm:104,
      oneShotTags:["warm Rhodes","clean funk guitar","synth brass stabs","glossy 80s production"],
      layers:[
        { id:"drums",   ko:"드럼",        prompt:"Add tight city pop drums with crisp hi-hats and a light disco groove" },
        { id:"bass",    ko:"베이스",      prompt:"Add a funky syncopated bass line" },
        { id:"guitar",  ko:"커팅 기타",   prompt:"Add clean funk guitar cutting chords, mostly in the chorus" },
        { id:"synth",   ko:"신스 브라스", prompt:"Add bright synth brass stabs in the chorus only" },
        { id:"strings", ko:"스트링 패드", prompt:"Add lush string pad accents under the chorus, subtle" }
      ] },
    { id:"kindie", ko:"K-인디", en:"Korean indie pop", bpm:[88,125], defaultBpm:110,
      oneShotTags:["jangly guitar","indie drum groove","warm bass","organic production"],
      layers:[
        { id:"drums",  ko:"드럼",      prompt:"Add natural indie drums, light and unpolished, brushes on the verse and sticks on the chorus" },
        { id:"bass",   ko:"베이스",    prompt:"Add a warm melodic bass guitar line" },
        { id:"guitar", ko:"일렉 기타", prompt:"Add a jangly clean electric guitar arpeggio that answers the vocal" },
        { id:"keys",   ko:"키보드",    prompt:"Add soft keyboard chords under the chorus" }
      ] },
    { id:"ukg", ko:"UK 개러지", en:"UK garage", bpm:[128,138], defaultBpm:132,
      oneShotTags:["2-step drums","shuffled hi-hats","sub bass","chopped vocal samples"],
      layers:[
        { id:"drums", ko:"2-스텝 드럼", prompt:"Add a UK garage 2-step drum pattern with shuffled hi-hats and a skipping snare" },
        { id:"bass",  ko:"서브 베이스", prompt:"Add a deep sub bass that follows the kick" },
        { id:"synth", ko:"신스 코드",   prompt:"Add warm organ-style synth chord stabs on the offbeat" },
        { id:"chops", ko:"보컬 챕",     prompt:"Add pitched vocal chops as a rhythmic texture, sparse" }
      ] },
    { id:"ballad", ko:"어쿠스틱 발라드", en:"acoustic ballad", bpm:[60,80], defaultBpm:72,
      oneShotTags:["fingerstyle guitar","soft strings","intimate","heartfelt"],
      layers:[
        { id:"drums",   ko:"브러시 드럼",   prompt:"Add soft brushed drums entering at the second verse, gentle and supportive" },
        { id:"bass",    ko:"업라이트 베이스", prompt:"Add a warm upright bass that follows the guitar" },
        { id:"strings", ko:"스트링 패드",   prompt:"Add a subtle string pad swelling into the final chorus, understated" }
      ] },
    { id:"neosoul", ko:"네오 소울", en:"neo soul", bpm:[70,95], defaultBpm:84,
      oneShotTags:["warm analog Rhodes","laid-back drums","smooth bass","jazzy chords"],
      layers:[
        { id:"drums", ko:"드럼",   prompt:"Add laid-back neo soul drums with a slightly behind-the-beat feel" },
        { id:"bass",  ko:"베이스", prompt:"Add a smooth fingered bass line with melodic fills" },
        { id:"keys",  ko:"키보드", prompt:"Add jazzy extended chords on electric piano" },
        { id:"guitar",ko:"기타",   prompt:"Add soft clean guitar licks between vocal phrases" }
      ] },
    { id:"lofi", ko:"로파이 힙합", en:"lo-fi hip hop", bpm:[70,90], defaultBpm:80,
      oneShotTags:["vinyl crackle","dusty drums","jazzy piano","mellow"],
      layers:[
        { id:"drums", ko:"드럼",     prompt:"Add dusty lo-fi drums with a soft swing" },
        { id:"bass",  ko:"베이스",   prompt:"Add a round mellow bass" },
        { id:"keys",  ko:"피아노",   prompt:"Add jazzy piano chords with vinyl texture" },
        { id:"fx",    ko:"텍스처",   prompt:"Add vinyl crackle and soft ambient noise as a bed" }
      ] },
    { id:"synthwave", ko:"신스웨이브", en:"synthwave", bpm:[100,120], defaultBpm:110,
      oneShotTags:["analog synth","gated reverb snare","arpeggiated bass","80s"],
      layers:[
        { id:"drums", ko:"드럼",       prompt:"Add 80s electronic drums with a gated reverb snare" },
        { id:"bass",  ko:"아르페지오 베이스", prompt:"Add an arpeggiated analog synth bass" },
        { id:"pad",   ko:"패드",       prompt:"Add wide analog synth pads" },
        { id:"lead",  ko:"리드",       prompt:"Add a retro synth lead melody in the instrumental sections" }
      ] },
    { id:"altrock", ko:"얼터너티브 록", en:"alternative rock", bpm:[110,150], defaultBpm:128,
      oneShotTags:["driving drums","overdriven guitars","punchy bass","raw"],
      layers:[
        { id:"drums",  ko:"드럼",      prompt:"Add driving rock drums, tight and punchy" },
        { id:"bass",   ko:"베이스",    prompt:"Add a punchy pick bass that doubles the guitar riff" },
        { id:"guitar", ko:"리듬 기타", prompt:"Add overdriven rhythm guitars, wide in the chorus" },
        { id:"lead",   ko:"리드 기타", prompt:"Add a melodic lead guitar line in the bridge" }
      ] },
    { id:"jazzfusion", ko:"재즈 퓨전", en:"jazz fusion", bpm:[100,140], defaultBpm:120,
      oneShotTags:["Rhodes","syncopated drums","fretless bass","extended harmony"],
      layers:[
        { id:"drums", ko:"드럼",   prompt:"Add syncopated fusion drums with ghost notes" },
        { id:"bass",  ko:"베이스", prompt:"Add a fretless bass with melodic movement" },
        { id:"keys",  ko:"키보드", prompt:"Add Rhodes comping with extended harmony" },
        { id:"horns", ko:"혼",     prompt:"Add muted trumpet answering the vocal, sparse" }
      ] },
    { id:"dreampop", ko:"드림 팝", en:"dream pop", bpm:[80,110], defaultBpm:96,
      oneShotTags:["ambient guitar","washed-out reverb","soft drums","floating"],
      layers:[
        { id:"drums",  ko:"드럼",       prompt:"Add soft, washed-out drums, low in the mix" },
        { id:"bass",   ko:"베이스",     prompt:"Add a simple round bass" },
        { id:"guitar", ko:"앰비언트 기타", prompt:"Add ambient reverb-drenched guitar swells" },
        { id:"pad",    ko:"패드",       prompt:"Add a floating synth pad bed" }
      ] },
    { id:"rnb", ko:"R&B", en:"contemporary R&B", bpm:[70,100], defaultBpm:88,
      oneShotTags:["smooth","808-tinged drums","airy vocal chops","intimate"],
      layers:[
        { id:"drums", ko:"드럼",     prompt:"Add smooth R&B drums with a soft 808 kick and crisp snaps" },
        { id:"bass",  ko:"베이스",   prompt:"Add a deep sub bass with slides" },
        { id:"keys",  ko:"키보드",   prompt:"Add lush electric piano chords" },
        { id:"chops", ko:"보컬 챕",  prompt:"Add airy vocal chops as texture, sparse" }
      ] },
    { id:"bossa", ko:"보사노바", en:"bossa nova", bpm:[120,140], defaultBpm:128,
      oneShotTags:["nylon-string guitar","brushed drums","upright bass","intimate"],
      layers:[
        { id:"drums", ko:"브러시 드럼",   prompt:"Add gentle brushed bossa nova drums with rim clicks" },
        { id:"bass",  ko:"업라이트 베이스", prompt:"Add a walking upright bass" },
        { id:"perc",  ko:"퍼커션",       prompt:"Add soft shaker and light Brazilian percussion" }
      ] },
    { id:"folk", ko:"포크", en:"folk", bpm:[80,120], defaultBpm:100,
      oneShotTags:["acoustic guitar","harmonica","warm","organic"],
      layers:[
        { id:"drums",  ko:"드럼",     prompt:"Add light acoustic drums with brushes" },
        { id:"bass",   ko:"베이스",   prompt:"Add a warm upright or acoustic bass" },
        { id:"mando",  ko:"만돌린",   prompt:"Add mandolin or second acoustic guitar picking" }
      ] },
    { id:"funk", ko:"펑크 (Funk)", en:"funk", bpm:[100,120], defaultBpm:110,
      oneShotTags:["slap bass","tight drums","wah guitar","horn stabs"],
      layers:[
        { id:"drums",  ko:"드럼",     prompt:"Add tight funk drums with a driving hi-hat" },
        { id:"bass",   ko:"슬랩 베이스", prompt:"Add a slap bass groove" },
        { id:"guitar", ko:"와우 기타", prompt:"Add wah-wah rhythm guitar scratches" },
        { id:"horns",  ko:"혼 섹션",  prompt:"Add horn section stabs in the chorus" }
      ] },
    { id:"ambient", ko:"앰비언트", en:"ambient", bpm:[55,80], defaultBpm:65,
      oneShotTags:["evolving pads","granular textures","reverb-drenched","slow"],
      layers:[
        { id:"pad",   ko:"패드",   prompt:"Add slowly evolving synth pads" },
        { id:"fx",    ko:"텍스처", prompt:"Add granular textures and field-recording-like noise" },
        { id:"bass",  ko:"베이스", prompt:"Add a deep sustained sub bass drone" }
      ] }
  ],

  /* ---------- 레이어 생성 공통 규칙 ---------- */
  layerRules: {
    // 세부 지정이 비어 있을 때 붙는 관계절
    defaultRelation: "Lock to the existing lead vocal and {accomp}, following their key and timing.",
    // 세부 지정이 있을 때 붙는 관계절
    detailRelation: "Fit around the existing lead vocal, following its key and timing.",
    // 하모니/백보컬 레이어 감지 → 경고
    harmonyKeywords: ["harmony","harmonies","backing vocal","백보컬","하모니","화음","코러스 보컬"],
    harmonyWarning: "AI 하모니 보컬을 레이어로 얹으면 리드와 싱크가 어긋난다. 레이어링하지 말고 백킹 보컬을 통째로 재생성할 것.",
    postNotes: [
      "새 파트는 크고 갑자기 들어온다. 볼륨을 낮추고 페이드 핸들로 스웰시킬 것.",
      "잘 나온 코러스 구간은 복사해서 다른 코러스에 붙인다. 재생성보다 일관되고 크레딧 0.",
      "선택 범위가 스코프를 결정한다. 트랙 선택 = 그 트랙 편집, 선택 없음 = 새 요소 추가."
    ]
  },

  /* ---------- 곡 구성 템플릿 ---------- */
  /* lines: 음절 틀 생성용 섹션별 줄 수 */
  structures: [
    { id:"poprock", ko:"인트로-벌스-프리코러스-후렴-벌스-후렴-브릿지-후렴-아웃트로",
      sections:[
        { tag:"Intro", lines:0 },{ tag:"Verse 1", lines:6 },{ tag:"Pre-Chorus", lines:3 },{ tag:"Chorus", lines:4 },
        { tag:"Verse 2", lines:6 },{ tag:"Pre-Chorus", lines:3 },{ tag:"Chorus", lines:4 },
        { tag:"Bridge", lines:4 },{ tag:"Chorus", lines:4 },{ tag:"Outro", lines:2 } ] },
    { id:"ballad", ko:"발라드: 조용한 벌스 → 빌드 → 폭발 후렴 → 브릿지 → 마지막 후렴",
      sections:[
        { tag:"Intro", lines:0 },{ tag:"Verse 1", lines:6 },{ tag:"Verse 2", lines:6 },{ tag:"Chorus", lines:4 },
        { tag:"Verse 3", lines:4 },{ tag:"Chorus", lines:4 },{ tag:"Bridge", lines:4 },{ tag:"Final Chorus", lines:4 },{ tag:"Outro", lines:2 } ] },
    { id:"kpop", ko:"K-pop 다중 섹션 (댄스 브레이크 포함)",
      sections:[
        { tag:"Intro", lines:0 },{ tag:"Verse 1", lines:6 },{ tag:"Pre-Chorus", lines:3 },{ tag:"Chorus", lines:4 },
        { tag:"Verse 2", lines:6 },{ tag:"Pre-Chorus", lines:3 },{ tag:"Chorus", lines:4 },{ tag:"Dance Break", lines:0 },
        { tag:"Bridge", lines:4 },{ tag:"Final Chorus", lines:4 },{ tag:"Outro", lines:2 } ] },
    { id:"shorthook", ko:"짧은 벌스-훅-브릿지-훅 (숏폼용)",
      sections:[
        { tag:"Verse 1", lines:4 },{ tag:"Hook", lines:4 },{ tag:"Bridge", lines:2 },{ tag:"Hook", lines:4 } ] },
    { id:"vcvc", ko:"벌스-프리코러스-후렴-벌스-후렴-아웃트로",
      sections:[
        { tag:"Verse 1", lines:6 },{ tag:"Pre-Chorus", lines:3 },{ tag:"Chorus", lines:4 },
        { tag:"Verse 2", lines:6 },{ tag:"Chorus", lines:4 },{ tag:"Outro", lines:2 } ] }
  ],

  /* ---------- 섹션별 기본 디렉팅 (스템 모드에서 태그 뒤에 붙음) ---------- */
  sectionDirecting: {
    oneshot: {
      "Intro":        "short instrumental intro",
      "Verse":        "intimate",
      "Pre-Chorus":   "building",
      "Chorus":       "full, open",
      "Final Chorus": "fullest, layered",
      "Bridge":       "stripped back",
      "Hook":         "catchy, memorable",
      "Outro":        "fading",
      "Dance Break":  "instrumental",
      "_default":     ""
    },
    split: {
      "Intro":        "short instrumental intro",
      "Verse":        "intimate",
      "Pre-Chorus":   "building",
      "Chorus":       "full, open",
      "Final Chorus": "fullest, layered",
      "Bridge":       "stripped back",
      "Hook":         "catchy, memorable",
      "Outro":        "fading",
      "Dance Break":  "instrumental",
      "_default":     ""
    }
  },

  /* ---------- 한국어 발음 규칙 ---------- */
  koreanRules: {
    syllablesPerLine: { min: 6, ideal: [8,10], max: 12 },
    styleTag: "singing in Korean with natural pronunciation",
    rules: [
      "순수 한글 사용. 로마자 병기는 최후수단으로 국소적으로만.",
      "한 줄 8~10음절. 한국어는 음절당 의미 밀도가 높다.",
      "긴 줄에는 쉼표·마침표로 호흡 분리. (영어 가이드는 문장부호 제거를 권하지만 한국어는 반대)",
      "숫자는 한글로. 1234 → 천이백삼십사",
      "특정 구간만 틀리면 Replace Section으로 그 구간만 재생성. Cover 금지.",
      "반복 코러스는 모든 반복에 동일 철자 적용."
    ]
  },

  /* ---------- 괄호 규칙: 소괄호 안에 있으면 경고할 지시어 ---------- */
  directiveWords: [
    "whisper","whispered","belt","belted","spoken","falsetto","softly","loud","quiet","harmonized","ad-lib","building","stripped",
    "속삭","외치","강하게","부드럽게","조용히","크게","작게","힘있게","가성","진성","읊조","말하듯","노래하듯"
  ],

  /* ---------- 메타태그 ---------- */
  /* ---------- v6 신규: 섹션 큐 파이프 스택 ---------- */
  /* v6는 섹션 태그 안의 퍼포먼스 지시를 실제로 읽어 반영한다. 확인됨. */
  sectionCues: {
    enabled: true,
    format: "[{tag} | {지시1} | {지시2}]",
    examples: [
      "[Verse 1 | 속삭이듯, 기타만 | 절제된 딜리버리]",
      "[Chorus | 레이어드 보컬 | 확 트이게]",
      "[Bridge | 반주 최소화 | 목소리만 남기고]"
    ],
    note: "v6의 가장 큰 신규 무기. 스타일 박스 글자를 아끼고 섹션별 차이는 여기서 만든다."
  },

  metaTags: {
    structure: ["Intro","Verse","Verse 1","Verse 2","Pre-Chorus","Chorus","Post-Chorus","Bridge","Hook","Refrain","Outro","Interlude","Instrumental","Instrumental Break","Break","Breakdown","Build-Up","Drop","Solo","Fade Out","End"],
    performance: ["Guitar Solo","Sax Solo","Piano Solo","Drum Fill","Melodic Interlude","Percussion Break"],
    note: "[Intro] 태그는 불안정하기로 유명. 가사 없이 짧은 instrumental로 묘사하는 편이 안정적."
  },

  /* ---------- 체크리스트 ---------- */
  checklist: {
    oneshot: [
      { id:"model",   text:"모델 확인. 발매용은 v6. 캐릭터가 중요한 곡은 v6-wild도 섞어 뽑기" },
      { id:"variety", text:"Variety 0 확인. 안 그러면 Suno가 스타일 태그를 스스로 변형한다", critical:true },
      { id:"reroll",  text:"8~15회 생성해 베스트를 고른다. 테이크 간 편차가 프롬프트 수정 효과보다 클 수 있다", critical:true },
      { id:"six",     text:"6회 안에 원하는 편성이 안 나오면 SPLIT 모드로 전환 (원샷 재롤로 해결 안 되는 문제다)" },
      { id:"exclude", text:"Exclude 적용 확인: 곡 페이지 Styles에 -drums 처럼 마이너스 표기가 보이는지" },
      { id:"intro",   text:"0초에 보컬 또는 명확한 리듬이 치고 나오는가" },
      { id:"korean",  text:"한국어 발음이 뭉개진 구간은 Replace Section으로 그 구간만 재생성 (Cover 금지)" },
      { id:"drift",   text:"32마디 지점 그리드 이탈이 40ms를 넘으면 그 생성물은 폐기. 그리드 필수 장르(UK 개러지·신스팝)에서 특히", critical:true },
      { id:"bpm",     text:"DAW 반입 전 Studio에서 Manual BPM 고정" },
      { id:"export",  text:"export는 Studio 경유. Studio 워크플로우는 다운로드 캡에서 면제되고, 한 곡의 모든 스템이 단일 다운로드로 카운트된다", critical:true },
      { id:"wav",     text:"32-bit / 48kHz WAV. MP3 금지" },
      { id:"restore", text:"아티팩트 복원 → 마스터링 순서 준수" },
      { id:"lufs",    text:"-14 LUFS integrated / -1 dBTP (Spotify Normal). 과리미팅 금지" },
      { id:"watermark", text:"v6 출력에는 오디오 워터마크·핑거프린팅이 실린다. 유통 전 배급사 스크리닝 확인", critical:true },
      { id:"human",   text:"작사·편곡 결정·DAW 작업 기록을 남긴다. 100% AI 생성물은 저작권 등록이 안 된다", critical:true }
    ],
    split: [
      { id:"base",    text:"먼저 완곡을 뽑아 베스트를 고른다. 편곡이 이미 서로 자리를 비켜준 상태에서 시작하는 것이 핵심", critical:true },
      { id:"bpm",     text:"Studio 진입 후 제일 먼저 Manual BPM 고정", critical:true },
      { id:"listen",  text:"곡을 끝까지 듣고 실제로 존재하는 악기만 Advanced Split으로 지정. 없는 악기를 지정하면 크레딧만 소모된다", critical:true },
      { id:"minimum", text:"필요한 스템만 분리한다. 스템 수가 많을수록 아티팩트·크로스토크가 늘어난다" },
      { id:"weak",    text:"베이스·기타 스템은 약한 편(baked-in 이펙트에 잠김). 이 파트는 DAW 재작업 대안을 미리 준비" },
      { id:"scope",   text:"트랙을 선택하고 지시하면 그 트랙만 편집, 선택 안 하면 새 파트 추가. 원치 않는 악기가 생기면 이걸 확인", critical:true },
      { id:"fx",      text:"보컬에 잔향이 남으면 Remove FX로 드라이화. 완전 제거는 미검증이니 전후를 비교해볼 것" },
      { id:"vocal",   text:"보컬만 다시 만들려면 보컬 트랙을 선택해 Chat Bar로 재생성. Voices·Persona로는 기존 트랙 보컬을 교체할 수 없다" },
      { id:"harmony", text:"새 화음 보컬을 레이어로 추가하지 말 것. 싱크가 어긋난다. 백보컬은 통째 재생성" },
      { id:"copy",    text:"잘 나온 코러스 구간은 복사해서 다른 코러스에 붙이기. 재생성보다 일관되고 크레딧 0" },
      { id:"three",   text:"같은 파트를 3회 재생성해도 안 되면 그 곡은 폐기하고 완곡부터 다시" },
      { id:"export",  text:"export는 Studio 경유. 다운로드 캡 면제", critical:true },
      { id:"wav",     text:"32-bit / 48kHz WAV 멀티트랙 + 풀믹스. MP3 금지" },
      { id:"restore", text:"아티팩트 복원 → 마스터링 순서 준수" },
      { id:"lufs",    text:"-14 LUFS / -1 dBTP" },
      { id:"watermark", text:"스템에도 워터마크가 실린다. 유통 전 배급사 스크리닝 확인", critical:true },
      { id:"human",   text:"스템 편집·DAW 재작업 기록을 남긴다. 인간 기여 문서화는 이 경로가 가장 유리하다" }
    ],
    credits: "생성 10크레딧(2곡) / Advanced Split 스템당 10 / Auto Split 50 / Split from Mix 10. Premier 월 10,000이라 크레딧은 병목이 아니다.",
    v6: "2026-09-09 v6 출시. v4~v5.5 전부 은퇴되어 신규 생성 불가. 기존 Persona·Voices·Custom Models는 v6로 이전됨.",
    korean: "[v6 미검증] 한국어 발음 개선 여부는 v6 전용 자료가 없다. 기존 규칙(순수 한글, 8~10음절, singing in Korean 병기) 유지하고 본인 곡으로 직접 A/B 할 것.",
    route: "기본은 원샷. 6회 안에 편성이 안 나오면 SPLIT. 보컬만 문제면 보컬 트랙 재생성 3회 시도 후 실패 시 곡 폐기.",
    downloadCap: "2026-09-03부터: Free 평생 7 / Pro 월 20 / Premier 월 60. 단 Studio 워크플로우는 캡에서 면제되고, 한 곡의 모든 스템은 단일 다운로드로 카운트된다."
  },

  /* ---------- 사운드 단어 사전 (칩 / LLM 참고용) ---------- */
  soundWords: {
    instruments: [
      ["Warm analog Rhodes","따뜻한 빈티지 전자피아노"],["Electric piano","부드러운 전자 피아노"],["Grand piano","선명한 그랜드 피아노"],
      ["Acoustic guitar","어쿠스틱 기타"],["Fingerstyle guitar","핑거스타일 기타"],["Clean electric guitar","클린 일렉기타"],
      ["Jangly guitar","반짝이는 인디팝 기타"],["Ambient guitar","리버브 넓은 기타"],["Synth pad","신스 패드"],
      ["Analog synth","아날로그 신스"],["Supersaw synth","두꺼운 EDM 신스"],["Bass guitar","베이스 기타"],
      ["Sub bass","서브 베이스"],["808 bass","808 베이스"],["Upright bass","콘트라베이스"],
      ["Muted trumpet","뮤트 트럼펫"],["Saxophone melody","색소폰 멜로디"],["String ensemble","스트링 앙상블"],
      ["Orchestral brass","오케스트라 브라스"],["Nylon-string guitar","나일론 기타"]
    ],
    rhythm: [
      ["Boom bap groove","올드스쿨 힙합 드럼"],["Trap hi-hats","트랩 하이햇"],["Punchy kick","단단한 킥"],
      ["Soft drum groove","부드러운 드럼"],["Four-on-the-floor","하우스 킥 패턴"],["Swing groove","재즈 스윙"],
      ["Finger snap groove","핑거 스냅"],["Lo-fi drum groove","빈티지 드럼"],["Indie drum groove","인디 드럼"],
      ["House groove","하우스 리듬"],["Latin groove","라틴 리듬"],["Brush drums","브러시 드럼"],
      ["Minimal beat","미니멀 비트"],["Driving rhythm","밀어붙이는 리듬"],["2-step garage beat","개러지 2-스텝"],
      ["Disco groove","디스코 그루브"],["Shuffled hi-hats","셔플 하이햇"],["Rim clicks","림 클릭"],
      ["Half-time feel","하프타임"],["Ghost notes","고스트 노트"]
    ],
    texture: [
      ["Analog warmth","아날로그 따뜻함"],["Tape saturation","테이프 새츄레이션"],["Vinyl texture","LP 질감"],
      ["Lo-fi texture","로파이 질감"],["Wide stereo","넓은 스테레오"],["Deep bass","깊은 저음"],
      ["Punchy mix","타격감 있는 믹스"],["Smooth tone","매끄러운 톤"],["Bright tone","밝은 톤"],
      ["Dark tone","어두운 톤"],["Ambient space","공간감"],["Vintage plate reverb","빈티지 플레이트 리버브"],
      ["Tape delay","테이프 딜레이"],["Sidechained bass","사이드체인 베이스"],["Layered production","레이어드 프로덕션"],
      ["Radio-ready mix","상업적 완성도"],["Polished production","정돈된 프로덕션"],["Raw sound","날것의 사운드"],
      ["Organic production","실연 느낌"],["Minimal processing","최소 가공"]
    ],
    vocal: [
      ["Airy vocal","숨결 보컬"],["Intimate vocal","귀 가까운 보컬"],["Soulful vocal","소울풀"],
      ["Powerful vocal","파워풀"],["Soft vocal","부드러운"],["Whisper vocal","속삭임"],
      ["Layered vocals","레이어드 보컬"],["Background harmonies","백 하모니"],["Falsetto vocal","가성"],
      ["Emotional vocal","감정적"],["Clean vocal tone","깨끗한 톤"],["Airy vocal","공기감"],
      ["Warm vocal tone","따뜻한 톤"],["Indie vocal style","인디 보컬"],["R&B vocal style","R&B 보컬"],
      ["Dreamy vocal","몽환적 보컬"],["Restrained delivery","절제된 창법"],["Conversational delivery","대화하듯"],
      ["Laid-back phrasing","여유로운 프레이징"],["Dry vocal","드라이 보컬"]
    ],
    mood: [
      ["Dreamy mood","몽환적"],["Late night mood","심야"],["Melancholic mood","멜랑콜리"],
      ["Romantic mood","로맨틱"],["Chill vibe","편안한"],["Relaxed atmosphere","여유로운"],
      ["Emotional atmosphere","감정적"],["Dark atmosphere","어두운"],["Uplifting mood","희망적"],
      ["Energetic vibe","활기찬"],["Epic atmosphere","웅장한"],["Cinematic mood","시네마틱"],
      ["Nostalgic vibe","노스탤직"],["Vintage vibe","빈티지"],["Urban atmosphere","도시적"],
      ["Summer vibe","여름"],["Rainy day mood","비 오는 날"],["Floating atmosphere","떠 있는 듯한"],
      ["Wistful","아련한"],["Bittersweet","씁쓸달콤한"]
    ]
  },

  /* ---------- 젬에서 채택하지 않은 것 (기록용) ---------- */
  rejected: [
    "60/30/10 퍼센트 장르 공식 — 수노가 퍼센트를 해석한다는 근거 없음. 앞쪽 가중치만 확인됨.",
    "(whispered) 소괄호 인라인 디렉팅 — 그대로 불려버리는 사례 흔함. 지시는 대괄호로.",
    "Style 200자 제한 — v4 이하 한도. v5.5는 1000자.",
    "///*****/// 시각적 분할 기호 — 근거 없음. 표준 섹션 태그만.",
    "[v6] 한국어 발음이 좋아졌다는 주장 — 검증 자료 없음. 일본어 후기를 한국어로 일반화하지 말 것.",
    "[v6] 템포 드리프트·하모니 싱크 개선 — 근거 없음. Manual BPM 고정과 백보컬 통째 재생성 유지.",
    "조성(key) 입력 — 약한 레버라 제거하고 그 자리를 보컬 음역 제어로 대체. 음정 숫자(C3 등)는 Suno가 파싱하지 않는다.",
    "미니멀 베이스(반주 1종+보컬) → 상향 레이어링 — 솔로 반주가 리듬·베이스·필인을 혼자 다 연주해 빈자리가 없고, 루바토라 그리드가 없어 드럼을 붙이기 어렵다. v6에서 해결됐다는 증거도 없어 경로에서 제외."
  ]
};

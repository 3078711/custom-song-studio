/**
 * 歌曲生成工作台参数配置
 * 参考：Suno API 文档 https://docs.sunoapi.org/cn
 * 参考：OpenMusicPrompt Suno 元标签指南、Suno Architect 提示词工程
 * 优化：全局风格映射、高潮指令、人声/乐器强化、歧义过滤、用户输入处理
 */

// 模型版本（Suno API）
export const MODEL_OPTIONS = [
  { value: "V5", label: "V5 最新模型", desc: "卓越表现力，生成更快" },
  { value: "V4_5PLUS", label: "V4.5+ 更丰富音色", desc: "最长8分钟" },
  { value: "V4_5ALL", label: "V4.5-all 更好结构", desc: "结构良好的音乐" },
  { value: "V4_5", label: "V4.5 智能提示词", desc: "更快生成" },
  { value: "V4", label: "V4 改进人声", desc: "最长4分钟" },
] as const;

/** 参考创作（翻唱）模型选项，含参考曲时长限制（Suno upload-cover API） */
export const REFERENCE_MODEL_OPTIONS = [
  { value: "V5", label: "V5 最新模型", refLimit: "≤8分钟" },
  { value: "V4_5PLUS", label: "V4.5+ 更丰富音色", refLimit: "≤8分钟" },
  { value: "V4_5", label: "V4.5 智能提示词", refLimit: "≤8分钟" },
  { value: "V4_5ALL", label: "V4.5-all 更好结构", refLimit: "≤1分钟" },
  { value: "V4", label: "V4 改进人声", refLimit: "≤8分钟" },
] as const;

// 风格（含中国风等）
export const STYLE_OPTIONS = [
  "中国风", "流行", "抒情", "民谣", "摇滚", "电子", "R&B", "古风", "古风仙侠", "爵士", "轻音乐",
  "chinese-style", "r&b", "indie folk", "indie rock", "ambient pop", "indie pop", "lo-fi hip hop",
  "hard rock", "dance pop", "chill pop", "hip hop", "alternative pop", "indie ballad",
  "sad ballad", "punk rock", "alternative rock", "ambient electronic", "post-rock",
  "古典", "动漫", "J-pop", "K-pop", "Latin pop", "其他",
] as const;

// 人声类型：API vocalGender 仅支持 m/f，其余通过 style 描述
export const VOCAL_GENDER_OPTIONS = [
  { value: "", label: "不指定", prompt: "" },
  { value: "m", label: "男声", prompt: "male vocals, male lead, male singer" },
  { value: "f", label: "女声", prompt: "female vocals, female lead, female singer" },
  { value: "duet", label: "男女对唱", prompt: "male and female duet, call and response, duet vocals, alternating verses" },
  { value: "mixed", label: "混声", prompt: "mixed vocals, layered harmonies, ensemble" },
  { value: "child", label: "童声", prompt: "child vocals, children choir, youthful voice" },
  { value: "harmony", label: "和声", prompt: "harmony vocals, backing vocals, layered harmonies" },
  { value: "choir", label: "合唱", prompt: "choir, group vocals, ensemble singing, choir-led" },
] as const;

// 年代
export const ERA_OPTIONS = [
  { id: "", label: "不指定", prompt: "" },
  { id: "30-40", label: "30-40年代", prompt: "1930s-1940s style, vintage, swing era" },
  { id: "50-80", label: "50-80年代", prompt: "1950s-1980s style, classic rock, golden age" },
  { id: "90s", label: "90年代", prompt: "1990s style, 90s pop" },
  { id: "2000-2010", label: "2000-2010年代", prompt: "2000s-2010s style, modern pop" },
  { id: "2011-2020", label: "2011-2020年代", prompt: "2010s-2020s style, contemporary" },
  { id: "contemporary", label: "当代", prompt: "contemporary, current trends" },
] as const;

// 场景
export const SCENE_OPTIONS = [
  { id: "sport", label: "运动健身", prompt: "energetic workout music, strong beats" },
  { id: "sleep", label: "助眠放松", prompt: "calm relaxing sleep music, ambient" },
  { id: "study-work", label: "学习工作", prompt: "focus study background music" },
  { id: "travel", label: "旅途风景", prompt: "travel, adventure, uplifting, scenic" },
  { id: "party", label: "派对聚会", prompt: "party celebration music, upbeat" },
  { id: "relax", label: "冥想放松", prompt: "meditation relaxation music" },
  { id: "lyrical", label: "浪漫表白", prompt: "romantic love ballad" },
  { id: "anime", label: "动漫二次元", prompt: "anime pop, j-pop" },
  { id: "", label: "无", prompt: "" },
] as const;

// 心情：统一用英文 mood，避免与场景冲突
export const MOOD_OPTIONS = [
  { mood: "开心", style: "r&b", en: "happy" },
  { mood: "难过", style: "indie folk", en: "sad" },
  { mood: "焦虑", style: "indie rock", en: "anxious" },
  { mood: "疲惫", style: "ambient pop", en: "tired" },
  { mood: "平静", style: "ambient pop", en: "calm" },
  { mood: "感动", style: "indie folk", en: "touched" },
  { mood: "想念", style: "chinese-style", en: "nostalgic" },
  { mood: "兴奋", style: "dance pop", en: "excited" },
  { mood: "快乐", style: "dance pop", en: "joyful" },
  { mood: "幸福", style: "r&b", en: "blissful" },
  { mood: "轻松", style: "chill pop", en: "relaxed" },
  { mood: "自信", style: "hip hop", en: "confident" },
  { mood: "悲伤", style: "indie ballad", en: "melancholic" },
  { mood: "沮丧", style: "sad ballad", en: "depressed" },
  { mood: "愤怒", style: "rock", en: "angry" },
  { mood: "孤独", style: "indie folk", en: "lonely" },
  { mood: "期待", style: "indie pop", en: "anticipating" },
  { mood: "惊喜", style: "dance pop", en: "surprised" },
  { mood: "喜庆", style: "dance pop", en: "festive" },
  { mood: "温暖", style: "r&b", en: "warm" },
] as const;

// 乐器：全部强化 prominent / lead / main instrument
export const INSTRUMENT_OPTIONS = [
  { id: "", label: "无", prompt: "" },
  { id: "piano", label: "钢琴", prompt: "piano-led, piano as main instrument, prominent throughout" },
  { id: "guitar", label: "吉他", prompt: "acoustic guitar-led, guitar as main instrument, prominent" },
  { id: "guzheng", label: "古筝", prompt: "guzheng, Chinese zither, lead instrument, prominent, plucked strings" },
  { id: "erhu", label: "二胡", prompt: "erhu, Chinese bowed strings, lead instrument, prominent, emotional" },
  { id: "violin", label: "小提琴", prompt: "violin-led, orchestral violin, main instrument, prominent" },
  { id: "dizi", label: "笛箫", prompt: "dizi, xiao, Chinese bamboo flute, lead melody, prominent throughout" },
  { id: "electronic", label: "电子合成器", prompt: "electronic synth-led, synth as main instrument, prominent" },
] as const;

// 声线：含民族音乐常用描述（苍凉、细腻、浑厚、嘹亮、空灵）
export const VOCAL_TONE_OPTIONS = [
  { id: "", label: "无", prompt: "" },
  { id: "deep", label: "深沉", prompt: "deep, low-pitched, baritone" },
  { id: "high", label: "高昂", prompt: "powerful, high-pitched, soaring" },
  { id: "gentle", label: "温柔", prompt: "gentle, soft, mellow" },
  { id: "hoarse", label: "沙哑", prompt: "hoarse, raspy, gravelly" },
  { id: "clear", label: "清澈", prompt: "clear, bright, crystalline" },
  { id: "desolate", label: "苍凉", prompt: "desolate, melancholic, mournful, weathered" },
  { id: "delicate", label: "细腻", prompt: "delicate, nuanced, refined, intimate" },
  { id: "rich", label: "浑厚", prompt: "rich, sonorous, full-bodied, resonant" },
  { id: "resounding", label: "嘹亮", prompt: "resounding, bright, piercing, clear" },
  { id: "ethereal", label: "空灵", prompt: "ethereal, airy, transcendent, otherworldly" },
] as const;

// 语言
export const LANGUAGE_OPTIONS = [
  { id: "zh", label: "中文", prompt: "Chinese lyrics, Chinese only" },
  { id: "zh-mixed", label: "中文+英文副歌", prompt: "Chinese verses, English chorus" },
  { id: "zh-yue", label: "粤语", prompt: "Cantonese lyrics, Hong Kong style, Cantopop" },
  { id: "en", label: "英文", prompt: "English lyrics, modern production" },
  { id: "ja", label: "日文", prompt: "Japanese lyrics, J-pop style" },
  { id: "ko", label: "韩文", prompt: "Korean lyrics, K-pop style" },
  { id: "instrumental", label: "纯音乐无歌词", prompt: "" },
] as const;

// 民族风格：强化乐器、唱法、氛围，便于 API 生成纯正民族味
export const ETHNIC_OPTIONS = [
  { id: "", label: "无", style: "" },
  { id: "tibetan", label: "藏族", style: "Tibetan folk, Himalayan, overtone singing, deep resonant chanting, dramyin, piwang, dungchen, raw intimate" },
  { id: "mongolian", label: "蒙古族", style: "Mongolian folk, khöömei throat singing, morin khuur horsehead fiddle, long song urtyn duu, grassland nomadic, meditative vibrato" },
  { id: "xinjiang", label: "新疆", style: "Xinjiang Uyghur, Central Asian, dutar, rawap, satar, Silk Road, meshrep" },
  { id: "miao", label: "苗族", style: "Miao folk, lusheng mouth organ, polyphonic singing, pentatonic, call-and-response, raw intimate" },
  { id: "zhuang", label: "壮族", style: "Zhuang folk, Guangxi, call-and-response singing, song fair, three-part harmony" },
  { id: "yi", label: "彝族", style: "Yi folk, qinqin, xianggu, Southwest China, torch festival" },
  { id: "dai", label: "傣族", style: "Dai folk, hulusi gourd flute, elephant-foot drum, Xishuangbanna, gentle lyrical" },
  { id: "kazakh", label: "哈萨克族", style: "Kazakh folk, dombra, kobyz, Central Asian, pastoral" },
  { id: "uyghur", label: "维吾尔族", style: "Uyghur folk, dutar, rawap, satar, Central Asian, Silk Road" },
] as const;

// 排除风格（negativeTags）
export const NEGATIVE_TAGS_EXAMPLES = [
  "重金属", "强节奏鼓点", "刺耳", "嘈杂", "失真",
];

// ========== 人声多样化：民族人声 + 常规 archetype ==========
/** 民族人声映射：民族风格时注入人声特质，替代通用 male/female vocals */
const ETHNIC_VOCAL_MAP: Record<string, string> = {
  tibetan: "Tibetan vocal timbre, Himalayan vocal quality, resonant chanting, deep throat, raw",
  mongolian: "Mongolian throat singing vocal, khöömei style, grassland timbre, long song vibrato",
  xinjiang: "Central Asian vocal timbre, Uyghur vocal quality, ornate melisma",
  miao: "Miao folk vocal, polyphonic mountain timbre, raw intimate",
  zhuang: "Zhuang folk vocal, bright call-and-response timbre",
  yi: "Yi folk vocal, raw mountain timbre, Southwest China",
  dai: "Dai folk vocal, gentle lyrical, soft Southeast Asian timbre",
  kazakh: "Kazakh folk vocal, Central Asian pastoral timbre",
  uyghur: "Uyghur vocal timbre, Central Asian, ornate",
};

/** 民族风格时，negativeTags 建议排除流行人声 */
export const ETHNIC_NEGATIVE_TAGS = "Western pop vocals, polished pop singer, auto-tune";

/** 民族风格默认声线：用户未选 vocalTone 时使用 */
const ETHNIC_DEFAULT_TONE_MAP: Record<string, string> = {
  tibetan: "desolate, melancholic, mournful, weathered, rich resonant",
  mongolian: "desolate, resounding, bright, piercing, long song vibrato",
  xinjiang: "ornate melisma, bright, Central Asian",
  miao: "raw intimate, polyphonic",
  zhuang: "bright, call-and-response",
  yi: "raw mountain timbre",
  dai: "gentle lyrical, soft",
  kazakh: "pastoral, resonant",
  uyghur: "ornate, Central Asian",
};

/** 常规人声 archetype：声部 + 质感，打破同质化 */
const VOCAL_ARCHETYPE_MAP: Record<string, string> = {
  warm_tenor: "tenor, warm chest voice, intimate, clear diction",
  deep_baritone: "baritone, deep, rich, resonant, storytelling",
  bright_tenor: "tenor, bright, soaring, powerful, belting",
  gritty_male: "male vocals, gritty, raspy, raw, emotional",
  smooth_male: "male vocals, smooth, mellow, polished",
  warm_alto: "alto, warm, intimate, breathy",
  bright_soprano: "soprano, bright, crystalline, soaring",
  delicate_female: "female vocals, delicate, nuanced, refined",
  powerful_female: "female vocals, powerful, belting, emotional",
  airy_female: "female vocals, airy, ethereal, falsetto",
  ethereal_xianxia: "ethereal, transcendent, otherworldly, xianxia vocal, airy",
  epic_xianxia_male: "deep, resonant, heroic, xianxia male lead, baritone",
};

/** 风格 → 男/女 archetype 候选（随机轮换打破同质化） */
const STYLE_VOCAL_ARCHETYPE_MAP: Record<string, { m: string[]; f: string[] }> = {
  "抒情": { m: ["warm_tenor", "deep_baritone"], f: ["warm_alto", "delicate_female"] },
  "流行": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "warm_alto"] },
  "民谣": { m: ["warm_tenor", "deep_baritone", "gritty_male"], f: ["warm_alto", "delicate_female"] },
  "摇滚": { m: ["gritty_male", "bright_tenor"], f: ["powerful_female"] },
  "R&B": { m: ["smooth_male", "deep_baritone"], f: ["warm_alto", "delicate_female"] },
  "爵士": { m: ["smooth_male", "deep_baritone"], f: ["warm_alto", "delicate_female"] },
  "古风": { m: ["deep_baritone"], f: ["delicate_female", "airy_female"] },
  "古风仙侠": { m: ["epic_xianxia_male", "deep_baritone"], f: ["ethereal_xianxia", "delicate_female", "airy_female"] },
  "中国风": { m: ["deep_baritone", "warm_tenor"], f: ["delicate_female", "warm_alto"] },
  "电子": { m: ["smooth_male"], f: ["airy_female", "bright_soprano"] },
  "轻音乐": { m: ["smooth_male", "warm_tenor"], f: ["delicate_female", "airy_female"] },
  "古典": { m: ["deep_baritone"], f: ["bright_soprano", "delicate_female"] },
  "动漫": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "airy_female"] },
  "chinese-style": { m: ["deep_baritone", "warm_tenor"], f: ["delicate_female", "warm_alto"] },
  "r&b": { m: ["smooth_male", "deep_baritone"], f: ["warm_alto", "delicate_female"] },
  "indie folk": { m: ["warm_tenor", "deep_baritone", "gritty_male"], f: ["warm_alto", "delicate_female"] },
  "indie rock": { m: ["gritty_male", "bright_tenor"], f: ["powerful_female"] },
  "ambient pop": { m: ["smooth_male"], f: ["airy_female", "delicate_female"] },
  "indie pop": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "warm_alto"] },
  "lo-fi hip hop": { m: ["smooth_male"], f: ["airy_female", "warm_alto"] },
  "hard rock": { m: ["gritty_male", "bright_tenor"], f: ["powerful_female"] },
  "dance pop": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "warm_alto"] },
  "chill pop": { m: ["smooth_male", "warm_tenor"], f: ["warm_alto", "airy_female"] },
  "hip hop": { m: ["gritty_male", "smooth_male"], f: ["powerful_female", "warm_alto"] },
  "alternative pop": { m: ["bright_tenor"], f: ["bright_soprano"] },
  "indie ballad": { m: ["warm_tenor", "deep_baritone"], f: ["warm_alto", "delicate_female"] },
  "sad ballad": { m: ["deep_baritone", "warm_tenor"], f: ["delicate_female", "warm_alto"] },
  "punk rock": { m: ["gritty_male"], f: ["powerful_female"] },
  "alternative rock": { m: ["gritty_male", "bright_tenor"], f: ["powerful_female"] },
  "ambient electronic": { m: ["smooth_male"], f: ["airy_female"] },
  "post-rock": { m: ["deep_baritone", "gritty_male"], f: ["airy_female", "delicate_female"] },
  "J-pop": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "airy_female"] },
  "K-pop": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "powerful_female"] },
  "Latin pop": { m: ["bright_tenor", "smooth_male"], f: ["bright_soprano", "warm_alto"] },
  "其他": { m: ["warm_tenor", "bright_tenor"], f: ["warm_alto", "bright_soprano"] },
};

/** 默认 archetype（风格未映射时） */
const DEFAULT_ARCHETYPE = { m: ["warm_tenor", "bright_tenor"], f: ["warm_alto", "bright_soprano"] };

/** 从候选 archetype 中随机选一个 */
function pickArchetype(candidates: string[]): string {
  if (!candidates?.length) return "";
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

/**
 * 获取人声 prompt：民族注入 或 常规 archetype
 * - 民族风格：ETHNIC_VOCAL_MAP + 性别
 * - 常规 m/f：按风格 + 性别选 archetype（随机轮换）
 * - duet/mixed/choir 等：保持原有 prompt
 */
function getVocalPrompt(parts: {
  vocalGenderId?: string;
  ethnicId?: string;
  baseStyle?: string;
  vocalToneId?: string;
}): string {
  const { vocalGenderId, ethnicId, baseStyle } = parts;
  if (!vocalGenderId) return "";

  // 民族风格：注入民族人声
  if (ethnicId && ETHNIC_VOCAL_MAP[ethnicId]) {
    const ethnicDesc = ETHNIC_VOCAL_MAP[ethnicId];
    const gender = vocalGenderId === "m" ? "male" : vocalGenderId === "f" ? "female" : "";
    if (gender) return `${ethnicDesc}, ${gender} vocals`;
    return ethnicDesc;
  }

  // duet / mixed / choir / child / harmony：保持原有
  const special = VOCAL_GENDER_OPTIONS.find((o) => o.value === vocalGenderId);
  if (special && !["m", "f"].includes(vocalGenderId)) {
    return special.prompt || "";
  }

  // 常规 m/f：使用 archetype
  const styleKey = baseStyle?.trim() || "其他";
  const map = STYLE_VOCAL_ARCHETYPE_MAP[styleKey] ?? DEFAULT_ARCHETYPE;
  const candidates = vocalGenderId === "m" ? map.m : map.f;
  const archetypeId = pickArchetype(candidates);
  const archetypePrompt = archetypeId ? VOCAL_ARCHETYPE_MAP[archetypeId] : "";
  if (archetypePrompt) return archetypePrompt;

  // 兜底：原有 prompt
  const v = VOCAL_GENDER_OPTIONS.find((o) => o.value === vocalGenderId);
  return v?.prompt ?? "";
}

/** 民族风格时，返回建议追加的 negativeTags（可与用户输入合并） */
export function getEthnicNegativeTags(ethnicId?: string): string {
  return ethnicId && ETHNIC_VOCAL_MAP[ethnicId] ? ETHNIC_NEGATIVE_TAGS : "";
}

// ========== 补充乐器/风格/年代 中文→英文映射 ==========
/** 补充乐器：常见中文乐器名 → 英文 prompt */
const INSTRUMENT_EXTRA_MAP: Record<string, string> = {
  "萨克斯风": "saxophone, saxophone-led, prominent",
  "萨克斯": "saxophone, saxophone-led, prominent",
  "小号": "trumpet, trumpet-led, prominent",
  "长号": "trombone, trombone-led, prominent",
  "大提琴": "cello, cello-led, prominent",
  "口琴": "harmonica, harmonica-led, prominent",
  "琵琶": "pipa, Chinese lute, lead instrument, prominent",
  "唢呐": "suona, Chinese horn, prominent",
  "扬琴": "yangqin, Chinese dulcimer, prominent",
  "古琴": "guqin, Chinese zither, prominent",
  "架子鼓": "drums, drum-led, prominent",
  "贝斯": "bass, bass-led, prominent",
  "八音盒": "music box, music box-led, dreamy",
  "电子琴": "electric piano, synth keys, prominent",
};

/** 补充风格/年代：常见中文描述 → 英文 prompt（按长度降序，优先匹配长串） */
const STYLE_ERA_EXTRA_MAP: Record<string, string> = {
  // 港台剧 / 怀旧
  "港剧风格": "Hong Kong drama style, 90s Cantopop",
  "港剧": "Hong Kong drama style, 90s Cantopop",
  "港风": "Hong Kong style, Cantopop",
  "港乐": "Cantopop, Hong Kong pop",
  "台湾流行": "Taiwan pop, Mandopop",
  "日剧风格": "Japanese drama style, J-pop ballad",
  "韩剧风格": "Korean drama style, K-pop ballad",
  "怀旧": "nostalgic, vintage",
  "复古": "retro, vintage",
  // 二次元 / 动漫 / ACG（年轻群体核心需求）
  "国风二次元": "Chinese fantasy anime, gufeng fusion, ACG",
  "古风二次元": "ancient Chinese anime, gufeng ACG",
  "古风动漫": "ancient Chinese anime, gufeng",
  "动态变化": "dynamic arrangement, evolving sections, varied instrumentation",
  "有层次": "contrasting verses and chorus, building intensity",
  "仙侠": "xianxia, Chinese fantasy, cultivation theme, otherworldly, ethereal",
  "修仙": "cultivation theme, xianxia, ethereal, transcendent",
  "仙剑风格": "Chinese Paladin style, gufeng game OST, guzheng dizi",
  "剑侠情缘": "wuxia xianxia, Chinese fantasy RPG, epic",
  "仙侠游戏": "Chinese fantasy RPG, wuxia game BGM",
  "游戏BGM": "game BGM, orchestral, cinematic",
  "治愈系": "healing, soft, warm, gentle anime",
  "治愈番": "healing anime, soft, warm",
  "燃系": "intense, epic, battle anthem, anime OP",
  "燃曲": "intense, epic, battle anthem",
  "萌系": "kawaii, cute, moe anime",
  "卡哇伊": "kawaii, cute, sweet",
  "蒸汽波": "vaporwave, retro 80s, lo-fi",
  "赛博朋克": "cyberpunk, synthwave, neon",
  "赛博国风": "cyberpunk Chinese, synthwave gufeng",
  "未来bass": "kawaii future bass, anime EDM",
  "future bass": "kawaii future bass, anime electronic",
  "City Pop": "city pop, 80s Japanese urban",
  "city pop": "city pop, 80s Japanese urban",
  "Future Funk": "future funk, anime groove, vaporwave",
  "future funk": "future funk, anime groove",
  "VOCALOID": "vocaloid, electronic pop, anime",
  "vocaloid": "vocaloid, electronic pop, anime",
  "电音二次元": "anime EDM, electronic anime",
  "动漫OP": "anime OP, J-pop, energetic",
  "动漫ED": "anime ED, J-pop ballad",
  "动漫风格": "anime, J-pop, Japanese pop",
  "二次元": "anime, J-pop, kawaii",
};

/** 补充民族风格：常见中文民族名 → 英文 prompt（强化乐器、唱法） */
const ETHNIC_EXTRA_MAP: Record<string, string> = {
  "藏族": "Tibetan folk, Himalayan, overtone singing, dramyin, raw intimate",
  "蒙古族": "Mongolian folk, khöömei throat singing, morin khuur, long song, grassland",
  "新疆": "Xinjiang Uyghur, Central Asian, dutar, rawap, Silk Road",
  "苗族": "Miao folk, lusheng, polyphonic singing, pentatonic",
  "壮族": "Zhuang folk, Guangxi, call-and-response, three-part harmony",
  "彝族": "Yi folk, qinqin, xianggu, Southwest China",
  "傣族": "Dai folk, hulusi, elephant-foot drum, gentle lyrical",
  "哈萨克族": "Kazakh folk, dombra, kobyz, Central Asian",
  "维吾尔族": "Uyghur folk, dutar, rawap, satar, Central Asian",
  "朝鲜族": "Korean Chinese folk, gayageum, janggu",
  "满族": "Manchu folk, Northeast China",
  "回族": "Hui folk, Chinese Islamic",
  "侗族": "Dong folk, polyphonic big song, gaohu",
};

function resolveEthnicExtra(text: string): string {
  const t = text?.trim();
  if (!t) return "";
  const entries = Object.entries(ETHNIC_EXTRA_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of entries) {
    if (t.includes(zh)) return en;
  }
  return t;
}

/** 补充人声：二次元/动漫 + 民族音乐人声特质 → 英文 prompt */
const VOCAL_EXTRA_MAP: Record<string, string> = {
  "萝莉音": "child-like vocals, cute, high-pitched",
  "御姐音": "mature female vocals, deep, sultry",
  "少年音": "young male vocals, bright, clear",
  "正太音": "young boy vocals, innocent, clear",
  "少女音": "young female vocals, sweet, bright",
  "大叔音": "deep male vocals, baritone, mature",
  "苍凉": "desolate, melancholic, mournful, weathered",
  "细腻": "delicate, nuanced, refined, intimate",
  "浑厚": "rich, sonorous, full-bodied, resonant",
  "嘹亮": "resounding, bright, piercing, clear",
  "空灵": "ethereal, airy, transcendent, otherworldly",
  "悠远": "distant, ethereal, expansive",
};

function resolveVocalExtra(text: string): string {
  const t = text?.trim();
  if (!t) return "";
  const entries = Object.entries(VOCAL_EXTRA_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of entries) {
    if (t.includes(zh)) return en;
  }
  return t;
}

function resolveInstrumentExtra(text: string): string {
  const t = text?.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  for (const [zh, en] of Object.entries(INSTRUMENT_EXTRA_MAP)) {
    if (t === zh || lower.includes(zh.toLowerCase())) return en;
  }
  return t;
}

function resolveStyleEraExtra(text: string): string {
  const t = text?.trim();
  if (!t) return "";
  const entries = Object.entries(STYLE_ERA_EXTRA_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [zh, en] of entries) {
    if (t.includes(zh)) return en;
  }
  return t;
}

/** API vocalGender 仅支持 m/f，返回可传值或 undefined */
export function getVocalGenderForApi(vocalGenderId: string): "m" | "f" | undefined {
  if (vocalGenderId === "m" || vocalGenderId === "f") return vocalGenderId;
  return undefined;
}

/** 防单调：Suno 缺乏结构指引时会循环同一旋律，注入此标签可增强段落对比与高潮辨识度 */
const DYNAMIC_CONTRAST_TAGS = "dynamic arrangement, contrasting verses and chorus, building intensity, varied instrumentation";

// ========== 全局风格映射（含英文标签 + 高潮指令） ==========
const STYLE_MAP: Record<string, { tags: string; climax: string }> = {
  "中国风": { tags: "chinese-style, modern Chinese pop, traditional elements", climax: "memorable chorus, emotional climax" },
  "古风": { tags: "gufeng, Chinese traditional ballad, pentatonic, guzheng pipa dizi, ethereal delicate vocals, melancholic nostalgic", climax: "emotional climax, soaring chorus, gentle build" },
  "古风仙侠": { tags: "gufeng xianxia, Chinese fantasy epic, pentatonic, guzheng dizi erhu prominent, ethereal transcendent vocals, otherworldly cinematic, traditional Chinese instruments", climax: "epic climax, dramatic chorus, powerful build" },
  "流行": { tags: "pop, modern pop, catchy, radio-friendly", climax: "catchy hook, memorable chorus, anthemic" },
  "抒情": { tags: "ballad, emotional, soaring vocals", climax: "emotional climax, powerful chorus" },
  "民谣": { tags: "folk, acoustic, storytelling", climax: "memorable hook, singalong chorus" },
  "摇滚": { tags: "rock, electric guitar-driven", climax: "powerful chorus, big drop, driving beat" },
  "电子": { tags: "electronic, synth-driven, modern production", climax: "big drop, catchy hook, high energy chorus" },
  "R&B": { tags: "r&b, soul, smooth vocals", climax: "soulful chorus, memorable hook" },
  "爵士": { tags: "jazz, smooth, sophisticated", climax: "swinging chorus, melodic climax" },
  "轻音乐": { tags: "light music, instrumental, ambient", climax: "melodic peak, gentle build" },
  "古典": { tags: "classical, orchestral", climax: "dramatic crescendo, epic climax" },
  "动漫": { tags: "anime, j-pop, Japanese pop", climax: "catchy chorus, anthemic hook" },
  "chinese-style": { tags: "chinese-style, modern Chinese", climax: "memorable chorus" },
  "r&b": { tags: "r&b, soul", climax: "soulful chorus" },
  "indie folk": { tags: "indie folk, acoustic", climax: "emotional chorus" },
  "indie rock": { tags: "indie rock, alternative", climax: "powerful chorus" },
  "ambient pop": { tags: "ambient pop, dreamy", climax: "atmospheric climax" },
  "indie pop": { tags: "indie pop, melodic", climax: "catchy chorus" },
  "lo-fi hip hop": { tags: "lo-fi hip hop, chill beats", climax: "smooth hook" },
  "hard rock": { tags: "hard rock, heavy guitars", climax: "explosive chorus, big drop" },
  "dance pop": { tags: "dance pop, upbeat", climax: "catchy hook, big drop, anthemic chorus" },
  "chill pop": { tags: "chill pop, relaxed", climax: "memorable chorus" },
  "hip hop": { tags: "hip hop, rap", climax: "catchy hook, melodic chorus" },
  "alternative pop": { tags: "alternative pop", climax: "memorable chorus" },
  "indie ballad": { tags: "indie ballad, emotional", climax: "emotional climax" },
  "sad ballad": { tags: "sad ballad, melancholic", climax: "powerful emotional chorus" },
  "punk rock": { tags: "punk rock, raw", climax: "anthemic chorus" },
  "alternative rock": { tags: "alternative rock", climax: "powerful chorus" },
  "ambient electronic": { tags: "ambient electronic, atmospheric", climax: "evolving climax" },
  "post-rock": { tags: "post-rock, cinematic", climax: "epic build, dramatic climax" },
  "J-pop": { tags: "J-pop, Japanese pop", climax: "catchy chorus" },
  "K-pop": { tags: "K-pop, Korean pop", climax: "catchy hook, explosive chorus" },
  "Latin pop": { tags: "Latin pop, rhythmic", climax: "catchy chorus" },
  "其他": { tags: "", climax: "memorable chorus" },
};

function getBaseStylePrompt(baseStyle: string): string {
  const s = baseStyle.trim();
  const entry = STYLE_MAP[s];
  const base = entry ? [entry.tags, entry.climax].filter(Boolean).join(", ") : (s || "");
  return base ? `${base}, ${DYNAMIC_CONTRAST_TAGS}` : DYNAMIC_CONTRAST_TAGS;
}

/** 与民族风格冲突的 baseStyle：摇滚/电子等会压制民族味 */
const ETHNIC_CONFLICT_STYLES = new Set([
  "摇滚", "rock", "电子", "electronic", "dance pop", "hard rock", "punk rock",
  "hip hop", "alternative rock", "indie rock",
]);

/** 古风/仙侠风格：mood 不注入西方流派（indie folk 等），仅保留情绪词，避免风格冲突 */
const GUFENG_XIANXIA_STYLES = new Set(["古风", "古风仙侠"]);

/** 民族风格选中时，若 baseStyle 冲突，改用此基调以突出民族味 */
const ETHNIC_OVERRIDE_SUFFIX = "world music, acoustic, raw, intimate, storytelling, traditional";

function getEthnicStyleString(ethnicId: string): string {
  const ethnic = ETHNIC_OPTIONS.find((e) => e.id === ethnicId);
  return ethnic?.style ?? "";
}

/** 当民族风格选中且 baseStyle 冲突时，返回民族优先的 style */
function getStyleWithEthnicPriority(
  baseStyle: string,
  ethnicId: string | undefined,
  ethnicExtraResolved: string
): string {
  const ethnicStr = ethnicId ? getEthnicStyleString(ethnicId) : "";
  const hasEthnic = ethnicStr || ethnicExtraResolved;
  const baseTrim = baseStyle?.trim() ?? "";
  const conflicts = hasEthnic && baseTrim && ETHNIC_CONFLICT_STYLES.has(baseTrim);
  if (conflicts && hasEthnic) {
    return [ethnicStr, ethnicExtraResolved, ETHNIC_OVERRIDE_SUFFIX].filter(Boolean).join(", ");
  }
  return "";
}

// ========== 歧义过滤 ==========
const HIGH_ENERGY_SCENES = new Set(["sport", "party"]);
const LOW_ENERGY_SCENES = new Set(["sleep", "relax", "study-work"]);
const SAD_MOODS = new Set(["难过", "悲伤", "沮丧", "孤独", "想念"]);
const HAPPY_MOODS = new Set(["开心", "快乐", "兴奋", "喜庆", "幸福", "惊喜"]);

/** 禁止词：用户输入中若包含则移除或替换 */
const FORBIDDEN_IN_LYRICS = [
  /\b(radiohead|taylor swift|周杰伦|张学友|邓丽君)\b/i,
  /\b(好听|有感觉|随便|都可以)\b/,
];

/** 标签数量上限（避免 style 过长导致 API 理解分散） */
const MAX_STYLE_TAGS = 12;

/** 处理用户输入的歌词/描述：移除歧义、禁止词，规范化结构标签 */
export function sanitizeUserInput(text: string): string {
  if (!text?.trim()) return text;
  let s = text.trim();
  for (const re of FORBIDDEN_IN_LYRICS) {
    s = s.replace(re, "");
  }
  s = s.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/** 检测歌词是否已有结构标签 */
export function hasStructureTags(text: string): boolean {
  return /\[(?:Verse|Chorus|Pre-Chorus|Bridge|Intro|Outro)\s*\d*\]/i.test(text || "");
}

// ========== buildPrompt ==========
/**
 * 构建 prompt：自定义模式下仅返回纯歌词（经 sanitize），否则返回结构化格式
 * 关键：customMode 下 prompt 被严格演唱，不能混入任何风格指令
 */
export function buildPrompt(parts: {
  basePrompt: string;
  lyricsOnly?: boolean;
  baseStyle?: string;
  sceneId?: string;
  mood?: string;
  instrumentId?: string;
  vocalToneId?: string;
  languageId?: string;
  vocalGenderId?: string;
  eraId?: string;
  ethnicId?: string;
  styleExtra?: string;
  vocalExtra?: string;
  eraExtra?: string;
  sceneExtra?: string;
  moodExtra?: string;
  instrumentExtra?: string;
  ethnicExtra?: string;
  maxLength?: number;
}): string {
  const maxLen = parts.maxLength ?? 5000;
  let content = parts.basePrompt.trim();

  if (parts.lyricsOnly) {
    content = sanitizeUserInput(content);
    return content.substring(0, maxLen).trim();
  }

  content = sanitizeUserInput(content);

  const segments: string[] = [];
  const baseStyle = parts.baseStyle?.trim() ?? "";
  const ethnicExtraResolved = parts.ethnicExtra?.trim() ? resolveEthnicExtra(parts.ethnicExtra) : "";
  const styleExtraResolved = parts.styleExtra?.trim() ? resolveStyleEraExtra(parts.styleExtra) : "";
  let styleStr = "";
  const ethnicOverride = getStyleWithEthnicPriority(baseStyle, parts.ethnicId, ethnicExtraResolved);
  if (ethnicOverride) {
    styleStr = ethnicOverride;
  } else {
    styleStr = getBaseStylePrompt(baseStyle);
    if (baseStyle === "其他" && styleExtraResolved) {
      styleStr = [styleStr, styleExtraResolved].filter(Boolean).join(", ");
    } else if (styleExtraResolved) {
      styleStr = styleStr ? `${styleStr}, ${styleExtraResolved}` : styleExtraResolved;
    }
  }
  if (styleStr) segments.push(`[Style] ${styleStr}`);

  const vocalParts: string[] = [];
  const baseVocal = getVocalPrompt({
    vocalGenderId: parts.vocalGenderId,
    ethnicId: parts.ethnicId,
    baseStyle: parts.baseStyle,
    vocalToneId: parts.vocalToneId,
  });
  if (baseVocal) vocalParts.push(baseVocal);
  const vocalExtraResolved = parts.vocalExtra?.trim() ? resolveVocalExtra(parts.vocalExtra) : "";
  if (vocalExtraResolved) vocalParts.push(vocalExtraResolved);
  if (vocalParts.length > 0) segments.push(`[Vocal] ${vocalParts.join(", ")}`);

  const instParts: string[] = [];
  if (parts.instrumentId) {
    const inst = INSTRUMENT_OPTIONS.find((i) => i.id === parts.instrumentId);
    if (inst?.prompt) instParts.push(inst.prompt);
  }
  const instExtra = parts.instrumentExtra?.trim() ? resolveInstrumentExtra(parts.instrumentExtra) : "";
  if (instExtra) instParts.push(instExtra);
  if (instParts.length > 0) segments.push(`[Instrument] ${instParts.join(", ")}`);

  if (parts.vocalToneId) {
    const tone = VOCAL_TONE_OPTIONS.find((t) => t.id === parts.vocalToneId);
    if (tone?.prompt) segments.push(`[Tone] ${tone.prompt}`);
  } else if (parts.ethnicId && ETHNIC_DEFAULT_TONE_MAP[parts.ethnicId]) {
    segments.push(`[Tone] ${ETHNIC_DEFAULT_TONE_MAP[parts.ethnicId]}`);
  }

  if (parts.mood) {
    const mood = MOOD_OPTIONS.find((m) => m.mood === parts.mood);
    if (mood) {
      const en = (mood as { en?: string }).en;
      const moodWord = en ?? mood.mood;
      // 古风/仙侠时不注入西方流派（indie folk 等），避免与 gufeng/xianxia 冲突
      const moodStr = GUFENG_XIANXIA_STYLES.has(baseStyle)
        ? `${moodWord} mood`
        : `${moodWord} mood, ${mood.style}`;
      segments.push(`[Mood] ${moodStr}`);
    }
  }
  if (parts.moodExtra?.trim()) segments.push(`[Mood] ${parts.moodExtra.trim()}`);

  if (parts.sceneId) {
    const scene = SCENE_OPTIONS.find((s) => s.id === parts.sceneId);
    if (scene?.prompt) segments.push(`[Scene] ${scene.prompt}`);
  }
  if (parts.sceneExtra?.trim()) segments.push(`[Scene] ${parts.sceneExtra.trim()}`);

  const eraParts: string[] = [];
  if (parts.eraId) {
    const era = ERA_OPTIONS.find((e) => e.id === parts.eraId);
    if (era?.prompt) eraParts.push(era.prompt);
  }
  const eraExtraResolved = parts.eraExtra?.trim() ? resolveStyleEraExtra(parts.eraExtra) : "";
  if (eraExtraResolved) eraParts.push(eraExtraResolved);
  if (eraParts.length > 0) segments.push(`[Era] ${eraParts.join(", ")}`);

  if (parts.languageId && parts.languageId !== "instrumental") {
    const lang = LANGUAGE_OPTIONS.find((l) => l.id === parts.languageId);
    if (lang?.prompt) segments.push(`[Language] ${lang.prompt}`);
  }

  const ethnicParts: string[] = [];
  if (parts.ethnicId) {
    const ethnic = ETHNIC_OPTIONS.find((e) => e.id === parts.ethnicId);
    if (ethnic?.style) ethnicParts.push(ethnic.style);
  }
  if (ethnicExtraResolved) ethnicParts.push(ethnicExtraResolved);
  if (ethnicParts.length > 0) segments.push(`[Ethnic] ${ethnicParts.join(", ")}`);

  // styleExtra 已合并入 [Style]，不再单独输出 [StyleExtra] 避免重复

  const prefix = segments.length > 0 ? segments.join(". ") + ". " : "";
  const full = content ? `${prefix}[Content] ${content}` : prefix.trimEnd();
  return full.substring(0, maxLen).trim();
}

/** 歌词结构推荐（UI 展示）：明确结构可避免旋律单一、高潮不突出 */
export const LYRIC_STRUCTURE_HINT =
  "推荐结构：[Intro]→[Verse 1]→[Pre-Chorus]→[Chorus]→[Verse 2]→[Chorus]→[Bridge]→[Chorus]→[Outro]。每段前加标签（如 [Chorus]），副歌更突出、旋律更有层次。";

/** 从 prompt 中移除风格指令，仅保留纯歌词 */
export function stripStyleExtrasFromPrompt(prompt: string): string {
  if (!prompt?.trim()) return prompt;
  const contentMatch = prompt.match(/\[Content\]\s*([\s\S]+)/);
  if (contentMatch) return contentMatch[1].trim();
  const parts = prompt.split(/,\s*/);
  const extraKeywords = [
    "mood", "r&b", "choir", "group vocals", "vocals", "chinese", "english",
    "chorus", "cantonese", "japanese", "korean", "cantopop", "title",
    "[style]", "[vocal]", "[instrument]", "[tone]", "[mood]", "[scene]",
    "[era]", "[language]", "[ethnic]", "[styleextra]",
  ];
  const isExtra = (s: string) => {
    const lower = s.toLowerCase();
    return (
      extraKeywords.some((k) => lower.includes(k)) ||
      /\d+s\s*(style|pop)/.test(lower) ||
      /chinese\s*\d+%/.test(lower)
    );
  };
  let cutAt = parts.length;
  for (let i = 0; i < parts.length; i++) {
    if (isExtra(parts[i]!)) {
      cutAt = i;
      break;
    }
  }
  const result = parts.slice(0, cutAt).join(", ").trim();
  return result || prompt;
}

/** 收集 style 片段并应用冲突检测、标签限制 */
function collectStyleSegments(segments: string[]): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of segments) {
    const normalized = s.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(s);
    if (result.join(" ").length > 900) break;
  }
  return result.slice(0, MAX_STYLE_TAGS).join(", ").trim();
}

/**
 * 构建完整 style：基础风格 + 高潮 + 乐器 + 情绪 + 场景 + 人声 + 年代 + 语言
 * 含歧义过滤、标签数量限制
 */
export function buildStyle(parts: {
  baseStyle: string;
  ethnicId?: string;
  styleExtra?: string;
  ethnicExtra?: string;
  instrumentId?: string;
  instrumentExtra?: string;
  mood?: string;
  moodExtra?: string;
  sceneId?: string;
  sceneExtra?: string;
  vocalToneId?: string;
  vocalGenderId?: string;
  vocalExtra?: string;
  eraId?: string;
  eraExtra?: string;
  languageId?: string;
  /** 歌词模式且无结构标签时，注入 strong chorus 等以强化高潮 */
  lyricsWithoutStructure?: boolean;
}): string {
  const { baseStyle, sceneId, mood } = parts;
  const segments: string[] = [];
  const baseTrim = baseStyle?.trim() || "";
  const ethnicExtraResolved = parts.ethnicExtra?.trim() ? resolveEthnicExtra(parts.ethnicExtra) : "";
  const ethnicOverride = getStyleWithEthnicPriority(baseStyle, parts.ethnicId, ethnicExtraResolved);

  if (ethnicOverride) {
    segments.push(ethnicOverride);
  } else {
    const entry = STYLE_MAP[baseTrim];
    if (entry) {
      if (entry.tags) segments.push(entry.tags);
      if (entry.climax) segments.push(entry.climax);
    } else if (baseTrim) {
      segments.push(baseTrim);
    }
  }
  segments.push(DYNAMIC_CONTRAST_TAGS);
  if (parts.lyricsWithoutStructure) {
    segments.push("strong chorus, clear song structure");
  }

  const ethnicParts: string[] = [];
  if (parts.ethnicId && !ethnicOverride) {
    const ethnic = ETHNIC_OPTIONS.find((e) => e.id === parts.ethnicId);
    if (ethnic?.style) ethnicParts.push(ethnic.style);
  }
  if (ethnicExtraResolved && !ethnicOverride) ethnicParts.push(ethnicExtraResolved);
  if (ethnicParts.length > 0) segments.push(ethnicParts.join(", "));

  if (parts.instrumentId) {
    const inst = INSTRUMENT_OPTIONS.find((i) => i.id === parts.instrumentId);
    if (inst?.prompt) segments.push(inst.prompt);
  }
  const instExtra = parts.instrumentExtra?.trim() ? resolveInstrumentExtra(parts.instrumentExtra) : "";
  if (instExtra) segments.push(instExtra);

  if (parts.mood) {
    const moodOpt = MOOD_OPTIONS.find((m) => m.mood === parts.mood);
    if (moodOpt) {
      const en = (moodOpt as { en?: string }).en;
      const moodStr = en ? `${en} mood` : `${moodOpt.mood} mood`;
      const styleTag = moodOpt.style;
      if (sceneId && LOW_ENERGY_SCENES.has(sceneId) && HAPPY_MOODS.has(parts.mood)) {
        segments.push("calm mood");
      } else if (sceneId && HIGH_ENERGY_SCENES.has(sceneId) && SAD_MOODS.has(parts.mood)) {
        segments.push(moodStr, "melodic");
      } else {
        segments.push(moodStr);
        // 古风/仙侠时不注入西方流派，避免 indie folk 等与 gufeng 冲突
        if (styleTag && !GUFENG_XIANXIA_STYLES.has(baseTrim)) segments.push(styleTag);
      }
    }
  }
  if (parts.moodExtra?.trim()) segments.push(parts.moodExtra.trim());

  if (parts.sceneId) {
    const scene = SCENE_OPTIONS.find((s) => s.id === parts.sceneId);
    if (scene?.prompt) segments.push(scene.prompt);
  }
  if (parts.sceneExtra?.trim()) segments.push(parts.sceneExtra.trim());

  if (parts.vocalToneId) {
    const tone = VOCAL_TONE_OPTIONS.find((t) => t.id === parts.vocalToneId);
    if (tone?.prompt) segments.push(tone.prompt);
  } else if (parts.ethnicId && ETHNIC_DEFAULT_TONE_MAP[parts.ethnicId]) {
    segments.push(ETHNIC_DEFAULT_TONE_MAP[parts.ethnicId]);
  }

  const baseVocal = getVocalPrompt({
    vocalGenderId: parts.vocalGenderId,
    ethnicId: parts.ethnicId,
    baseStyle: parts.baseStyle,
    vocalToneId: parts.vocalToneId,
  });
  if (baseVocal) segments.push(baseVocal);
  const vocalExtraResolved = parts.vocalExtra?.trim() ? resolveVocalExtra(parts.vocalExtra) : "";
  if (vocalExtraResolved) segments.push(vocalExtraResolved);

  const eraParts: string[] = [];
  if (parts.eraId) {
    const era = ERA_OPTIONS.find((e) => e.id === parts.eraId);
    if (era?.prompt) eraParts.push(era.prompt);
  }
  const eraExtraResolved = parts.eraExtra?.trim() ? resolveStyleEraExtra(parts.eraExtra) : "";
  if (eraExtraResolved) eraParts.push(eraExtraResolved);
  if (eraParts.length > 0) segments.push(eraParts.join(", "));

  if (parts.languageId && parts.languageId !== "instrumental") {
    const lang = LANGUAGE_OPTIONS.find((l) => l.id === parts.languageId);
    if (lang?.prompt) segments.push(lang.prompt);
  }
  if (parts.styleExtra?.trim()) {
    const extra = resolveStyleEraExtra(parts.styleExtra);
    if (extra) segments.push(extra);
  }

  const style = collectStyleSegments(segments);
  return style.substring(0, 1000).trim();
}

# 民族歌曲人声与风格不融合问题：根因分析与解决方案

---

## 一、问题描述

生成藏族、蒙古族等民族歌曲时，**演唱者的人声**与**歌曲的民族风格**难以融合：
- 人声听起来像普通流行歌手，缺乏藏族/蒙古族歌手的嗓音特质
- 乐器、编曲有民族味，但人声「格格不入」

---

## 二、根因分析

### 2.1 当前 Prompt 结构

```
[Style] Tibetan folk, Himalayan, overtone singing, dramyin, piwang...
[Vocal] male vocals, male lead, male singer    ← 问题所在
[Tone] powerful, high-pitched, soaring        ← 通用描述
[Ethnic] Tibetan folk, Himalayan, overtone singing...
```

**核心矛盾**：
- `[Vocal]` 描述的是**通用人声**（male vocals, male lead）—— 模型会理解为「普通男声」
- `[Ethnic]` 描述的是**风格与乐器**，未明确要求人声具有民族特质
- 模型将两者分开处理：人声 = 通用男声，风格 = 藏族乐器 → 结果 = 普通男声 + 藏族伴奏

### 2.2 人声与风格被割裂

| 标签 | 当前内容 | 模型理解 |
|------|----------|----------|
| [Vocal] | male vocals, male lead | 普通流行男声 |
| [Tone] | powerful, high-pitched | 通用声线 |
| [Ethnic] | Tibetan folk, overtone singing... | 乐器、氛围，**未强调人声** |

**结论**：`[Ethnic]` 中的 overtone singing、chanting 等本应作用于**人声**，但模型可能主要将其用于乐器/氛围，人声仍由 `[Vocal]` 决定，导致人声与民族风格脱节。

### 2.3 Suno API 限制

- **vocalGender**：仅支持 `m` / `f`，无法指定民族嗓音
- **personaId**：可指定 Persona，但需先通过「生成 Persona」接口创建，且依赖参考音频
- **无参考音频**：当前流程无法上传藏族/蒙古族人声样本作为参考

### 2.4 模型训练偏向

Suno 主要基于英文/流行音乐数据训练，对民族人声的建模有限，需通过**更明确的人声描述**引导模型向民族嗓音靠拢。

---

## 三、各民族人声特点（供 Prompt 使用）

| 民族 | 人声/唱法特点 | 英文描述关键词 |
|------|---------------|----------------|
| 藏族 | 喉音、诵经式、深沉共鸣、假声带唱法（卡基拉） | Tibetan vocal quality, resonant chanting, deep throat, Himalayan timbre |
| 蒙古族 | 呼麦（喉音）、长调、颤音、泛音唱法 | Mongolian throat singing, khöömei, long song vibrato, overtone vocals |
| 新疆/维吾尔 | 明亮、装饰音、中亚音色 | Central Asian vocal timbre, ornate melisma |
| 苗族 | 多声部、对唱、山歌感 | Miao polyphonic vocal, mountain folk timbre |
| 壮族 | 对歌、三声部、嘹亮 | Zhuang call-and-response, bright folk vocals |
| 彝族 | 粗犷、山野感 | Yi folk vocal, raw mountain timbre |
| 傣族 | 柔和、抒情 | Dai gentle lyrical vocal |

---

## 四、解决方案

### 方案 A：民族人声注入 [Vocal]（推荐）

**思路**：当选择民族风格时，将**民族人声特质**写入 `[Vocal]`，替代或补充通用「male/female vocals」。

**实现**：
- 新增 `ETHNIC_VOCAL_MAP`：每个民族对应的人声描述
- 当 `ethnicId` 有值时，`[Vocal]` = 民族人声描述 + 性别（可选）
- 示例：藏族 → `Tibetan male vocals, Himalayan vocal quality, resonant chanting, deep throat`

**优点**：直接作用于人声，改动集中、易实现  
**风险**：模型对部分民族人声理解有限，效果需实测

---

### 方案 B：negativeTags 排除流行人声

**思路**：民族风格时，通过 `negativeTags` 排除「流行人声」相关标签，减少模型使用通用流行嗓音的倾向。

**实现**：
- 当 `ethnicId` 有值时，自动追加：`Western pop vocals, polished pop singer, auto-tune`
- 需确认 Suno API 是否支持并正确解析 negativeTags

**优点**：实现简单  
**缺点**：仅做排除，不直接指定民族人声，效果可能有限

---

### 方案 C：合并 [Vocal] 与 [Ethnic] 人声部分

**思路**：将民族人声描述并入 `[Ethnic]`，并确保其语义明确指向「人声」。

**实现**：
- 在 `[Ethnic]` 中显式加入人声描述，例如：`Tibetan folk, Himalayan, **Tibetan vocal timbre, resonant chanting vocals**`
- 或新增 `[VocalStyle]`：`ethnic Tibetan male, chanting, resonant`

**优点**：人声与民族风格在语义上更统一  
**缺点**：标签结构需调整，可能与现有逻辑有交叉

---

### 方案 D：Persona 预置（中长期）

**思路**：使用 Suno 的 `personaId`，预先用藏族/蒙古族人声样本生成 Persona，在民族歌曲生成时传入。

**实现**：
- 准备藏族、蒙古族等参考人声样本
- 调用 Suno「生成 Persona」接口，得到 personaId
- 民族风格生成时传入对应 personaId（需 customMode，且 V5 支持 voice_persona）

**优点**：人声一致性最好  
**缺点**：依赖参考音频、接口与流程较复杂，适合作为后续增强

---

## 五、推荐实施顺序

| 优先级 | 方案 | 说明 |
|--------|------|------|
| 1 | 方案 A：民族人声注入 [Vocal] | 核心改动，直接提升人声与民族风格的匹配度 |
| 2 | 方案 B：negativeTags | 作为补充，抑制流行人声 |
| 3 | 方案 C：强化 [Ethnic] 人声描述 | 与方案 A 配合，双通道强化 |
| 4 | 方案 D：Persona | 有参考音频和接口支持后再考虑 |

---

## 六、方案 A 详细设计

### 6.1 ETHNIC_VOCAL_MAP 设计

```ts
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
```

### 6.2 [Vocal] 构建逻辑

- **无民族**：`[Vocal] = male vocals, male lead`（或用户选择）
- **有民族**：`[Vocal] = ETHNIC_VOCAL_MAP[ethnicId] + ", " + (m/f ? "male" : "female") + " vocals"`

### 6.3 [Tone] 与民族声线

- 当有民族时，可优先使用民族适配的声线（如藏族→苍凉/浑厚，蒙古族→苍凉/嘹亮）
- 或提供「民族默认声线」映射，减少与民族风格冲突的声线选项

---

## 七、预期效果与验证

- **预期**：人声更贴近藏族/蒙古族等民族嗓音，与乐器、风格更一致
- **验证**：对藏族、蒙古族等做 A/B 对比（方案 A 实施前后），并收集主观听感反馈

---

**请审核本方案，确认后可进入实施阶段。**

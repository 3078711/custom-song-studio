# 提示词工程优化方案

> 目标：提升 Suno API 对创作参数的理解度，增强歌曲高潮与辨识度，简化并过滤易产生歧义的提示词。

---

## 一、现状问题分析

### 1.1 已识别问题

| 问题 | 表现 | 根因推测 |
|------|------|----------|
| 缺乏高潮/辨识度低 | 副歌不突出、记忆点弱 | 未显式强调 Chorus 能量、缺少 catchy hook 等指令 |
| 参数不被 API 理解 | 古风仙侠、笛箫、人声选择等失效 | 中文/生僻词、API 仅支持 m/f、style 标签不够行业化 |
| 提示词歧义 | 效果不稳定 | 标签冲突、描述模糊、未做过滤 |

### 1.2 API 约束（Suno API 文档）

- **vocalGender**：仅支持 `m`（男声）、`f`（女声），**不支持** duet/choir/child 等
- **style**：V4.5+ 最多 1000 字符，用于风格/流派/人声/乐器/情绪
- **prompt**（自定义模式）：= 歌词内容，**严格按原样演唱**，不能混入风格指令
- **结构标签**：`[Verse]` `[Chorus]` `[Pre-Chorus]` `[Bridge]` `[Intro]` `[Outro]` 应写在歌词中

---

## 二、优化策略总览

| 维度 | 策略 |
|------|------|
| 高潮与辨识度 | 在 style 中注入 chorus 能量指令；引导歌词使用 [Pre-Chorus]→[Chorus] 结构 |
| 参数可识别性 | 全部使用英文行业标签；人声 duet/choir 等放入 style；古风仙侠等用多标签组合 |
| 歧义过滤 | 冲突标签互斥；模糊词映射到明确标签；单类目单标签优先 |

---

## 三、分项优化方案

### 3.1 高潮与辨识度增强

**目标**：让副歌更突出、更有记忆点。

**方案**：

1. **在 style 中注入副歌能量指令**（按风格智能选择）  
   - 流行/电子/舞曲：`catchy hook, memorable chorus, big drop, anthemic chorus`  
   - 抒情/民谣：`emotional climax, soaring chorus, powerful bridge`  
   - 古风/中国风：`epic climax, dramatic chorus, cinematic build`

2. **歌词结构引导**（在「歌词模式」说明与示例中）  
   - 明确推荐：`[Intro] → [Verse 1] → [Pre-Chorus] → [Chorus] → [Verse 2] → [Chorus] → [Bridge] → [Chorus]`  
   - 在 [Chorus] 内重复核心句，形成 hook  
   - 在 [Pre-Chorus] 建立张力

3. **可选：根据歌词自动检测结构**  
   - 若用户歌词无 `[Chorus]`，在 style 中追加 `strong chorus, clear song structure` 作为兜底

---

### 3.2 风格映射优化（含古风仙侠）

**目标**：风格选项与 API 可理解的英文标签一一对应。

**当前问题**：`古风仙侠` 用 `gufeng, xianxia` 等，API 可能不识别。

**优化映射**（已实施，详见 `docs/GUFENG_XIANXIA_ANALYSIS.md`）：

| 中文选项 | 优化后（英文行业标签） |
|----------|------------------------|
| 古风仙侠 | gufeng xianxia, Chinese fantasy epic, pentatonic, guzheng dizi erhu prominent, ethereal transcendent vocals, otherworldly cinematic, traditional Chinese instruments |
| 古风 | gufeng, Chinese traditional ballad, pentatonic, guzheng pipa dizi, ethereal delicate vocals, melancholic nostalgic |
| 中国风 | chinese-style, traditional Chinese | chinese-style, modern Chinese pop, traditional elements |
| 流行 | pop, modern pop | pop, modern pop, catchy, radio-friendly |
| 抒情 | ballad, emotional | ballad, emotional, soaring vocals |
| 民谣 | folk, acoustic | folk, acoustic, storytelling |
| 电子 | electronic | electronic, synth-driven, modern production |
| R&B | r&b, soul | r&b, soul, smooth vocals |

**原则**：每个风格 3–6 个互补标签，避免冲突；优先使用 Suno 文档与社区验证过的标签。

---

### 3.3 人声参数修正

**API 限制**：`vocalGender` 仅支持 `m` / `f`。

**方案**：

| 用户选择 | API vocalGender | style 补充 |
|----------|-----------------|------------|
| 男声 | m | male vocals, male lead |
| 女声 | f | female vocals, female lead |
| 男女对唱 | 不传（或传主声 m/f） | male and female duet, call and response, duet vocals, alternating verses |
| 合唱 | 不传 | choir, group vocals, ensemble singing |
| 混声 | 不传 | mixed vocals, layered harmonies |
| 童声 | 不传 | child vocals, children choir |
| 和声 | 不传 | harmony vocals, backing vocals |

**实现**：`vocalGender` 仅在选择「男声」「女声」时传入；其余人声类型全部通过 style 描述。

---

### 3.4 乐器突出度强化

**目标**：笛箫、古筝等能真正成为主奏乐器。

**优化**：

| 乐器 | 当前 | 优化后 |
|------|------|--------|
| 笛箫 | dizi and xiao as main instruments... | dizi, xiao, Chinese bamboo flute, prominent throughout, lead melody, traditional Chinese wind |
| 古筝 | guzheng-led, guzheng as main instrument | guzheng, Chinese zither, prominent, lead instrument, plucked strings |
| 二胡 | erhu-led... | erhu, Chinese bowed strings, prominent, emotional lead |
| 钢琴 | piano-led... | piano-led, piano as main instrument, prominent |
| 吉他 | acoustic guitar... | acoustic guitar-led, guitar as main instrument |

**原则**：乐器名 + `prominent` / `lead` / `main instrument`，必要时加 `throughout`。

---

### 3.5 情绪与场景标签

**目标**：情绪、场景使用英文且与风格不冲突。

**优化**：

- 情绪：统一使用 `en` 字段（happy, sad, melancholic, euphoric 等）  
- 场景：使用英文 prompt（如 romantic love ballad, energetic workout music）  
- 互斥规则：例如「难过」不与「 upbeat」同现；「助眠」不与「high energy」同现

---

### 3.6 歧义过滤与简化

**规则**：

1. **冲突过滤**  
   - 情绪 vs 风格：sad + dance pop → 保留 sad mood，风格改为 sad ballad / indie folk  
   - 场景 vs 情绪：sleep + excited → 以场景为准，情绪改为 calm

2. **模糊词映射**  
   - 「不指定」→ 不注入对应标签  
   - 「其他」→ 仅使用用户补充的 styleExtra，不追加默认标签

3. **标签数量控制**  
   - style 总标签建议 4–8 个，每类（风格/人声/乐器/情绪/场景）1–2 个  
   - 超长时按优先级截断：风格 > 人声 > 乐器 > 情绪 > 场景

4. **禁止词**  
   - 避免具体艺人名、版权敏感词  
   - 避免过于抽象的词（如「好听」「有感觉」）

---

### 3.7 歌词结构提示优化

**当前**：`支持 [Verse] [Chorus] [Bridge] [Intro] [Outro] 等结构标签`

**优化**：

```
推荐结构：[Intro] → [Verse 1] → [Pre-Chorus] → [Chorus] → [Verse 2] → [Chorus] → [Bridge] → [Chorus]
- [Chorus] 为高潮，建议重复核心句形成记忆点
- [Pre-Chorus] 用于在副歌前建立张力
```

在 UI 中作为「结构建议」展示，不强制修改用户歌词。

---

## 四、实施清单

| 序号 | 修改点 | 文件 | 说明 |
|------|--------|------|------|
| 1 | 风格映射表 | workbenchParams.ts | 古风仙侠、古风、中国风等全部改为英文行业标签 |
| 2 | 人声逻辑 | workbenchParams.ts + suno.ts | vocalGender 仅 m/f；duet/choir 等全部放入 style |
| 3 | 乐器 prompt | workbenchParams.ts | 笛箫、古筝、二胡等强化 prominent/lead |
| 4 | 高潮指令 | workbenchParams.ts | buildStyle 中按 baseStyle 注入 chorus 能量标签 |
| 5 | 情绪/场景 | workbenchParams.ts | 统一用英文，增加冲突检测与过滤 |
| 6 | 歧义过滤 | workbenchParams.ts | 冲突过滤、标签数量限制、禁止词 |
| 7 | 歌词结构提示 | workbench page | 更新 placeholder 与帮助文案 |
| 8 | negativeTags | workbenchParams | 根据风格自动追加合理排除项（可选） |

---

## 五、预期效果

- **高潮与辨识度**：副歌更突出，结构更清晰  
- **参数可识别性**：古风仙侠、笛箫、人声类型等更易被 API 采纳  
- **稳定性**：减少冲突与歧义，生成结果更可控  

---

## 六、风险与回退

- **风险**：部分旧任务/旧版本的 creationForm 可能因风格映射变化而表现不同  
- **回退**：修改集中在 `workbenchParams.ts`，可整体 revert  
- **验证**：建议对古风仙侠、男女对唱、笛箫主奏等场景做 A/B 对比测试  

---

**请审核本方案，确认后可进入实施阶段。**

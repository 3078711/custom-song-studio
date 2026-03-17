# 古风仙侠歌曲特点分析与提示词优化

> **目标**：让 Suno API 正确理解并生成古风仙侠风格歌曲，解决用户反馈「风格不太相符」的问题。

---

## 一、古风仙侠歌曲特点分析

### 1.1 古风 (Gufeng) 与仙侠 (Xianxia) 的关系

| 维度 | 古风 | 古风仙侠 |
|------|------|----------|
| **起源** | 2005 年左右，源于仙剑、轩辕剑等游戏 OST | 古风的子集/延伸，更强调玄幻、修仙主题 |
| **主题** | 诗词、山水、江湖、离别、情感细腻 | 修炼、仙界、神话、武侠、史诗感 |
| **氛围** | 怀旧、雅致、抒情、内省 | 超凡脱俗、大气磅礴、电影感 |
| **制作** | 传统+现代融合，偏抒情 | 管弦乐、OST、游戏 BGM 感更强 |

### 1.2 音乐特征（API 可理解的英文标签）

#### 音阶与结构
- **Pentatonic scale**（五声音阶）：中国传统音乐核心，do-re-mi-sol-la
- **Monophonic / heterophonic**：单旋律或复调变奏，非西方和声
- **Slow to moderate tempo**：缓慢、冥想式，营造意境

#### 传统乐器（必须显式指定）
| 乐器 | 英文 | 在古风仙侠中的角色 |
|------|------|-------------------|
| 古筝 | guzheng | 主奏，流水般琶音、明亮流畅 |
| 笛子 | dizi | 主旋律，清亮或哀婉 |
| 箫 | xiao | 空灵、 melancholic，竖吹竹笛 |
| 古琴 | guqin | 文人气质，内省、禅意 |
| 琵琶 | pipa | 节奏驱动、叙事感 |
| 二胡 | erhu | 情感表达，滑音、颤音 |

#### 人声特质
- **Ethereal**（空灵）：仙侠核心人声质感
- **Delicate / nuanced**（细腻）：古风抒情
- **Transcendent / otherworldly**（超凡脱俗）：仙侠主题
- **Desolate / melancholic**（苍凉）：江湖、离别主题

#### 氛围与情绪
- **Atmospheric, otherworldly**：超凡脱俗
- **Cinematic, epic**：电影感、史诗感
- **Meditative, contemplative**：冥想、内省
- **Nostalgic yet modern**：怀旧与现代融合

### 1.3 古风仙侠子类型（供 styleExtra 参考）

| 子类型 | 英文标签 | 说明 |
|--------|----------|------|
| 传统仙侠 | Traditional xianxia, pure instrumental | 纯器乐，古琴/笛箫主导 |
| 现代融合 | Gufeng fusion, electronic xianxia | 电子元素 + 传统 |
| 史诗仙侠 | Epic xianxia, orchestral, game OST | 宏大管弦乐，游戏/影视配乐 |

---

## 二、当前实现问题诊断

### 2.1 现有 STYLE_MAP 配置

```ts
"古风仙侠": {
  tags: "Chinese fantasy epic, wuxia, cinematic orchestral, traditional Chinese, dramatic",
  climax: "epic climax, dramatic chorus, powerful build"
}
```

### 2.2 问题分析

| 问题 | 根因 | 影响 |
|------|------|------|
| **缺少乐器** | 未显式指定 guzheng/dizi/erhu 等 | API 可能生成西洋乐器主导 |
| **缺少 pentatonic** | 未强调五声音阶 | 旋律可能偏西方调式 |
| **缺少人声特质** | 未注入 ethereal/transcendent | 人声可能偏流行、不够空灵 |
| **wuxia 与 xianxia 混用** | wuxia 偏武侠，xianxia 偏修仙 | 风格可能不够「仙」 |
| **标签过于抽象** | traditional Chinese 太泛 | API 理解分散 |

### 2.3 古风 vs 古风仙侠 区分不足

- **古风** 当前：`Chinese traditional, gufeng, ancient Chinese ballad, ethereal`
- **古风仙侠** 应更突出：fantasy、epic、cinematic、cultivation theme、otherworldly

---

## 三、优化后的提示词设计

### 3.1 古风仙侠 STYLE_MAP 优化

**原则**：多标签组合、乐器显式、人声特质、氛围明确，全部英文行业标签。

```
tags: gufeng, xianxia, Chinese fantasy epic, pentatonic, guzheng and dizi prominent, 
      ethereal vocals, otherworldly atmosphere, cinematic orchestral, traditional Chinese instruments,
      cultivation theme, wuxia-inspired
climax: epic climax, dramatic chorus, soaring build, powerful crescendo
```

**精简版（避免超长）**：
```
tags: gufeng xianxia, Chinese fantasy epic, pentatonic, guzheng dizi erhu, 
      ethereal transcendent vocals, otherworldly cinematic, traditional Chinese
climax: epic climax, dramatic chorus, powerful build
```

### 3.2 古风 STYLE_MAP 优化（区分仙侠）

```
tags: gufeng, Chinese traditional ballad, pentatonic, ancient Chinese, 
      guzheng pipa dizi, ethereal delicate vocals, melancholic nostalgic
climax: emotional climax, soaring chorus, gentle build
```

### 3.3 默认乐器建议

当用户选择「古风仙侠」时，若未选乐器，可在 buildStyle 中**自动注入**推荐乐器：
- `guzheng, dizi, xiao, traditional Chinese instruments prominent`

（可选实现：在 baseStyle 为古风/古风仙侠且无 instrumentId 时，追加默认乐器片段）

### 3.4 STYLE_ERA_EXTRA_MAP 补充

```ts
"仙侠": "xianxia, Chinese fantasy, cultivation theme, otherworldly",
"修仙": "cultivation theme, xianxia, ethereal",
"仙剑风格": "Chinese Paladin style, gufeng game OST, guzheng dizi",
"剑侠情缘": "wuxia xianxia, Chinese fantasy RPG, epic",
```

### 3.5 人声 Archetype 强化

古风仙侠的 `STYLE_VOCAL_ARCHETYPE_MAP` 已配置：
- 男：deep_baritone
- 女：delicate_female, airy_female

建议在 VOCAL_ARCHETYPE_MAP 中为古风仙侠增加：
- `ethereal_female`: "ethereal, transcendent, otherworldly, airy, xianxia vocal"
- `epic_male`: "deep, resonant, heroic, xianxia male lead"

---

## 四、实施清单

| 序号 | 修改点 | 文件 | 说明 | 状态 |
|------|--------|------|------|------|
| 1 | 古风仙侠 STYLE_MAP | workbenchParams.ts | 注入 pentatonic、乐器、ethereal、otherworldly | ✅ |
| 2 | 古风 STYLE_MAP | workbenchParams.ts | 区分古风与仙侠，补充乐器 | ✅ |
| 3 | STYLE_ERA_EXTRA_MAP | workbenchParams.ts | 补充仙侠、修仙、仙剑风格等 | ✅ |
| 4 | 古风仙侠人声 | workbenchParams.ts | 增加 ethereal_xianxia / epic_xianxia_male | ✅ |
| 5 | 情绪与风格冲突 | workbenchParams.ts | 古风/仙侠时 mood 不注入 indie folk 等西方流派 | ✅ |
| 6 | styleExtra 重复 | workbenchParams.ts | 移除 [StyleExtra] 单独段，已合并入 [Style] | ✅ |

---

## 五、预期效果

- **风格辨识度**：生成的歌曲明显具有古风仙侠的乐器、人声、氛围
- **与古风区分**：古风更抒情雅致，古风仙侠更史诗玄幻
- **API 可理解性**：全部英文标签，Suno 训练数据中常见，易于采纳

---

## 六、参考来源

- Grokipedia: Gufeng music
- SunoPrompt: East Asian Music for AI
- Web search: Chinese xianxia music characteristics, gufeng xianxia Suno AI

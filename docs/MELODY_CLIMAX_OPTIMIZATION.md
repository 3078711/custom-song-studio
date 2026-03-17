# 旋律单一、高潮不突出 — 提示词工程优化

> **问题**：生成的歌曲旋律单一、高潮不突出  
> **依据**：Suno API 文档、HookGenius、Sunoprompt、全网搜索

---

## 一、根因分析

Suno 在**缺乏结构指引**时会循环同一旋律，导致：
- 整首歌能量扁平
- 副歌与主歌无对比
- 缺乏动态变化

---

## 二、优化措施（已实施）

### 2.1 注入防单调标签（style 全局）

在 `workbenchParams.ts` 中新增 `DYNAMIC_CONTRAST_TAGS`，并注入到所有风格的 style：

```
dynamic arrangement, contrasting verses and chorus, building intensity, varied instrumentation
```

**作用**：引导 Suno 在 verse/chorus 间形成对比，避免旋律单调。

### 2.2 歌词无结构标签时追加指令

当用户使用「歌词模式」且歌词中**没有** `[Verse]`、`[Chorus]` 等结构标签时，自动追加：

```
strong chorus, clear song structure
```

**作用**：在无法依赖歌词结构时，通过 style 强调副歌与结构。

### 2.3 补充风格映射（styleExtra）

用户可在「补充风格」中填写：
- **动态变化** → dynamic arrangement, evolving sections, varied instrumentation
- **有层次** → contrasting verses and chorus, building intensity

### 2.4 歌词结构提示优化

- 更新 `LYRIC_STRUCTURE_HINT`：明确结构标签可避免旋律单一
- 无结构标签时的提示：改为「易导致旋律单一、高潮不突出，建议按推荐结构添加」

---

## 三、推荐结构（Suno 官方）

```
[Intro]
[Verse 1]
[Pre-Chorus]
[Chorus]
[Verse 2]
[Chorus]
[Bridge]
[Chorus]
[Outro]
```

- `[Pre-Chorus]`：在副歌前建立张力
- `[Chorus]`：高潮、最饱满、能量最高
- `[Bridge]`：提供对比，避免 verse-chorus 无限循环

---

## 四、模型选择建议

- **V4_5ALL**：描述为「更好的歌曲结构」，适合对结构要求高的创作
- **V5**：当前默认，表现力与生成速度较好

---

## 五、参考来源

-  [HookGenius: Fix Suno Repetition](https://hookgenius.app/learn/fix-suno-repetition/)
- [Sunoprompt: Music Form Guide](https://sunoprompt.com/music-elements/music-form)
- [Suno API 文档](https://docs.sunoapi.org/cn)

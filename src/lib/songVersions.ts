const STORAGE_KEY = "custom-song-studio-song-versions";
const TASKS_KEY = "custom-song-studio-generation-tasks";
const EDIT_TASKS_KEY = "custom-song-studio-edit-tasks";

export type VersionStatus = "draft" | "candidate" | "sent" | "to_revise" | "confirmed" | "rejected" | "final";

export interface SongVersion {
  id: string;
  projectId: string;
  versionNo: string;
  roundNo: number;
  prompt: string;
  /** 纯歌词（不含风格指令），用于展示 */
  lyrics?: string;
  style: string;
  title: string;
  audioUrl?: string;
  coverUrl?: string;
  durationSeconds?: number;
  status: VersionStatus;
  internalComment?: string;
  isCandidate: boolean;
  isSentToCustomer: boolean;
  isFinal: boolean;
  createdAt: string;
  /** Suno taskId，用于获取改编歌词 */
  sunoTaskId?: string;
  /** Suno 音频 ID，用于获取改编歌词 */
  sunoAudioId?: string;
  /** 生成时的创作参数快照，用于查看与分析 */
  creationParams?: Record<string, string | number | boolean | undefined>;
  /** 来源版本 ID（由深度编辑产生时） */
  sourceVersionId?: string;
  /** 由何种编辑能力产生 */
  editCapabilityId?: string;
}

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface GenerationTask {
  id: string;
  projectId: string;
  status: TaskStatus;
  progress: number;
  prompt: string;
  style: string;
  title: string;
  errorMessage?: string;
  /** Suno API 返回的 taskId，用于轮询 */
  sunoTaskId?: string;
  /** 单版本兼容 */
  resultVersionId?: string;
  /** 每次任务生成 2 首歌曲，对应 2 个版本 ID */
  resultVersionIds?: string[];
  /** 生成时的创作参数表单快照，用于点击任务时恢复左侧参数 */
  creationForm?: Record<string, unknown>;
  audioUrl?: string;
  coverUrl?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

function getVersions(): SongVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: SongVersion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
}

function getTasks(): GenerationTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: GenerationTask[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function listVersionsByProject(projectId: string): SongVersion[] {
  return getVersions()
    .filter((v) => v.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/** 所有版本，按创建时间倒序，用于首页最近版本 */
export function listAllVersions(limit?: number): SongVersion[] {
  const list = getVersions().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return limit ? list.slice(0, limit) : list;
}

export function getVersionById(id: string): SongVersion | undefined {
  return getVersions().find((v) => v.id === id);
}

export function createVersion(data: Omit<SongVersion, "id" | "createdAt">): SongVersion {
  const versions = getVersions();
  const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const version: SongVersion = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  versions.push(version);
  saveVersions(versions);
  return version;
}

export function updateVersion(id: string, data: Partial<SongVersion>): SongVersion | null {
  const versions = getVersions();
  const index = versions.findIndex((v) => v.id === id);
  if (index === -1) return null;
  versions[index] = { ...versions[index], ...data };
  saveVersions(versions);
  return versions[index];
}

export function deleteVersion(id: string): boolean {
  const versions = getVersions().filter((v) => v.id !== id);
  if (versions.length === getVersions().length) return false;
  saveVersions(versions);
  return true;
}

export function getNextVersionNo(projectId: string, roundNo: number): string {
  const versions = listVersionsByProject(projectId).filter(
    (v) => v.roundNo === roundNo
  );
  const letters = "ABCDEFGH";
  return `V${roundNo}-${letters[versions.length] || versions.length + 1}`;
}

export function listTasksByProject(projectId: string): GenerationTask[] {
  return getTasks()
    .filter((t) => t.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getTaskById(id: string): GenerationTask | undefined {
  return getTasks().find((t) => t.id === id);
}

export function createTask(
  projectId: string,
  params: { prompt: string; style: string; title: string }
): GenerationTask {
  const tasks = getTasks();
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const task: GenerationTask = {
    id,
    projectId,
    status: "pending",
    progress: 0,
    prompt: params.prompt,
    style: params.style,
    title: params.title,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(
  id: string,
  data: Partial<GenerationTask>
): GenerationTask | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...data };
  saveTasks(tasks);
  return tasks[index];
}

/** 删除任务记录（不影响已生成的版本） */
export function deleteTask(id: string): boolean {
  const tasks = getTasks().filter((t) => t.id !== id);
  if (tasks.length === getTasks().length) return false;
  saveTasks(tasks);
  return true;
}

// ========== 深度编辑任务 ==========
export type EditTaskStatus = "pending" | "running" | "completed" | "failed";

export interface EditTask {
  id: string;
  projectId: string;
  capabilityId: string;
  sourceVersionId: string;
  status: EditTaskStatus;
  progress: number;
  errorMessage?: string;
  sunoTaskId?: string;
  resultVersionIds?: string[];
  /** Persona 生成：返回 personaId */
  personaId?: string;
  personaName?: string;
  /** 人声分离：vocalUrl, instrumentalUrl 等；split_stem 时含多轨 URL */
  stems?: { vocalUrl?: string; instrumentalUrl?: string; [key: string]: string | undefined };
  /** split_stem 分轨的 originData，供生成 MIDI 使用 */
  separationOriginData?: Array<{ id: string; stem_type_group_name?: string }>;
  /** 音乐视频：生成的 MP4 视频 URL */
  videoUrl?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

function getEditTasks(): EditTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EDIT_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEditTasks(tasks: EditTask[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EDIT_TASKS_KEY, JSON.stringify(tasks));
}

export function listEditTasksByProject(projectId: string): EditTask[] {
  return getEditTasks()
    .filter((t) => t.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function createEditTask(data: Omit<EditTask, "id" | "createdAt">): EditTask {
  const tasks = getEditTasks();
  const id = `e_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const task: EditTask = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveEditTasks(tasks);
  return task;
}

export function updateEditTask(id: string, data: Partial<EditTask>): EditTask | null {
  const tasks = getEditTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...data };
  saveEditTasks(tasks);
  return tasks[index];
}

export function getEditTaskById(id: string): EditTask | undefined {
  return getEditTasks().find((t) => t.id === id);
}

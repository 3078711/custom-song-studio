const STORAGE_KEY = "custom-song-studio-projects";

export type ProjectStatus =
  | "pending_communication"   // 待沟通
  | "brief_confirming"       // 需求确认中
  | "creating"               // 创作中
  | "first_version_sent"     // 已发初版
  | "revising"               // 修改中
  | "waiting_confirmation"   // 待确认
  | "waiting_payment"        // 待付款
  | "completed"              // 已完成
  | "closed";                // 已关闭

export type ProjectType = "定制歌曲" | "翻唱" | "纪念曲" | "生日歌" | "表白曲" | "其他";
export type ProjectPriority = "普通" | "加急";

/** 需求 Brief 结构化字段，与工作台参数可映射 */
export interface ProjectBrief {
  stylePreference?: string;      // 风格偏好
  moodScene?: string;            // 情绪/场景
  lyricDirection?: string;        // 歌词方向
  referenceTracks?: string;       // 参考曲目描述（如「某首歌的风格」）
  referenceTrackUrl?: string;    // 参考曲目公网直链（工作台可带入）
  specialRequirements?: string;   // 特殊要求
  freeDescription?: string;      // 自由描述（支持多行）
}

export interface Project {
  id: string;
  customerId: string;
  projectName: string;
  projectType: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  scenario?: string;
  includeVideo: boolean;
  budget?: string;
  targetDeliveryDate?: string;
  summary?: string;
  /** 需求 Brief，用于收集用户需求并与工作台参数映射 */
  brief?: ProjectBrief;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending_communication: "待沟通",
  brief_confirming: "需求确认中",
  creating: "创作中",
  first_version_sent: "已发初版",
  revising: "修改中",
  waiting_confirmation: "待确认",
  waiting_payment: "待付款",
  completed: "已完成",
  closed: "已关闭",
};

export function getStatusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status];
}

function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): Project[] {
  const list = getProjects();
  return list.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProjectById(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function getProjectsByCustomerId(customerId: string): Project[] {
  return getProjects().filter((p) => p.customerId === customerId);
}

export function createProject(
  data: Omit<Project, "id" | "createdAt" | "updatedAt">
): Project {
  const projects = getProjects();
  const now = new Date().toISOString();
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const project: Project = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  saveProjects(projects);
  return project;
}

export function updateProject(
  id: string,
  data: Partial<Project>
): Project | null {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = {
    ...projects[index],
    ...data,
    id: projects[index].id,
    customerId: projects[index].customerId,
    createdAt: projects[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  projects[index] = updated;
  saveProjects(projects);
  return updated;
}

export function deleteProject(id: string): boolean {
  const projects = getProjects().filter((p) => p.id !== id);
  if (projects.length === getProjects().length) return false;
  saveProjects(projects);
  return true;
}

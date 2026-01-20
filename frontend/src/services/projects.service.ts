import type { CreateProjectInput, Project } from '@/types'

const STORAGE_KEY = 'projects_data'

const loadProjects = (): Project[] => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as Project[]
  } catch {
    return []
  }
}

const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

const getNextId = (projects: Project[]): number => {
  return projects.reduce((max, project) => Math.max(max, project.id), 0) + 1
}

const normalizeProject = (input: CreateProjectInput): CreateProjectInput => {
  const links =
    input.links?.filter(link => link.label.trim() || link.url.trim()).map(link => ({
      label: link.label.trim(),
      url: link.url.trim(),
    })) ?? []

  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    links,
  }
}

export const projectsService = {
  getProjects(): Project[] {
    return loadProjects()
  },

  getProject(id: number): Project | undefined {
    return loadProjects().find(project => project.id === id)
  },

  createProject(input: CreateProjectInput): Project {
    const projects = loadProjects()
    const now = new Date().toISOString()
    const normalized = normalizeProject(input)
    const project: Project = {
      id: getNextId(projects),
      name: normalized.name,
      description: normalized.description ?? '',
      phone: normalized.phone ?? '',
      links: normalized.links ?? [],
      created_at: now,
      updated_at: now,
    }
    const next = [...projects, project]
    saveProjects(next)
    return project
  },

  updateProject(id: number, input: CreateProjectInput): Project | null {
    const projects = loadProjects()
    const index = projects.findIndex(project => project.id === id)
    if (index === -1) return null

    const now = new Date().toISOString()
    const normalized = normalizeProject(input)
    const updated: Project = {
      ...projects[index],
      name: normalized.name,
      description: normalized.description ?? '',
      phone: normalized.phone ?? '',
      links: normalized.links ?? [],
      updated_at: now,
    }
    const next = [...projects]
    next[index] = updated
    saveProjects(next)
    return updated
  },

  deleteProject(id: number): void {
    const next = loadProjects().filter(project => project.id !== id)
    saveProjects(next)
  },
}

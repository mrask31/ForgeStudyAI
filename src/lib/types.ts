export type ClassType =
  | 'fundamentals'
  | 'med_surg'
  | 'pharm'
  | 'peds'
  | 'ob'
  | 'psych'
  | 'other'

export interface StudentClass {
  id: string
  userId: string
  code: string
  name: string
  type: ClassType
  startDate?: string
  endDate?: string
  nextExamDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface NotebookTopic {
  id: string
  userId: string
  classId?: string
  title: string
  description?: string
  nclexCategory?: string
  fileIds?: string[]
  lastStudiedAt?: string
  confidence?: number
  createdAt: string
  updatedAt: string
}

export interface ExamPlan {
  id: string
  userId: string
  classId: string
  name: string
  date?: string // Optional date
  topicIds: string[]
  createdAt: string
  updatedAt: string
}


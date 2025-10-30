export interface ModuleInfo {
  name: string;
  career: string;
  university: string;
  workload: string;
  sessionsCount: number;
  sessionDuration: string;
}

export enum ActivityType {
  NONE = 'none', // Added for default selection
  PRESENTATION = 'presentation',
  EXPOSITION = 'exposition',
  DEFINITION = 'definition',
  DISCUSSION = 'discussion',
  BREAK = 'break',
  PRACTICAL_DILEMMAS = 'practical_dilemmas',
  SUMMARY = 'summary',
  PREVIEW = 'preview',
  RECAP = 'recap',
  GROUP_REFLECTION = 'group_reflection',
  CASE_ANALYSIS = 'case_analysis',
  DEBATE = 'debate', // Generic debate
  DATA_PROTECTION_DISCUSSION = 'data_protection_discussion',
  DIGITAL_RESPONSIBILITY = 'digital_responsibility',
  VIOLATION_CASES_PRESENTATION = 'violation_cases_presentation',
  DEONTOLOGICAL_CODES_REVIEW = 'deontological_codes_review',
  PERSONAL_CODE_CREATION = 'personal_code_creation',
  EXAM_REVIEW = 'exam_review',
  PARTIAL_EXAM = 'partial_exam',
  FINAL_EXAM = 'final_exam',
  FEEDBACK_SESSION = 'feedback_session',
  LEGAL_FRAMEWORK_REVIEW = 'legal_framework_review',
  COMPARATIVE_LAW_ANALYSIS = 'comparative_law_analysis',
  STRATEGIC_ETHICS_PLANNING = 'strategic_ethics_planning',
  TRANSFORMATIONAL_LEADERSHIP = 'transformational_leadership',
  DECISION_SIMULATION = 'decision_simulation',
  INNOVATION_ETHICS = 'innovation_ethics',
  TECH_BUSINESS_ETHICS = 'tech_business_ethics',
  ETHICAL_STARTUP_CREATION = 'ethical_startup_creation',
  EMERGING_TECH_FRONTIERS = 'emerging_tech_frontiers',
  AI_ETHICS_ANALYSIS = 'ai_ethics_analysis',
  PRIVACY_CYBERSECURITY_DEBATE = 'privacy_cybersecurity_debate',
  AI_REGULATION_DEBATE = 'ai_regulation_debate',
  EXAM_INSTRUCTIONS = 'exam_instructions',
  MODULE_CLOSURE = 'module_closure',
  ACTIVITY = 'activity' // Generic activity
}

export interface Activity {
  type: ActivityType;
  title: string;
  description?: string;
  details?: string[]; 
  resources?: string[]; 
  forumTopicId?: string;
  submissionType?: 'text' | 'file';
}

export interface SessionBlock {
  timeRange: string;
  title: string;
  activities: Activity[];
}

export interface CourseSession {
  id: string;
  number: number;
  date: string;
  title: string;
  objective: string;
  blocks: SessionBlock[];
  googleMeetLink?: string; // Added Google Meet link
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

// Helper para obtener el nombre completo
export const getUserFullName = (user: User): string => {
  return `${user.first_name} ${user.last_name}`;
};

// Helper para obtener el rol como string
export const getUserRole = (user: User): string => {
  return user.role.name;
};

export interface StudentProgress {
  sessionId: string;
  completedActivities: number;
  totalActivities: number;
}

export interface Submission {
  id: string;
  submittedAt: string; // ISO date string
  status: 'graded' | 'pending' | 'late';
  fileUrl?: string;
  fileName?: string;
  feedback?: string;
  grade?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string; // User-friendly date string e.g., "28/06/25"
  status: 'Pendiente' | 'No Iniciado' | 'Completado';
  submissions: Submission[];
}
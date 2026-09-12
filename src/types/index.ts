// ==========================================
// Scheduler Job - Type Definitions
// ==========================================

// --- User ---
export type UserRole = 'USER' | 'ADMIN';

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED' | 'DELETED';

export interface IUser {
  _id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// --- Company ---
export interface ICompany {
  _id: string;
  userId: string;
  name: string;
  address: string;
  website: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Application ---
export type ApplicationStatus =
  | 'APPLIED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'WAITING_RESULT'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface IApplication {
  _id: string;
  userId: string;
  companyId: string;
  position: string;
  applicationDate: Date;
  status: ApplicationStatus;
  jdText: string;
  jdFileUrl: string;
  jdOriginalFilename: string;
  cvFileUrl: string;
  cvOriginalFilename: string;
  notes: string;
  requiredDocuments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Interview ---
export type InterviewType = 'OFFLINE' | 'ONLINE' | 'PHONE' | 'OTHER';

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'NO_SHOW';

export interface InterviewHistoryEntry {
  type: 'CREATED' | 'RESCHEDULED';
  from: Date | null;
  to: Date;
  reason: string;
  createdAt: Date;
}

export interface IInterview {
  _id: string;
  userId: string;
  applicationId: string;
  companyId: string;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  timezone: string;
  type: InterviewType;
  location: string;
  meetingUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: InterviewStatus;
  notes: string;
  history: InterviewHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Interview Review ---
export type ReviewResult = 'WAITING' | 'PASSED' | 'FAILED' | 'OFFER' | 'WITHDRAWN';

export type SalaryType = 'GROSS' | 'NET' | 'UNKNOWN';

export interface QuestionAsked {
  question: string;
  answerNote: string;
}

export interface Ratings {
  salary: number;
  location: number;
  technology: number;
  careerGrowth: number;
  culture: number;
  benefits: number;
  workLifeBalance: number;
  overall: number;
}

export interface IInterviewReview {
  _id: string;
  userId: string;
  interviewId: string;
  applicationId: string;
  companyId: string;
  result: ReviewResult;
  expectedSalary: number | null;
  salaryDiscussed: number | null;
  companyOffer: number | null;
  currency: string;
  salaryType: SalaryType;
  probationSalary: number | null;
  probationDuration: string;
  benefits: string[];
  advantages: string[];
  disadvantages: string[];
  generalNotes: string;
  questionsAsked: QuestionAsked[];
  answerNotes: string;
  ratings: Ratings;
  createdAt: Date;
  updatedAt: Date;
}

// --- Notification ---
export type NotificationType = 'REMINDER_1DAY' | 'REMINDER_2HOUR' | 'REMINDER_30MIN';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'TELEGRAM' | 'DISCORD';

export interface INotification {
  _id: string;
  userId: string;
  interviewId: string;
  type: NotificationType;
  scheduledAt: Date;
  status: NotificationStatus;
  read: boolean;
  channel: NotificationChannel;
  title: string;
  message: string;
  createdAt: Date;
}

// --- Verification Token ---
export interface IVerificationToken {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// --- Activity ---
export type ActivityType =
  | 'APPLICATION_CREATED'
  | 'INTERVIEW_IMPORTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_RESCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'INTERVIEW_CANCELLED'
  | 'REVIEW_ADDED'
  | 'STATUS_CHANGED';

export interface IActivity {
  _id: string;
  userId: string;
  applicationId: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// --- AI Import ---
export interface AIExtractedData {
  companyName: string | null;
  position: string | null;
  interviewDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  interviewType: InterviewType | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  meetingUrl: string | null;
  originalDateText: string | null;
  interpretedDate: string | null;
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

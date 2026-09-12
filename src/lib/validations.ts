import { z } from 'zod';

// --- Auth ---
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be at most 100 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email address')
      .max(255)
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});

// --- Company ---
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200).trim(),
  address: z.string().max(500).trim().optional().default(''),
  website: z.string().max(500).trim().optional().default(''),
  notes: z.string().max(5000).optional().default(''),
});

export const updateCompanySchema = createCompanySchema.partial();

// --- Application ---
export const createApplicationSchema = z.object({
  companyId: z.string().optional(),
  companyName: z.string().max(200).trim().optional(),
  position: z.string().min(1, 'Position is required').max(200).trim(),
  applicationDate: z.string().optional(),
  status: z
    .enum([
      'APPLIED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEWED',
      'WAITING_RESULT',
      'OFFER',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional()
    .default('APPLIED'),
  jdText: z.string().max(50000).optional().default(''),
  requiredDocuments: z.array(z.string().trim().max(500)).optional().default([]),
  notes: z.string().max(10000).optional().default(''),
});

export const updateApplicationSchema = z.object({
  companyName: z.string().trim().min(1).max(200).optional(),
  position: z.string().min(1).max(200).trim().optional(),
  status: z
    .enum([
      'APPLIED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEWED',
      'WAITING_RESULT',
      'OFFER',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional(),
  jdText: z.string().max(50000).optional(),
  jdFileUrl: z.string().optional(),
  jdOriginalFilename: z.string().max(255).optional(),
  cvFileUrl: z.string().optional(),
  cvOriginalFilename: z.string().max(255).optional(),
  requiredDocuments: z.array(z.string().trim().max(500)).optional(),
  notes: z.string().max(10000).optional(),
});

// --- Interview ---
export const createInterviewSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  scheduledStart: z.string().min(1, 'Start time is required'),
  scheduledEnd: z.string().optional().nullable(),
  timezone: z.string().optional().default('Asia/Ho_Chi_Minh'),
  type: z.enum(['OFFLINE', 'ONLINE', 'PHONE', 'OTHER']).optional().default('OFFLINE'),
  location: z.string().max(500).trim().optional().default(''),
  meetingUrl: z.string().max(500).trim().optional().default(''),
  contactName: z.string().max(100).trim().optional().default(''),
  contactEmail: z.string().max(255).trim().optional().default(''),
  contactPhone: z.string().max(20).trim().optional().default(''),
  notes: z.string().max(10000).optional().default(''),
});

export const updateInterviewSchema = z.object({
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional().nullable(),
  timezone: z.string().optional(),
  type: z.enum(['OFFLINE', 'ONLINE', 'PHONE', 'OTHER']).optional(),
  location: z.string().max(500).trim().optional(),
  meetingUrl: z.string().max(500).trim().optional(),
  contactName: z.string().max(100).trim().optional(),
  contactEmail: z.string().max(255).trim().optional(),
  contactPhone: z.string().max(20).trim().optional(),
  notes: z.string().max(10000).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export const rescheduleInterviewSchema = z.object({
  newStart: z.string().min(1, 'New start time is required'),
  newEnd: z.string().optional().nullable(),
  reason: z.string().max(1000).optional().default(''),
});

// --- Review ---
export const createReviewSchema = z.object({
  interviewId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID').min(1, 'Interview ID is required'),
  applicationId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID').min(1, 'Application ID is required'),
  companyId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID').min(1, 'Company ID is required'),
  result: z.enum(['WAITING', 'PASSED', 'FAILED', 'OFFER', 'WITHDRAWN']).optional().default('WAITING'),
  expectedSalary: z.number().finite().nonnegative('Mức lương không được âm').nullable().optional().default(null),
  salaryDiscussed: z.number().finite().nonnegative('Mức lương không được âm').nullable().optional().default(null),
  companyOffer: z.number().finite().nonnegative('Mức lương không được âm').nullable().optional().default(null),
  currency: z.enum(['VND', 'USD', 'EUR']).optional().default('VND'),
  salaryType: z.enum(['GROSS', 'NET', 'UNKNOWN']).optional().default('UNKNOWN'),
  probationSalary: z.number().min(0).max(100, 'Lương thử việc phải trong khoảng 0–100%').nullable().optional().default(null),
  probationDuration: z.string().optional().default(''),
  benefits: z.array(z.string()).optional().default([]),
  advantages: z.array(z.string()).optional().default([]),
  disadvantages: z.array(z.string()).optional().default([]),
  generalNotes: z.string().max(10000).optional().default(''),
  questionsAsked: z
    .array(
      z.object({
        question: z.string().max(1000),
        answerNote: z.string().max(5000).optional().default(''),
      })
    )
    .optional()
    .default([]),
  answerNotes: z.string().max(10000).optional().default(''),
  ratings: z
    .object({
      salary: z.number().min(0).max(5).optional().default(0),
      location: z.number().min(0).max(5).optional().default(0),
      technology: z.number().min(0).max(5).optional().default(0),
      careerGrowth: z.number().min(0).max(5).optional().default(0),
      culture: z.number().min(0).max(5).optional().default(0),
      benefits: z.number().min(0).max(5).optional().default(0),
      workLifeBalance: z.number().min(0).max(5).optional().default(0),
      overall: z.number().min(0).max(5).optional().default(0),
    })
    .optional()
    .default({}),
});

export const updateReviewSchema = createReviewSchema.partial().omit({
  interviewId: true,
  applicationId: true,
  companyId: true,
});

// --- AI ---
export const aiExtractSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(10000),
});

// --- Admin ---
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type RescheduleInterviewInput = z.infer<typeof rescheduleInterviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type AIExtractInput = z.infer<typeof aiExtractSchema>;

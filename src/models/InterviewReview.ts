import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ReviewResult, SalaryType, QuestionAsked, Ratings } from '@/types';

export interface IInterviewReviewDocument extends Document {
  userId: mongoose.Types.ObjectId;
  interviewId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
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

const QuestionAskedSchema = new Schema(
  {
    question: { type: String, required: true, maxlength: 1000 },
    answerNote: { type: String, default: '', maxlength: 5000 },
  },
  { _id: false }
);

const RatingsSchema = new Schema(
  {
    salary: { type: Number, min: 0, max: 5, default: 0 },
    location: { type: Number, min: 0, max: 5, default: 0 },
    technology: { type: Number, min: 0, max: 5, default: 0 },
    careerGrowth: { type: Number, min: 0, max: 5, default: 0 },
    culture: { type: Number, min: 0, max: 5, default: 0 },
    benefits: { type: Number, min: 0, max: 5, default: 0 },
    workLifeBalance: { type: Number, min: 0, max: 5, default: 0 },
    overall: { type: Number, min: 0, max: 5, default: 0 },
  },
  { _id: false }
);

const InterviewReviewSchema = new Schema<IInterviewReviewDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    result: {
      type: String,
      enum: ['WAITING', 'PASSED', 'FAILED', 'OFFER', 'WITHDRAWN'],
      default: 'WAITING',
    },
    expectedSalary: { type: Number, default: null },
    salaryDiscussed: { type: Number, default: null },
    companyOffer: { type: Number, default: null },
    currency: { type: String, default: 'VND' },
    salaryType: {
      type: String,
      enum: ['GROSS', 'NET', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    probationSalary: { type: Number, default: null },
    probationDuration: { type: String, default: '' },
    benefits: {
      type: [String],
      default: [],
    },
    advantages: {
      type: [String],
      default: [],
    },
    disadvantages: {
      type: [String],
      default: [],
    },
    generalNotes: {
      type: String,
      default: '',
      maxlength: 10000,
    },
    questionsAsked: {
      type: [QuestionAskedSchema],
      default: [],
    },
    answerNotes: {
      type: String,
      default: '',
      maxlength: 10000,
    },
    ratings: {
      type: RatingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InterviewReviewSchema.index({ userId: 1, interviewId: 1 }, { unique: true });
InterviewReviewSchema.index({ userId: 1, companyId: 1 });
InterviewReviewSchema.index({ userId: 1, result: 1 });

const InterviewReview: Model<IInterviewReviewDocument> =
  mongoose.models.InterviewReview ||
  mongoose.model<IInterviewReviewDocument>('InterviewReview', InterviewReviewSchema);

export default InterviewReview;

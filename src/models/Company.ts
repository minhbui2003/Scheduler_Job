import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompanyDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  website: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompanyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    website: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate companies per user
CompanySchema.index({ userId: 1, name: 1 }, { unique: true });

const Company: Model<ICompanyDocument> =
  mongoose.models.Company || mongoose.model<ICompanyDocument>('Company', CompanySchema);

export default Company;

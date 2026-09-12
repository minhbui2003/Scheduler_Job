import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVerificationTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
VerificationTokenSchema.index({ userId: 1 });

const VerificationToken: Model<IVerificationTokenDocument> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationTokenDocument>('VerificationToken', VerificationTokenSchema);

export default VerificationToken;

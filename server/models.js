import mongoose from "mongoose";

const isHttpUrl = (value) => {
  if (!value) return true;
  if (/^\/api\/business-photos\/[a-f\d]{24}$/i.test(value)) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: true }
);

const businessSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    photoUrl: { type: String, trim: true, maxlength: 2048, default: "", validate: isHttpUrl },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    foundedYear: { type: Number, min: 1000, max: 3000, default: null },
    ownerName: { type: String, trim: true, maxlength: 100, default: "" },
    achievements: { type: [String], default: [] },
    workers: {
      type: [{
        name: { type: String, trim: true, maxlength: 100 },
        role: { type: String, trim: true, maxlength: 100 },
      }],
      default: [],
    },
    branches: { type: [branchSchema], default: [] },
    socialLinks: {
      website: { type: String, trim: true, default: "", validate: isHttpUrl },
      instagram: { type: String, trim: true, default: "", validate: isHttpUrl },
      facebook: { type: String, trim: true, default: "", validate: isHttpUrl },
      x: { type: String, trim: true, default: "", validate: isHttpUrl },
      google: { type: String, trim: true, default: "", validate: isHttpUrl },
    },
    products: { type: [String], default: [] },
    collaborationIdeas: { type: [String], default: [] },
    isCollaborationOpen: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

businessSchema.index({ status: 1, isCollaborationOpen: 1, createdAt: -1 });
businessSchema.index({ name: "text", category: "text", description: "text" });

const collaborationRequestSchema = new mongoose.Schema(
  {
    fromBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    toBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  { timestamps: true }
);

const campaignSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    platform: { type: String, enum: ["instagram", "facebook", "x", "google"], required: true },
    scheduledFor: { type: Date, default: null },
    status: { type: String, enum: ["draft", "planned"], default: "draft" },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Business = mongoose.models.Business || mongoose.model("Business", businessSchema);
export const CollaborationRequest =
  mongoose.models.CollaborationRequest ||
  mongoose.model("CollaborationRequest", collaborationRequestSchema);
export const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);

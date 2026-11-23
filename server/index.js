import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import { Business, Campaign, CollaborationRequest, User } from "./models.js";

const app = express();
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const port = Number(process.env.PORT || 3001);
const sessionCookie = "northstar_session";
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Set JWT_SECRET to a random value of at least 32 characters.");
}
if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error("Set FRONTEND_URL to the deployed frontend origin.");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const frontendOrigin = new URL(process.env.FRONTEND_URL || "http://localhost:5173").origin;
app.use(cors({
  origin: frontendOrigin,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again later." },
});

const setSession = (res, user) => {
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: sessionLifetime,
    path: "/",
  });
};

const requireAuth = (req, res, next) => {
  const token = req.cookies[sessionCookie];
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  return next();
};

const getOwnedBusiness = async (businessId, userId) =>
  Business.findOne({ _id: businessId, ownerId: userId });

const getList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
};

const getImageType = (buffer) => {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return { extension: "png", contentType: "image/png" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return { extension: "webp", contentType: "image/webp" };
  return null;
};

const photoBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "businessPhotos" });

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post(
  "/api/uploads/business-photo",
  requireAuth,
  photoUpload.single("image"),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
    const imageType = getImageType(req.file.buffer);
    if (!imageType) {
      return res.status(415).json({ error: "Upload a JPEG, PNG, or WebP image." });
    }
    const fileName = `${crypto.randomUUID()}.${imageType.extension}`;
    const uploadStream = photoBucket().openUploadStream(fileName, {
      metadata: { ownerId: req.session.sub, contentType: imageType.contentType },
    });
    await new Promise((resolve, reject) => {
      uploadStream.once("finish", resolve);
      uploadStream.once("error", reject);
      uploadStream.end(req.file.buffer);
    });
    const photoUrl = `${process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`}/api/business-photos/${uploadStream.id.toString()}`;
    return res.status(201).json({ photoUrl });
  })
);

app.get(
  "/api/business-photos/:id",
  asyncRoute(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).end();
    }
    const bucket = photoBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await bucket.find({ _id: fileId }).next();
    if (!file) return res.status(404).end();
    res.set("Content-Type", file.metadata?.contentType || "application/octet-stream");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "public, max-age=86400");
    return bucket.openDownloadStream(fileId).pipe(res);
  })
);

app.post(
  "/api/auth/signup",
  asyncRoute(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter your name and a valid email address." });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Your password must be between 8 and 128 characters." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
    }
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: adminEmails.has(email) ? "admin" : "user",
    });
    setSession(res, user);
    return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

app.post(
  "/api/auth/login",
  loginLimiter,
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    setSession(res, user);
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

app.get(
  "/api/auth/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.session.sub).select("name email role");
    if (!user) return res.status(401).json({ error: "Account not found. Please sign in again." });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

app.post("/api/auth/logout", (_req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie(sessionCookie, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "strict",
    secure: isProduction,
    path: "/",
  });
  return res.json({ message: "Signed out." });
});

app.get(
  "/api/businesses",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const query = String(req.query.q || "").trim().slice(0, 100);
    const filter = { status: "approved" };
    if (req.query.collaboration === "true") filter.isCollaborationOpen = true;
    if (query) filter.$text = { $search: query };
    const [businesses, total] = await Promise.all([
      Business.find(filter)
        .select("name photoUrl category description foundedYear ownerName branches socialLinks products collaborationIdeas isCollaborationOpen")
        .sort(query ? { score: { $meta: "textScore" }, createdAt: -1 } : { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Business.countDocuments(filter),
    ]);
    return res.json({ businesses, page, limit, total, pageCount: Math.ceil(total / limit) });
  })
);

app.get(
  "/api/businesses/mine",
  requireAuth,
  asyncRoute(async (req, res) => {
    const businesses = await Business.find({ ownerId: req.session.sub }).sort({ createdAt: -1 }).lean();
    return res.json({ businesses });
  })
);

app.post(
  "/api/businesses",
  requireAuth,
  asyncRoute(async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name || name.length > 120) return res.status(400).json({ error: "Business name is required (120 characters max)." });
    const business = await Business.create({
      ownerId: req.session.sub,
      name,
      photoUrl: req.body.photoUrl,
      category: req.body.category,
      description: req.body.description,
      foundedYear: req.body.foundedYear || null,
      ownerName: req.body.ownerName,
      achievements: getList(req.body.achievements),
      workers: Array.isArray(req.body.workers) ? req.body.workers.slice(0, 50) : [],
      branches: Array.isArray(req.body.branches) ? req.body.branches.slice(0, 20) : [],
      socialLinks: req.body.socialLinks || {},
      products: getList(req.body.products),
      collaborationIdeas: getList(req.body.collaborationIdeas),
      isCollaborationOpen: Boolean(req.body.isCollaborationOpen),
    });
    return res.status(201).json({ business });
  })
);

app.put(
  "/api/businesses/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const business = await getOwnedBusiness(req.params.id, req.session.sub);
    if (!business) return res.status(404).json({ error: "Business not found." });
    const editableFields = [
      "name", "photoUrl", "category", "description", "foundedYear", "ownerName",
      "workers", "branches", "socialLinks", "products", "collaborationIdeas", "isCollaborationOpen",
    ];
    for (const field of editableFields) {
      if (Object.hasOwn(req.body, field)) {
        business[field] = ["products", "collaborationIdeas"].includes(field)
          ? getList(req.body[field])
          : req.body[field];
      }
    }
    await business.save();
    return res.json({ business });
  })
);

app.get(
  "/api/businesses/:id",
  asyncRoute(async (req, res) => {
    const business = await Business.findOne({ _id: req.params.id, status: "approved" })
      .select("name photoUrl category description foundedYear ownerName achievements workers branches socialLinks products collaborationIdeas isCollaborationOpen")
      .lean();
    if (!business) return res.status(404).json({ error: "Business not found." });
    return res.json({ business });
  })
);

app.get(
  "/api/collaborations",
  requireAuth,
  asyncRoute(async (req, res) => {
    const owned = await Business.find({ ownerId: req.session.sub }).select("_id").lean();
    const ids = owned.map((business) => business._id);
    const requests = await CollaborationRequest.find({
      $or: [{ fromBusinessId: { $in: ids } }, { toBusinessId: { $in: ids } }],
    })
      .populate("fromBusinessId", "name")
      .populate("toBusinessId", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ requests });
  })
);

app.post(
  "/api/collaborations",
  requireAuth,
  asyncRoute(async (req, res) => {
    const from = await getOwnedBusiness(req.body.fromBusinessId, req.session.sub);
    const to = await Business.findOne({
      _id: req.body.toBusinessId,
      status: "approved",
      isCollaborationOpen: true,
    });
    const message = String(req.body.message || "").trim();
    if (!from) return res.status(403).json({ error: "Choose one of your own businesses to send this request." });
    if (!to || to.ownerId?.toString() === req.session.sub) {
      return res.status(404).json({ error: "That business is not currently accepting collaboration requests." });
    }
    if (!message || message.length > 2000) return res.status(400).json({ error: "Write a message (2,000 characters max)." });
    const request = await CollaborationRequest.create({
      fromBusinessId: from.id,
      toBusinessId: to.id,
      senderId: req.session.sub,
      message,
    });
    return res.status(201).json({ request });
  })
);

app.patch(
  "/api/collaborations/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    if (!["accepted", "declined"].includes(req.body.status)) {
      return res.status(400).json({ error: "Choose accepted or declined." });
    }
    const request = await CollaborationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Collaboration request not found." });
    const recipientBusiness = await getOwnedBusiness(request.toBusinessId, req.session.sub);
    if (!recipientBusiness) return res.status(403).json({ error: "Only the receiving business can respond." });
    request.status = req.body.status;
    await request.save();
    return res.json({ request });
  })
);

app.get(
  "/api/campaigns",
  requireAuth,
  asyncRoute(async (req, res) => {
    const owned = await Business.find({ ownerId: req.session.sub }).select("_id").lean();
    const campaigns = await Campaign.find({ businessId: { $in: owned.map((item) => item._id) } })
      .populate("businessId", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ campaigns });
  })
);

app.post(
  "/api/campaigns",
  requireAuth,
  asyncRoute(async (req, res) => {
    const business = await getOwnedBusiness(req.body.businessId, req.session.sub);
    if (!business) return res.status(403).json({ error: "Choose one of your own businesses." });
    const title = String(req.body.title || "").trim();
    if (!title || title.length > 120) return res.status(400).json({ error: "Campaign title is required (120 characters max)." });
    const campaign = await Campaign.create({
      businessId: business.id,
      title,
      description: req.body.description,
      platform: req.body.platform,
      scheduledFor: req.body.scheduledFor || null,
      status: req.body.scheduledFor ? "planned" : "draft",
    });
    return res.status(201).json({ campaign });
  })
);

app.put(
  "/api/campaigns/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found." });
    if (!(await getOwnedBusiness(campaign.businessId, req.session.sub))) {
      return res.status(403).json({ error: "You cannot edit this campaign." });
    }
    if (Object.hasOwn(req.body, "title")) campaign.title = req.body.title;
    if (Object.hasOwn(req.body, "description")) campaign.description = req.body.description;
    if (Object.hasOwn(req.body, "platform")) campaign.platform = req.body.platform;
    if (Object.hasOwn(req.body, "scheduledFor")) campaign.scheduledFor = req.body.scheduledFor || null;
    campaign.status = campaign.scheduledFor ? "planned" : "draft";
    await campaign.save();
    return res.json({ campaign });
  })
);

app.get(
  "/api/admin/businesses",
  requireAuth,
  requireAdmin,
  asyncRoute(async (req, res) => {
    const status = ["pending", "approved", "rejected"].includes(req.query.status)
      ? req.query.status
      : "pending";
    const businesses = await Business.find({ status }).populate("ownerId", "name email").sort({ createdAt: 1 }).lean();
    return res.json({ businesses });
  })
);

app.patch(
  "/api/admin/businesses/:id",
  requireAuth,
  requireAdmin,
  asyncRoute(async (req, res) => {
    if (!["approved", "rejected"].includes(req.body.status)) {
      return res.status(400).json({ error: "Choose approved or rejected." });
    }
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ error: "Business not found." });
    return res.json({ business });
  })
);

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Images must be 5 MB or smaller."
      : "Choose one image to upload.";
    return res.status(400).json({ error: message });
  }
  if (error?.code === 11000) return res.status(409).json({ error: "That record already exists." });
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "Some information is invalid. Check the form and try again." });
  }
  console.error("API request failed:", error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI in the server environment before starting the API.");
}

await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => {
  console.log(`Northstar API listening on http://localhost:${port}`);
});

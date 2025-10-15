require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const merchantRoutes = require("./routes/merchant");
const userRoutes = require("./routes/user");
const bookingRoutes = require("./routes/bookings");
const uploadRoutes = require("./routes/upload");
const subscriptionRoutes = require("./routes/subscription");
const webhookRoutes = require("./routes/webhook");
const analyticsRoutes = require("./routes/analytics");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"] // Replace with your frontend domain
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Limit each IP
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Webhook routes MUST come before body parser to preserve raw body
// This is required for Stripe webhook signature verification
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/user", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/analytics", analyticsRoutes);

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to DineAhead API",
    version: "1.0.0",
    documentation: "/api/docs", // You can add API documentation later
    endpoints: {
      authentication: "/api/auth",
      merchant: "/api/merchant",
      user: "/api/user",
      bookings: "/api/bookings",
      subscription: "/api/subscription",
      webhook: "/api/webhook",
      analytics: "/api/analytics",
    },
  });
});

// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`DineAhead API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints: http://localhost:${PORT}/`);
});

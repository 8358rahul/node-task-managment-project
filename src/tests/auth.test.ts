import request from "supertest";
import jwt from "jsonwebtoken";
import User from "../models/User";
import app from "../app";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { JWT_SECRET } from "../config/env";

let mongoServer: MongoMemoryServer;
let testUserId: mongoose.Types.ObjectId;
let authToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log("MongoDB URI:", mongoUri);
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Auth API", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    role: "user",
  };

  beforeEach(async () => {
    await User.deleteMany({});
    const user = await User.create({
      ...testUser,
      password: await bcrypt.hash(testUser.password, 10),
    });
    testUserId = user._id;
    authToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  describe("POST /api/v1/auth/register", () => {
    const validPayload = {
      name: "New User",
      email: "new@example.com",
      password: "ValidPass123!",
      role: "user",
    };

    it("should register user with valid data (201)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        token: expect.any(String),
        expiresIn: expect.any(String),
        user: {
          name: validPayload.name,
          email: validPayload.email,
          role: validPayload.role,
          id: expect.any(String),
        },
      });
    });

    it("should reject weak passwords (400)", async () => {
      const weakPasswords = [
        { password: "weak", expectedError: "at least 8 characters" },
        { password: "noUpperCase1", expectedError: "uppercase letter" },
        { password: "NOLOWERCASE1", expectedError: "lowercase letter" },
        { password: "NoNumbersHere", expectedError: "number" },
      ];
      for (const { password, expectedError } of weakPasswords) {
        const res = await request(app)
          .post("/api/v1/auth/register")
          .send({
            ...validPayload,
            password,
          });
        expect(res?.status)?.toBe(400);
        expect(res?.body?.error?.message).toContain(expectedError);
      }
    });

    it("should reject invalid email (400)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...validPayload });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Invalid email");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials (200)", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        token: expect.any(String),
        expiresIn: expect.any(String),
        user: {
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
          id: testUserId.toString(),
        },
      });
    });

    it("should reject empty password (400)", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: "",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Password is required");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return user profile (200)", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        id: testUserId.toString(),
      });
    });
  });
});

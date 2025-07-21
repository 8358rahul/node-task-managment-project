import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import Task from "../models/Task";
import User from "../models/User";
import jwt from "jsonwebtoken";

let mongoServer: MongoMemoryServer;
let authToken: string;
let testUserId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test user and generate token
  const user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });
  testUserId = user._id;
  authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
});

beforeEach(async () => {
  await Task.deleteMany({});
  // Create sample tasks for the test user
  await Task.create([
    {
      title: "Task 1",
      description: "Description 1",
      status: "pending",
      createdBy: testUserId,
    },
    {
      title: "Task 2",
      description: "Description 2",
      status: "completed",
      createdBy: testUserId,
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Task API", () => {
  describe("GET /api/tasks", () => {
    it("should fetch all tasks for authenticated user (200)", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]).toHaveProperty("title", "Task 1");
    });

    it("should apply status filter (200)", async () => {
      const res = await request(app)
        .get("/api/tasks?status=completed")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe("completed");
    });

    it("should return 401 for unauthenticated requests", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should fetch single task (200)", async () => {
      const task = await Task.findOne({ title: "Task 1" });
      const res = await request(app)
        .get(`/api/tasks/${task!._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Task 1");
    });

    it("should return 404 for non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 403 for task owned by another user", async () => {
      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });
      const otherTask = await Task.create({
        title: "Other Task",
        createdBy: otherUser._id,
      });

      const res = await request(app)
        .get(`/api/tasks/${otherTask._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404); // Or 403 depending on your implementation
    });
  });

  describe("POST /api/tasks", () => {
    it("should create new task (201)", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "New Task",
          description: "New Description",
          status: "pending",
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.title).toBe("New Task");
    });

    it("should validate required fields (400)", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "Missing title" });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("title");
    });

    it("should validate status enum (400)", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Invalid Status",
          status: "invalid-status",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("status");
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update task (200)", async () => {
      const task = await Task.findOne({ title: "Task 1" });
      const res = await request(app)
        .put(`/api/tasks/${task!._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "in-progress" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("in-progress");
    });

    it("should return 404 when updating non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated" });

      expect(res.status).toBe(404);
    });

    it("should prevent updating other users tasks (403)", async () => {
      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });
      const otherTask = await Task.create({
        title: "Other Task",
        createdBy: otherUser._id,
      });

      const res = await request(app)
        .put(`/api/tasks/${otherTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(404); // Or 403
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete task (200)", async () => {
      const task = await Task.findOne({ title: "Task 1" });
      const res = await request(app)
        .delete(`/api/tasks/${task!._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(await Task.findById(task!._id)).toBeNull();
    });

    it("should return 404 when deleting non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it("should prevent deleting other users tasks (403)", async () => {
      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });
      const otherTask = await Task.create({
        title: "Other Task",
        createdBy: otherUser._id,
      });

      const res = await request(app)
        .delete(`/api/tasks/${otherTask._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404); // Or 403
    });
  });

  describe("Caching", () => {
    it("should cache GET /api/tasks results", async () => {
      // First request (not cached)
      const firstRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(firstRes.body.fromCache).toBeUndefined();

      // Second request (should be cached)
      const secondRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(secondRes.body.fromCache).toBe(true);
    });

    it("should invalidate cache on task changes", async () => {
      // Prime the cache
      await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      // Make a change
      const task = await Task.findOne({});
      await request(app)
        .put(`/api/tasks/${task!._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated" });

      // Verify cache was invalidated
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.body.fromCache).toBeUndefined();
    });
  });
});

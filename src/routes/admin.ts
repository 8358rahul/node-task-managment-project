import express from "express"; 
import { assignTaskToUser, getAllUsers } from "../controllers/admin";
import { validate } from "../middleware/admin";
import { assignTaskSchema } from "../validations/adminValidation";

const router = express.Router();


router.post("/assign-task",validate(assignTaskSchema), assignTaskToUser);

router.get("/users", getAllUsers);

export default router;

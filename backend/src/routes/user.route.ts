import { Router } from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { clerkWebhookListener, getUserProfile, updateUserProfile, createUser, deleteUser, getAllUsers } from "../controllers/user.controller";

const authRouter = Router();

authRouter.route('/webhook/clerk').post(
  clerkWebhookListener
);

authRouter.route('/profile').get(
  ClerkExpressRequireAuth() as any,
  getUserProfile
);



authRouter.route('/profile/update').post(
  ClerkExpressRequireAuth() as any,
  updateUserProfile
);

authRouter.route('/create').post(
  ClerkExpressRequireAuth() as any,
  createUser
);

authRouter.route('/delete').delete(
  ClerkExpressRequireAuth() as any,
  deleteUser
);

authRouter.route('/getAll').get(
  ClerkExpressRequireAuth() as any,
  getAllUsers
);

export default authRouter;
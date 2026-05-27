import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import bikesRouter from "./bikes";
import salesRouter from "./sales";
import maintenanceRouter from "./maintenance";
import dashboardRouter from "./dashboard";
import snookerRouter from "./snooker";
import ridersRouter from "./riders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(bikesRouter);
router.use(salesRouter);
router.use(maintenanceRouter);
router.use(dashboardRouter);
router.use(snookerRouter);
router.use(ridersRouter);

export default router;

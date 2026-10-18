import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import jobsRouter from "./jobs";
import overviewRouter from "./overview";
import workersRouter from "./workers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(overviewRouter);
router.use(jobsRouter);
router.use(workersRouter);
router.use(applicationsRouter);

export default router;

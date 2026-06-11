import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import participantsRouter from "./participants";
import songsRouter from "./songs";
import queueRouter from "./queue";
import reservationsRouter from "./reservations";
import operatorsRouter from "./operators";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(participantsRouter);
router.use(songsRouter);
router.use(queueRouter);
router.use(reservationsRouter);
router.use(operatorsRouter);

export default router;

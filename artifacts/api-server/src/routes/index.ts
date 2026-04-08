import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import tenantsRouter from "./tenants";
import leasesRouter from "./leases";
import paymentsRouter from "./payments";
import maintenanceRouter from "./maintenance";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(propertiesRouter);
router.use(tenantsRouter);
router.use(leasesRouter);
router.use(paymentsRouter);
router.use(maintenanceRouter);
router.use(usersRouter);
router.use(reportsRouter);

export default router;

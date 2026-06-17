require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectMongo } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));

const categoriesRouter = require("./routes/categories");
const transactionsRouter = require("./routes/transactions");
const debtsRouter = require("./routes/debts");
const dashboardRouter = require("./routes/dashboard");
const remindersRouter = require("./routes/reminders");
const calendarRouter = require("./routes/calendar");
const budgetsRouter = require("./routes/budgets");
const exchangeRatesRouter = require("./routes/exchangeRates");
const authRouter = require("./routes/auth");
const authenticate = require("./middleware/authenticate");
const ensureReady = require("./middleware/ensureReady");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tracker-server" });
});

const apiRouter = express.Router();
apiRouter.use("/auth", ensureReady, authRouter);

const protectedRouter = express.Router();
protectedRouter.use(ensureReady);
protectedRouter.use(authenticate);
protectedRouter.use("/categories", categoriesRouter);
protectedRouter.use("/transactions", transactionsRouter);
protectedRouter.use("/debts", debtsRouter);
protectedRouter.use("/dashboard", dashboardRouter);
protectedRouter.use("/reminders", remindersRouter);
protectedRouter.use("/calendar", calendarRouter);
protectedRouter.use("/budgets", budgetsRouter);
protectedRouter.use("/exchange-rates", exchangeRatesRouter);

apiRouter.use(protectedRouter);

app.use("/api", apiRouter);

async function main() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`API listening on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

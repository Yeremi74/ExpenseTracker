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
const ensureReady = require("./middleware/ensureReady");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tracker-server" });
});

const apiRouter = express.Router();
apiRouter.use(ensureReady);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/debts", debtsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/budgets", budgetsRouter);
apiRouter.use("/exchange-rates", exchangeRatesRouter);

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

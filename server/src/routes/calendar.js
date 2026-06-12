const express = require("express");
const { getDb } = require("../config/database");
const { utcMonthRange } = require("../utils/date");

const router = express.Router();

router.get("/events", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const { start, end } = utcMonthRange(year, month);
    const db = getDb();

    const [reminders, debts] = await Promise.all([
      db
        .collection("reminders")
        .find({ date: { $gte: start, $lte: end } })
        .toArray(),
      db
        .collection("debts")
        .find({
          dueDate: { $gte: start, $lte: end },
          $expr: { $lt: ["$paidAmount", "$totalAmount"] },
        })
        .toArray(),
    ]);

    const events = [
      ...reminders.map((r) => ({
        id: r._id.toString(),
        source: "reminder",
        title: r.title,
        amount: r.amount,
        currency: "ves",
        date: r.date,
        debtId: r.debtId?.toString() ?? null,
        type: r.type,
      })),
      ...debts.map((d) => ({
        id: d._id.toString(),
        source: "debt",
        title: d.name,
        amount: d.totalAmount - d.paidAmount,
        currency: d.currency || "ves",
        date: d.dueDate,
        debtId: d._id.toString(),
        direction: d.direction || "payable",
        installmentNumber: d.installmentNumber ?? null,
        installmentTotal: d.installmentTotal ?? null,
        type: "debt",
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

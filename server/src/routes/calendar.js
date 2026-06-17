const express = require("express");
const { getDb } = require("../config/database");
const { utcMonthRange } = require("../utils/date");
const { withUser } = require("../utils/userScope");

const router = express.Router();

function hasInstallments(debt) {
  return Array.isArray(debt.installments) && debt.installments.length > 0;
}

function debtEventsFromDoc(d, start, end) {
  if (hasInstallments(d)) {
    return d.installments
      .filter((inst) => inst.dueDate >= start && inst.dueDate <= end)
      .map((inst) => {
        const isSettled = (inst.paidAmount || 0) >= inst.amount;
        return {
          id: `${d._id.toString()}-${inst.id.toString()}`,
          source: "debt",
          title: `${d.name} (Cuota ${inst.number}/${d.installments.length})`,
          amount: inst.amount - (inst.paidAmount || 0),
          totalAmount: inst.amount,
          currency: d.currency || "ves",
          date: inst.dueDate,
          debtId: d._id.toString(),
          installmentId: inst.id.toString(),
          direction: d.direction || "payable",
          installmentNumber: inst.number,
          installmentTotal: d.installments.length,
          isSettled,
          type: "debt",
        };
      });
  }

  if (!d.dueDate || d.dueDate < start || d.dueDate > end) return [];

  const isSettled = d.paidAmount >= d.totalAmount;
  return [
    {
      id: d._id.toString(),
      source: "debt",
      title: d.name,
      amount: d.totalAmount - d.paidAmount,
      totalAmount: d.totalAmount,
      currency: d.currency || "ves",
      date: d.dueDate,
      debtId: d._id.toString(),
      direction: d.direction || "payable",
      installmentNumber: d.installmentNumber ?? null,
      installmentTotal: d.installmentTotal ?? null,
      isSettled,
      type: "debt",
    },
  ];
}

router.get("/events", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const { start, end } = utcMonthRange(year, month);
    const db = getDb();
    const userFilter = withUser(req.userId);

    const [reminders, debts] = await Promise.all([
      db
        .collection("reminders")
        .find({ ...userFilter, date: { $gte: start, $lte: end } })
        .toArray(),
      db.collection("debts").find(userFilter).toArray(),
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
      ...debts.flatMap((d) => debtEventsFromDoc(d, start, end)),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

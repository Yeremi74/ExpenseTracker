const express = require("express");
const { getDb } = require("../config/database");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { parseDateInput } = require("../utils/date");
const { withUser } = require("../utils/userScope");

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    const debtId = toObjectId(req.params.debtId);
    if (!debtId) return res.status(400).json({ error: "invalid debtId" });

    const debt = await getDb()
      .collection("debts")
      .findOne(withUser(req.userId, { _id: debtId }));
    if (!debt) return res.status(404).json({ error: "debt not found" });

    const docs = await getDb()
      .collection("debt_payments")
      .find(withUser(req.userId, { debtId }))
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    res.json(
      docs.map((doc) =>
        serializeDoc({
          ...doc,
          debtId: doc.debtId.toString(),
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const debtId = toObjectId(req.params.debtId);
    if (!debtId) return res.status(400).json({ error: "invalid debtId" });

    const { amount, date, note } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be greater than 0" });
    }

    const db = getDb();
    const debt = await db.collection("debts").findOne(withUser(req.userId, { _id: debtId }));
    if (!debt) return res.status(404).json({ error: "debt not found" });

    const paymentAmount = Number(amount);
    const remaining = debt.totalAmount - debt.paidAmount;
    if (paymentAmount > remaining) {
      return res.status(400).json({ error: "payment exceeds remaining debt" });
    }

    const doc = {
      userId: req.userId,
      debtId,
      amount: paymentAmount,
      date: date ? parseDateInput(date) : parseDateInput(new Date().toISOString().slice(0, 10)),
      note: note?.trim() || "",
      createdAt: new Date(),
    };

    const result = await db.collection("debt_payments").insertOne(doc);
    await db.collection("debts").updateOne(
      withUser(req.userId, { _id: debtId }),
      { $inc: { paidAmount: paymentAmount } }
    );

    res.status(201).json(
      serializeDoc({
        _id: result.insertedId,
        ...doc,
        debtId: debtId.toString(),
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:paymentId", async (req, res) => {
  try {
    const debtId = toObjectId(req.params.debtId);
    const paymentId = toObjectId(req.params.paymentId);
    if (!debtId || !paymentId) return res.status(400).json({ error: "invalid id" });

    const db = getDb();
    const payment = await db.collection("debt_payments").findOne(
      withUser(req.userId, { _id: paymentId, debtId })
    );
    if (!payment) return res.status(404).json({ error: "not found" });

    await db.collection("debt_payments").deleteOne(
      withUser(req.userId, { _id: paymentId })
    );
    await db.collection("debts").updateOne(
      withUser(req.userId, { _id: debtId }),
      { $inc: { paidAmount: -payment.amount } }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

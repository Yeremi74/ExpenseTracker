const express = require("express");
const { getDb } = require("../config/database");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { parseDateInput } = require("../utils/date");
const { withUser } = require("../utils/userScope");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const docs = await getDb()
      .collection("reminders")
      .find(withUser(req.userId))
      .sort({ date: 1 })
      .toArray();

    res.json(
      docs.map((doc) =>
        serializeDoc({
          ...doc,
          debtId: doc.debtId?.toString() ?? null,
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, amount, date, debtId, type } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!date) return res.status(400).json({ error: "date is required" });

    const debtObjectId = debtId ? toObjectId(debtId) : null;
    if (debtId && !debtObjectId) {
      return res.status(400).json({ error: "invalid debtId" });
    }

    if (debtObjectId) {
      const debt = await getDb()
        .collection("debts")
        .findOne(withUser(req.userId, { _id: debtObjectId }));
      if (!debt) return res.status(400).json({ error: "debt not found" });
    }

    const doc = {
      userId: req.userId,
      title: title.trim(),
      amount: amount != null ? Number(amount) : null,
      date: parseDateInput(date),
      debtId: debtObjectId,
      type: type === "debt" ? "debt" : "custom",
      createdAt: new Date(),
    };

    const result = await getDb().collection("reminders").insertOne(doc);
    res.status(201).json(
      serializeDoc({
        _id: result.insertedId,
        ...doc,
        debtId: doc.debtId?.toString() ?? null,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const { title, amount, date, debtId, type } = req.body;
    const update = {};

    if (title !== undefined) {
      if (!title?.trim()) return res.status(400).json({ error: "title is required" });
      update.title = title.trim();
    }
    if (amount !== undefined) update.amount = amount != null ? Number(amount) : null;
    if (date !== undefined) update.date = parseDateInput(date);
    if (debtId !== undefined) {
      const debtObjectId = debtId ? toObjectId(debtId) : null;
      if (debtId && !debtObjectId) return res.status(400).json({ error: "invalid debtId" });
      if (debtObjectId) {
        const debt = await getDb()
          .collection("debts")
          .findOne(withUser(req.userId, { _id: debtObjectId }));
        if (!debt) return res.status(400).json({ error: "debt not found" });
      }
      update.debtId = debtObjectId;
    }
    if (type !== undefined) update.type = type === "debt" ? "debt" : "custom";

    const result = await getDb()
      .collection("reminders")
      .findOneAndUpdate(withUser(req.userId, { _id: id }), { $set: update }, { returnDocument: "after" });

    if (!result) return res.status(404).json({ error: "not found" });
    res.json(
      serializeDoc({
        ...result,
        debtId: result.debtId?.toString() ?? null,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const result = await getDb()
      .collection("reminders")
      .deleteOne(withUser(req.userId, { _id: id }));
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

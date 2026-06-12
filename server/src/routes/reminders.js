const express = require("express");
const { getDb } = require("../config/database");
const { toObjectId, serializeDoc } = require("../utils/mongo");
const { parseDateInput } = require("../utils/date");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const docs = await getDb()
      .collection("reminders")
      .find({})
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

    const doc = {
      title: title.trim(),
      amount: amount != null ? Number(amount) : null,
      date: parseDateInput(date),
      debtId: debtId ? toObjectId(debtId) : null,
      type: type === "debt" ? "debt" : "custom",
      createdAt: new Date(),
    };

    if (debtId && !doc.debtId) {
      return res.status(400).json({ error: "invalid debtId" });
    }

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
      update.debtId = debtId ? toObjectId(debtId) : null;
      if (debtId && !update.debtId) return res.status(400).json({ error: "invalid debtId" });
    }
    if (type !== undefined) update.type = type === "debt" ? "debt" : "custom";

    const result = await getDb()
      .collection("reminders")
      .findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });

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

    const result = await getDb().collection("reminders").deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

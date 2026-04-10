const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { sortWishlistWithOpenAI } = require("../services/openaiWishlistSort");

const router = express.Router();

router.post("/sort", requireAuth, async (req, res) => {
  try {
    const { mode, items } = req.body || {};
    if (mode !== "necessity" && mode !== "price") {
      return res.status(400).json({ error: "mode debe ser necessity o price" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "items debe ser un array no vacío" });
    }
    for (const it of items) {
      if (
        !it ||
        typeof it.id !== "string" ||
        typeof it.label !== "string" ||
        !it.id
      ) {
        return res.status(400).json({ error: "Cada ítem necesita id y label" });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
      return res.status(503).json({
        error:
          "OPENAI_API_KEY no está definida en el .env del servidor (carpeta server)",
      });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const order = await sortWishlistWithOpenAI({
      apiKey: String(apiKey).trim(),
      model,
      mode,
      items,
    });

    res.json({ order });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Error al ordenar con OpenAI" });
  }
});

module.exports = router;

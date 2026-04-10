const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function extractBalanced(s, open, close) {
  const start = s.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function parseJsonLoose(text) {
  const trimmed = String(text).trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const chunks = [
    fence ? fence[1].trim() : null,
    trimmed,
    extractBalanced(trimmed, "[", "]"),
    extractBalanced(trimmed, "{", "}"),
  ].filter(Boolean);

  for (const chunk of chunks) {
    try {
      return JSON.parse(chunk);
    } catch (_) {
      /* siguiente */
    }
  }
  return null;
}

function orderIdsFromParsed(parsed) {
  if (parsed == null) return null;

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [];
    if (typeof parsed[0] === "string") return parsed;
    if (parsed[0] && typeof parsed[0] === "object" && typeof parsed[0].id === "string") {
      return parsed.map((x) => x.id);
    }
    return null;
  }

  if (typeof parsed === "object") {
    const o = parsed.order;
    if (Array.isArray(o)) {
      if (o.length === 0) return [];
      if (typeof o[0] === "string") return o;
      if (o[0] && typeof o[0] === "object" && typeof o[0].id === "string") {
        return o.map((x) => x.id);
      }
    }
  }

  return null;
}

function repairOrder(candidateIds, expectedIds) {
  const expSet = new Set(expectedIds);
  const out = [];
  const seen = new Set();
  for (const id of candidateIds) {
    if (typeof id !== "string" || !expSet.has(id) || seen.has(id)) continue;
    out.push(id);
    seen.add(id);
  }
  for (const id of expectedIds) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function validatePermutation(expectedIds, order) {
  if (!Array.isArray(order) || order.length !== expectedIds.length) {
    return false;
  }
  const exp = new Set(expectedIds);
  const seen = new Set();
  for (const id of order) {
    if (typeof id !== "string" || !exp.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return seen.size === exp.size;
}

const PROMPTS = {
  necessity: `Ordena los productos de la MÁS NECESARIA para la vida diaria a la MENOS NECESARIA.
Responde SOLO JSON (sin markdown ni texto). Formatos aceptados:
1) {"order":["uuid1","uuid2",...]} — solo ids en el nuevo orden
2) [{"id":"uuid1","label":"..."},...] — mismos objetos id+label, solo reordenados
Debes incluir exactamente los mismos ids que recibes (ni más ni menos).`,

  price: `Ordena los productos del que estimas MÁS BARATO al MÁS CARO (precio aproximado por nombre).
Responde SOLO JSON (sin markdown ni texto). Formatos aceptados:
1) {"order":["uuid1","uuid2",...]}
2) [{"id":"uuid1","label":"..."},...] — mismos objetos, solo reordenados
Debes incluir exactamente los mismos ids que recibes (ni más ni menos).`,
};

const RETRY_HINT =
  "Repite la respuesta: SOLO JSON, sin markdown ni texto. Forma preferida: {\"order\":[\"id1\",\"id2\",...]} con TODOS los ids (misma cantidad que te envié).";

async function sortWishlistWithOpenAI({ apiKey, model, mode, items }) {
  const expectedIds = items.map((i) => i.id);
  const userPayload = JSON.stringify(
    items.map((i) => ({ id: i.id, label: i.label }))
  );

  const system = PROMPTS[mode];
  if (!system) throw new Error("Modo de ordenación no válido");

  const baseMessages = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Ítems (${expectedIds.length} en total). Ordena todos; conserva cada id exactamente una vez:\n${userPayload}`,
    },
  ];

  let lastContent = "";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const messages =
      attempt === 0
        ? baseMessages
        : [...baseMessages, { role: "user", content: RETRY_HINT }];

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        max_tokens: 16384,
        messages,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data?.error?.message || data?.error || res.statusText || "OpenAI error";
      throw new Error(msg);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Respuesta vacía de OpenAI");
    lastContent = content;

    const parsed = parseJsonLoose(content);
    let rawOrder = orderIdsFromParsed(parsed);

    if (rawOrder == null && parsed && typeof parsed === "object") {
      for (const v of Object.values(parsed)) {
        if (Array.isArray(v)) {
          rawOrder = orderIdsFromParsed(v);
          if (rawOrder != null) break;
        }
      }
    }

    if (rawOrder == null) {
      continue;
    }

    const order = repairOrder(rawOrder, expectedIds);
    if (validatePermutation(expectedIds, order)) {
      return order;
    }
  }

  const snippet = lastContent.slice(0, 200).replace(/\s+/g, " ");
  throw new Error(
    `No se obtuvo un orden válido tras ${maxAttempts} intentos. La IA no devolvió JSON utilizable. (${snippet}…)`
  );
}

module.exports = { sortWishlistWithOpenAI };

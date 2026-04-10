const { MongoClient } = require("mongodb");

let client;
let connected = false;

function mongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !String(uri).trim()) {
    throw new Error(
      "MONGODB_URI no está definida en el archivo .env del servidor (carpeta server)"
    );
  }
  return String(uri).trim();
}

async function connectMongo() {
  if (connected) return client;
  client = new MongoClient(mongoUri());
  await client.connect();
  connected = true;
  return client;
}

function getDb() {
  if (!connected || !client) {
    throw new Error("MongoDB no está conectado; llama a connectMongo() antes.");
  }
  const name = process.env.MONGODB_DB || "tracker";
  return client.db(name);
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    connected = false;
  }
}

module.exports = { connectMongo, getDb, closeMongo };

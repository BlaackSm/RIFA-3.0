const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_PASSWORD = "minhaSenhaSecreta"; // troque para sua senha

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function inicializarRifas(){
  const data = readData();
  data.rifas.forEach(rifa => {
    if (!rifa.cartela || rifa.cartela.length === 0) {
      rifa.cartela = [];
      for (let i = 0; i < 100; i++) {
        rifa.cartela.push({
          numero: i.toString().padStart(2, "0"),
          status: "disponivel", // disponivel | pendente | pago
          comprador: null,
          telefone: null,
          timestamp: null
        });
      }
    }
    if (typeof rifa.valor !== "number") rifa.valor = 3.0;
  });
  writeData(data);
}
inicializarRifas();

/* ROTAS */

app.get("/api/rifas", (req,res) => {
  const data = readData();
  res.json(data.rifas.map(r => ({ nome: r.nome, valor: r.valor })));
});

app.get("/api/rifa/:id", (req,res) => {
  const id = parseInt(req.params.id,10);
  const data = readData();
  if (!data.rifas[id]) return res.status(404).json({ error: "Rifa não encontrada" });
  res.json(data.rifas[id]);
});

app.post("/api/comprar", (req,res) => {
  const { rifaIndex, numeros, nome, telefone } = req.body;
  if (rifaIndex == null || !Array.isArray(numeros) || numeros.length === 0 || !nome || !telefone) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const data = readData();
  const rifa = data.rifas[rifaIndex];
  if (!rifa) return res.status(400).json({ error: "Rifa inválida" });

  const bloqueados = [];
  const marcados = [];
  numeros.forEach(i => {
    const n = rifa.cartela[i];
    if (!n) return;
    if (n.status !== "disponivel") bloqueados.push(n.numero);
    else {
      n.status = "pendente";
      n.comprador = nome;
      n.telefone = telefone;
      n.timestamp = Date.now();
      marcados.push(n.numero);
    }
  });

  writeData(data);
  res.json({ success: true, marcados, bloqueados });
});

app.post("/api/pago", (req,res) => {
  const { rifaIndex, numeros } = req.body;
  if (rifaIndex == null || !Array.isArray(numeros)) return res.status(400).json({ error: "Dados inválidos" });
  const data = readData();
  const rifa = data.rifas[rifaIndex];
  numeros.forEach(i => {
    if (rifa.cartela[i] && rifa.cartela[i].status === "pendente") {
      rifa.cartela[i].status = "pago";
      rifa.cartela[i].timestamp = null;
    }
  });
  writeData(data);
  res.json({ success: true });
});

app.post("/api/cancelar", (req,res) => {
  const { rifaIndex, numeros } = req.body;
  if (rifaIndex == null || !Array.isArray(numeros)) return res.status(400).json({ error: "Dados inválidos" });
  const data = readData();
  const rifa = data.rifas[rifaIndex];
  numeros.forEach(i => {
    if (rifa.cartela[i]) {
      rifa.cartela[i].status = "disponivel";
      rifa.cartela[i].comprador = null;
      rifa.cartela[i].telefone = null;
      rifa.cartela[i].timestamp = null;
    }
  });
  writeData(data);
  res.json({ success: true });
});

app.post("/api/login", (req,res) => {
  const { senha } = req.body;
  if (senha === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false, error: "Senha incorreta" });
});

setInterval(() => {
  const data = readData();
  const now = Date.now();
  const TTL = 24 * 60 * 60 * 1000;
  let changed = false;
  data.rifas.forEach(rifa => {
    rifa.cartela.forEach(n => {
      if (n.status === "pendente" && n.timestamp && (now - n.timestamp > TTL)) {
        n.status = "disponivel";
        n.comprador = null;
        n.telefone = null;
        n.timestamp = null;
        changed = true;
      }
    });
  });
  if (changed) writeData(data);
}, 60 * 1000);

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));

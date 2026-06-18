// server.js — Servidor principal da aplicação

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");
const { enviarTicket } = require("./email");

const app = express();
const PORTA = process.env.PORT || 3000;

const SENHA_OPERADOR = process.env.SENHA_OPERADOR || "pankeka67";

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ─── PEDIDOS NORMAIS ──────────────────────────────────────────────────────────

// POST /api/pedidos — Cria pedido normal
app.post("/api/pedidos", async (req, res) => {
  const { nome, email, itens } = req.body;

  if (!nome || !email || !itens || itens.length === 0) {
    return res.status(400).json({ erro: "Campos obrigatórios: nome, email e pelo menos um item." });
  }

  let pedido;
  try {
    pedido = db.criarPedido({ nome, email, itens });
    console.log(`📦 Novo pedido criado: ${pedido.ticketNumero} — ${nome}`);
  } catch (erro) {
    // ✅ Erro separado: falha ao salvar no banco
    console.error("Erro ao criar pedido no banco:", erro);
    return res.status(500).json({ erro: "Erro interno ao criar o pedido." });
  }

  // ✅ E-mail separado: falha no e-mail NÃO cancela o pedido
  let emailEnviado = false;
  try {
    const resultadoEmail = await enviarTicket(pedido);
    emailEnviado = resultadoEmail.sucesso;
  } catch (erro) {
    console.error("Erro ao enviar e-mail (pedido já salvo):", erro);
  }

  res.status(201).json({ mensagem: "Pedido criado com sucesso!", pedido, emailEnviado });
});

// GET /api/pedidos — Lista todos os pedidos
app.get("/api/pedidos", (req, res) => {
  try {
    const pedidos = db.listarPedidos();
    res.json(pedidos);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar pedidos." });
  }
});

// PATCH /api/pedidos/:ticket/item
app.patch("/api/pedidos/:ticket/item", (req, res) => {
  const { ticket } = req.params;
  const { item } = req.body;
  if (!item) return res.status(400).json({ erro: "Informe o item a finalizar." });

  const pedido = db.finalizarItem(ticket, item);
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

  res.json({ mensagem: "Item atualizado.", pedido });
});

// PATCH /api/pedidos/:ticket/finalizar
app.patch("/api/pedidos/:ticket/finalizar", (req, res) => {
  const { ticket } = req.params;
  const pedido = db.finalizarPedido(ticket);
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

  console.log(`✅ Pedido finalizado: ${ticket}`);
  res.json({ mensagem: "Pedido finalizado com sucesso!", pedido });
});


// ─── PRÉ-VENDA HOT DOG ────────────────────────────────────────────────────────

// GET /api/prevenda/status — informa se a pré-venda está aberta
app.get("/api/prevenda/status", (req, res) => {
  res.json({ ativa: db.isPrevendaAtiva() });
});

// POST /api/prevenda — Cria pré-venda de hot dog
app.post("/api/prevenda", async (req, res) => {
  if (!db.isPrevendaAtiva()) {
    return res.status(403).json({ erro: "Pré-venda encerrada no momento." });
  }

  const { nome, email, hotdogCompleto, quantidade, adicionais } = req.body;
  const qtd = Math.max(1, parseInt(quantidade) || 1);

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });
  }
  if (!hotdogCompleto && !adicionais?.cheddar && !adicionais?.bacon) {
    return res.status(400).json({ erro: "Selecione ao menos um item." });
  }

  const itens = [];
  let total = 0;

  if (hotdogCompleto) {
    const label = qtd > 1 ? `Hot Dog Completo x${qtd}` : "Hot Dog Completo";
    itens.push(label);
    total += 15 * qtd;
  }
  if (adicionais?.cheddar) { itens.push("+Cheddar"); total += 1 * qtd; }
  if (adicionais?.bacon)   { itens.push("+Bacon");   total += 1 * qtd; }

  let pedido;
  try {
    pedido = db.criarPrevendaHotdog({ nome, email, itens, total });
    console.log(`🌭 Pré-venda criada: ${pedido.ticketNumero} — ${nome} — R$${total}`);
  } catch (erro) {
    // ✅ Erro separado: falha ao salvar no banco
    console.error("Erro ao criar pré-venda no banco:", erro);
    return res.status(500).json({ erro: "Erro interno ao criar a pré-venda." });
  }

  // ✅ E-mail separado: falha no e-mail NÃO cancela a pré-venda
  let emailEnviado = false;
  try {
    const resultadoEmail = await enviarTicket({ ...pedido, total });
    emailEnviado = resultadoEmail.sucesso;
  } catch (erro) {
    console.error("Erro ao enviar e-mail (pré-venda já salva):", erro);
  }

  res.status(201).json({ mensagem: "Pré-venda confirmada!", pedido, emailEnviado });
});


// ─── OPERADOR ────────────────────────────────────────────────────────────────

// POST /api/operador/login — verifica senha
app.post("/api/operador/login", (req, res) => {
  const { senha } = req.body;
  if (senha === SENHA_OPERADOR) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, erro: "Senha incorreta." });
  }
});

// PATCH /api/operador/prevenda — ativa ou desativa pré-venda
app.patch("/api/operador/prevenda", (req, res) => {
  const { senha, ativa } = req.body;
  if (senha !== SENHA_OPERADOR) {
    return res.status(401).json({ erro: "Não autorizado." });
  }
  db.setConfig("prevenda_ativa", ativa ? "true" : "false");
  console.log(`🔧 Pré-venda ${ativa ? "ATIVADA" : "DESATIVADA"} pelo operador`);
  res.json({ mensagem: `Pré-venda ${ativa ? "ativada" : "desativada"}.`, ativa });
});


// ─── INICIAR ──────────────────────────────────────────────────────────────────
app.listen(PORTA, () => {
  console.log(`🎪 Servidor rodando em http://localhost:${PORTA}`);
  console.log(`📋 Painel: http://localhost:${PORTA}/painel.html`);
  console.log(`🔑 Senha operador: ${SENHA_OPERADOR}`);
});
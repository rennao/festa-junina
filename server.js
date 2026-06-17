// server.js — Servidor principal da aplicação
// Express é um framework web minimalista para Node.js. Ele recebe as requisições
// do frontend (HTML), processa, salva no banco e responde com JSON.

const express = require("express");
const cors = require("cors");
const path = require("path");

// Importa os módulos que criamos
const db = require("./db");
const { enviarTicket } = require("./email");

const app = express();
const PORTA = process.env.PORT || 3000;

// ─── MIDDLEWARES ────────────────────────────────────────────────────────────
// Middlewares são funções que rodam antes das rotas processar a requisição.

// cors(): permite que o frontend (mesmo em outro domínio/porta) acesse o backend
app.use(cors());

// express.json(): interpreta o corpo das requisições como JSON automaticamente
app.use(express.json());

// express.static(): serve os arquivos HTML/CSS/JS da pasta "public" como site estático
// Quando alguém acessa http://localhost:3000/, o Express devolve o index.html
app.use(express.static(path.join(__dirname, "public")));


// ─── ROTAS DA API ────────────────────────────────────────────────────────────
// Rotas são os "endereços" que o frontend chama. Todas começam com /api/

// POST /api/pedidos — Cria um novo pedido e envia o ticket por e-mail
// O frontend manda: { nome, email, itens: ["item1", "item2"] }
app.post("/api/pedidos", async (req, res) => {
  const { nome, email, itens } = req.body;

  // Validação básica: todos os campos são obrigatórios
  if (!nome || !email || !itens || itens.length === 0) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome, email e pelo menos um item.",
    });
  }

  try {
    // 1. Salva o pedido no banco JSON e gera o número do ticket
    const pedido = db.criarPedido({ nome, email, itens });
    console.log(`📦 Novo pedido criado: ${pedido.ticketNumero} — ${nome}`);

    // 2. Tenta enviar o e-mail com o ticket (não bloqueia se falhar)
    const resultadoEmail = await enviarTicket(pedido);

    // 3. Responde ao frontend com o pedido criado + status do e-mail
    res.status(201).json({
      mensagem: "Pedido criado com sucesso!",
      pedido,
      emailEnviado: resultadoEmail.sucesso,
    });
  } catch (erro) {
    console.error("Erro ao criar pedido:", erro);
    res.status(500).json({ erro: "Erro interno ao criar o pedido." });
  }
});


// GET /api/pedidos — Lista todos os pedidos (usado pelo painel de pré-venda)
app.get("/api/pedidos", (req, res) => {
  try {
    const pedidos = db.listarPedidos();
    res.json(pedidos);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar pedidos." });
  }
});


// PATCH /api/pedidos/:ticket/item — Marca um item individual como feito (checkbox)
// O frontend manda: { item: "nome do item" }
// :ticket é um parâmetro dinâmico na URL, ex: /api/pedidos/FJ-0001/item
app.patch("/api/pedidos/:ticket/item", (req, res) => {
  const { ticket } = req.params; // pega o ticket da URL
  const { item } = req.body;     // pega o item do corpo JSON

  if (!item) {
    return res.status(400).json({ erro: "Informe o item a finalizar." });
  }

  const pedido = db.finalizarItem(ticket, item);

  if (!pedido) {
    return res.status(404).json({ erro: "Pedido não encontrado." });
  }

  res.json({ mensagem: "Item atualizado.", pedido });
});


// PATCH /api/pedidos/:ticket/finalizar — Finaliza o pedido inteiro (botão "Finalizar")
app.patch("/api/pedidos/:ticket/finalizar", (req, res) => {
  const { ticket } = req.params;
  const pedido = db.finalizarPedido(ticket);

  if (!pedido) {
    return res.status(404).json({ erro: "Pedido não encontrado." });
  }

  console.log(`✅ Pedido finalizado: ${ticket}`);
  res.json({ mensagem: "Pedido finalizado com sucesso!", pedido });
});


// ─── INICIAR SERVIDOR ────────────────────────────────────────────────────────
app.listen(PORTA, () => {
  console.log(`🎪 Servidor rodando em http://localhost:${PORTA}`);
  console.log(`📋 Painel de pedidos: http://localhost:${PORTA}/painel.html`);
});

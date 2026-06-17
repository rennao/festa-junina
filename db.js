// db.js — Camada de acesso ao banco de dados (SQLite via better-sqlite3)
// Substitui o banco JSON por SQLite, que é mais robusto e não perde dados
// ao reiniciar o servidor. A API exportada é idêntica à versão anterior,
// então o server.js não precisa de nenhuma alteração.
//
// Instalação: npm install better-sqlite3
//
// No Railway: crie um Volume montado em /data
// O banco ficará em /data/db.sqlite (persistente entre deploys)
// Localmente: ficará em ./data/db.sqlite (pasta data do projeto)

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ─── CAMINHO DO BANCO ────────────────────────────────────────────────────────
// Em produção no Railway usa o Volume persistente em /data
// Localmente usa a pasta "data" do próprio projeto
const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
const DB_DIR = isRailway ? "/data" : path.join(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "db.sqlite");

// Garante que a pasta existe (importante para ambiente local)
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Abre (ou cria) o banco SQLite
const db = new Database(DB_PATH);

// ─── CONFIGURAÇÃO INICIAL ────────────────────────────────────────────────────
// WAL mode: melhora performance em leitura/escrita simultânea
db.pragma("journal_mode = WAL");

// Cria as tabelas se ainda não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS contador (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    valor INTEGER NOT NULL DEFAULT 0
  );

  -- Garante que sempre existe exatamente uma linha no contador
  INSERT OR IGNORE INTO contador (id, valor) VALUES (1, 0);

  CREATE TABLE IF NOT EXISTS pedidos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_numero    TEXT NOT NULL UNIQUE,   -- Ex: FJ-0001
    nome             TEXT NOT NULL,
    email            TEXT NOT NULL,
    itens            TEXT NOT NULL,          -- JSON: ["Espetinho", "Quentão"]
    itens_finalizados TEXT NOT NULL DEFAULT '[]', -- JSON: subconjunto de itens
    status           TEXT NOT NULL DEFAULT 'pendente', -- pendente | finalizado
    criado_em        TEXT NOT NULL
  );
`);

// ─── HELPERS INTERNOS ────────────────────────────────────────────────────────
// SQLite não tem tipo Array nativo — guardamos arrays como JSON string
function parsePedido(row) {
  if (!row) return null;
  return {
    id:               row.id,
    ticketNumero:     row.ticket_numero,
    nome:             row.nome,
    email:            row.email,
    itens:            JSON.parse(row.itens),
    itensFinalizados: JSON.parse(row.itens_finalizados),
    status:           row.status,
    criadoEm:         row.criado_em,
  };
}

// ─── FUNÇÕES EXPORTADAS ───────────────────────────────────────────────────────
// Mesma assinatura da versão JSON — server.js não precisa mudar nada

// Cria um pedido novo e retorna ele com o número de ticket gerado
function criarPedido({ nome, email, itens }) {
  // Incrementa o contador atomicamente e pega o novo valor
  db.prepare("UPDATE contador SET valor = valor + 1 WHERE id = 1").run();
  const { valor: numeroTicket } = db.prepare("SELECT valor FROM contador WHERE id = 1").get();

  const ticketNumero = `FJ-${String(numeroTicket).padStart(4, "0")}`; // Ex: FJ-0001
  const criadoEm = new Date().toISOString();

  db.prepare(`
    INSERT INTO pedidos (ticket_numero, nome, email, itens, itens_finalizados, status, criado_em)
    VALUES (?, ?, ?, ?, ?, 'pendente', ?)
  `).run(ticketNumero, nome, email, JSON.stringify(itens), "[]", criadoEm);

  // Retorna o objeto no mesmo formato que o server.js espera
  return {
    id:               numeroTicket,
    ticketNumero,
    nome,
    email,
    itens,
    itensFinalizados: [],
    status:           "pendente",
    criadoEm,
  };
}

// Retorna todos os pedidos (para o painel e aba de antecipados)
function listarPedidos() {
  const rows = db.prepare("SELECT * FROM pedidos ORDER BY id ASC").all();
  return rows.map(parsePedido);
}

// Marca um item individual como finalizado dentro de um pedido
function finalizarItem(ticketNumero, item) {
  const row = db.prepare("SELECT * FROM pedidos WHERE ticket_numero = ?").get(ticketNumero);
  if (!row) return null;

  const pedido = parsePedido(row);

  // Adiciona o item aos finalizados se ainda não estiver
  if (!pedido.itensFinalizados.includes(item)) {
    pedido.itensFinalizados.push(item);
  }

  // Se todos os itens foram finalizados, muda o status do pedido
  if (pedido.itensFinalizados.length >= pedido.itens.length) {
    pedido.status = "finalizado";
  }

  db.prepare(`
    UPDATE pedidos
    SET itens_finalizados = ?, status = ?
    WHERE ticket_numero = ?
  `).run(JSON.stringify(pedido.itensFinalizados), pedido.status, ticketNumero);

  return pedido;
}

// Finaliza o pedido inteiro de uma vez (botão "Finalizar Pedido")
function finalizarPedido(ticketNumero) {
  const row = db.prepare("SELECT * FROM pedidos WHERE ticket_numero = ?").get(ticketNumero);
  if (!row) return null;

  const pedido = parsePedido(row);
  pedido.itensFinalizados = [...pedido.itens]; // marca todos como feitos
  pedido.status = "finalizado";

  db.prepare(`
    UPDATE pedidos
    SET itens_finalizados = ?, status = 'finalizado'
    WHERE ticket_numero = ?
  `).run(JSON.stringify(pedido.itensFinalizados), ticketNumero);

  return pedido;
}

module.exports = { criarPedido, listarPedidos, finalizarItem, finalizarPedido };
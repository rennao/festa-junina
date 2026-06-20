# Festa Junina — Sistema de Pedidos

Sistema web criado para resolver um problema real de uma barraca de festa junina: parar de anotar pedido em papel. O cliente faz o pedido pelo celular e recebe um ticket; quem está na cozinha acompanha tudo organizado em um painel.

Foi também o projeto onde aprendi Railway na prática

## Stack

- **Backend:** Node.js, Express
- **Banco de dados:** SQLite (`better-sqlite3`)
- **E-mail:** Nodemailer (Gmail)(não operante)
- **Frontend:** HTML, CSS e JavaScript puro

## Funcionalidades

- Pedido normal e pré-venda de um item específico, com ticket gerado automaticamente (`FJ-0001`, `PV-0001`).
- Campo de observações por pedido.
- Confirmação automática por e-mail(não funcional
- Painel administrativo com login: fila de produção, histórico, sorteio entre participantes da pré-venda e modo de edição para ocultar pedidos (ex: não pagamento) sem apagar do banco.

## Como rodar

```bash
npm install
```

Crie um `.env` na raiz:
```
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=senha_de_app_do_gmail
SENHA_OPERADOR=defina_uma_senha_aqui
PORT=3000
```

`EMAIL_PASS` precisa ser uma Senha de App do Google (não a senha normal da conta) — gere em [myaccount.google.com/security](https://myaccount.google.com/security), com verificação em duas etapas ativada.

```bash
npm start
```

- Página de compra: `http://localhost:3000/`
- Painel administrativo: `http://localhost:3000/painel.html`

- contato:
- E-mail: rennerfag@gmail.com
- Discord: blinbas

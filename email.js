const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER || "rennerfag@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "SUA_SENHA_DE_APP_AQUI"; // ← gere uma nova

function criarTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

// ... montarHTMLTicket permanece igual ...

async function enviarTicket(pedido) {
  const transporter = criarTransporter();

  const opcoes = {
    from: `"Festa Junina 🎪" <${EMAIL_USER}>`, // ✅ Agora usa a mesma variável
    to: pedido.email,
    subject: `Seu ticket ${pedido.ticketNumero} — Festa Junina`,
    html: montarHTMLTicket(pedido),
  };

  try {
    const info = await transporter.sendMail(opcoes);
    console.log(`✅ E-mail enviado para ${pedido.email} — ID: ${info.messageId}`);
    return { sucesso: true, messageId: info.messageId };
  } catch (erro) {
    console.error("❌ Erro ao enviar e-mail:", erro.message);
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = { enviarTicket };

// email.js — Responsável por montar e enviar o e-mail do ticket ao comprador usando RESEND
const { Resend } = require("resend");

// Nova variável de ambiente para o Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY não configurada nas variáveis de ambiente!");
}

// Inicializa o cliente do Resend
const resend = new Resend(RESEND_API_KEY);

// Mantém exatamente a sua lógica original de construção do HTML
function montarHTMLTicket(pedido) {
  let itensArray = pedido.itens;
  if (!Array.isArray(itensArray)) {
    try {
      const parsed = typeof itensArray === "string" ? JSON.parse(itensArray) : itensArray;
      itensArray = parsed.itens || [];
    } catch (_) {
      itensArray = [];
    }
  }

  const itensHTML = itensArray
    .map((item) => `<li style="padding: 4px 0;">${item}</li>`)
    .join("");

  const linhaTotal =
    pedido.total != null
      ? `<p style="font-size: 16px;"><strong>Total:</strong> <span style="color: #e67e22;">R$ ${Number(pedido.total).toFixed(2)}</span></p>`
      : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 2px solid #e67e22; border-radius: 8px; overflow: hidden;">
      <div style="background: #e67e22; color: white; padding: 16px 24px;">
        <h1 style="margin: 0; font-size: 22px;">🎪 Festa Junina — Ticket de Compra</h1>
      </div>
      <div style="padding: 24px;">
        <p><strong>Nome:</strong> ${pedido.nome}</p>
        <p><strong>E-mail:</strong> ${pedido.email}</p>
        <p style="font-size: 20px;"><strong>Número do Ticket:</strong>
          <span style="color: #e67e22; font-weight: bold;">${pedido.ticketNumero}</span>
        </p>
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p><strong>Itens do Pedido:</strong></p>
        <ul style="padding-left: 20px; color: #333;">
          ${itensHTML}
        </ul>
        ${linhaTotal}
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #888; font-size: 13px;">Pedido realizado em: ${new Date(pedido.criadoEm).toLocaleString("pt-BR")}</p>
        <p style="color: #888; font-size: 13px;">Guarde este e-mail! Apresente o número <strong>${pedido.ticketNumero}</strong> na hora de retirar seu pedido.</p>
      </div>
    </div>
  `;
}

// Função principal adaptada para a API do Resend
async function enviarTicket(pedido) {
  if (!pedido.email || !pedido.ticketNumero || !pedido.itens) {
    console.error("❌ Dados do pedido incompletos para envio de e-mail.");
    return { sucesso: false, erro: "Dados do pedido incompletos." };
  }

  try {
    // Importante: A conta gratuita do Resend exige enviar a partir de 'onboarding@resend.dev'
    const { data, error } = await resend.emails.send({
      from: "Festa Junina 🎪 <onboarding@resend.dev>",
      to: [pedido.email],
      subject: `Seu ticket ${pedido.ticketNumero} — Festa Junina`,
      html: montarHTMLTicket(pedido),
    });

    if (error) {
      console.error("❌ Erro retornado pelo Resend:", error.message || error);
      return { sucesso: false, erro: error.message };
    }

    console.log(`✅ E-mail enviado para ${pedido.email} — ID: ${data.id}`);
    return { sucesso: true, messageId: data.id };
  } catch (erro) {
    console.error("❌ Erro ao enviar e-mail:", erro.message);
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = { enviarTicket };

export async function handler(event) {
  const token = event.headers.authorization;

  // Lista dei token validi (puoi anche leggerli da variabili d'ambiente come sotto)
  const validTokens = [
    process.env.SUPPLIER_TOKEN_1_NLG,
    process.env.SUPPLIER_TOKEN_2_ALIDAUNIA,
    process.env.SUPPLIER_TOKEN_3_NAVITREMITI,
    process.env.SUPPLIER_TOKEN_4_GSTRAVEL,
    process.env.SUPPLIER_TOKEN_5_UTENTE_PRIVATO,
  ].filter(Boolean); // rimuove eventuali undefined
  if (validTokens.includes(token)) {
    return {
      isAuthorized: true,
      context: { user: "internal" }, // puoi cambiare il contesto se vuoi distinguere i supplier
    };
  }

  return { isAuthorized: false };
}
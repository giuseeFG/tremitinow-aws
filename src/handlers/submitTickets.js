import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const QUEUE_URL = process.env.MAIN_QUEUE_URL;
const INPUT_DLQ_URL = process.env.INPUT_DLQ_URL;

// Mappa dinamica token → supplier
const SUPPLIER_TOKENS = {
  [process.env.SUPPLIER_TOKEN_1_NLG]: 1,
  [process.env.SUPPLIER_TOKEN_2_ALIDAUNIA]: 2,
  [process.env.SUPPLIER_TOKEN_3_NAVITREMITI]: 3,
  [process.env.SUPPLIER_TOKEN_4_GSTRAVEL]: 4,
  [process.env.SUPPLIER_TOKEN_5_UTENTE_PRIVATO]: 5,
};

export const handler = async (event) => {
  console.log(event)
  if (!QUEUE_URL) {
    console.error('QUEUE_URL non è definito nelle variabili d\'ambiente.');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Errore di configurazione: URL della coda non trovato.' }),
    };
  }

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;

    if (!authHeader || !(authHeader in SUPPLIER_TOKENS)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Autorizzazione non valida o assente.' }),
      };
    }

    const supplier = SUPPLIER_TOKENS[authHeader];
    const payload = JSON.parse(event.body);

    // Controlla solo i campi obbligatori (escluso supplier ed exemption)
    const requiredFields = ['date', 'number'];
    const missingFields = requiredFields.filter((field) => !(field in payload));

    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Campi mancanti: ${missingFields.join(', ')}` }),
      };
    }

    // Valida exemption se presente
    if (payload.exemption !== undefined && (!Number.isInteger(payload.exemption) || payload.exemption < 2 || payload.exemption > 12)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Campo exemption deve essere un intero tra 2 e 12' }),
      };
    }

    payload.supplier = supplier;
    payload.created_at = new Date().toISOString();

    try {
      // Tentativo di invio alla coda principale
      await sqs.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(payload),
      }));

      console.log('Messaggio inserito in coda con successo.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Messaggio in coda con successo!' }),
      };
    } catch (sqsError) {
      // FALLBACK: Se la coda principale fallisce, invia alla Input DLQ per retry
      console.warn('🚨 Fallimento coda principale, fallback a Input DLQ:', sqsError.message);
      
      if (INPUT_DLQ_URL) {
        try {
          await sqs.send(new SendMessageCommand({
            QueueUrl: INPUT_DLQ_URL,
            MessageBody: JSON.stringify({
              ...payload,
              originalError: sqsError.message,
              retryAttempt: 0,
              failedAt: new Date().toISOString()
            }),
          }));

          console.log('📨 Ticket salvato in Input DLQ per retry successivo.');
          return {
            statusCode: 202, // Accepted - sarà processato dopo
            body: JSON.stringify({ 
              message: 'Ticket accettato e scheduled per retry',
              status: 'queued_for_retry'
            }),
          };
        } catch (dlqError) {
          console.error('❌ Fallimento anche Input DLQ:', dlqError.message);
          throw sqsError; // Rethrow errore originale
        }
      } else {
        throw sqsError; // Nessuna DLQ configurata
      }
    }
  } catch (error) {
    console.error('Errore durante l\'invio del messaggio a SQS:', error);

    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Errore nel formato del payload JSON. Assicurati che il body sia un JSON valido.',
          error: error.message,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Errore durante l\'invio del messaggio alla coda.',
        error: error.message,
      }),
    };
  }
};
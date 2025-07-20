import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'eu-central-1' });

export const handler = async (event) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    const inputDlqUrl = process.env.INPUT_DLQ_URL;
    const mainQueueUrl = process.env.MAIN_QUEUE_URL;

    if (!inputDlqUrl || !mainQueueUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DLQ URLs non configurate' })
      };
    }

    console.log('🔄 Iniziando reprocessamento Input DLQ...');

    // Ricevi messaggi dalla Input DLQ
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: inputDlqUrl,
      MaxNumberOfMessages: 10, // Processa fino a 10 messaggi per volta
      WaitTimeSeconds: 1,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All']
    });

    const response = await sqs.send(receiveCommand);
    const messages = response.Messages || [];

    if (messages.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Nessun messaggio da riprocessare',
          processed: 0
        })
      };
    }

    console.log(`📨 Trovati ${messages.length} messaggi da riprocessare`);

    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const message of messages) {
      try {
        const messageBody = JSON.parse(message.Body);
        
        // Rimuovi metadati della DLQ e incrementa retry attempt
        const cleanedPayload = {
          date: messageBody.date,
          number: messageBody.number,
          exemption: messageBody.exemption,
          supplier: messageBody.supplier,
          created_at: messageBody.created_at,
          retryAttempt: (messageBody.retryAttempt || 0) + 1,
          reprocessedAt: new Date().toISOString()
        };

        // Reinvia alla coda principale
        await sqs.send(new SendMessageCommand({
          QueueUrl: mainQueueUrl,
          MessageBody: JSON.stringify(cleanedPayload)
        }));

        // Rimuovi il messaggio dalla DLQ
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: inputDlqUrl,
          ReceiptHandle: message.ReceiptHandle
        }));

        processedCount++;
        console.log(`✅ Ticket ${messageBody.number} riprocessato con successo`);

      } catch (error) {
        errorCount++;
        errors.push({
          messageId: message.MessageId,
          error: error.message
        });
        console.error(`❌ Errore riprocessando messaggio ${message.MessageId}:`, error);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Reprocessamento completato`,
        processed: processedCount,
        errors: errorCount,
        details: {
          total: messages.length,
          successful: processedCount,
          failed: errorCount,
          failureDetails: errors.length > 0 ? errors : undefined
        }
      })
    };

  } catch (error) {
    console.error('❌ Errore reprocessInputDLQ:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
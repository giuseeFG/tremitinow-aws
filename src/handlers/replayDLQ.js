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

    const dlqUrl = process.env.DLQ_URL;
    const mainQueueUrl = process.env.MAIN_QUEUE_URL;

    if (!dlqUrl || !mainQueueUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DLQ_URL o MAIN_QUEUE_URL non configurati' })
      };
    }

    // Ricevi messaggi dalla DLQ
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 2
    });

    const receiveResponse = await sqs.send(receiveCommand);
    const messages = receiveResponse.Messages || [];

    if (messages.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Nessun messaggio nella DLQ da riprocessare',
          replayedCount: 0,
          timestamp: new Date().toISOString()
        })
      };
    }

    let replayedCount = 0;
    const errors = [];

    // Riprocessa ogni messaggio
    for (const message of messages) {
      try {
        // Invia messaggio alla coda principale
        await sqs.send(new SendMessageCommand({
          QueueUrl: mainQueueUrl,
          MessageBody: message.Body
        }));

        // Elimina messaggio dalla DLQ
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: dlqUrl,
          ReceiptHandle: message.ReceiptHandle
        }));

        replayedCount++;
        console.log(`✅ Messaggio riprocessato: ${message.MessageId}`);
      } catch (error) {
        console.error(`❌ Errore riprocessamento messaggio ${message.MessageId}:`, error);
        errors.push({
          messageId: message.MessageId,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Riprocessati ${replayedCount} messaggi dalla DLQ`,
        replayedCount,
        totalMessages: messages.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Errore replayDLQ:', error);
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
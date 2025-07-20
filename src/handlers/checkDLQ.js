import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'eu-central-1' });

export const handler = async (event) => {
  console.log('🔍 checkDLQ - Evento ricevuto:', JSON.stringify(event, null, 2));
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
    if (!dlqUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DLQ_URL non configurato' })
      };
    }

    const command = new GetQueueAttributesCommand({
      QueueUrl: dlqUrl,
      AttributeNames: [
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed'
      ]
    });

    const response = await sqs.send(command);
    const attributes = response.Attributes;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dlqUrl,
        stats: {
          messagesAvailable: parseInt(attributes.ApproximateNumberOfMessages || '0'),
          messagesInFlight: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
          messagesDelayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0')
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Errore checkDLQ:', error);
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
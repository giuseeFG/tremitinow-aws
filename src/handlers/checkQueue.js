import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

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

    const queueUrl = process.env.MAIN_QUEUE_URL;
    if (!queueUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'MAIN_QUEUE_URL non configurato' })
      };
    }

    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
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
        queueUrl,
        stats: {
          messagesAvailable: parseInt(attributes.ApproximateNumberOfMessages || '0'),
          messagesInFlight: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
          messagesDelayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0')
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Errore checkQueue:', error);
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
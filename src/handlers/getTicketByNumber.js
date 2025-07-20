import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });

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

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Body JSON non valido' })
      };
    }

    const { number } = body;
    if (!number) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Campo number richiesto' })
      };
    }

    const tableName = process.env.TICKETS_TABLE_NAME || 'tremitinow-prod-tickets';

    // Cerca il ticket per numero usando GSI
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'TicketNumberIndex', // GSI definito nel template
      KeyConditionExpression: '#number = :number',
      ExpressionAttributeNames: {
        '#number': 'number'
      },
      ExpressionAttributeValues: {
        ':number': { S: number }
      }
    });

    try {
      const response = await dynamodb.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Biglietto non trovato',
            number
          })
        };
      }

      const ticket = unmarshall(response.Items[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ticket: {
            id: ticket.id,
            number: ticket.number,
            date: ticket.date,
            supplier: ticket.supplier,
            exemption: ticket.exemption,
            created_at: ticket.created_at,
            checked_at: ticket.checked_at || null,
            controller: ticket.controller || null
          },
          timestamp: new Date().toISOString()
        })
      };
    } catch (dynamoError) {
      // Se GSI non esiste, usa scan come fallback
      if (dynamoError.name === 'ValidationException') {
        console.log('⚠️ GSI non trovato, usando scan...');
        // Implementare scan come fallback se necessario
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Configurazione database non completa - manca GSI TicketNumberIndex'
          })
        };
      }
      throw dynamoError;
    }
  } catch (error) {
    console.error('❌ Errore getTicketByNumber:', error);
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
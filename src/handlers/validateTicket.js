import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import knex from 'knex';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });

// Singleton per connessione PostgreSQL
let dbInstance = null;
function getDatabase() {
  if (!dbInstance && process.env.PG_DATA_URL) {
    dbInstance = knex({
      client: 'pg',
      connection: {
        connectionString: process.env.PG_DATA_URL,
        ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
      pool: { min: 0, max: 1 }
    });
  }
  return dbInstance;
}

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

    const { ticketId, controller } = body;
    if (!ticketId || !controller) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Campi ticketId e controller richiesti' 
        })
      };
    }
    
    // Ensure ticketId is a string
    const ticketIdStr = String(ticketId);

    const tableName = process.env.TICKETS_TABLE_NAME || 'tremitinow-prod-tickets';
    const now = new Date().toISOString();

    // Aggiorna DynamoDB
    const dynamoCommand = new UpdateItemCommand({
      TableName: tableName,
      Key: {
        id: { S: ticketIdStr }
      },
      UpdateExpression: 'SET checked_at = :checked_at, controller = :controller',
      ExpressionAttributeValues: {
        ':checked_at': { S: now },
        ':controller': { S: controller }
      },
      ReturnValues: 'ALL_NEW'
    });

    await dynamodb.send(dynamoCommand);
    console.log(`✅ DynamoDB aggiornato per ticket ${ticketIdStr}`);  

    // Aggiorna PostgreSQL se disponibile
    const db = getDatabase();
    if (db) {
      try {
        await db('tickets')
          .where('id', ticketIdStr)
          .update({
            checked_at: now,
            controller: controller
          });
        console.log(`✅ PostgreSQL aggiornato per ticket ${ticketIdStr}`);
      } catch (pgError) {
        console.error('⚠️ Errore aggiornamento PostgreSQL:', pgError.message);
        // Non fallire se PostgreSQL non è disponibile
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Biglietto validato con successo',
        ticketId: ticketIdStr,
        controller,
        validated_at: now,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Errore validateTicket:', error);
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
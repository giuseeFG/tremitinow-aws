import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import knex from 'knex';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });
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
  console.log('🚀 processTickets_s3 - Evento SQS ricevuto:', JSON.stringify(event, null, 2));

  const results = [];

  for (const record of event.Records) {
    try {
      const ticketData = JSON.parse(record.body);
      console.log('🎫 Processando ticket:', ticketData);

      // Genera UUID per il file S3
      const ticketUuid = uuidv4();
      
      // 1. Salva in PostgreSQL (per ottenere ID auto-generato)
      let postgresId = null;
      const db = getDatabase();
      
      if (db) {
        try {
          const insertData = {
            supplier: ticketData.supplier,
            date: ticketData.date,
            number: ticketData.number,
            created_at: ticketData.created_at || new Date().toISOString()
          };

          // Aggiungi exemption solo se presente
          if (ticketData.exemption !== undefined) {
            insertData.exemption = ticketData.exemption;
          }

          const [insertedTicket] = await db('tickets')
            .insert(insertData)
            .returning('id');
          
          postgresId = insertedTicket.id;
          console.log(`✅ PostgreSQL - Ticket salvato con ID: ${postgresId}`);
        } catch (pgError) {
          // Se è un duplicato, cerca l'ID esistente
          if (pgError.message.includes('duplicate key value violates unique constraint')) {
            console.log('⚠️ PostgreSQL - Ticket duplicato, cercando ID esistente...');
            try {
              const existingTicket = await db('tickets')
                .select('id')
                .where({ number: ticketData.number, date: ticketData.date })
                .first();
              
              if (existingTicket) {
                postgresId = existingTicket.id;
                console.log(`✅ PostgreSQL - ID esistente trovato: ${postgresId}`);
              } else {
                throw new Error('Ticket duplicato ma non trovato in database');
              }
            } catch (selectError) {
              console.error('❌ Errore ricerca ticket esistente:', selectError.message);
              throw new Error(`PostgreSQL: ${selectError.message}`);
            }
          } else {
            console.error('❌ Errore PostgreSQL:', pgError.message);
            throw new Error(`PostgreSQL: ${pgError.message}`);
          }
        }
      } else {
        console.log('⚠️ PostgreSQL non disponibile');
        postgresId = Date.now(); // Fallback ID
      }

      // 2. Salva in DynamoDB (con ID sincronizzato)
      const dynamoItem = {
        id: postgresId.toString(),
        supplier: ticketData.supplier,
        date: ticketData.date,
        number: String(ticketData.number), // Ensure number is always a string
        created_at: ticketData.created_at || new Date().toISOString(),
        uuid: ticketUuid
      };

      // Aggiungi exemption solo se presente
      if (ticketData.exemption !== undefined) {
        dynamoItem.exemption = ticketData.exemption;
      }

      const putCommand = new PutItemCommand({
        TableName: process.env.TICKETS_TABLE_NAME || 'tremitinow-prod-tickets',
        Item: marshall(dynamoItem),
        ConditionExpression: 'attribute_not_exists(id)' // Previene duplicati
      });

      try {
        await dynamodb.send(putCommand);
        console.log(`✅ DynamoDB - Ticket salvato con ID: ${postgresId}`);
      } catch (dynamoError) {
        if (dynamoError.name === 'ConditionalCheckFailedException') {
          console.log(`⚠️ DynamoDB - Ticket con ID ${postgresId} già esistente, continuando...`);
        } else {
          throw dynamoError;
        }
      }

      // 3. Salva backup in S3
      const date = new Date(ticketData.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const s3Key = `${year}/${month}-${day}/${ticketData.number}/${ticketUuid}.json`;
      const bucketName = process.env.S3_STAGING_BUCKET_NAME || 'tremitinow-prod-tickets-storage';

      const s3Data = {
        ...dynamoItem,
        metadata: {
          processedAt: new Date().toISOString(),
          sqsMessageId: record.messageId,
          source: 'processTickets_s3'
        }
      };

      const s3Command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(s3Data, null, 2),
        ContentType: 'application/json',
        Metadata: {
          ticketId: postgresId.toString(),
          ticketNumber: ticketData.number,
          supplier: ticketData.supplier.toString(),
          ...(ticketData.exemption !== undefined && { exemption: ticketData.exemption.toString() })
        }
      });

      await s3.send(s3Command);
      console.log(`✅ S3 - Backup salvato: s3://${bucketName}/${s3Key}`);

      results.push({
        success: true,
        ticketNumber: ticketData.number,
        postgresId,
        s3Key,
        messageId: record.messageId
      });

    } catch (error) {
      console.error('❌ Errore processamento ticket:', error);
      results.push({
        success: false,
        error: error.message,
        messageId: record.messageId,
        body: record.body
      });
      
      // Per SQS: se c'è un errore, il messaggio andrà in DLQ automaticamente
      throw error;
    }
  }

  console.log('📊 Risultati processamento:', results);
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      processed: results.length,
      results
    })
  };
};
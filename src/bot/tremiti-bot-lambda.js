import { TremitiBot } from './shared/services/tremitiBot.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione Bedrock
const bedrockConfig = {
  region: process.env.AWS_REGION || 'eu-central-1',
  modelConfig: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE) || 0.3,
    topP: 0.9
  }
};

const dataPath = path.join(__dirname, 'data');

export const handler = async (event, context) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'OK' })
      };
    }

    if (event.httpMethod === 'GET' && event.resource === '/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          message: 'TremitiBot Lambda is running'
        })
      };
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

    const { message, history = [] } = body;
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Messaggio richiesto' })
      };
    }

    const bot = new TremitiBot({ dataPath, bedrockConfig });
    const response = await bot.sendMessage(message, history);

    if (response.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: response.message,
          usage: response.usage,
          timestamp: new Date().toISOString()
        })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: response.error,
          fallbackMessage: response.fallbackMessage
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Errore interno del server',
        fallbackMessage: "Mi dispiace, c'è stato un problema. Contatta [Fuffy](https://tremitinow.it/cGFnZS82Mw==)",
        timestamp: new Date().toISOString()
      })
    };
  }
};
const admin = require('firebase-admin');

// Inizializza Firebase Admin SDK
let app;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_CREDENTIALS);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }, 'token-authorizer');
} catch (error) {
  console.error('❌ Errore inizializzazione Firebase:', error);
}

exports.handler = async (event) => {
  try {
    // Aggiungi timestamp per rendere ogni log unico
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`📨 TokenAuthorizer [${requestId}] - Evento ricevuto:`, JSON.stringify(event, null, 2));
    console.log(`🔍 Resource ARN: ${event.methodArn}`);

    // Ottieni token da authorizationToken (standard per TOKEN authorizer)
    let token = event.authorizationToken;
    if (!token) {
      console.log(`❌ [${requestId}] Token mancante`);
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    // Rimuovi prefisso Bearer se presente
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    if (!token || token.trim() === '') {
      console.log(`❌ [${requestId}] Token vuoto dopo rimozione Bearer`);
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    if (!app) {
      console.log('❌ Firebase non inizializzato');
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    // Verifica token Firebase
    const decodedToken = await admin.auth(app).verifyIdToken(token);
    console.log('✅ Token verificato:', decodedToken.uid);

    // Qui dovresti recuperare user_type dal tuo database PostgreSQL
    // Per ora simulo il controllo
    const userType = decodedToken.user_type || 'operator'; // Fallback per test

    if (userType === 'admin' || userType === 'operator') {
      console.log(`✅ Autorizzazione concessa per user_type: ${userType}`);
      return generatePolicy(decodedToken.uid, 'Allow', event.methodArn, {
        userId: decodedToken.uid,
        userType: userType
      });
    } else {
      console.log(`❌ user_type non autorizzato: ${userType}`);
      return generatePolicy(decodedToken.uid, 'Deny', event.methodArn);
    }
  } catch (error) {
    console.error('❌ Errore TokenAuthorizer:', error.message);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};

function generatePolicy(principalId, effect, resource, context = {}) {
  // SOLUZIONE DEFINITIVA: principalId randomico + wildcard resource per eliminare TUTTO il caching
  const randomId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const uniquePrincipalId = `${principalId}-${randomId}-${timestamp}`;
  
  console.log(`🔍 Resource originale: ${resource}`);
  
  // SOLUZIONE DRASTICA: Policy che permette TUTTO su questa API
  // Format: arn:aws:execute-api:region:account:api-id/stage/METHOD/path
  const arnParts = resource.split(':');
  const apiArn = arnParts.slice(0, 5).join(':');
  const resourcePath = arnParts[5]; // es: api-id/stage/METHOD/path
  const pathSegments = resourcePath.split('/');
  const apiId = pathSegments[0];
  const stage = pathSegments[1];
  
  // Policy che autorizza TUTTO su questa API (rimuove stage/method/path)
  const wildcardResource = `${apiArn}:${apiId}/*`;
  
  console.log(`✨ Wildcard resource generata (FULL ACCESS): ${wildcardResource}`);
  
  const authResponse = {
    principalId: uniquePrincipalId, // ID sempre unico per bypassare cache
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: wildcardResource
        }
      ]
    },
    // Disabilita cache completamente
    ttlOverride: 0,
    context: {
      ...context,
      originalPrincipalId: principalId,
      timestamp: timestamp.toString(),
      randomId: randomId
    }
  };

  console.log('📋 Policy generata con ID unico:', JSON.stringify(authResponse, null, 2));
  return authResponse;
}
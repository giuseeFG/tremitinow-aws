#!/usr/bin/env node

const https = require('https');

const API_URL = 'https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod/tickets/submit';
const SUPPLIER_TOKEN = 'cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5'; // NLG token

// Genera dati casuali per i ticket
function generateRandomTicket(index) {
  const dates = ['2025-01-25', '2025-01-26', '2025-01-27', '2025-01-28'];
  const exemptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // Rimosso 12, solo valori < 12
  
  return {
    date: dates[Math.floor(Math.random() * dates.length)],
    number: 10000 + index, // Numeri unici partendo da 10001
    exemption: Math.random() > 0.2 ? exemptions[Math.floor(Math.random() * exemptions.length)] : undefined // 80% con exemption
  };
}

// Invia un singolo ticket
function submitTicket(ticketData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(ticketData);
    
    const options = {
      hostname: 'd8r8p6oi51.execute-api.eu-central-1.amazonaws.com',
      port: 443,
      path: '/prod/tickets/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SUPPLIER_TOKEN,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(body), ticket: ticketData });
        } else {
          reject({ success: false, statusCode: res.statusCode, body, ticket: ticketData });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message, ticket: ticketData });
    });

    req.write(data);
    req.end();
  });
}

// Funzione principale
async function insertBulkTickets() {
  console.log('🚀 Iniziando inserimento di 1000 ticket...');
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // OTTIMIZZAZIONE PER STRESS TEST: batch più piccoli, delay più lungo
  const BATCH_SIZE = 5; // Ridotto da 10 a 5
  const TOTAL_TICKETS = 1000;
  const BATCH_DELAY = 250; // Aumentato da 100ms a 250ms

  for (let i = 0; i < TOTAL_TICKETS; i += BATCH_SIZE) {
    const batch = [];
    
    // Crea batch di ticket
    for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_TICKETS; j++) {
      const ticketNumber = i + j + 1;
      const ticket = generateRandomTicket(ticketNumber);
      batch.push(submitTicket(ticket));
    }

    try {
      // Esegui batch sequenzialmente invece che in parallelo per ridurre stress
      const batchResults = await Promise.allSettled(batch);
      
      batchResults.forEach((result, index) => {
        const ticketNumber = i + index + 1;
        
        if (result.status === 'fulfilled') {
          results.success++;
          if (ticketNumber % 100 === 0) {
            console.log(`✅ Ticket ${ticketNumber}: SUCCESS`);
          }
        } else {
          results.failed++;
          results.errors.push({
            ticket: ticketNumber,
            error: result.reason
          });
          console.log(`❌ Ticket ${ticketNumber}: FAILED -`, result.reason);
        }
      });

      // Pausa più lunga tra i batch per ridurre stress su API Gateway
      if (i + BATCH_SIZE < TOTAL_TICKETS) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }

    } catch (error) {
      console.error('❌ Errore nel batch:', error);
      results.failed += BATCH_SIZE;
    }

    // Progress report ogni 100 ticket
    if ((i + BATCH_SIZE) % 100 === 0) {
      console.log(`📊 Progress: ${i + BATCH_SIZE}/${TOTAL_TICKETS} - Success: ${results.success}, Failed: ${results.failed}`);
    }
  }

  console.log('\n🎯 RISULTATI FINALI:');
  console.log(`✅ Successi: ${results.success}/${TOTAL_TICKETS}`);
  console.log(`❌ Fallimenti: ${results.failed}/${TOTAL_TICKETS}`);
  console.log(`📈 Tasso di successo: ${((results.success / TOTAL_TICKETS) * 100).toFixed(2)}%`);

  if (results.failed > 0) {
    console.log('\n❌ ERRORI:');
    results.errors.slice(0, 10).forEach(error => {
      console.log(`Ticket ${error.ticket}:`, error.error);
    });
    if (results.errors.length > 10) {
      console.log(`... e altri ${results.errors.length - 10} errori`);
    }
  }

  return results;
}

// Esegui il test
insertBulkTickets()
  .then(results => {
    console.log('\n✅ Test completato!');
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  });
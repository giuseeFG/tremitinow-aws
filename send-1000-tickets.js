const https = require('https');

// Configuration
const API_ENDPOINT = 'https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod/tickets/submit';
const SUPPLIER_TOKEN = 'cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5'; // NLG token
const TOTAL_TICKETS = 1000;
const BATCH_SIZE = 5; // Send in smaller batches to avoid overwhelming the API

// Generate random ticket data
function generateTicket(index) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 30)); // Random date within next 30 days

  return {
    date: date.toISOString().split('T')[0],
    number: `TEST${String(index).padStart(6, '0')}`,
    passengerName: `Test Passenger ${index}`,
    passengerSurname: `Surname${index}`,
    passengerEmail: `test${index}@example.com`,
    passengerPhone: `+39123456${String(index).padStart(3, '0')}`,
    route: `Termoli-Tremiti`,
    transportType: 'nave',
    ticketType: Math.random() > 0.7 ? 'return' : 'single',
    price: Math.floor(Math.random() * 50) + 15,
    currency: 'EUR',
    paymentMethod: Math.random() > 0.5 ? 'credit_card' : 'cash',
    notes: `Test ticket batch #${Math.ceil(index / BATCH_SIZE)}`
  };
}

// Send single ticket
function sendTicket(ticketData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(ticketData);
    
    const options = {
      hostname: 'd8r8p6oi51.execute-api.eu-central-1.amazonaws.com',
      port: 443,
      path: '/prod/tickets/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': SUPPLIER_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve({ success: true, ticketNumber: ticketData.ticketNumber, response });
          } else {
            resolve({ success: false, ticketNumber: ticketData.ticketNumber, error: response, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, ticketNumber: ticketData.ticketNumber, error: 'Invalid JSON response', rawData: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, ticketNumber: ticketData.ticketNumber, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Send batch of tickets
async function sendBatch(startIndex, batchSize) {
  const promises = [];
  
  for (let i = 0; i < batchSize; i++) {
    const ticketIndex = startIndex + i;
    if (ticketIndex > TOTAL_TICKETS) break;
    
    const ticket = generateTicket(ticketIndex);
    promises.push(sendTicket(ticket));
  }
  
  return Promise.all(promises);
}

// Main execution
async function main() {
  console.log(`🎫 Iniziando invio di ${TOTAL_TICKETS} ticket di test...`);
  console.log(`📡 Endpoint: ${API_ENDPOINT}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  const totalBatches = Math.ceil(TOTAL_TICKETS / BATCH_SIZE);
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const startIndex = batchNum * BATCH_SIZE + 1;
    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_TICKETS - startIndex + 1);
    
    console.log(`📤 Invio batch ${batchNum + 1}/${totalBatches} (tickets ${startIndex}-${startIndex + currentBatchSize - 1})...`);
    
    try {
      const results = await sendBatch(startIndex, currentBatchSize);
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(result);
        }
      });
      
      console.log(`✅ Batch ${batchNum + 1} completato. Successi: ${results.filter(r => r.success).length}, Errori: ${results.filter(r => !r.success).length}`);
      
      // Small delay between batches to avoid overwhelming the API
      if (batchNum < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Errore nel batch ${batchNum + 1}:`, error);
      errorCount += currentBatchSize;
    }
  }

  console.log('');
  console.log('📊 RISULTATI FINALI:');
  console.log(`✅ Tickets inviati con successo: ${successCount}`);
  console.log(`❌ Tickets falliti: ${errorCount}`);
  console.log(`📈 Tasso di successo: ${((successCount / TOTAL_TICKETS) * 100).toFixed(2)}%`);
  
  if (errors.length > 0) {
    console.log('');
    console.log('❌ ERRORI DETTAGLIATI:');
    errors.slice(0, 10).forEach(error => {
      console.log(`- ${error.ticketNumber}: ${error.error} (Status: ${error.statusCode || 'N/A'})`);
    });
    if (errors.length > 10) {
      console.log(`... e altri ${errors.length - 10} errori`);
    }
  }
}

// Run the script
main().catch(console.error);
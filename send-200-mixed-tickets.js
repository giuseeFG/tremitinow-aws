const https = require('https');

// Configurazione supplier tokens
const SUPPLIERS = {
  1: { name: 'NLG', token: 'cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5' },
  2: { name: 'ALIDAUNIA', token: 'zopLLLmnbxQeRkWv842FT9K2Yp7sxHduN3RvjiA1' },
  3: { name: 'NAVITREMITI', token: 'migPPPaazZtLvDyM510CR3X8Wo9bgLqfV7ExnZt4' },
  4: { name: 'GSTRAVEL', token: 'texQQQyywuBsNpMa266VH6L1Jq2ctKpoE5MdgyC7' },
  5: { name: 'UTENTE_PRIVATO', token: 'rifMMMcckdUzQbHt903BN5D6Xs8ayTemK2KlhwR2' }
};

const API_URL = 'https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod';

function generateTicket(index, supplierId) {
  const supplier = SUPPLIERS[supplierId];
  const today = new Date().toISOString().split('T')[0];
  
  // Alcuni ticket con exemption, altri senza (circa 30% con exemption)
  const hasExemption = Math.random() < 0.3;
  
  const ticket = {
    id: `${30000 + index}`,
    supplier: supplierId,
    date: today,
    number: `MIX${String(index).padStart(6, '0')}`,
    price: (15 + Math.random() * 50).toFixed(2)
  };
  
  // Aggiungi exemption se necessario (deve essere un numero tra 2 e 12)
  if (hasExemption) {
    ticket.exemption = Math.floor(Math.random() * 11) + 2; // Random tra 2 e 12
  }
  
  return ticket;
}

function sendTicket(ticket, supplierId) {
  return new Promise((resolve, reject) => {
    const supplier = SUPPLIERS[supplierId];
    const postData = JSON.stringify(ticket);
    
    const options = {
      hostname: 'd8r8p6oi51.execute-api.eu-central-1.amazonaws.com',
      port: 443,
      path: '/prod/tickets/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': supplier.token,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            ticket: ticket.number,
            supplier: supplier.name,
            status: res.statusCode,
            response: response,
            hasExemption: ticket.exemption !== undefined
          });
        } catch (e) {
          resolve({
            ticket: ticket.number,
            supplier: supplier.name,
            status: res.statusCode,
            response: data,
            hasExemption: ticket.exemption !== undefined,
            error: 'Parse error'
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject({
        ticket: ticket.number,
        supplier: supplier.name,
        error: err.message,
        hasExemption: !!ticket.exemption
      });
    });
    
    req.write(postData);
    req.end();
  });
}

async function sendAllTickets() {
  console.log('🚀 Invio di 2000 ticket misti da supplier diversi...');
  console.log('📊 Suppliers disponibili:', Object.keys(SUPPLIERS).length);
  
  const promises = [];
  const supplierIds = Object.keys(SUPPLIERS).map(Number);
  
  // Genera e invia 200 ticket
  for (let i = 1; i <= 2000; i++) {
    // Distribuisci i ticket tra i supplier in modo casuale
    const supplierId = supplierIds[Math.floor(Math.random() * supplierIds.length)];
    const ticket = generateTicket(i, supplierId);
    
    // Aggiungi alla lista delle promise (invio simultaneo)
    promises.push(sendTicket(ticket, supplierId));
  }
  
  console.log(`📤 Invio di ${promises.length} ticket simultaneamente...`);
  const startTime = Date.now();
  
  try {
    // Invia tutti i ticket contemporaneamente
    const results = await Promise.allSettled(promises);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Analizza i risultati
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status !== 200));
    const withExemption = results.filter(r => r.status === 'fulfilled' && r.value.hasExemption);
    
    console.log('\n📈 RISULTATI FINALI:');
    console.log(`⏱️  Tempo totale: ${duration.toFixed(2)} secondi`);
    console.log(`✅ Ticket inviati con successo: ${successful.length}/200`);
    console.log(`❌ Ticket falliti: ${failed.length}/200`);
    console.log(`🎫 Ticket con exemption: ${withExemption.length}/200`);
    
    // Analizza per supplier
    const bySupplier = {};
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const supplier = result.value.supplier;
        if (!bySupplier[supplier]) {
          bySupplier[supplier] = { success: 0, failed: 0, withExemption: 0 };
        }
        if (result.value.status === 200) {
          bySupplier[supplier].success++;
        } else {
          bySupplier[supplier].failed++;
        }
        if (result.value.hasExemption) {
          bySupplier[supplier].withExemption++;
        }
      }
    });
    
    console.log('\n📊 DISTRIBUZIONE PER SUPPLIER:');
    Object.entries(bySupplier).forEach(([supplier, stats]) => {
      console.log(`  ${supplier}: ✅${stats.success} ❌${stats.failed} 🎫${stats.withExemption}`);
    });
    
    // Mostra alcuni esempi di errori se ci sono
    if (failed.length > 0) {
      console.log('\n🚨 ESEMPI DI ERRORI:');
      failed.slice(0, 5).forEach(result => {
        if (result.status === 'fulfilled') {
          console.log(`  ${result.value.ticket} (${result.value.supplier}): HTTP ${result.value.status} - ${JSON.stringify(result.value.response).substring(0, 100)}`);
        } else {
          console.log(`  ${result.reason.ticket} (${result.reason.supplier}): ${result.reason.error}`);
        }
      });
    }
    
    console.log('\n🎯 Test completato! Verifica ora le code SQS e DynamoDB per vedere l\'elaborazione.');
    
  } catch (error) {
    console.error('💥 Errore durante l\'invio dei ticket:', error);
  }
}

// Avvia il test
sendAllTickets().catch(console.error);
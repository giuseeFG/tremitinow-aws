import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import fs from 'fs';
import path from 'path';
import knex from 'knex';

// Singleton per la connessione DB
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    // Se PG_DATA_URL non è configurata, restituisci null
    if (!process.env.PG_DATA_URL) {
      console.log('⚠️ PG_DATA_URL non configurata, salvataggio DB disabilitato');
      return null;
    }
    
    dbInstance = knex({
      client: 'pg',
      connection: {
        connectionString: process.env.PG_DATA_URL,
        ssl: { rejectUnauthorized: false }
      },
      pool: {
        min: 0,
        max: 1,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      },
      acquireConnectionTimeout: 30000,
      // Importante: per Lambda, disabilita il ping periodico
      ping: false
    });
  }
  return dbInstance;
}

export class TremitiBot {
  constructor({ dataPath, bedrockConfig }) {
    this.client = new BedrockRuntimeClient({
      region: bedrockConfig.region,
      credentials: bedrockConfig.credentials || undefined
    });
    this.modelConfig = bedrockConfig.modelConfig;
    this.jsonData = this.loadJsonData(dataPath);
    this.db = getDatabase();
  }

  loadJsonData(dataPath) {
    try {
      return {
        jet: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_jet.json'), 'utf-8')),
        nave: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_nave.json'), 'utf-8')),
        gargano: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_gargano.json'), 'utf-8')),
        zenit: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_zenit.json'), 'utf-8')),
        elicottero: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_elicottero.json'), 'utf-8')),
        vieste: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_vieste.json'), 'utf-8')),
        cale: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_cale.json'), 'utf-8')),
        pagine: JSON.parse(fs.readFileSync(path.join(dataPath, 'json_pagine.json'), 'utf-8'))
      };
    } catch (error) {
      console.error('❌ Errore caricamento dati JSON:', error.message);
      return {};
    }
  }

  buildCategoryPrompt() {
    return `Sei un classificatore di domande per un assistente delle Isole Tremiti.

Analizza la domanda dell'utente e restituisci UNA SOLA categoria tra quelle disponibili.

Categorie disponibili:
- ristoranti: domande su mangiare, ristoranti, pizzerie, bar, cena, pranzo, gelaterie, gelato, dolci, locali
- hotel: domande su dormire, hotel, albergo, b&b, alloggio, appartamento, casa vacanze, residence, campeggio
- escursioni: domande su escursioni, tour, gite, barca, diving, sub, noleggio, gommone, sup, canoa
- cale: domande su spiagge, mare, bagno, lido, baia (PRIORITÀ ASSOLUTA se contiene "cala" o "cale")
- traghetti: domande su traghetti, orari, partenza, arrivo, prenotazione, biglietto, jet, nave, zenit, elicottero
- taxi: domande su taxi, navetta, trasporto, porto
- collegamenti: domande su collegamenti interni, san domino, san nicola, tra isole
- negozi: domande su negozi, shopping, alimentari, tabacchi, made in tremiti
- servizi: domande su servizi, meteo, notizie, spa, biblioteca, conad, supermercato
- eventi: domande su eventi, manifestazioni, feste, concerti, spettacoli, sagre, pro loco, cosa fare, attività culturali, programma

Regole:
1. Se la domanda contiene "cala" o "cale", restituisci SEMPRE "cale"
2. Se la domanda contiene "come" e ("tremiti" o "isole"), restituisci "traghetti"
3. Se la domanda contiene "eventi" o parole legate a eventi (evento, festa, concerto, manifestazione, spettacolo, sagra, pro loco), restituisci SEMPRE "eventi"
4. Restituisci solo il nome della categoria, senza virgolette o altri caratteri
5. Se non trovi corrispondenze, restituisci "null"

Esempi:
- "Dove posso mangiare?" → ristoranti
- "Hotel a San Domino" → hotel
- "Orari traghetti per domani" → traghetti
- "Cala delle Arene" → cale
- "Taxi dal porto" → taxi
- "Come arrivare alle Tremiti" → traghetti
- "eventi" → eventi
- "Quali eventi ci sono questa settimana?" → eventi
- "Cosa organizza la pro loco?" → eventi

Rispondi solo con il nome della categoria.`;
  }

  async getQueryCategory(userMessage) {
    try {
      const categoryPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 50,
        temperature: 0.1,
        top_p: 0.9,
        system: this.buildCategoryPrompt(),
        messages: [
          { role: 'user', content: userMessage }
        ]
      };

      const categoryCommand = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        body: JSON.stringify(categoryPayload),
        contentType: 'application/json'
      });

      const categoryResponse = await this.client.send(categoryCommand);
      const categoryBody = JSON.parse(new TextDecoder().decode(categoryResponse.body));
      const category = categoryBody.content[0].text.trim().toLowerCase();

      // Normalizza la risposta
      if (category === 'null' || category === 'none' || category === '') {
        return null;
      }

      return category;
    } catch (error) {
      console.error('❌ Errore categorizzazione:', error.message);
      return null;
    }
  }

  prepareMessages(userMessage, history) {
    const messages = [];
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  async getRelevantData(category) {
    if (!category) return null;

    // Per gli eventi, recupera dal database
    if (category === 'eventi') {
      return await this.getEventsFromDatabase();
    }

    // Per le cale, restituisci direttamente i dati delle cale
    if (category === 'cale') return this.jsonData.cale;

    // Per i traghetti, restituisci tutti i dati dei trasporti
    if (category === 'traghetti') {
      return {
        jet: this.jsonData.jet,
        nave: this.jsonData.nave,
        gargano: this.jsonData.gargano,
        zenit: this.jsonData.zenit,
        elicottero: this.jsonData.elicottero
      };
    }

    // Per taxi e collegamenti, non serve JSON specifico (sono hardcoded nel prompt)
    if (category === 'taxi' || category === 'collegamenti') {
      return null;
    }

    // Per tutte le altre categorie, filtra dalle pagine
    if (this.jsonData.pagine && Array.isArray(this.jsonData.pagine)) {
      const categoryMap = {
        ristoranti: ['Ristoranti/pizzerie', 'Bar', 'Locali', 'Gelaterie & Dolci'],
        hotel: ['Hotel', 'Albergo', 'B&B', 'Appartamenti & B&B', 'Campeggi', 'Residence'],
        escursioni: ['Escursioni', 'Diving', 'Noleggio Barche & Gommoni', 'Noleggio SUP & canoe'],
        negozi: ['Negozi', 'Made in Tremiti', 'Alimentari', 'Tabacchi'],
        servizi: ['Servizi', 'Taxi', 'Notizie', 'Meteo', 'SPA'],
        trasporti: ['Trasporti'],
        lidi: ['Lidi'],
        sport: ['Sport']
      };

      const validCategories = categoryMap[category] || [category];
      return this.jsonData.pagine.filter(p =>
        Array.isArray(p.category) &&
        p.category.some(catObj =>
          catObj && catObj.category &&
          validCategories.map(c => c.toLowerCase()).includes(catObj.category.category.toLowerCase())
        )
      );
    }

    console.error('❌ Errore: this.jsonData.pagine non è un array valido:', typeof this.jsonData.pagine);
    return null;
  }

  async buildRagPrompt(category = null) {
    const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const basePrompt = `Sei un assistente che aiuta le persone a trovare informazioni sui traghetti per le Isole Tremiti e altri servizi utili, come taxi, cale, collegamenti interni, attività da fare o spiagge.

IMPORTANTE: Quando l'utente usa parole come "oggi", "domani", "dopodomani", "lunedì", "martedì", ecc., calcola la data corretta in modo dinamico basandoti sulla data attuale di OGGI. Vai subito al punto con le informazioni richieste senza spiegare i calcoli. NON dire mai frasi come "Per fornirti informazioni precise", "ho bisogno di calcolare", "Ecco gli orari disponibili per [data]".
IMPORTANTE: La data attuale è ${today}.

---

### 🚢 1. Normalizzazione e interpretazione

- Sostituisci automaticamente "San Domino", "San Nicola" o "Tremiti" con "Isole Tremiti".
- Tratta "Isole Tremiti" come destinazione unica per tutte le compagnie.
- Se l'utente indica solo **una località** (es. "per Tremiti"), assumi che l'altra sia la **terraferma**.
- Se l'utente indica **Termoli**, **Vieste**, **Rodi**, **Peschici** o **Foggia**, usali come punto di partenza o arrivo a seconda del contesto linguistico.
- Se non è chiaro da dove parte o dove va, chiedi gentilmente di chiarire la direzione della tratta.

---

### 📆 2. Orari traghetti

Se l'utente chiede orari per una certa data, DEVI:

1. **Calcola la data corretta** se l'utente dice "domani", "dopodomani", "lunedì", ecc.
2. Cercare **tutte** le tratte disponibili per quella data e direzione:
   - JET NLG
   - NAVE NLG
   - Navitremiti (Gargano)
   - Zenit (GS Travel)
   - Elicottero (Foggia)
3. Mostrare tutte le opzioni disponibili in una **singola risposta** in formato Markdown con elenco puntato.
4. Se una tratta è **fuori stagione** o non disponibile, dillo chiaramente.
5. Se **nessuna corsa** è disponibile, scrivi:
   > "In data [DATA], non ci sono corse disponibili da [ORIGINE] a [DESTINAZIONE]."
6. Non limitarti alla prima compagnia trovata: esamina tutti i JSON disponibili.
7. Se l'utente ti chiede info sul collegamento tra Termoli e Tremiti o viceversa con partenza entro il 2 giugno 2025, sappi che ci sono corse aggiuntive extra non cataogate nel DB.
Devi suggerire all'utente di controllare manualmente la pagina interna all'app di NLG cliccando qui: "https://tremitinow.it/cGFnZS8xMA==" 

📎 Link prenotazione (da usare in base alla compagnia):
- JET / NAVE NLG: <a href="https://tremitinow.it/cGFnZS8xMA==">Clicca qui per prenotare o saperne di più</a>
- Navitremiti (Gargano): <a href="https://tremitinow.it/cGFnZS8zOA==">Clicca qui per prenotare o saperne di più</a>
- Zenit (GS Travel): <a href="https://tremitinow.it/cGFnZS85">Clicca qui per prenotare o saperne di più</a>
- Elicottero (Foggia): <a href="https://tremitinow.it/cGFnZS81">Clicca qui per prenotare o saperne di più</a>

---

### 🚖 3. Taxi

Se l'utente chiede informazioni sui taxi:

> Il servizio taxi è garantito da 2 navette private che si trovano sul porto al vostro arrivo.  
> I contatti sono i seguenti:
> - [Tommaso](https://tremitinow.it/cGFnZS8xMDk=)  
> - [Fabio](https://tremitinow.it/cGFnZS8xMDg=)

- Rispondi in **Markdown** con elenco puntato.
- Usa **solo il nome cliccabile**, senza duplicare il nome in chiaro.

---

### 🚤 4. Collegamenti interni tra San Domino e San Nicola

Se l'utente chiede dei collegamenti tra le isole:

> Per raggiungere l'altra isola (San Nicola da San Domino o viceversa), puoi utilizzare i traghetti interni che collegano le due isole principali delle Tremiti.  
> Ti consiglio di consultare l'app al seguente link per visualizzare gli orari aggiornati, inclusi quelli notturni:  
> <a href='https://tremitinow.it/cGFnZS82'>Clicca qui per più info</a>

---

### 🏖 5. Cale e spiagge

Se l'utente chiede informazioni su cale, lidi o spiagge:

1. Usa i dati JSON forniti.
2. Mostra massimo 10 risultati, dando priorità a:
   - Cale di **San Domino**
   - Cale che hanno almeno **una foto**
3. Per ogni cala, includi una breve descrizione (se disponibile) e **una sola immagine** nel tag <img> presa da "bay_info.bays_photos.media".

---

### 🎉 6. Eventi e manifestazioni

Se l'utente chiede informazioni su eventi, manifestazioni o attività organizzate dalla Pro Loco:

1. Mostra SOLO gli eventi futuri, ordinati dal più vicino nel tempo
2. Per ogni evento, usa questa formattazione:
   - **Titolo**: Usa il campo "title" se disponibile
   - **Contenuto**: Mostra il campo "content" che contiene data, ora, luogo e descrizione
   - **Immagine**: Se presente il campo "media", includi l'immagine con <img src="[URL]" style="max-width: 300px;">
3. Formatta il contenuto in modo leggibile, mantenendo le emoji e la struttura originale
4. Se non ci sono eventi futuri in programma, suggerisci di controllare la pagina della Pro Loco o di contattare direttamente
5. Ricorda che gli eventi sono organizzati dalla Pro Loco delle Isole Tremiti
6. NON mostrare eventi passati a meno che l'utente non li richieda esplicitamente

---

### ❓ 7. Mancanza di dati

Se non riesci a rispondere a una richiesta, scrivi qualcosa come:

Non ho abbastanza informazioni per rispondere con precisione alla tua domanda. Ti consiglio di chiedere info a <a href='https://tremitinow.it/cGFnZS82Mw=='>Fuffy</a>.

---

### 📦 Dati JSON disponibili

Ecco i dati che puoi usare:`;

    // Se abbiamo una categoria specifica, includi solo i dati rilevanti
    if (category) {
      const relevantData = await this.getRelevantData(category);
      if (relevantData) {
        return `${basePrompt}

- Dati rilevanti per "${category}":
  ${JSON.stringify(relevantData)}

> Esiste anche una mappa dell'arcipelago interattiva. Basta andare nel menu principale dell'app e cliccare su "Mappa": la mappa comprende anche i percorsi e sentieri da fare a piedi e i tragitti per raggiungere le cale e le spiagge.
> Se ti chiedono percorsi per visitare le isole (San Domino e San Nicola), rispondi che esiste la mappa sull'app che comprende anche i percorsi e sentieri da fare a piedi e i tragitti per raggiungere le cale e le spiagge.
> Se ti chiedono dove si trovano alcune cale, fai riferimento al JSON delle cale e rispondi con la cala che più assomiglia alla richiesta: suggerisci anche il "clicca qui" per andare alla pagina di dettalgio dela cala.
> Se ti chiedono gli orari della Conad o del supermercato vai alla pagina "conad".
> Se ti chiedono info sulle spiagge? Cala delle arene o cala matano (aggiungi i link alle cale).
> Se ti chiedono dov'è la biblioteca, rispondi che sta a San Domino prima della discesa in Via Federico II.
> Se ti chiedono qualcosa come Appartamenti in affitto oppure Casa vacanze fai riferimento al JSON_PAGINE cercando dove dormire.
> Se ti informazioni informazioni dei Carabinieri o Polizia locale, rispondi oltre al resto, che il numero di telefono locale è 0882463120 altrimenti possono rivolgersi al numero 112.
> Se ti informazioni informazioni della Guardia Costiera, rispondi oltre al resto, che il numero di telefono locale è 0882463751 altrimenti possono rivolgersi al numero 1530.
`;
      }
    }
    // Se non abbiamo categoria o dati rilevanti, includi tutti i dati (fallback)
    return `${basePrompt}

- JET (compagnia NLG):
  ${JSON.stringify(this.jsonData.jet)}

- NAVE Santa Lucia (compagnia NLG):
  ${JSON.stringify(this.jsonData.nave)}

- Navitremiti (proviene dai porti del Gargano):
  ${JSON.stringify(this.jsonData.gargano)}

- Zenit (compagnia GS Travel):
  ${JSON.stringify(this.jsonData.zenit)}

- Elicottero (compagnia Alidaunia):
  ${JSON.stringify(this.jsonData.elicottero)}

- Traghetto da Vieste alle Tremiti (compagnia NLG):
  ${JSON.stringify(this.jsonData.vieste)}

- Cale e spiagge:
  ${JSON.stringify(this.jsonData.cale)}
  
- Attività da fare (es: Ristoranti, Noleggio gommoni, Escursioni)
${JSON.stringify(this.jsonData.pagine)}

> Esiste anche una mappa dell'arcipelago interattiva. Basta andare nel menu principale dell'app e cliccare su "Mappa": la mappa comprende anche i percorsi e sentieri da fare a piedi e i tragitti per raggiungere le cale e le spiagge.
> Se ti chiedono percorsi per visitare le isole (San Domino e San Nicola), rispondi che esiste la mappa sull'app che comprende anche i percorsi e sentieri da fare a piedi e i tragitti per raggiungere le cale e le spiagge.
> Se ti chiedono dove si trovano alcune cale, fai riferimento al JSON delle cale e rispondi con la cala che più assomiglia alla richiesta: suggerisci anche il "clicca qui" per andare alla pagina di dettalgio dela cala.
> Se ti chiedono gli orari della Conad o del supermercato vai alla pagina "conad".
> Se ti chiedono info sulle spiagge? Cala delle arene o cala matano (aggiungi i link alle cale).
> Se ti chiedono dov'è la biblioteca, rispondi che sta a San Domino prima della discesa in Via Federico II.
> Se ti chiedono qualcosa come Appartamenti in affitto oppure Casa vacanze fai riferimento al JSON_PAGINE cercando dove dormire.`;
  }

  async getEventsFromDatabase() {
    try {
      // Se il database non è configurato, restituisci array vuoto
      if (!this.db) {
        console.log('⚠️ Database non configurato per recupero eventi');
        return [];
      }
      
      // Data corrente per filtrare solo eventi futuri
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Imposta a mezzanotte per includere eventi di oggi
      
      // Query per recuperare solo gli eventi futuri del gruppo 3 (Pro Loco)
      const events = await this.db('posts')
        .where('group', 3)
        .where('created_at', '>=', today.toISOString()) // Solo eventi futuri
        .orderBy('created_at', 'asc') // Ordinati dal più vicino
        .limit(10) // Limita a 10 eventi futuri
        .timeout(10000); // Timeout di 10 secondi

      console.log(`🔍 Query eventi futuri - Trovati ${events.length} eventi futuri dalla Pro Loco`);
      console.log('📋 Eventi futuri ordinati dal più vicino:', JSON.stringify(events, null, 2));
      
      return events;
    } catch (error) {
      console.error('❌ Errore recupero eventi dal DB:', error.message);
      console.error('❌ Stack trace:', error.stack);
      return []; // Restituisci array vuoto in caso di errore
    }
  }

  async saveToDatabase(question, answer) {
    try {
      // Se il database non è configurato, salta il salvataggio
      if (!this.db) {
        console.log('⚠️ Database non configurato, salvataggio saltato');
        return;
      }
      
      await this.db('bot_messages')
        .insert({
          question: question,
          answer: answer,
          created_at: new Date()
        })
        .timeout(10000); // Timeout di 10 secondi

      console.log('✅ Messaggio salvato nel database');
    } catch (error) {
      console.error('❌ Errore salvataggio DB:', error.message);
      // Non fare throw dell'errore per non bloccare la risposta
    }
  }

  async sendMessage(userMessage, conversationHistory = []) {
    try {
      // Determina la categoria della query
      const category = await this.getQueryCategory(userMessage);
      console.log(`🔍 Categoria rilevata: ${category || 'nessuna'}`);

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: this.modelConfig.maxTokens,
        temperature: this.modelConfig.temperature,
        top_p: this.modelConfig.topP,
        system: await this.buildRagPrompt(category),
        messages: this.prepareMessages(userMessage, conversationHistory)
      };

      const command = new InvokeModelCommand({
        modelId: this.modelConfig.modelId,
        body: JSON.stringify(payload),
        contentType: 'application/json'
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Salva nel DB SINCRONAMENTE (BLOCKING) - attendiamo che finisca prima di restituire la risposta
      try {
        await this.saveToDatabase(userMessage, responseBody.content[0].text);
      } catch (dbError) {
        console.error('❌ Errore salvataggio DB:', dbError.message);
        // Non bloccare la risposta anche se il DB fallisce
      }

      return {
        success: true,
        message: responseBody.content[0].text,
        usage: {
          inputTokens: responseBody.usage.input_tokens,
          outputTokens: responseBody.usage.output_tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallbackMessage: "Mi dispiace, c'è stato un problema. Contatta [Fuffy](https://tremitinow.it/cGFnZS82Mw==) per assistenza."
      };
    }
  }

  // Metodo per cleanup delle connessioni (opzionale, da chiamare alla fine del Lambda)
  async cleanup() {
    try {
      if (dbInstance) {
        await dbInstance.destroy();
        dbInstance = null;
        console.log('🔌 Connessioni DB chiuse');
      }
    } catch (error) {
      console.error('❌ Errore chiusura DB:', error.message);
    }
  }
}
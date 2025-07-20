# 🏝️ TremitiBot Bedrock - Knowledge Base Completa

## 📋 Panoramica del Progetto

**TremitiBot Bedrock** è un assistente AI specializzato per le Isole Tremiti che utilizza Amazon Bedrock con il modello Claude 3.5 Sonnet per fornire informazioni complete sui servizi turistici dell'arcipelago.

### 🎯 Obiettivo
Fornire assistenza completa ai viaggiatori delle Isole Tremiti con informazioni su:
- Orari e prenotazioni traghetti
- Servizi di trasporto (elicottero, taxi)
- Cale e spiagge
- Strutture ricettive e ristoranti
- Attività turistiche

## 🏗️ Architettura del Sistema

### Stack Tecnologico
- **Backend**: Node.js con Express.js
- **AI Model**: Amazon Bedrock (Claude 3.5 Sonnet)
- **Configurazione**: AWS SDK v3
- **Gestione Date**: Utility personalizzate
- **Frontend**: Interfaccia HTML/CSS/JS integrata

### Struttura del Progetto
```
tremitinow-bedrock/
├── src/
│   ├── app.js                 # Server Express e UI
│   ├── server.js              # Avvio server
│   ├── config/
│   │   └── bedrock.js         # Configurazione AWS Bedrock
│   ├── controllers/
│   │   └── chatController.js  # Gestione richieste API
│   ├── services/
│   │   └── tremitiBotBedrock.js # Servizio AI principale
│   ├── utils/
│   │   └── dateUtils.js       # Utility per date
│   └── data/                  # Database JSON
│       ├── json_jet.json      # Orari JET NLG
│       ├── json_nave.json     # Orari NAVE Santa Lucia
│       ├── json_gargano.json  # Orari Navitremiti
│       ├── json_zenit.json    # Orari Zenit
│       ├── json_elicottero.json # Orari elicottero
│       ├── json_cale.json     # Cale e spiagge
│       ├── json_pagine.json   # Strutture ricettive
│       └── json_traghettiinterni.json # Traghetti interni
```

## 🤖 Funzionalità del Bot

### 1. Gestione Orari Traghetti
Il bot gestisce **5 compagnie di trasporto**:

#### 🚢 JET NLG (Termoli)
- **Durata**: 60 minuti
- **Periodi**: Maggio-Settembre 2025
- **Orari principali**:
  - Termoli → Tremiti: 08:40 (tutti i giorni)
  - Tremiti → Termoli: 17:40 (tutti i giorni)
  - **Prezzi**: €21-25.50 adulti, €12.50-13.50 bambini
- **Link prenotazione**: https://tremitinow.it/cGFnZS8xMA==

#### 🚢 NAVE Santa Lucia (Termoli)
- **Durata**: 75 minuti
- **Periodi**: Aprile-Dicembre 2025
- **Orari principali**:
  - Termoli → Tremiti: 08:00, 09:00, 15:15
  - Tremiti → Termoli: 09:35, 17:00, 16:45
- **Prezzi**: €13.60-14.70 adulti
- **Link prenotazione**: https://tremitinow.it/cGFnZS8xMA==

#### 🚢 Navitremiti (Gargano)
- **Porti**: Vieste, Peschici, Rodi Garganico
- **Orari principali**:
  - Peschici → Tremiti: 09:10 (Mar, Gio, Sab)
  - Vieste → Tremiti: 08:30 (Lun, Mer, Ven, Dom)
  - Rodi → Tremiti: 08:40 (Mar, Gio, Sab)
  - Tremiti → Ritorno: 16:30 (tutti i giorni)
- **Prezzi**: €40-44 adulti, €27-29 bambini
- **Link prenotazione**: https://tremitinow.it/cGFnZS8zOA==

#### 🚢 Zenit (GS Travel)
- **Periodi**: Giugno-Agosto 2025
- **Orari principali**:
  - Termoli → Tremiti: 08:50, 08:20, 10:55, 17:20
  - Tremiti → Termoli: 17:55, 09:40, 16:10, 18:40
- **Link prenotazione**: https://tremitinow.it/cGFnZS85

#### 🚁 Elicottero Alidaunia (Foggia)
- **Durata**: 20-30 minuti
- **Periodi**: Gennaio-Dicembre 2025
- **Orari principali**:
  - Foggia → Tremiti: 08:40, 11:00, 15:10, 16:00, 18:00
  - Tremiti → Foggia: 09:10, 11:30, 15:40, 16:30, 18:30
- **Prezzi**: €31.75-63.50 adulti, €15.87-31.75 bambini
- **Link prenotazione**: https://tremitinow.it/cGFnZS81

### 2. Servizi di Trasporto Locale

#### 🚕 Taxi
- **Tommaso**: 3288418382 - https://taxi-isole-tremiti.it
- **Fabio**: 3488036023
- **Link**: https://tremitinow.it/cGFnZS8xMDk= e https://tremitinow.it/cGFnZS8xMDg=

#### ⛴️ Traghetti Interni
- **Collegamenti**: San Domino ↔ San Nicola
- **Link orari**: https://tremitinow.it/cGFnZS82

### 3. Cale e Spiagge
Il bot gestisce **58 cala** distribuite su:
- **San Domino**: 35 cala (priorità con foto)
- **Capraia**: 20 cala
- **San Nicola**: 3 cala
- **Cretaccio**: 1 cala

**Cale principali San Domino**:
- Cala delle Arene
- Cala Matano
- Cala del Sale
- Cala delle Roselle
- Cala degli Inglesi
- Cala Tonda
- Cala Tamariello

### 4. Strutture Ricettive
**Database completo** con **200+ strutture**:

#### 🏨 Hotel
- Hotel Eden, Hotel La Vela, Hotel San Domino
- Hotel Gabbiano, Hotel Kyrie, Micro Hotel Rossana
- La Tramontana, Le Viole, Villaggio Punta del Diamante

#### 🏠 B&B e Appartamenti
- Rondinelle, Antonia's Home, Lo Scrigno
- Villa Olimpia, B&B Ghibli, La Riccia
- Casa Margherita, Il Nido, Villa Paradiso

#### 🏕️ Campeggi
- Touring Club Italiano
- Villaggio Punta del Diamante

### 5. Ristoranti e Bar
**Categorie principali**:
- Ristoranti/pizzerie: Da Elio, L'Altro Faro, Architiello
- Bar: Luna Matana, La Fenice, Il Caffè della Marina
- Lidi: Benedettini, Il Pirata, Polo Nord, La Terrazza

### 6. Attività Turistiche
- **Escursioni**: 15+ operatori (Tremiti Vista Mare, Capitan Basso Tour)
- **Diving**: Only One Apnea Center, Tremiti Diving Center, Marlin Tremiti
- **Noleggio**: 12+ operatori (I Pirati, Selvaggia, La Riccia)
- **Sport**: JalApulia (SUP e canoe)

## 🔧 Configurazione Tecnica

### Variabili d'Ambiente
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_MAX_TOKENS=2000
BEDROCK_TEMPERATURE=0.3
PORT=3000
NODE_ENV=development
```

### Parametri AI
- **Modello**: Claude 3.5 Sonnet
- **Max Tokens**: 2000
- **Temperature**: 0.3 (risposte coerenti)
- **Top P**: 0.9

### API Endpoints
- `POST /api/chat` - Invia messaggio al bot
- `GET /api/health` - Status del servizio
- `GET /` - Interfaccia web di test

## 🧠 Logica del Bot

### System Prompt
Il bot utilizza un system prompt strutturato che include:

1. **Regole di normalizzazione**:
   - Sostituzione "San Domino/San Nicola/Tremiti" → "Isole Tremiti"
   - Gestione porti: Termoli, Vieste, Peschici, Rodi Garganico, Foggia
   - Normalizzazione direzioni ambigue

2. **Gestione orari**:
   - Ricerca automatica in tutte le compagnie
   - Formato Markdown per le risposte
   - Link di prenotazione integrati

3. **Servizi specifici**:
   - Taxi con contatti diretti
   - Traghetti interni
   - Cale con foto (max 10 risultati)

4. **Fallback**:
   - Contatto Fuffy per informazioni mancanti
   - Gestione errori con messaggi di supporto

### Elaborazione Date
- **Normalizzazione**: "oggi", "domani", "dopodomani" → date italiane
- **Formato**: DD/MM/YYYY
- **Calcolo dinamico** basato sulla data corrente

## 📊 Dati Disponibili

### Traghetti (5 compagnie)
- **JET**: 1 servizio, 5 periodi, 25+ orari
- **NAVE**: 1 servizio, 3 periodi, 15+ orari  
- **Navitremiti**: 1 servizio, 2 periodi, 8 rotte
- **Zenit**: 6 servizi, 6 periodi, 30+ orari
- **Elicottero**: 5 periodi, 20+ voli

### Cale (58 totali)
- **San Domino**: 35 cala (con foto)
- **Capraia**: 20 cala (con foto)
- **San Nicola**: 3 cala
- **Cretaccio**: 1 cala

### Strutture (200+)
- **Hotel**: 8 strutture
- **B&B**: 25+ strutture
- **Ristoranti**: 15+ locali
- **Bar**: 10+ locali
- **Attività**: 30+ operatori

## 🚀 Deployment

### Avvio Locale
```bash
npm install
npm start
# oppure
npm run dev
```

### Endpoints Disponibili
- **Web UI**: http://localhost:3000
- **Chat API**: http://localhost:3000/api/chat
- **Health Check**: http://localhost:3000/api/health

### Test API
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Orari traghetti domani da Termoli"}'
```

## 🔍 Esempi di Utilizzo

### Domande Supportate
- "Orari traghetti domani da Termoli"
- "Come arrivare alle Tremiti da Vieste?"
- "Quali sono le cala più belle di San Domino?"
- "Cerco un hotel per 2 persone"
- "Orari elicottero da Foggia"
- "Taxi dal porto all'hotel"
- "Ristoranti con vista mare"

### Risposte del Bot
- **Orari completi** di tutte le compagnie disponibili
- **Prezzi** aggiornati per stagione
- **Link di prenotazione** diretti
- **Foto delle cala** (quando disponibili)
- **Contatti diretti** per servizi
- **Fallback** a Fuffy per informazioni mancanti

## 🛠️ Manutenzione

### Aggiornamento Dati
I file JSON in `src/data/` possono essere aggiornati per:
- Nuovi orari traghetti
- Nuove strutture ricettive
- Modifiche prezzi
- Aggiunta cala

### Monitoraggio
- **Health check** automatico
- **Log** dettagliati delle richieste
- **Metriche** token utilizzati
- **Gestione errori** robusta

## 📞 Supporto
- **Contatto principale**: Fuffy (3408836502)
- **Email**: salvatoretremiti@icloud.com
- **Facebook**: https://www.facebook.com/fuffytremiti
- **Centro Informazioni**: San Domino, Isole Tremiti

---

*TremitiBot Bedrock v1.0 - Powered by Amazon Bedrock e Claude 3.5 Sonnet* 
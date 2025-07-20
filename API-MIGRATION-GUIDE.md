# TremitiNow API - Guida Migrazione Endpoint

## 📋 Panoramica

Gli endpoint API sono stati separati per contesto d'uso per migliorare sicurezza, performance e manutenibilità.

## 🔄 Migrazione Endpoint

### PRIMA (Endpoint Unificato)
```
https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod
```

### DOPO (Endpoint Separati per Contesto)

#### 🌐 **API Sistemi Esterni**
**Base URL:** `https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod`
- **Uso:** Sistemi esterni che inviano ticket
- **Autenticazione:** Token supplier nel header `authorization`

#### 👨‍💼 **API Dashboard React (Admin)**
**Base URL:** `https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod`
- **Uso:** Pannello amministrativo React
- **Autenticazione:** Firebase Auth (admin/operator)

#### 📱 **API App Mobile (Controllori)**
**Base URL:** `https://l3mf60peue.execute-api.eu-central-1.amazonaws.com/prod`
- **Uso:** App mobile per controllori
- **Autenticazione:** Firebase Auth (checker)

#### 🤖 **API Bot AI**
**Base URL:** `https://ijr1whuvo2.execute-api.eu-central-1.amazonaws.com/prod`
- **Uso:** Chatbot AI tramite app mobile
- **Autenticazione:** Nessuna (pubblico)

---

## 📊 Tabella Migrazione Completa

| **Client** | **Vecchio Endpoint** | **Nuovo Endpoint** | **Nuovo Path** |
|------------|---------------------|-------------------|----------------|
| **Sistema Esterno** | `POST /api/v1/tickets/submit` | `https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod` | `POST /tickets/submit` |
| **Dashboard React** | `GET /api/v1/admin/queue/status` | `https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod` | `GET /admin/queue/status` |
| **Dashboard React** | `GET /api/v1/admin/dlq/status` | `https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod` | `GET /admin/dlq/status` |
| **Dashboard React** | `POST /api/v1/admin/dlq/reprocess` | `https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod` | `POST /admin/dlq/reprocess` |
| **App Mobile** | `POST /api/v1/mobile/ticket/lookup` | `https://l3mf60peue.execute-api.eu-central-1.amazonaws.com/prod` | `POST /mobile/ticket/lookup` |
| **App Mobile** | `POST /api/v1/mobile/ticket/validate` | `https://l3mf60peue.execute-api.eu-central-1.amazonaws.com/prod` | `POST /mobile/ticket/validate` |
| **App Mobile (Bot)** | `POST /api/v1/ai/chat` | `https://ijr1whuvo2.execute-api.eu-central-1.amazonaws.com/prod` | `POST /ai/chat` |
| **App Mobile (Bot)** | `GET /api/v1/health` | `https://ijr1whuvo2.execute-api.eu-central-1.amazonaws.com/prod` | `GET /health` |

---

## 🔧 Dettagli Implementazione per Client

### 1. **Sistema Esterno - Invio Ticket**

#### ❌ Vecchio
```javascript
const response = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/tickets/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': 'cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5'
  },
  body: JSON.stringify({
    date: '2025-07-20',
    number: 'TICKET001',
    exemption: 5 // OPZIONALE
  })
});
```

#### ✅ Nuovo
```javascript
const response = await fetch('https://d8r8p6oi51.execute-api.eu-central-1.amazonaws.com/prod/tickets/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': 'cicKKKunsdaCelPx359MH7R7Zo1frUjtKO4G8xl5'
  },
  body: JSON.stringify({
    date: '2025-07-20',
    number: 'TICKET001',
    exemption: 5 // OPZIONALE
  })
});
```

**Modifiche:**
- ✅ Base URL cambiato
- ✅ Path semplificato: `/tickets/submit` invece di `/api/v1/tickets/submit`
- ✅ Autenticazione invariata
- ✅ Payload invariato (exemption sempre opzionale)

---

### 2. **Dashboard React - Amministrazione**

#### ❌ Vecchio
```javascript
// Monitor coda principale
const queueStatus = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/admin/queue/status', {
  headers: { 'authorization': firebaseToken }
});

// Monitor DLQ
const dlqStatus = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/admin/dlq/status', {
  headers: { 'authorization': firebaseToken }
});

// Riprocessa DLQ
const reprocess = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/admin/dlq/reprocess', {
  method: 'POST',
  headers: { 'authorization': firebaseToken }
});
```

#### ✅ Nuovo
```javascript
const ADMIN_API_BASE = 'https://ngfw2ilz91.execute-api.eu-central-1.amazonaws.com/prod';

// Monitor coda principale
const queueStatus = await fetch(`${ADMIN_API_BASE}/admin/queue/status`, {
  headers: { 'authorization': firebaseToken }
});

// Monitor DLQ
const dlqStatus = await fetch(`${ADMIN_API_BASE}/admin/dlq/status`, {
  headers: { 'authorization': firebaseToken }
});

// Riprocessa DLQ
const reprocess = await fetch(`${ADMIN_API_BASE}/admin/dlq/reprocess`, {
  method: 'POST',
  headers: { 'authorization': firebaseToken }
});
```

**Modifiche:**
- ✅ Base URL dedicato per admin
- ✅ Path semplificati: `/admin/*` invece di `/api/v1/admin/*`
- ✅ Autenticazione Firebase invariata

---

### 3. **App Mobile - Controllo Ticket**

#### ❌ Vecchio
```javascript
// Ricerca ticket
const lookup = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/mobile/ticket/lookup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': firebaseToken
  },
  body: JSON.stringify({ number: 'TICKET001' })
});

// Valida ticket
const validate = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/mobile/ticket/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': firebaseToken
  },
  body: JSON.stringify({
    ticketId: '12345',
    controller: 'Mario Rossi'
  })
});
```

#### ✅ Nuovo
```javascript
const MOBILE_API_BASE = 'https://l3mf60peue.execute-api.eu-central-1.amazonaws.com/prod';

// Ricerca ticket
const lookup = await fetch(`${MOBILE_API_BASE}/mobile/ticket/lookup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': firebaseToken
  },
  body: JSON.stringify({ number: 'TICKET001' })
});

// Valida ticket
const validate = await fetch(`${MOBILE_API_BASE}/mobile/ticket/validate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'authorization': firebaseToken
  },
  body: JSON.stringify({
    ticketId: '12345',
    controller: 'Mario Rossi'
  })
});
```

**Modifiche:**
- ✅ Base URL dedicato per mobile
- ✅ Path semplificati: `/mobile/*` invece di `/api/v1/mobile/*`
- ✅ Autenticazione Firebase invariata
- ✅ Payload invariati

---

### 4. **App Mobile - Bot AI**

#### ❌ Vecchio
```javascript
// Chat con bot
const chat = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Ciao, info orari traghetti' })
});

// Health check
const health = await fetch('https://fk48avuxhb.execute-api.eu-central-1.amazonaws.com/prod/api/v1/health');
```

#### ✅ Nuovo
```javascript
const BOT_API_BASE = 'https://ijr1whuvo2.execute-api.eu-central-1.amazonaws.com/prod';

// Chat con bot
const chat = await fetch(`${BOT_API_BASE}/ai/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Ciao, info orari traghetti' })
});

// Health check
const health = await fetch(`${BOT_API_BASE}/health`);
```

**Modifiche:**
- ✅ Base URL dedicato per bot
- ✅ Path semplificati: `/ai/*` e `/health` invece di `/api/v1/*`
- ✅ Nessuna autenticazione richiesta
- ✅ Payload invariati

---

## 🚀 Piano di Migrazione

### Fase 1: Aggiornamento Client
1. **Sistema Esterno:** Aggiornare URL e path per `/tickets/submit`
2. **Dashboard React:** Aggiornare tutti gli endpoint admin con nuovo base URL
3. **App Mobile:** Aggiornare endpoint mobile e bot con nuovi base URL

### Fase 2: Test
1. Testare ogni client con i nuovi endpoint
2. Verificare autenticazione funzioni correttamente
3. Controllare che i payload siano gestiti correttamente

### Fase 3: Deploy Produzione
1. Deploy simultaneo di tutti i client aggiornati
2. Monitoraggio errori nelle prime ore
3. Rollback se necessario

---

## ❗ Note Importanti

### 🔐 **Autenticazione**
- **Sistema Esterno:** Token supplier invariato
- **Dashboard React:** Token Firebase Admin/Operator invariato
- **App Mobile:** Token Firebase Checker invariato
- **Bot AI:** Pubblico, nessuna autenticazione

### 📝 **Payload**
- **Tutti i payload rimangono identici**
- **Campo `exemption` sempre opzionale**
- **Response format invariate**

### 🔄 **CORS**
- Configurazione CORS appropriata per ogni API
- Headers supportati invariati

### 📊 **Monitoraggio**
- Ogni API ha log separati
- Metriche dedicate per contesto
- Facilita debugging e performance monitoring

---

## 🆘 Troubleshooting

### Errore 403 - Unauthorized
- Verificare token Firebase valido
- Controllare header `authorization` presente

### Errore 404 - Not Found
- Verificare nuovo base URL corretto
- Controllare path senza `/api/v1` prefix

### Errore 400 - Bad Request
- Payload format invariato
- Campo `exemption` sempre opzionale

---

## 📞 Supporto

Per domande o problemi durante la migrazione:
- Verificare questa documentazione
- Testare endpoint singolarmente
- Controllare logs CloudWatch per errori dettagliati

**Data migrazione:** 20 Luglio 2025
**Versione:** 2.0.0 - API Separation
# TremitiNow AWS - Sistema Unificato

Sistema serverless completo per la gestione dei servizi turistici delle Isole Tremiti, che include gestione ticket, validazione, e assistente AI.

## 🏗️ Architettura

Il progetto combina due sistemi principali:

### 1. Sistema Gestione Ticket
- **Submission**: API per l'invio ticket dai supplier
- **Processing**: Elaborazione asincrona via SQS
- **Storage**: S3, DynamoDB e PostgreSQL
- **Validation**: Validazione ticket per controllori
- **Error Handling**: Dead Letter Queue per errori

### 2. TremitiBot AI Assistant  
- **AI Engine**: AWS Bedrock con Claude 3.5 Sonnet
- **Knowledge Base**: Database completo servizi Tremiti
- **Query Processing**: Categorizzazione intelligente richieste
- **RAG**: Recupero contestuale informazioni

## 🚀 Deployment

### Prerequisiti
```bash
# Installa dipendenze
npm install

# Configura credenziali AWS (già fatto)
aws configure list

# Verifica Serverless Framework
serverless --version
```

### Deploy Completo
```bash
# Deploy su environment di sviluppo
npm run deploy:dev

# Deploy su produzione
npm run deploy:prod

# Deploy default (dev)
npm run deploy
```

### Deploy Singole Funzioni
```bash
# Deploy solo TremitiBot
serverless deploy function -f tremiti-bot-lambda

# Deploy solo sistema ticket
serverless deploy function -f submitTickets
serverless deploy function -f processTickets_s3
```

## 📊 Monitoraggio

### Logs
```bash
# Logs TremitiBot
npm run logs -- tremiti-bot-lambda

# Logs gestione ticket
npm run logs -- submitTickets
npm run logs -- processTickets_s3

# Real-time logs
npm run logs -- tremiti-bot-lambda --tail
```

### Health Checks
```bash
# TremitiBot health
curl https://your-api-url/health

# Sistema ticket (tramite API Gateway)
curl -X POST https://your-api-url/checkQueue
```

## 🔧 Configurazione

### Environment Variables (.env)
Tutte le variabili necessarie sono già configurate:
- AWS credentials e region
- Supplier tokens (5 compagnie)
- PostgreSQL connection
- Firebase service account
- Bedrock AI configuration
- SQS queue URLs
- S3 bucket names

### Supplier Integration
Il sistema supporta 5 supplier con autenticazione token:
1. **NLG** - JET ferries da Termoli
2. **ALIDAUNIA** - Elicottero da Foggia  
3. **NAVITREMITI** - Traghetti dal Gargano
4. **GSTRAVEL** - Zenit ferries
5. **UTENTE_PRIVATO** - Utenti privati

## 🤖 TremitiBot Usage

### API Endpoint
```bash
# Invia messaggio al bot
curl -X POST https://your-api-url/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Orari traghetti domani da Termoli",
    "history": []
  }'
```

### Tipi di Query Supportate
- **Traghetti**: "Orari traghetti domani", "Come arrivare alle Tremiti"
- **Cale**: "Cala delle Arene", "Spiagge più belle"  
- **Hotel**: "Hotel a San Domino", "Dove dormire"
- **Ristoranti**: "Dove mangiare", "Ristoranti con vista mare"
- **Attività**: "Diving", "Noleggio gommoni", "Escursioni"

## 📋 Sistema Ticket

### Submit Ticket (Supplier → Sistema)
```bash
curl -X POST https://your-api-url/tickets \
  -H "Authorization: supplier-token" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-07-20",
    "number": "TKT001",
    "passenger": "Mario Rossi"
  }'
```

### Validate Ticket (App Mobile)
```bash
curl -X GET https://your-api-url/ticket/TKT001 \
  -H "Authorization: firebase-jwt-token"
```

### Queue Management
```bash
# Controlla stato coda principale
curl -X POST https://your-api-url/checkQueue

# Controlla Dead Letter Queue  
curl -X POST https://your-api-url/checkDLQ

# Riprocessa ticket da DLQ
curl -X POST https://your-api-url/replayDLQ
```

## 🛠️ Development

### Local Testing
```bash
# Test singole funzioni
npm run invoke -- tremiti-bot-lambda --data '{"body": "{\"message\": \"ciao\"}"}'

# Test con payload personalizzato
echo '{"message": "orari traghetti"}' > test.json
npm run invoke -- tremiti-bot-lambda --path test.json
```

### Database Operations
Il sistema utilizza:
- **PostgreSQL**: Dati principali ticket e conversazioni bot
- **DynamoDB**: Cache e dati rapidi
- **S3**: Storage file e backup ticket

### Error Handling
- Retry automatico per errori transitori
- Dead Letter Queue per ticket non processabili
- Fallback a contatto umano per bot
- Logging completo su CloudWatch

## 📞 Support

### Contatti Tecnici
- **Repository**: https://github.com/giuseeFG/tremitinow-aws
- **CloudWatch**: Console AWS per logs e metriche
- **Database**: PostgreSQL per dati persistenti

### Contatti Business  
- **Fuffy**: 3408836502 (Centro Informazioni Tremiti)
- **Email**: salvatoretremiti@icloud.com

## 🔄 Backup & Recovery

### Backup Automatico
- PostgreSQL: Backup giornaliero automatico
- S3: Versioning abilitato per tutti i file
- DynamoDB: Point-in-time recovery attivo

### Recovery
```bash
# Ripristino da backup
aws s3 cp s3://backup-bucket/date/ . --recursive

# Ristart servizi
npm run deploy
```

---

**TremitiNow AWS v2.0** - Sistema unificato per la gestione completa dei servizi turistici delle Isole Tremiti 🏝️
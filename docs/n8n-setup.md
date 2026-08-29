# Setup manual del workflow de n8n

El JSON del workflow (`n8n/workflow.json`) no incluye credenciales — n8n nunca
exporta secretos en el JSON. Estos pasos son manuales, se hacen una sola vez
desde la UI de n8n en `http://localhost:5678` (con `docker compose up`
corriendo).

## 1. Importar el workflow

1. Abrí `http://localhost:5678` y creá tu owner account si es la primera vez.
2. Menú (☰) → **Import from File**.
3. Seleccioná `n8n/workflow.json` de este repo.
4. Se crea el workflow **"CrazySupportHub - Ticket Enrichment"** con 5 nodos:
   `Webhook` → `Classify Ticket` → `Message a model` (Gemini) → `Build AI Reply`
   → `Send Callback`, **inactivo**.

## 2. Crear las 2 credenciales "Header Auth"

El workflow referencia dos credenciales `httpHeaderAuth` por nombre que no
existen todavía en tu instancia — al abrir el workflow importado, n8n te va a
pedir que las selecciones o crees. Ambas credenciales usan **el mismo valor**:
el de `N8N_WEBHOOK_SECRET` en `backend/.env`.

### a) `Webhook Secret (incoming)` — valida al backend cuando llama al webhook

1. Abrí el nodo **Webhook**.
2. En el campo de credencial (Authentication → Header Auth), click **Create New**.
3. Nombre de la credencial: `Webhook Secret (incoming)`.
4. **Name** (del header): `X-Webhook-Secret`.
5. **Value**: el valor exacto de `N8N_WEBHOOK_SECRET` (el mismo que usa el
   backend para firmar la llamada saliente).
6. Guardar.

### b) `Webhook Secret (outgoing)` — el que n8n manda al llamar de vuelta al backend

1. Abrí el nodo **Send Callback**.
2. En Authentication → Generic Auth Type → Header Auth, click **Create New**.
3. Nombre de la credencial: `Webhook Secret (outgoing)`.
4. **Name**: `X-Webhook-Secret`.
5. **Value**: el mismo valor de `N8N_WEBHOOK_SECRET` que en el paso anterior.
6. Guardar.

> Los nombres de credencial no son mágicos — solo tienen que quedar
> seleccionados en cada nodo. Podés nombrarlas distinto si preferís, mientras
> el **valor** del header sea el mismo `N8N_WEBHOOK_SECRET` en los dos.

## 3. Crear la credencial de Google Gemini

El nodo **Message a model** (tipo `@n8n/n8n-nodes-langchain.googleGemini`, modelo
`gemini-3-flash-preview`) genera `suggestedReply` — necesita su propia credencial,
distinta de las de `Header Auth`.

1. Conseguí una API key gratis de Gemini en **Google AI Studio**
   (`https://aistudio.google.com/app/apikey`, con cualquier cuenta de Google) →
   **Create API key**. El free tier no pide tarjeta, solo tiene límites de
   cuota/rate por minuto y por día — de sobra para probar este flujo.
2. Abrí el nodo **Message a model** en el workflow importado.
3. En el campo de credencial, click **Create New**.
4. Tipo de credencial a buscar: **Google Gemini(PaLM) Api**.
5. Pegá la API key del paso 1 en el campo **API Key**.
6. Guardar.

Si esta credencial falta o la API key es inválida, el nodo tiene configurado
**"On Error: Continue"** — el workflow no se cuelga, el ticket igual se
clasifica por keywords (`Classify Ticket`) y solo `suggestedReply` queda sin
valor (ver README, sección "Uso de IA").

## 4. URL del callback (ya no requiere configuración)

El nodo **Send Callback** apunta al string literal
`http://backend:3000/webhooks/n8n/enrichment` (el nombre de servicio del
backend en la red de Docker Compose). Originalmente se pensó referenciarlo
como `{{$env.BACKEND_CALLBACK_URL}}`, pero esta instancia de n8n bloquea el
acceso a variables de entorno desde expresiones de nodo por defecto, así que
se hardcodeó directamente en el workflow — no hay ninguna variable que
configurar ni verificar acá.

Si en el futuro se vuelve a usar `$env` (por ejemplo habilitando
`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`), `docker-compose.yml` ya trae
`BACKEND_CALLBACK_URL` definida en el servicio `n8n` por si hace falta
retomarla.

## 5. Activar el workflow

Toggle **Active** arriba a la derecha del editor del workflow. Con el
workflow inactivo, el path `/webhook/ticket-enrichment` no existe todavía y
el backend recibe 404 al intentar notificar (el ticket igual se crea y queda
en `pending` — es el comportamiento esperado documentado en el README).

## 6. Probar el flujo completo

1. Creá un ticket vía la API (o el frontend) autenticado como agent o admin.
2. El backend dispara el webhook saliente → si n8n respondió 2xx, el ticket
   pasa a `enrichmentStatus: "processing"`.
3. El nodo `Classify Ticket` clasifica por keywords, `Message a model` le pide
   a Gemini una `suggestedReply` (y refina `priority`/`category` si el modelo
   propone algo válido), `Build AI Reply` arma el payload final y
   `Send Callback` llama de vuelta a `POST /webhooks/n8n/enrichment`.
4. El ticket debería terminar en `enrichmentStatus: "done"` con
   `priority`/`category`/`tags`/`suggestedReply` completados (podés
   confirmarlo con `GET /tickets/:id`, o revisando la fila en Postgres).

Podés seguir la ejecución en n8n desde **Executions** en el menú lateral para
ver qué datos entraron y salieron de cada nodo.

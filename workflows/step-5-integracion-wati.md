---
description:  Motor de Envío (Outbound WATI V1)
auto_execution_mode: 3
---

# Step 5 — Conexión a la API de WATI

**Objetivo:** Disparar el mensaje real vía HTTP y guardar el registro localmente.

**Instrucciones para Cascade:**
1. **Cliente API:** Crea `frontend/api/watiClient.ts`.
2. **Petición HTTP:** Implementa el POST a `https://{TU_WATI_ENDPOINT}/api/v1/sendSessionMessage/{whatsappNumber}` [5].
   * **REGLA CRÍTICA:** La documentación V1 de WATI exige que el texto pase como **Query Parameter** (`?messageText=...`), NO en el body JSON. La longitud máxima es 4096 caracteres [5].
3. **Sincronización:** En `MessageInput.tsx`, al presionar "Enviar":
   * Ejecuta el POST a WATI.
   * Si el status es 200 OK, utiliza la API de Airtable (`base.getTable('Interacciones WATI').createRecordAsync()`) para escribir el mensaje en la base de datos local y que aparezca inmediatamente en el `ChatFeed`.
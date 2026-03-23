---
description: Lectura de Esquema con MCP y Tipado
auto_execution_mode: 1
---

# Step 2 — Modelado de Datos vía MCP

**Objetivo:**
 Leer la estructura real de Airtable y generar las interfaces TypeScript.

**Instrucciones para Cascade:**
1. **Lectura MCP:** Usa tu conexión MCP activa para leer la estructura de las tablas `Contacts` e `Interacciones WATI`.
2. **Tipos TypeScript:** Crea `frontend/utils/types.ts` con interfaces como `ContactRecord` y `MessageRecord`.
3. **Hook de Lectura:** Crea `frontend/hooks/useChatData.ts`. 
   * *Nota Técnica:* Dado que el SDK actualmente tiene limitaciones para usar un "Data Source" nativo multi-tabla desde la UI de configuración [8, 9], utiliza los hooks `useBase` y `useRecords` de `@airtable/blocks/ui` directamente en el código para consultar ambas tablas simultáneamente.
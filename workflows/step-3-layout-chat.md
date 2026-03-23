---
description: Construcción de la UI "Split Screen" nativa
auto_execution_mode: 3
---

# Step 3 — Layout Principal (Contactos y Chat)

*Objetivo:** Construir la interfaz de chat emulando el comportamiento del video, utilizando los componentes de diseño de Airtable.

**Instrucciones para Cascade:**
1. **Contenedor Principal:** En `index.tsx`, usa `<Box display="flex" height="100vh">`.
2. **Panel de Contactos (Izquierda):** Crea `frontend/components/ContactList.tsx`. Usa `useRecords` para iterar sobre la tabla Contacts. Cada item debe actualizar un estado `selectedContactId`.
3. **Panel de Chat (Derecha):** Crea `frontend/components/ChatFeed.tsx`. Filtra los registros de `Interacciones WATI` que pertenezcan al `selectedContactId`. Renderiza las burbujas aplicando las directrices del `design-system.md` (Verde para salida, Gris para entrada).
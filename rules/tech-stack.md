---
trigger: always_on
---

### Tech Stack & Arquitectura: Airtable WATI Chat Extension
Este proyecto NO es una app web tradicional, es una **Airtable Interface Extension**. Todo el código debe escribirse para ejecutarse dentro del entorno de Airtable.

#### Lenguajes y Herramientas Base
* **Entorno:** Node.js v22 o superior [2].
* **Framework:** React + TypeScript.
* **SDK:** Airtable Blocks SDK / Interface Extensions SDK (`@airtable/block-cli`) [2, 3].
* **Conexión Externa:** Fetch API nativa del navegador para HTTP Requests.

#### Convenciones de Código y Limitaciones
* **Componentes UI:** Obligatorio utilizar los componentes nativos de `@airtable/blocks/ui` (ej. `<Box>`, `<Text>`, `<Input>`, `<Button>`) en lugar de HTML puro, para asegurar que el diseño coincida con el ecosistema Airtable [4].
* **Gestión de Estado:** React Hooks (`useState`, `useEffect`).
* **Reactividad:** Utilizar `useRecords` y `useBase` del SDK de Airtable para leer datos. Cuando los datos cambien en Airtable (por un webhook entrante), la UI debe re-renderizarse sola gracias a estos hooks.
* **Llamadas API (WATI):** El envío de mensajes se hará desde el cliente React hacia la API V1 de WATI, enviando el texto como Query Parameter `messageText` [5].
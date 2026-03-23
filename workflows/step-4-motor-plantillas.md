---
description: Lógica Condicional y Tagging Dinámico
auto_execution_mode: 2
---

# Step 4 — Motor de Plantillas y Variables

**Objetivo:** Inyectar datos dinámicos en el área de texto.

**Instrucciones para Cascade:**
1. **Componente de Input:** Crea `frontend/components/MessageInput.tsx` con un `<Input>` de Airtable UI y un botón de enviar.
2. **Parser de Variables:** Crea `frontend/utils/templateParser.ts`. Escribe una función que reciba el texto y el registro del contacto activo, y reemplace variables como `{{Nombre}}` o `{{Estado del Pedido}}`.
3. **Lógica Condicional:** Si el usuario teclea el atajo "/estado", el script debe evaluar: si el estado es "Enviado", inyecta el Tracking ID. Si es "Pendiente", inyecta un texto distinto sin tracking (replicando la lógica del video).
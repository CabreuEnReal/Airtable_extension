---
description: Verificación estricta del ambiente de Airtable SDK
auto_execution_mode: 1
---

# Step 0 — Verificación e instalación del entorno

**Objetivo:**
Verificar que el entorno local cumple con los requisitos estrictos de Airtable para desarrollar Extensiones de Interfaz [2].

**Instrucciones para Cascade:**
1. **Verificación de Node.js:** Verifica si Node.js está instalado y si la versión activa es **v22.x** o superior [2]. Si no lo es, avisa al usuario.
2. **Instalación del CLI:** Ejecuta en la terminal: `npm install -g @airtable/block-cli` para instalar la herramienta global.
3. **Verificación MCP:** Confirma con el usuario si ya tiene configurado el servidor MCP de Airtable (Activepieces o felores) en Windsurf para darle contexto a la IA de la base de datos [6, 7].
4. **Resumen Ejecutivo:**
   * Node.js Version (>=22): ✅/❌
   * @airtable/block-cli instalado: ✅/❌
   * MCP Activado: ✅/❌

**Reglas Críticas:**
* Si Node es < 22, DETÉN el proceso y pide actualizar [2].
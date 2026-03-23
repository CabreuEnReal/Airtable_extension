---
trigger: always_on
---

### Sistema de Diseño: "Airtable Native Chat"
La interfaz debe sentirse como una parte nativa de Airtable, utilizando sus tokens de diseño a través del paquete `@airtable/blocks/ui`.

#### 1. Paleta de Colores (Airtable UI)
* Utiliza la paleta `colors` exportada de `@airtable/blocks/ui`.
* **Burbujas Salientes (WATI/Agente):** Fondo verde suave (`colors.GREEN_LIGHT_1` o similar), texto oscuro. Alineadas a la derecha.
* **Burbujas Entrantes (Cliente):** Fondo gris suave (`colors.GRAY_LIGHT_2`), texto oscuro. Alineadas a la izquierda.
* **Superficies:** Paneles laterales con borde sutil (`border="thick"` con color `colors.GRAY_LIGHT_1`).

#### 2. Layout Philosophy (Split Screen)
* **Pantalla Dividida Flex:** 
  * Panel Izquierdo (30%): Lista de Contactos (Buscador y cards clickeables).
  * Panel Derecho (70%): Ventana de Chat activa.
* **Input Area:** Fondo fijo en la parte inferior del Panel Derecho, con un `<Input>` expansible y un `<Button icon="send">` alineado a la derecha.
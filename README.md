# Card Companion

Credit Card Payment Tracker

Crea una aplicación web moderna, responsive y enfocada en uso personal para registrar pagos de tarjetas de crédito.

Objetivo

La aplicación debe permitirme administrar varias tarjetas de crédito, registrar pagos realizados, almacenar comprobantes, visualizar fechas importantes y consultar estadísticas de mis gastos.

La interfaz debe ser minimalista, rápida y optimizada para dispositivos móviles.

Tecnologías

React

TypeScript

Tailwind CSS

Supabase como base de datos y almacenamiento de imágenes

Diseño moderno tipo dashboard

Modo claro y oscuro

Autenticación

Implementar login simple mediante correo electrónico y contraseña usando Supabase Auth.

Cada usuario únicamente puede visualizar sus propios datos.

Módulo de Tarjetas

Permitir crear, editar y eliminar tarjetas.

Campos:

Nombre de la tarjeta

Banco

Últimos 4 dígitos

Color identificador

Límite de crédito

Fecha de corte

Fecha límite de pago

Mostrar las tarjetas en formato de tarjetas visuales.

Ejemplo:

BBVA Azul

Límite: $50,000

Corte: 25 de cada mes

Pago: 15 de cada mes

Registro de Pagos

Crear formulario de registro rápido.

Campos:

Tarjeta (selector)

Fecha de pago

Botón "Hoy"

Monto pagado

Notas opcionales

Comprobante de pago (imagen)

Al guardar:

Registrar el movimiento

Guardar la imagen en Supabase Storage

Asociar el pago a la tarjeta seleccionada

Historial de Pagos

Mostrar tabla con:

Fecha

Tarjeta

Monto

Notas

Comprobante

Permitir:

Buscar

Filtrar por tarjeta

Filtrar por rango de fechas

Editar registro

Eliminar registro

Dashboard

Mostrar indicadores principales:

KPIs

Total pagado este mes

Total pagado este año

Número de pagos registrados

Próximo vencimiento

Gráficas

Utilizar Recharts.

Mostrar:

Pagos por mes

Gráfica de barras.

Pagos por tarjeta

Gráfica circular.

Evolución de pagos

Gráfica de líneas.

Alertas

Crear sección de alertas.

Mostrar automáticamente:

Tarjetas cuyo corte sea dentro de 3 días.

Tarjetas cuyo vencimiento sea dentro de 3 días.

Tarjetas vencidas.

Mostrar alertas visuales destacadas en el dashboard.

Exportación

Agregar botón Exportar.

Opciones:

Excel (.xlsx)

CSV

Exportar:

Fecha | Tarjeta | Monto | Notas

OCR de Comprobantes

Agregar botón "Analizar comprobante".

Al subir una imagen:

Utilizar Gemini o OpenAI Vision para intentar detectar:

Fecha del pago

Monto pagado

Autocompletar automáticamente el formulario.

Si no se detecta información, permitir captura manual.

Diseño

Inspirarse en aplicaciones fintech modernas.

Características:

Sidebar lateral

Dashboard principal

Tarjetas visuales

Colores elegantes

Responsive móvil

Animaciones suaves

La prioridad es simplicidad, velocidad y facilidad de captura de pagos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/009c17d3-6c2e-464c-9e20-77835b8cf809).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

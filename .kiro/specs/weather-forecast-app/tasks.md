# Implementation Plan: weather-forecast-app

## Overview

Implementación de una SPA estática (HTML/CSS/TypeScript vanilla) que permite al usuario buscar el pronóstico del clima de una ciudad. La aplicación consulta la Geocoding API y la Forecast API de Open-Meteo sin backend propio. Las capas son: Presentación → WeatherController → GeocodingService / ForecastService → Clientes HTTP. El framework de testing es Vitest + fast-check.

## Tasks

- [x] 1. Configurar la estructura del proyecto y la cadena de herramientas
  - Inicializar el proyecto con `npm init` y configurar TypeScript (`tsconfig.json`) con modo estricto.
  - Instalar y configurar Vitest como test runner; instalar fast-check para property-based testing.
  - Instalar Testing Library (`@testing-library/dom`) para pruebas de componentes UI.
  - Crear la estructura de carpetas: `src/clients/`, `src/services/`, `src/components/`, `src/utils/`, `src/types/`.
  - Crear el punto de entrada `index.html` y `src/main.ts`.
  - _Requisitos: 1.1, 1.2_

- [x] 2. Definir tipos e interfaces centrales
  - [x] 2.1 Crear el archivo `src/types/index.ts` con todas las interfaces y tipos del dominio
    - Definir `Coordinates`, `WeatherData`, `AppState`.
    - Definir los tipos discriminados `GeocodingResult`, `GeocodingError`, `ForecastResult`, `ForecastError`.
    - Exportar todos los tipos para su uso en el resto de capas.
    - _Requisitos: 2.2, 3.2, 5.1, 5.2_

- [x] 3. Implementar los clientes HTTP
  - [x] 3.1 Implementar `src/clients/GeocodingClient.ts`
    - Construir la URL hacia `https://geocoding-api.open-meteo.com/v1/search` con los parámetros `name` (URL-encoded) y `count=1`.
    - Implementar timeout de 10 segundos con `AbortController` y `setTimeout`.
    - Retornar la respuesta cruda (`Response`) o lanzar error de red/timeout.
    - _Requisitos: 2.1, 2.4_

  - [x] 3.2 Escribir prueba de propiedad para GeocodingClient — URL de geocodificación
    - **Propiedad 3: Construcción correcta de la URL de Geocodificación**
    - Usar `fc.string({ minLength: 1 })` para generar nombres de ciudad arbitrarios.
    - Verificar que la URL resultante contenga el nombre URL-encoded como parámetro `name` y el parámetro `count=1`.
    - **Valida: Requisito 2.1**

  - [x] 3.3 Implementar `src/clients/ForecastClient.ts`
    - Construir la URL hacia `https://api.open-meteo.com/v1/forecast` con `latitude`, `longitude` y `current=temperature_2m,relative_humidity_2m,precipitation`.
    - Implementar timeout de 10 segundos con `AbortController` y `setTimeout`.
    - Retornar la respuesta cruda (`Response`) o lanzar error de red/timeout.
    - _Requisitos: 3.1, 3.3_

  - [x] 3.4 Escribir prueba de propiedad para ForecastClient — URL de pronóstico
    - **Propiedad 6: Construcción correcta de la URL de Pronóstico**
    - Usar `fc.tuple(fc.float({ min: -90, max: 90 }), fc.float({ min: -180, max: 180 }))` para generar pares de coordenadas.
    - Verificar que la URL contenga `latitude`, `longitude` y el parámetro `current` con las tres variables requeridas.
    - **Valida: Requisito 3.1**

- [x] 4. Implementar GeocodingService
  - [x] 4.1 Implementar `src/services/GeocodingService.ts`
    - Recibir `cityName: string` y llamar a `GeocodingClient`.
    - Validar que `results` exista y no esté vacío; si lo está, retornar `{ success: false, error: { type: 'CITY_NOT_FOUND' } }`.
    - Validar que `results[0].latitude` y `results[0].longitude` sean valores numéricos presentes; si alguno falta o es nulo, retornar `CITY_NOT_FOUND`.
    - Mapear `results[0]` a `Coordinates` sin transformar los valores.
    - Capturar errores de red y timeout y retornar los tipos de error correspondientes.
    - Capturar respuestas HTTP no-2xx y retornar `SERVICE_ERROR` con el código de estado.
    - Capturar fallos de parseo JSON y retornar `INVALID_RESPONSE`.
    - _Requisitos: 2.2, 2.3, 2.4, 2.6, 5.1, 5.4, 5.5_

  - [x] 4.2 Escribir prueba de propiedad para GeocodingService — extracción de coordenadas
    - **Propiedad 4: Extracción de coordenadas del primer resultado**
    - Usar `fc.record({ latitude: fc.float(), longitude: fc.float(), name: fc.string() })` para generar resultados de API válidos.
    - Verificar que los valores extraídos sean numéricamente iguales a los del primer elemento sin ninguna transformación.
    - **Valida: Requisitos 2.2, 5.1**

  - [x] 4.3 Escribir prueba de propiedad para GeocodingService — coordenadas faltantes
    - **Propiedad 5: Validación de campos de coordenadas faltantes**
    - Usar `fc.record({ latitude: fc.oneof(fc.constant(null), fc.constant(undefined)), longitude: fc.oneof(fc.constant(null), fc.constant(undefined)) })` para generar resultados con campos ausentes.
    - Verificar que el resultado sea `CITY_NOT_FOUND`.
    - **Valida: Requisito 2.6**

  - [x] 4.4 Escribir prueba de propiedad para GeocodingService — respuestas HTTP no-2xx
    - **Propiedad 8 (parte Geocoding): Respuestas HTTP no-2xx siempre generan error**
    - Usar `fc.integer({ min: 300, max: 599 })` para generar códigos de estado no exitosos.
    - Verificar que el resultado sea `{ success: false }` y que el error identifique el servicio de geocodificación.
    - **Valida: Requisitos 3.4, 5.4**

  - [x] 4.5 Escribir pruebas unitarias para GeocodingService
    - Probar: respuesta con 0 resultados → `CITY_NOT_FOUND`.
    - Probar: error de red → `NETWORK_ERROR`.
    - Probar: timeout simulado → `TIMEOUT`.
    - Probar: respuesta exitosa con un resultado válido → `{ success: true, data: Coordinates }`.
    - _Requisitos: 2.2, 2.3, 2.4_

- [x] 5. Implementar ForecastService
  - [x] 5.1 Implementar `src/services/ForecastService.ts`
    - Recibir `lat: number, lon: number` y llamar a `ForecastClient`.
    - Validar que `current.temperature_2m`, `current.relative_humidity_2m` y `current.precipitation` sean valores numéricos presentes (no nulos ni undefined); si alguno falta, retornar `{ success: false, error: { type: 'INCOMPLETE_DATA' } }`.
    - Mapear `current` a `WeatherData` sin transformar los valores crudos.
    - Capturar errores de red, timeout, HTTP no-2xx e `INVALID_RESPONSE` de forma análoga a `GeocodingService`.
    - _Requisitos: 3.2, 3.3, 3.4, 3.5, 5.2, 5.4, 5.5_

  - [x] 5.2 Escribir prueba de propiedad para ForecastService — round-trip de parseo
    - **Propiedad 7: Round-trip de parseo de la respuesta Forecast → WeatherData**
    - Usar `fc.record({ temperature_2m: fc.float(), relative_humidity_2m: fc.float(), precipitation: fc.float() })` para generar objetos `current` válidos.
    - Verificar que los valores en `WeatherData` sean numéricamente iguales a los del JSON crudo.
    - **Valida: Requisitos 3.2, 5.2**

  - [x] 5.3 Escribir prueba de propiedad para ForecastService — campos nulos generan error de datos incompletos
    - **Propiedad 10: Campos meteorológicos faltantes generan error de datos incompletos**
    - Generar combinaciones de objetos `current` donde al menos uno de los tres campos sea `null`, `undefined` o esté ausente.
    - Verificar que el resultado sea `{ success: false, error: { type: 'INCOMPLETE_DATA' } }`.
    - **Valida: Requisito 3.5**

  - [x] 5.4 Escribir prueba de propiedad para ForecastService — respuestas HTTP no-2xx
    - **Propiedad 8 (parte Forecast): Respuestas HTTP no-2xx siempre generan error**
    - Usar `fc.integer({ min: 300, max: 599 })` para generar códigos de estado no exitosos.
    - Verificar que el resultado sea `{ success: false }` y que el error identifique el servicio de pronóstico.
    - **Valida: Requisitos 3.4, 5.4**

  - [x] 5.5 Escribir prueba de propiedad para ForecastService — 2xx con cuerpo inválido
    - **Propiedad 9 (parte Forecast): Respuestas 2xx con cuerpo inválido generan error**
    - Generar strings malformados u objetos sin los campos requeridos del JSON de Forecast.
    - Verificar que el resultado sea `{ success: false, error: { type: 'INVALID_RESPONSE' } }`.
    - **Valida: Requisito 5.5**

  - [x] 5.6 Escribir pruebas unitarias para ForecastService
    - Probar: error de red → `NETWORK_ERROR`.
    - Probar: timeout simulado → `TIMEOUT`.
    - Probar: respuesta exitosa con todos los campos presentes → `{ success: true, data: WeatherData }`.
    - _Requisitos: 3.2, 3.3, 3.4, 3.5_

- [x] 6. Punto de control — Verificar servicios y clientes
  - Asegurarse de que todas las pruebas de los módulos `clients/` y `services/` pasen sin errores. Consultar al usuario si surge alguna duda.

- [x] 7. Implementar utilidades de formateo
  - [x] 7.1 Implementar `src/utils/formatters.ts`
    - Exportar `formatTemperature(value: number): string` → `value.toFixed(1) + ' °C'`.
    - Exportar `formatHumidity(value: number): string` → `Math.round(value) + ' %'`.
    - Exportar `formatPrecipitation(value: number): string` → `value.toFixed(1) + ' mm'`.
    - _Requisitos: 5.3_

  - [x] 7.2 Escribir prueba de propiedad para formatters — formateo numérico correcto
    - **Propiedad 11: Formateo numérico correcto de los valores del clima**
    - Usar `fc.float()` para temperatura y precipitación; verificar que la cadena resultante tenga como máximo 1 dígito decimal.
    - Usar `fc.float()` para humedad; verificar que la cadena resultante no contenga punto decimal.
    - **Valida: Requisito 5.3**

- [x] 8. Implementar componentes de UI
  - [x] 8.1 Implementar `src/components/CitySearchForm.ts`
    - Renderizar el campo `City_Input` con `maxlength="100"` y el botón de envío.
    - Manejar el evento `submit` del formulario y el evento `keydown` para la tecla Enter en `City_Input`.
    - Mostrar mensaje de validación inline cuando la entrada esté vacía o sea solo whitespace.
    - Emitir un callback `onSearch(cityName: string)` hacia el controlador con el valor recortado.
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Escribir prueba de propiedad para CitySearchForm — rechazo de entradas de solo whitespace
    - **Propiedad 1: Rechazo de entradas de solo whitespace**
    - Usar `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` para generar strings de solo whitespace (incluido el vacío).
    - Verificar que el callback `onSearch` no se invoque y que se muestre el mensaje de validación.
    - **Valida: Requisitos 1.3, 1.4, 2.5**

  - [x] 8.3 Escribir prueba de propiedad para CitySearchForm — trim antes de enviar
    - **Propiedad 2: Trim del nombre de ciudad antes de enviar**
    - Usar strings con whitespace en los extremos pero con al menos un carácter no-whitespace en el centro.
    - Verificar que el valor recibido en el callback `onSearch` sea igual a `cityName.trim()`.
    - **Valida: Requisito 1.5**

  - [x] 8.4 Escribir pruebas unitarias para CitySearchForm
    - Probar: renderizado del campo con `maxlength=100`.
    - Probar: envío con clic en el botón.
    - Probar: envío con tecla Enter mientras `City_Input` está enfocado.
    - Probar: `City_Input` permanece accesible después de un error.
    - _Requisitos: 1.1, 1.2, 1.6_

  - [x] 8.5 Implementar `src/components/WeatherDisplay.ts`
    - Renderizar nombre de ciudad, temperatura (°C), humedad (%) y precipitación (mm) usando las funciones de `formatters.ts`.
    - Aplicar fallback al nombre ingresado por el usuario si `cityName` está vacío en la respuesta de la API.
    - Exponer un método `clear()` para limpiar el contenido del display.
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 8.6 Escribir prueba de propiedad para WeatherDisplay — display contiene todos los campos con unidades
    - **Propiedad 12: Weather_Display contiene todos los campos con sus unidades**
    - Usar `fc.record({ temperature: fc.float(), humidity: fc.float(), precipitation: fc.float() })` para generar objetos `WeatherData` arbitrarios.
    - Verificar que el HTML renderizado contenga el nombre de ciudad, el valor de temperatura seguido de "°C", humedad seguido de "%" y precipitación seguido de "mm".
    - **Valida: Requisitos 4.1, 4.2, 4.3, 4.4**

  - [x] 8.7 Implementar `src/components/LoadingIndicator.ts`
    - Exponer métodos `show()` y `hide()` para controlar la visibilidad del indicador.
    - _Requisitos: 1.5, 4.5_

  - [x] 8.8 Implementar `src/components/ErrorMessage.ts`
    - Recibir un string de mensaje y renderizarlo en la zona de errores de la UI.
    - Exponer un método `clear()` para limpiar mensajes previos.
    - _Requisitos: 1.3, 1.4, 1.6, 2.3, 2.4, 3.3, 3.4, 3.5_

- [x] 9. Implementar WeatherController
  - [x] 9.1 Implementar `src/WeatherController.ts`
    - Orquestar el flujo completo: recibir `cityName` desde `CitySearchForm`, limpiar estado previo, mostrar `LoadingIndicator`, llamar a `GeocodingService`, luego a `ForecastService`, y actualizar la UI según el resultado.
    - Limpiar el `WeatherDisplay` y el `ErrorMessage` al inicio de cada nueva búsqueda.
    - Ocultar el `LoadingIndicator` una vez recibida la respuesta o el error de `ForecastService`.
    - Mantener `City_Input` accesible ante cualquier error.
    - _Requisitos: 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 9.2 Escribir prueba de propiedad para WeatherController — limpieza del display al iniciar nueva búsqueda
    - **Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda**
    - Simular un estado previo con datos en `WeatherDisplay` y lanzar una nueva búsqueda con mocks de servicios.
    - Verificar que `WeatherDisplay.clear()` se invoque antes de recibir la respuesta de `ForecastService`.
    - **Valida: Requisito 4.6**

  - [x] 9.3 Escribir pruebas unitarias para WeatherController
    - Probar: flujo exitoso completo (geocoding → forecast → display renderizado).
    - Probar: `GeocodingService` retorna `CITY_NOT_FOUND` → mensaje correcto en `ErrorMessage`.
    - Probar: `ForecastService` retorna `INCOMPLETE_DATA` → mensaje correcto en `ErrorMessage`.
    - Probar: indicador de carga aparece al iniciar y desaparece al completar (éxito y error).
    - _Requisitos: 1.5, 4.5_

- [x] 10. Punto de control — Verificar controlador y componentes UI
  - Asegurarse de que todas las pruebas de `components/` y `WeatherController` pasen. Consultar al usuario si surge alguna duda.

- [x] 11. Conectar capas y construir la SPA final
  - [x] 11.1 Conectar todo en `src/main.ts`
    - Instanciar `GeocodingClient`, `ForecastClient`, `GeocodingService`, `ForecastService`, los componentes UI y `WeatherController`.
    - Montar los componentes en el DOM del `index.html`.
    - Registrar el callback `onSearch` de `CitySearchForm` hacia `WeatherController`.
    - _Requisitos: 1.1, 1.2, 4.5_

  - [x] 11.2 Completar `index.html` con el marcado base y estilos CSS
    - Añadir la estructura HTML semántica: formulario de búsqueda, zona de indicador de carga, zona de errores y zona de display del clima.
    - Añadir estilos CSS básicos en `src/styles.css` que aseguren legibilidad y accesibilidad (contraste de color, foco visible, tamaño de fuente adecuado).
    - _Requisitos: 1.1, 4.1, 4.2, 4.3, 4.4_

  - [x] 11.3 Escribir pruebas de integración de extremo a extremo
    - Usar mocks de `GeocodingClient` y `ForecastClient` para simular flujos completos.
    - Probar el flujo exitoso: búsqueda → geocoding → forecast → datos visibles en el DOM.
    - Probar el flujo de error: geocoding falla → mensaje de error visible, `City_Input` accesible.
    - _Requisitos: 1.5, 1.6, 4.1, 4.5_

- [x] 12. Punto de control final — Verificar suite completa de pruebas
  - Ejecutar `vitest --run` y asegurarse de que todas las pruebas (unitarias, de propiedad e integración) pasen sin errores. Consultar al usuario si surge alguna duda.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para una entrega MVP más rápida.
- Cada tarea referencia los requisitos específicos que cubre para facilitar la trazabilidad.
- Los puntos de control garantizan validación incremental antes de avanzar a la siguiente capa.
- Las pruebas de propiedad usan fast-check con mínimo 100 iteraciones (configuración predeterminada).
- Las pruebas de propiedad y las pruebas unitarias son complementarias: las primeras validan invariantes universales y las segundas validan escenarios concretos y casos de borde.
- El parámetro de humedad en la URL de la Forecast API usa el nombre actual `relative_humidity_2m` (el requirements.md menciona el nombre legacy `relativehumidity_2m`; se usa el nombre actual para garantizar compatibilidad con la API).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "3.3"] },
    { "id": 2, "tasks": ["3.2", "3.4", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4", "5.5", "5.6", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1", "8.5", "8.7", "8.8"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "8.6"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] },
    { "id": 8, "tasks": ["11.1", "11.2"] },
    { "id": 9, "tasks": ["11.3"] }
  ]
}
```

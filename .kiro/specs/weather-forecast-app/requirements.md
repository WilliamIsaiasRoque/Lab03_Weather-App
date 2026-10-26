# Requirements Document

## Introduction

Esta feature describe una aplicación web que permite al usuario ingresar el nombre de una ciudad y obtener el pronóstico del clima actual. La aplicación utiliza la API de geocodificación de Open-Meteo para convertir el nombre de la ciudad en coordenadas geográficas (latitud y longitud), y luego consulta la API de pronóstico de Open-Meteo para recuperar temperatura, humedad y precipitaciones. El resultado se muestra en la interfaz web de manera clara y legible.

## Glossary

- **App**: La aplicación web de pronóstico del clima.
- **User**: El usuario final que interactúa con la interfaz web.
- **Geocoding_API**: El servicio de geocodificación de Open-Meteo (https://geocoding-api.open-meteo.com/v1/search) que convierte nombres de ciudades en coordenadas geográficas.
- **Forecast_API**: El servicio de pronóstico del clima de Open-Meteo (https://api.open-meteo.com/v1/forecast) que retorna datos meteorológicos dado un par de coordenadas.
- **City_Input**: El campo de texto donde el usuario escribe el nombre de una ciudad.
- **Coordinates**: Par de valores latitud/longitud retornados por la Geocoding_API para una ciudad.
- **Weather_Data**: Los datos meteorológicos retornados por la Forecast_API, incluyendo temperatura, humedad relativa y precipitaciones.
- **Weather_Display**: La sección de la interfaz que muestra los datos del clima al usuario.

---

## Requirements

### Requisito 1: Entrada del nombre de ciudad

**Historia de Usuario:** Como User, quiero escribir el nombre de una ciudad en un campo de texto y enviarlo, para poder solicitar el pronóstico del clima de esa ciudad.

#### Criterios de Aceptación

1. LA App DEBERÁ renderizar un campo de texto City_Input en la página principal con una longitud máxima de 100 caracteres.
2. LA App DEBERÁ renderizar un botón de envío que inicie la búsqueda del clima cuando se active con un clic del puntero o cuando el User presione la tecla Enter mientras City_Input esté enfocado.
3. CUANDO el User active el botón de envío con un City_Input vacío, LA App DEBERÁ mostrar un mensaje de validación indicando que el nombre de la ciudad es obligatorio.
4. CUANDO el User active el botón de envío con un City_Input que contenga solo espacios en blanco, LA App DEBERÁ mostrar un mensaje de validación indicando que el nombre de la ciudad es obligatorio.
5. CUANDO el User active el botón de envío con un City_Input no vacío, LA App DEBERÁ iniciar la solicitud de geocodificación a la Geocoding_API usando el valor recortado de City_Input y DEBERÁ mostrar un indicador de carga hasta que se reciba una respuesta.
6. SI la solicitud de geocodificación retorna un error o ningún resultado, ENTONCES LA App DEBERÁ mostrar el mensaje de error correspondiente y City_Input DEBERÁ permanecer accesible para que el User pueda ingresar un nuevo nombre de ciudad.

---

### Requisito 2: Geocodificación del nombre de ciudad

**Historia de Usuario:** Como User, quiero que la aplicación convierta el nombre de ciudad que ingresé en coordenadas geográficas, para que se use la ubicación correcta al obtener el clima.

#### Criterios de Aceptación

1. CUANDO el User envíe un nombre de ciudad, LA App DEBERÁ enviar una solicitud de geocodificación a la Geocoding_API con el nombre de la ciudad como parámetro de búsqueda y un máximo de 1 resultado.
2. CUANDO la Geocoding_API retorne uno o más resultados, LA App DEBERÁ usar la latitud y longitud del primer resultado como las Coordinates para la solicitud de pronóstico.
3. SI la Geocoding_API retorna cero resultados, ENTONCES LA App DEBERÁ mostrar un mensaje informando al User que la ciudad no fue encontrada.
4. SI la solicitud a la Geocoding_API falla por un error de red o no recibe respuesta en 10 segundos, ENTONCES LA App DEBERÁ mostrar un mensaje de error indicando que el servicio de geocodificación no está disponible.
5. SI el User envía un nombre de ciudad vacío o que contiene solo espacios en blanco, ENTONCES LA App DEBERÁ mostrar un mensaje de error de validación y NO DEBERÁ enviar una solicitud a la Geocoding_API.
6. SI la Geocoding_API retorna un resultado donde el valor de latitud o longitud está ausente, ENTONCES LA App DEBERÁ tratar la respuesta como cero resultados válidos y mostrar un mensaje informando al User que la ciudad no fue encontrada.

---

### Requisito 3: Consulta del pronóstico del clima

**Historia de Usuario:** Como User, quiero que la aplicación obtenga los datos climáticos actuales para las coordenadas obtenidas del nombre de ciudad, para recibir información meteorológica actualizada.

#### Criterios de Aceptación

1. CUANDO LA App tenga Coordinates válidas (latitud entre −90 y 90, longitud entre −180 y 180), LA App DEBERÁ enviar una solicitud a la Forecast_API incluyendo latitud, longitud y los parámetros para temperatura actual (temperature_2m), humedad relativa (relativehumidity_2m) y precipitación (precipitation).
2. CUANDO la Forecast_API retorne una respuesta exitosa, LA App DEBERÁ extraer los valores actuales de temperatura, humedad y precipitación del Weather_Data y ponerlos a disposición para su visualización al User.
3. SI la solicitud a la Forecast_API falla por un error de red o no recibe respuesta en 10 segundos, ENTONCES LA App DEBERÁ mostrar un mensaje de error indicando que el servicio de pronóstico no está disponible.
4. SI la Forecast_API retorna un código de estado HTTP no 2xx, ENTONCES LA App DEBERÁ mostrar un mensaje de error indicando que el servicio de pronóstico retornó un error.
5. SI la Forecast_API retorna una respuesta donde alguno de los campos del clima actual (temperatura, humedad o precipitación) está ausente o es nulo, ENTONCES LA App DEBERÁ mostrar un mensaje de error indicando que los datos meteorológicos están incompletos.

---

### Requisito 4: Visualización del pronóstico del clima

**Historia de Usuario:** Como User, quiero ver la temperatura, humedad y precipitación de la ciudad que busqué, para comprender las condiciones climáticas actuales.

#### Criterios de Aceptación

1. CUANDO LA App reciba Weather_Data válido, EL Weather_Display DEBERÁ mostrar el nombre de la ciudad tal como lo retornó la Geocoding_API.
2. CUANDO LA App reciba Weather_Data válido, EL Weather_Display DEBERÁ mostrar la temperatura actual en grados Celsius con la etiqueta de unidad "°C".
3. CUANDO LA App reciba Weather_Data válido, EL Weather_Display DEBERÁ mostrar la humedad relativa actual como porcentaje con la etiqueta de unidad "%".
4. CUANDO LA App reciba Weather_Data válido, EL Weather_Display DEBERÁ mostrar la precipitación actual en milímetros con la etiqueta de unidad "mm".
5. MIENTRAS una solicitud de clima esté en progreso, LA App DEBERÁ mostrar un indicador de carga; el indicador de carga DEBERÁ ocultarse una vez que LA App reciba una respuesta o un error de la Forecast_API.
6. CUANDO se inicie una nueva búsqueda, LA App DEBERÁ limpiar el contenido previo del Weather_Display antes de emitir la nueva solicitud a la Forecast_API.
7. SI LA App recibe Weather_Data válido pero el campo del nombre de ciudad está ausente o vacío, ENTONCES EL Weather_Display DEBERÁ mostrar el nombre de ciudad tal como lo ingresó el User en el campo de búsqueda.

---

### Requisito 5: Propiedades de corrección y round-trip

**Historia de Usuario:** Como desarrollador, quiero que el pipeline de transformación de datos sea verificable y consistente, para que la aplicación mapee de manera confiable las respuestas de la API a los valores mostrados.

#### Criterios de Aceptación

1. CUANDO LA App reciba una respuesta válida de la Geocoding_API, LA App DEBERÁ parsear el cuerpo JSON en un objeto Coordinates de modo que cada campo presente en el cuerpo de la respuesta sea mapeado al campo correspondiente de Coordinates con su valor sin modificar.
2. CUANDO LA App reciba una respuesta válida de la Forecast_API, LA App DEBERÁ parsear el cuerpo JSON en un objeto Weather_Data de modo que los valores de temperatura, humedad y precipitación en el Weather_Display coincidan exactamente con los valores correspondientes en la respuesta parseada antes de aplicar cualquier formato.
3. LA App DEBERÁ formatear los valores numéricos de temperatura y precipitación usando como máximo un decimal antes de renderizarlos en el Weather_Display; los valores de humedad DEBERÁN renderizarse como números enteros sin decimales.
4. SI la Geocoding_API o la Forecast_API retorna un código de estado HTTP no 2xx, ENTONCES LA App DEBERÁ tratar la respuesta como un fallo y mostrar un mensaje de error al User indicando qué servicio falló y que la solicitud no fue exitosa.
5. SI la Geocoding_API o la Forecast_API retorna un código de estado HTTP 2xx con un cuerpo de respuesta que no puede parsearse en el objeto esperado, ENTONCES LA App DEBERÁ tratar la respuesta como un fallo y mostrar un mensaje de error al User indicando que los datos recibidos no son válidos.

HU-01: Inicio de sesión seguro
Título: Inicio de sesión con correo y contraseña
Como usuario registrado de la aplicación móvil
Quiero iniciar sesión usando mi correo electrónico y una contraseña segura
Para acceder a mis datos personales y funcionalidades de la aplicación de forma segura
Descripción La aplicación debe permitir que los usuarios registrados ingresen su correo y contraseña en una pantalla de inicio de sesión. Si las credenciales son correctas, el sistema los autentica y muestra un mensaje de bienvenida inclusivo antes de llevarlos a la pantalla principal. Si son incorrectas, se muestra un mensaje genérico para proteger la seguridad de la cuenta.
Criterios de Aceptación
1.	Campos obligatorios
o	Debe existir un campo para correo electrónico.
o	Debe existir un campo para contraseña.
o	Si el usuario intenta iniciar sesión sin llenar ambos campos, se debe mostrar un mensaje de validación:
	"El correo electrónico es requerido."
	"La contraseña es requerida."
2.	Validación de correo
o	El sistema debe validar que el formato del correo sea válido (ejemplo: usuario@dominio.com).
o	Si el formato es inválido, se muestra un mensaje:
	"El formato del correo electrónico no es válido."
3.	Validación de contraseña
o	La contraseña debe tener al menos 8 caracteres.
o	Si no cumple, mostrar:
	"La contraseña debe tener al menos 8 caracteres."
4.	Inicio de sesión exitoso y Bienvenida
o	Si el correo y la contraseña son correctos:
	El sistema debe autenticar al usuario.
	Mensaje de éxito: Se debe mostrar una alerta o confirmación con el título "¡Bienvenid@!".
	Debe redirigir a la pantalla principal (Home).
	Seguridad: El token de sesión se debe almacenar en el almacenamiento seguro del dispositivo (Secure Storage, Keychain o EncryptedSharedPreferences), nunca en texto plano.
5.	Credenciales incorrectas (Seguridad)
o	Si el correo o la contraseña son incorrectos (sin importar cuál de los dos falló):
	Se debe mostrar un único mensaje genérico para evitar la enumeración de usuarios:
	"Correo o contraseña incorrectos."
	El usuario permanece en la pantalla de inicio de sesión.
6.	Manejo de errores técnicos
o	Si hay un error de conexión (sin internet):
	Mostrar: "Error de conexión. Verifica tu internet."
o	Si hay un error del servidor (Error 500, timeout):
	Mostrar mensaje genérico: "No se pudo completar la solicitud. Inténtalo más tarde."
7.	Persistencia de sesión
o	Al abrir la app, el sistema debe verificar si existe un token válido y no expirado en el almacenamiento seguro.
o	Si la sesión es válida: Omitir el login y redirigir directo al Dashboard.
o	Si el token expiró: Redirigir a la pantalla de inicio de sesión.
8.	Botón "Cerrar sesión"
o	Debe existir una opción para cerrar sesión.
o	Al confirmar, se debe eliminar el token del almacenamiento seguro y redirigir al usuario al login.



HU-02: Registro de nuevo usuario
Título: Crear cuenta nueva con validaciones de seguridad y bienvenida personalizada
Como usuario nuevo que quiere usar la aplicación
Quiero registrarme con mi correo electrónico y una contraseña segura
Para crear una cuenta, recibir una bienvenida personalizada y acceder a HomeSync
Descripción La aplicación debe permitir que nuevos usuarios se registren proporcionando sus datos. El sistema debe validar la seguridad de la contraseña, normalizar el texto (limpiar espacios y mayúsculas) y generar una experiencia de bienvenida personalizada utilizando lenguaje inclusivo y el primer nombre del usuario.
Criterios de Aceptación
1.	Campos del formulario
o	Nombre completo (opcional).
o	Correo electrónico (obligatorio).
o	Contraseña (obligatorio).
o	Confirmar contraseña (obligatorio).
2.	Normalización de datos (Limpieza)
o	Correo: El sistema debe convertir el correo a minúsculas y eliminar espacios al inicio/final antes de validar.
o	Nombre:
	Se deben eliminar espacios al inicio y al final (trim).
	Espacios internos: Si el usuario ingresa múltiples espacios entre nombres (ej: "Juan Perez"), el sistema debe convertirlos a un solo espacio ("Juan Perez").
3.	Lógica de "Primer Nombre"
o	El sistema debe procesar el nombre ingresado para extraer solo el primer nombre (la primera palabra antes del primer espacio) para usarlo en los saludos.
	Ejemplo: "Juan Perez" → Se usa "Juan".
	Ejemplo: "María José" → Se usa "María".
4.	Validación de correo electrónico
o	Debe validar el formato estándar.
o	Si el correo ya está registrado en la base de datos:
	No se debe crear la cuenta.
	Mostrar mensaje: "Este correo electrónico ya está registrado."
5.	Validación de contraseña (Seguridad)
o	La contraseña es obligatoria.
o	Debe tener al menos 8 caracteres.
o	Debe contener al menos una letra y un número.
o	Debe coincidir exactamente con el campo "Confirmar contraseña".
o	Si no coinciden, mostrar: "Las contraseñas no coinciden."
6.	Registro exitoso y Mensajes Inclusivos
o	Si el registro es exitoso, el sistema crea la cuenta, autentica al usuario y lo redirige.
o	Feedback al usuario (Alerta/Toast):
	Caso A (Usuario ingresó nombre): Mostrar "¡Bienvenid@, {primerNombre}!".
	Caso B (Sin nombre): Mostrar "¡Te damos la bienvenida!".
7.	Pantalla Principal (Post-Registro)
o	Al entrar al Home, el saludo debe ser consistente:
	Si hay nombre: "¡Bienvenid@, {primerNombre}!".
	Si no hay nombre: "¡Bienvenid@!".
8.	Manejo de errores
o	Error de red: "Error de conexión. Verifica tu internet."
o	Error de servidor: "Ocurrió un error inesperado. Intenta nuevamente."
9.	Navegación
o	Debe existir un botón o enlace visible ("¿Ya tienes cuenta? Inicia sesión") para ir a la pantalla de Login.












HU-03: Crear nueva tarea del hogar
Título: Agregar tarea con asignación, validaciones y fecha
Como usuario autenticado y miembro de un grupo familiar
Quiero crear una nueva tarea asignándola a un miembro de mi familia
Para organizar las actividades del hogar y que cada quien sepa qué debe hacer
Descripción La aplicación permite crear tareas. El usuario define qué hacer, para cuándo (fecha) y quién es el responsable. El sistema debe manejar errores de conexión, validar que el miembro asignado sea válido y prevenir duplicados accidentales.
Criterios de Aceptación
1.	Campos y Valores por Defecto
o	Título: Obligatorio (3-50 chars). Sin caracteres especiales peligrosos (HTML/Scripts).
o	Descripción: Obligatoria.
o	Asignar a: Selector de miembros de la familia.
o	Fecha: Obligatoria. Solo fecha (día/mes/año), sin hora específica.
o	Prioridad: Selector (Alta, Media, Baja). Valor por defecto: "Media".
2.	Validación de Miembro (Seguridad)
o	El sistema debe verificar que el usuario asignado siga perteneciendo al grupo familiar en el momento exacto de guardar.
o	Si el usuario ya no está en el grupo (fue eliminado justo antes), mostrar: "El miembro asignado ya no pertenece a tu grupo."
3.	Validación de Fechas
o	No se permiten fechas anteriores al día actual (basado en la fecha del servidor para evitar trampas cambiando la hora del celular).
o	Si selecciona "Hoy", es válido.
4.	Prevención de Duplicados (Aviso)
o	Si se intenta crear una tarea con el mismo título y misma fecha que una existente:
	Mostrar una alerta de confirmación: "Ya existe una tarea similar para esta fecha. ¿Deseas crearla de todos modos?"
	Permitir continuar si el usuario confirma.
5.	Manejo de Errores de Guardado (Firestore)
o	Si falla la conexión o Firestore da error:
	Mostrar: "No se pudo guardar la tarea. Intenta más tarde."
	No borrar los datos del formulario para que el usuario pueda reintentar.
6.	Sanitización
o	El sistema debe limpiar el texto ingresado para evitar inyección de código (ej: <script>).

HU-04: Gestionar tareas del hogar (Listar, Completar y Eliminar)
Título: Ver, filtrar y gestionar tareas con actualizaciones en tiempo real
Como usuario autenticado de HomeSync
Quiero ver una lista priorizada de mis tareas y las de mi familia, marcarlas como listas o eliminarlas
Para mantener el hogar organizado y saber qué está pendiente
Descripción La pantalla principal debe listar las tareas del grupo familiar. Debe priorizar lo pendiente sobre lo completado, actualizarse en tiempo real si alguien más hace cambios y restringir la eliminación de tareas por seguridad.
Criterios de Aceptación
1.	Visualización de la Tarjeta de Tarea
o	Cada tarea debe mostrar:
	Título y Fecha de vencimiento.
	Asignado a: Debe mostrar el avatar o nombre (usando la lógica de Primer Nombre) del miembro responsable. Si es el usuario actual, indicarlo visualmente (ej: "Tú").
	Prioridad (Indicador de color: Rojo/Alta, Amarillo/Media, Verde/Baja).
	Checkbox de estado.
2.	Ordenamiento Inteligente (UX)
o	La lista NO debe ordenarse solo por fecha de creación.
o	Regla de Orden:
1.	Primero las Pendientes, ordenadas por fecha de vencimiento (lo más urgente arriba).
2.	Después las Completadas, ordenadas por fecha de finalización (las recién terminadas arriba).
3.	Permisos de Eliminación (Seguridad)
o	Cualquier miembro de la familia puede marcar una tarea como completada/pendiente.
o	Eliminación Restringida: Solo el usuario que creó la tarea (Owner) tiene permiso para eliminarla.
o	Si un usuario intenta eliminar una tarea que no creó, no debe aparecer el botón de eliminar o debe mostrarse un error: "Solo el creador puede eliminar esta tarea."
4.	Filtros y Paginación (Infinite Scroll)
o	Filtros: "Todas", "Pendientes", "Completadas".
o	Comportamiento: Al cambiar de filtro, la lista y la paginación deben reiniciarse (volver a la página 1) para evitar errores de carga.
o	Carga progresiva: Cargar de 20 en 20 tareas.
5.	Actualización en Tiempo Real (UI)
o	Si otro miembro modifica, completa o elimina una tarea desde su dispositivo:
	La lista debe actualizarse automáticamente sin que el usuario recargue.
	Feedback Visual: Si una tarea se elimina o cambia de estado, debe desaparecer/moverse con una transición suave (animación) para que el usuario entienda qué pasó.
6.	Manejo de Errores Críticos
o	Fallo al Eliminar: Si Firestore falla al intentar borrar, mostrar: "No se pudo eliminar la tarea. Intenta más tarde."
o	Modo Sin Conexión: Si el dispositivo pierde internet, mostrar un indicador (banner o icono): "Estás desconectado. Los cambios se guardarán al recuperar la conexión."
7.	Estados de Interfaz
o	Cargando: Skeleton loader o Spinner.
o	Vacío: Ilustración con mensaje "¡Todo limpio! No hay tareas pendientes."

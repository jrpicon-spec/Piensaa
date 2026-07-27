# Informe completo de auditoría de validaciones

**Proyecto:** ReacciónVital  
**Fecha:** 26 de julio de 2026  
**Alcance:** Frontend React, backend NestJS, DTO, integración visible con Supabase y seguridad.  
**Modalidad:** Auditoría de solo lectura. No se modificó lógica de negocio, ESP32, WebSockets, autenticación ni base de datos. No se realizaron commits.

## 1. Resumen ejecutivo

| Área | Resultado |
|---|---:|
| DTO y `ValidationPipe` HTTP | Correcto |
| Pacientes, frontend | Correcto con inconsistencias menores |
| Login | Consistente |
| Registro | Inconsistente en política de contraseña |
| Usuarios/cuidadores | Formulario incompleto frente al contrato backend |
| Mediciones HTTP | Buena validación backend |
| Creación manual de mediciones | No existe formulario |
| Dispositivos | DTO de actualización válido; formulario de alta inexistente |
| Configuración | Sin validación efectiva ni persistencia |
| Perfil | Solo simula guardado local |
| Constraints de base de datos | No auditables completamente |
| IDs HTTP | UUID v4 y control de acceso |
| Sanitización/normalización | Parcial |
| SQL injection | Riesgo bajo en CRUD; filtros `.or()` requieren endurecimiento |
| XSS | React escapa la salida normal |
| JWT | Verificación correcta; almacenamiento frontend vulnerable ante XSS |

### Cobertura aproximada

- Backend HTTP: **88%**
- Formularios realmente persistidos: **76%**
- Configuración, perfil y formularios anunciados pero inexistentes: **25%**
- Base de datos verificable: **35%**, por ausencia de esquema versionado.
- **Cobertura global estimada: 74%**

La cifra considera presencia de reglas, equivalencia frontend/backend, rangos, normalización, IDs, duplicados y constraints verificables. No representa cobertura de líneas.

## 2. Alcance, método y limitaciones

Se revisó todo el código fuente disponible de:

- Frontend React 19 + Vite.
- Backend NestJS 11.
- Formularios, modales, filtros y controles de configuración.
- DTO, controladores, servicios, guards y configuración.
- Integración visible con Supabase.
- Rutas HTTP y eventos relacionados con dispositivos.
- Pruebas unitarias existentes de validación.

El repositorio ya contenía numerosos cambios sin confirmar antes de la auditoría. Se conservaron intactos.

### Limitaciones

- No existen migraciones, archivos SQL, esquema Prisma ni configuración declarativa de Supabase en el repositorio.
- No fue posible certificar `UNIQUE`, `FOREIGN KEY`, `NOT NULL`, `CHECK`, defaults, índices o RLS.
- No se enviaron solicitudes a Supabase ni se escribieron registros.
- La suite completa excedió 60 segundos. La suite específica de validación terminó correctamente: **9/9 pruebas aprobadas**.

## 3. Validaciones del frontend por página

| Página | Formulario/control | Campo | Validación existente | ¿Funciona? | ¿Falta algo? |
|---|---|---|---|---|---|
| Login | Inicio de sesión | Correo | Obligatorio, `email`, máx. 254, trim, minúsculas y regex | Sí | Backend no fija longitud 254 |
| Login | Inicio de sesión | Contraseña | Obligatoria, no solo espacios, 8–128 | Sí | Rate limiting/CAPTCHA no visibles |
| Login | Selector | Rol | Solo dos botones tipados | Parcial | El rol no llega al backend; se compara después |
| Registro | Crear cuenta | Nombre | Obligatorio, letras Unicode, 2–120, trim | Sí | Normalización de espacios no idéntica en todos los caminos |
| Registro | Crear cuenta | Correo | Obligatorio, formato, máx. 254, trim/minúsculas | Sí | Backend sin límite explícito |
| Registro | Crear cuenta | Contraseña | 8–128, no espacios, mayúscula, número y especial | Solo frontend | Backend no exige complejidad |
| Registro | Crear cuenta | Confirmación | Obligatoria y coincidente | Sí | Correcto como regla frontend |
| Registro | Crear cuenta | Rol | Lista cerrada | Sí | Registro público permite elegir administrador |
| Cuidadores | Crear/editar | Nombre | Letras, 2–120 y trim | Sí | Coincide con DTO |
| Cuidadores | Crear | Correo | Obligatorio, email, máx. 254, minúsculas | Sí | Backend sin máximo |
| Cuidadores | Crear | Teléfono | Obligatorio, patrón, máx. 32 | Solo frontend | Backend no lo recibe |
| Cuidadores | Crear | Estado | `activo/inactivo` | Solo frontend | Backend no lo recibe |
| Cuidadores | Crear | Contraseña | Se genera un UUID, no hay campo | Inadecuado | Falta flujo de invitación o restablecimiento |
| Cuidadores | Editar | Correo | El modal lo valida | No se persiste | `handleSave` solo envía nombre |
| Cuidadores | Editar | Teléfono/estado | El modal los valida | No se persisten | Ausentes del DTO real |
| Pacientes | Crear/editar | Nombre completo | Obligatorio, letras, nombre+apellido, trim, 5–121 HTML | Sí | El límite se divide internamente en 60+60 |
| Pacientes | Crear/editar | Fecha nacimiento | Obligatoria, edad 1–120 | Sí | HTML no define `min`/`max`, handler sí valida |
| Pacientes | Crear/editar | Sexo | Enum cerrado | Sí | Correcto |
| Pacientes | Crear/editar | Teléfono | Obligatorio, patrón, máx. 32 | Sí | El patrón admite teléfonos cortos |
| Pacientes | Crear/editar | Estado | Enum visual | No en creación | Backend fuerza `normal` |
| Pacientes | Crear/editar | Dirección | Obligatoria, trim, 2–255 | Sí | Permite cualquier contenido de texto |
| Pacientes | Crear/editar | Responsable | Obligatorio, letras, 2–160 | Sí | Correcto |
| Pacientes | Crear/editar | Teléfono familiar | Opcional, patrón, máx. 32 | No se persiste | No existe en DTO/backend |
| Pacientes | Crear/editar | Observaciones | Opcional, trim, máx. 1000 | Sí | Sin sanitización HTML explícita |
| Pacientes | Crear/editar | Cuidador | Lista de IDs | Parcial | Backend valida UUID, no existencia/rol antes del insert |
| Paciente detalle | Iniciar prueba | Paciente | Proviene del registro cargado | Sí | Backend HTTP exige UUID |
| Paciente detalle | Iniciar prueba | Nivel | Lista 1–4 | Sí en UI/socket | Endpoint HTTP no acepta nivel |
| Mediciones | Crear medición | Paciente/tiempo/fecha | No hay formulario manual | No aplica | Creación mediante ESP32/backend |
| Dispositivos | Nuevo dispositivo | — | Botón visible | No | No abre formulario |
| Dispositivos | Configurar | — | Handler vacío | No | No existe modal |
| Reportes | Filtros | Texto | Sin longitud/patrón | Parcial | Falta máximo y normalización |
| Reportes | Filtros | Desde/hasta | `type=date` | Parcial | No valida `desde <= hasta` |
| Configuración | Umbral normal | Número | Solo `type=number` | No | Sin requerido, min, max o entero |
| Configuración | Umbral atención | Número | Solo `type=number` | No | Permite negativo, enorme, `NaN` y orden inválido |
| Configuración | Retención | Número | Solo `type=number` | No | Sin rango |
| Configuración | API URL | Texto libre | Ninguna | No | Falta URL/protocolo/origen |
| Configuración | WebSocket URL | Texto libre | Ninguna | No | Falta `ws/wss` |
| Configuración | MQTT broker | Texto libre | Ninguna | No | Falta host/puerto/protocolo |
| Configuración | Interruptores | Booleanos | Componente cerrado | Sí localmente | No se persisten |
| Perfil | Datos personales | Nombre | Letras, 2–120 | Sí localmente | No se envía al backend |
| Perfil | Datos personales | Correo | Email, obligatorio, máx. 254 | Sí localmente | No se envía al backend |
| Perfil | Datos personales | Teléfono | Opcional, patrón, máx. 32 | Sí localmente | Campo no existe en backend |
| Perfil | Contraseña actual | Obligatoria/no espacios | Parcial | No se verifica |
| Perfil | Nueva contraseña | 8–128/no espacios | Sí localmente | No exige complejidad del Registro |
| Perfil | Confirmación | Coincidencia | Sí localmente | No existe petición real |

## 4. Detalle de los formularios

### Login

Archivo: `Front/src/pages/Login/LoginPage.tsx`, handler aproximado en línea 39.

- Correo obligatorio, `type="email"`, máximo 254, trim, minúsculas y regex.
- Contraseña obligatoria, no solo espacios y longitud 8–128.
- Estas reglas coinciden con `LoginDto`, excepto por el máximo de email ausente en backend.
- El rol no forma parte de `LoginDto`. Se autentica primero y el frontend compara el rol después. Una selección incorrecta genera un mensaje de credenciales inválidas aunque la contraseña sea correcta.

### Registro

Archivo: `Front/src/pages/Register/RegisterPage.tsx`, validación aproximada en línea 40.

La discrepancia principal está en la contraseña:

- Frontend exige mayúscula, número y carácter especial.
- Backend solo exige 8–128 y al menos un carácter no blanco.
- Una llamada directa a la API puede crear contraseñas que el frontend rechaza.
- `/auth/register` es público y acepta `rol: admin`.

### Crear y editar usuario/cuidador

Archivos:

- `Front/src/components/caregivers/CaregiverFormModal.tsx`
- `Front/src/pages/Caregivers/CaregiversPage.tsx`

Hallazgos:

- Teléfono y estado se validan pero el backend no los recibe.
- Al editar solo se persiste `nombre`; correo, teléfono y estado se descartan.
- Al crear se utiliza `crypto.randomUUID()` como contraseña.
- No se observa un flujo para comunicarla, activar la cuenta o restablecerla.

### Crear y editar paciente

Archivo: `Front/src/components/patients/PatientFormModal.tsx`, handler aproximado en línea 98.

Es el formulario más completo del frontend:

- Nombre/apellido, fecha, edad, sexo, teléfono, dirección, responsable y notas tienen reglas equivalentes en backend.
- El frontend divide `fullName`: el primer término se convierte en nombre y todos los demás en apellido.
- Nombres compuestos pueden dividirse de forma incorrecta.
- `guardianPhone` se valida pero no se envía al backend.
- El cuidador se valida como UUID en backend, pero no se confirma previamente que exista y tenga rol cuidador.

### Crear medición

No existe formulario React de creación manual. La medición se produce desde el flujo de prueba del dispositivo.

### Crear/configurar dispositivo

Archivo: `Front/src/pages/Devices/DevicesPage.tsx`.

- “Nuevo dispositivo” no abre formulario.
- “Configurar” tiene un handler vacío.
- El backend dispone de actualización, no de DTO de creación manual.

### Configuración

Archivo: `Front/src/pages/Settings/SettingsPage.tsx`.

- No existen reglas de rango.
- `Number('')` se convierte en `0`.
- Se pueden producir valores `NaN`, negativos o enormes.
- No se valida `thresholdNormal < thresholdAtencion`.
- Las URLs aceptan cualquier texto.
- Guardar solo muestra una confirmación y no se observa persistencia.

### Perfil y contraseña

Archivo: `Front/src/pages/Profile/ProfilePage.tsx`.

- Las reglas visuales funcionan.
- Los datos no se envían a `/users/:id`.
- La contraseña actual no se verifica.
- La nueva contraseña no se envía a Supabase Auth.
- El formulario se limpia y muestra éxito sin cambio persistido.

## 5. Auditoría de DTO

El pipe global en `backend/src/main.ts`, línea aproximada 18, tiene:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- Conversión implícita desactivada

| DTO | Validaciones presentes | Faltantes o inconsistencias |
|---|---|---|
| `LoginDto` | `Transform`, `IsEmail`, `IsNotEmpty`, `IsString`, `Matches`, 8–128 | Máximo explícito de correo |
| `RegisterDto` | Nombre trim/string/2–120/letras; email normalizado; password; enum rol | Complejidad consistente; restringir admin público |
| `CreateUserDto` | Equivalente a registro | Máximo de email y política consistente |
| `UpdateUserDto` | Campos opcionales con reglas | Body vacío; límite de email |
| `FilterUserDto` | Search 100, rol, paginación y orden | Escapar sintaxis PostgREST |
| `CreatePatientDto` | Nombre, apellido, fecha ISO, edad 1–120, sexo, teléfono, dirección, responsable, notas y UUID | Existencia/rol del cuidador; teléfono familiar |
| `UpdatePatientDto` | Reglas equivalentes opcionales | Mensajes menos específicos; body vacío |
| `FilterPatientDto` | Search, UUID, enums y paginación | Escapar filtros y verificar cuidador |
| `CreateMeasurementDto` | UUID, entero 1–60000 y fecha ISO | Política para fechas futuras/antiguas |
| `UpdateMeasurementDto` | Tiempo y fecha opcionales | Body vacío |
| `FilterMeasurementDto` | UUID, fechas, limit 1–100 y offset ≥0 | `desde <= hasta`; máximo de offset |
| `UpdateDeviceDto` | Nombre, IPv4 y estado | Mínimo de nombre; body vacío |
| `StartTestDto` | Paciente obligatorio y UUID v4 | Nivel ausente en HTTP |
| `StartTestSocketDto` | String obligatorio y nivel 1–4 | `patientId` debería ser UUID |
| `DeviceConnectedSocketDto` | ID, tipo fijo, IPv4 y RSSI -120…0 | Patrón de `deviceId` |
| `DeviceResultDto` | Alias opcionales, entero 50–5000 | Al menos uno obligatorio; rango inconsistente |
| `TestFinishedSocketDto` | UUID, tiempos, nivel, booleanos, botones y timestamp | Condición entre aliases y máximo de timestamp |

### Decoradores solicitados

| Decorador | Estado |
|---|---|
| `IsString` | Usado |
| `IsEmail` | Usado |
| `IsUUID` | Usado |
| `IsNotEmpty` | Usado |
| `IsOptional` | Usado |
| `IsNumber` | Usado |
| `IsBoolean` | Usado |
| `IsDateString` | Usado |
| `Min` / `Max` | Usados |
| `Length` / `MinLength` / `MaxLength` | Usados |
| `Matches` | Usado |
| `Transform` | Usado |
| `ValidateIf` | No usado |

La ausencia de `ValidateIf` es especialmente relevante en los DTO que aceptan `reactionTime` o `tiempo_reaccion`.

## 6. Validaciones duplicadas e inconsistencias

### Solo frontend

- Complejidad de contraseña de Registro.
- Confirmación de contraseña.
- Teléfono y estado del cuidador.
- Teléfono del familiar.
- Campos de Configuración.
- Contraseña actual/nueva de Perfil.
- Nivel cerrado mediante el componente Select.

### Solo backend

- UUID v4 de parámetros HTTP.
- Paginación y ordenamiento.
- Edad exacta 1–120.
- Medición 1–60000.
- IPv4 y RSSI.
- Botones y resultado del dispositivo.
- Rechazo de propiedades desconocidas.
- Autorización por rol y pertenencia.

### Inconsistencias principales

1. Frontend exige contraseña fuerte; backend acepta cualquier cadena no blanca de 8–128.
2. Resultado HTTP acepta 50–5000 ms; medición normal acepta 1–60000 ms.
3. `StartTestSocketDto.patientId` acepta cualquier string; HTTP exige UUID.
4. Perfil valida pero no persiste.
5. Editar cuidador valida varios campos pero solo guarda nombre.
6. Teléfono familiar no tiene equivalente backend.
7. Configuración acepta números y URLs arbitrarios.
8. Frontend limita email a 254; backend no.
9. Backend limita búsquedas a 100; frontend no tiene `maxLength`.
10. Se aceptan intervalos de fecha invertidos.

## 7. Base de datos y Supabase

### Elementos visibles

Tablas utilizadas:

- `profiles`
- `pacientes`
- `mediciones`
- `dispositivo`
- Supabase Auth

Indicios observados:

- `profiles.id` coincide lógicamente con el UUID de Supabase Auth.
- Se detecta y maneja error PostgreSQL `23505` sobre `profiles_pkey`.
- `pacientes.cuidador_id` relaciona lógicamente pacientes con perfiles.
- `mediciones.paciente_id` relaciona mediciones con pacientes.
- El dispositivo utiliza upsert con conflicto en `id`.

### Elementos no verificables

- `NOT NULL`
- `UNIQUE`
- Foreign keys y acciones `ON DELETE`
- `CHECK` para roles, sexo, estado y tiempos
- Defaults
- Índices
- RLS y policies
- Constraints de longitud
- Cascadas

El cliente administrativo de Supabase usa service role y puede omitir RLS. La seguridad depende por ello del backend y de constraints reales que no están versionados.

Se debería verificar externamente:

- `profiles.email UNIQUE NOT NULL`
- FK `pacientes.cuidador_id → profiles.id`
- FK `mediciones.paciente_id → pacientes.id`
- `CHECK` equivalentes a enums y rangos
- Política de eliminación de cuidadores
- Clave única estable del dispositivo

## 8. Auditoría de seguridad

### SQL injection

Los CRUD emplean métodos del cliente Supabase como `.eq()`, `.insert()` y `.update()`, reduciendo el riesgo de SQL injection clásica.

Existe riesgo de manipulación de la sintaxis PostgREST en búsquedas interpoladas dentro de `.or()`:

- `backend/src/users/users.service.ts`, línea aproximada 47.
- `backend/src/patients/patients.service.ts`, línea aproximada 57.

Caracteres como comas, puntos, paréntesis u operadores pueden alterar la expresión del filtro si no se escapan.

### XSS

- React escapa por defecto el texto renderizado.
- No se encontró `dangerouslySetInnerHTML`.
- Dirección y observaciones aceptan HTML y emojis, pero se representan como texto.
- Si esos valores se utilizaran en emails o exportaciones HTML, necesitarían sanitización contextual.

### Trim y normalización

Correcto en nombres, emails, teléfonos, dirección, responsable, observaciones y datos básicos del dispositivo.

Pendientes:

- Configuración y algunos filtros.
- Contraseñas con espacios al inicio/final son aceptadas si contienen otros caracteres.
- Los nombres rechazan guiones y apóstrofes legítimos.

### Contraseñas

Fortalezas:

- Longitud 8–128.
- Rechazo de solo espacios.
- Almacenamiento delegado a Supabase Auth.

Problemas:

- Política distinta entre frontend y backend.
- Creación de cuidador con contraseña UUID desconocida.
- Cambio de contraseña del Perfil no persiste.
- No se observa rate limiting, CAPTCHA ni bloqueo por intentos.
- Registro público con posibilidad de rol administrador.

### JWT

Fortalezas:

- `JWT_SECRET` obligatorio.
- Expiración verificada.
- Bearer token.
- Guards globales.

Problemas:

- Token guardado en `localStorage` bajo dos claves.
- `JwtStrategy.validate` no comprueba formalmente el enum del rol.
- Cambios de rol no invalidan inmediatamente un token ya firmado.
- Expiración por defecto de siete días.

### Archivos

No se encontraron inputs `type=file`, endpoints de subida ni procesamiento de archivos.

### IDs manipulados

- Las rutas HTTP usan `ParseUUIDPipe` v4.
- Los servicios verifican acceso del cuidador a pacientes y mediciones.
- Usuarios se restringen a admin.
- `StartTestSocketDto.patientId` no es UUID.
- Debe confirmarse la aplicación efectiva de DTO a todos los eventos WebSocket.
- El endpoint HTTP de resultado del dispositivo es público.

## 9. Simulación de casos límite

| Entrada simulada | Resultado observado/esperado |
|---|---|
| Campo obligatorio vacío | Rechazado en formularios principales y DTO |
| Solo espacios en nombre | Rechazado tras trim |
| Solo espacios en contraseña | Rechazado |
| Solo números en nombre | Rechazado |
| Letras con tilde | Aceptadas |
| Guion/apóstrofe en nombre | Rechazado |
| Emojis en nombre | Rechazados |
| Emojis en dirección/notas | Aceptados |
| Caracteres especiales en teléfono | Solo `+`, espacios y guiones |
| SQL injection como nombre | Rechazada por patrón |
| SQL injection en dirección/notas | Se conserva como texto; CRUD parametrizado |
| Manipulación de filtro en buscador | Riesgo por sintaxis `.or()` |
| Texto extremadamente largo | Rechazado donde hay máximos |
| Email inválido | Rechazado |
| Email mayor de 254 | Frontend rechaza; backend sin máximo |
| UUID inválido HTTP | Rechazado |
| UUID inválido en `StartTestSocketDto` | Puede pasar como string |
| Fecha inválida | Rechazada |
| Fecha futura de nacimiento | Rechazada por edad |
| Edad 0 o mayor de 120 | Rechazada |
| `desde` posterior a `hasta` | Aceptado |
| Tiempo negativo o cero | Rechazado |
| Tiempo 60001 | Rechazado por medición |
| Resultado de dispositivo 5001 | Rechazado |
| Umbral negativo | Aceptado localmente |
| Número enorme en Configuración | Aceptado localmente |
| Email duplicado | Delegado a Supabase Auth/DB |
| Campo desconocido en body | Rechazado |
| Update con body vacío | Aceptado como no-op en varios servicios |

La suite específica confirmó:

- Nombres con tilde.
- Normalización de correo.
- Rechazo de nombres vacíos y alfanuméricos.
- Aceptación de mediciones 1 y 60000.
- Rechazo de 0, -1 y 60001.
- Contrato de `testFinished` con timeout.
- Límite de paginación de 100.

## 10. Errores encontrados

### ERROR 1 — Registro público puede crear administradores

- **Descripción:** `RegisterDto` permite `rol: admin` y `/auth/register` es público.
- **Archivos:** `backend/src/auth/auth.controller.ts`, línea 26; `backend/src/auth/dto/auth.dto.ts`, línea 55.
- **Gravedad:** Crítica.
- **Solución propuesta:** Limitar registro público a cuidador o reservar la creación de administradores a otro administrador.

### ERROR 2 — Endpoint público de resultados sin autenticación de dispositivo

- **Descripción:** cualquier cliente puede intentar publicar resultados.
- **Archivo:** `backend/src/device/device.controller.ts`, línea 61.
- **Gravedad:** Crítica.
- **Solución propuesta:** Autenticación específica, firma/HMAC o secreto individual por dispositivo.

### ERROR 3 — Perfil aparenta guardar cambios inexistentes

- **Descripción:** actualiza estado local y muestra éxito sin persistencia.
- **Archivo:** `Front/src/pages/Profile/ProfilePage.tsx`, línea 37.
- **Gravedad:** Importante.
- **Solución propuesta:** Integrar endpoint real o deshabilitar la acción.

### ERROR 4 — Cambio de contraseña simulado

- **Descripción:** no verifica contraseña actual ni actualiza Supabase Auth.
- **Archivo:** `Front/src/pages/Profile/ProfilePage.tsx`, línea 57.
- **Gravedad:** Importante.
- **Solución propuesta:** Flujo autenticado y reautenticación.

### ERROR 5 — Edición de cuidador pierde campos

- **Descripción:** correo, teléfono y estado se validan pero solo se envía nombre.
- **Archivo:** `Front/src/pages/Caregivers/CaregiversPage.tsx`, línea 52.
- **Gravedad:** Importante.
- **Solución propuesta:** Alinear formulario y DTO.

### ERROR 6 — Contraseña generada sin flujo de entrega

- **Descripción:** se utiliza `crypto.randomUUID()` como contraseña.
- **Archivo:** `Front/src/pages/Caregivers/CaregiversPage.tsx`, línea 57.
- **Gravedad:** Importante.
- **Solución propuesta:** Invitación o restablecimiento seguro.

### ERROR 7 — Configuración acepta valores inválidos

- **Descripción:** números y URLs sin reglas; no existe persistencia.
- **Archivo:** `Front/src/pages/Settings/SettingsPage.tsx`, línea 36.
- **Gravedad:** Importante.
- **Solución propuesta:** Esquema de validación, rangos y persistencia.

### ERROR 8 — `patientId` de WebSocket no es UUID

- **Descripción:** solo exige string.
- **Archivo:** `backend/src/device/dto/device.dto.ts`, línea 46.
- **Gravedad:** Importante.
- **Solución propuesta:** UUID v4 y comprobación de acceso.

### ERROR 9 — Los alias de resultado pueden omitirse ambos

- **Descripción:** `reactionTime` y `tiempo_reaccion` son opcionales sin condición.
- **Archivo:** `backend/src/device/dto/device.dto.ts`, línea 81.
- **Gravedad:** Media.
- **Solución propuesta:** `ValidateIf` o validador de clase.

### ERROR 10 — Rangos de medición inconsistentes

- **Descripción:** resultado HTTP 50–5000; medición general 1–60000.
- **Archivos:** `backend/src/device/dto/device.dto.ts`, línea 81; `backend/src/measurements/dto/measurement.dto.ts`, línea 11.
- **Gravedad:** Media.
- **Solución propuesta:** Unificar o documentar los rangos.

### ERROR 11 — Riesgo de manipulación de filtro PostgREST

- **Descripción:** entrada interpolada en `.or()` sin escape formal.
- **Archivos:** `backend/src/users/users.service.ts`, línea 47; `backend/src/patients/patients.service.ts`, línea 57.
- **Gravedad:** Media.
- **Solución propuesta:** Escapar la sintaxis o usar filtros no interpretables.

### ERROR 12 — No se valida el orden del intervalo de fechas

- **Descripción:** `desde > hasta` supera la validación.
- **Archivos:** `backend/src/measurements/dto/filter-measurement.dto.ts`, línea 16; `Front/src/pages/Reports/ReportsPage.tsx`, línea 185.
- **Gravedad:** Media.
- **Solución propuesta:** Validador cruzado.

### ERROR 13 — Teléfono familiar no se persiste

- **Descripción:** aparece y se valida en UI, pero no existe en backend.
- **Archivo:** `Front/src/components/patients/PatientFormModal.tsx`, línea 278.
- **Gravedad:** Media.
- **Solución propuesta:** Alinear modelo o retirar el campo.

### ERROR 14 — Crear/configurar dispositivo no está implementado

- **Descripción:** botones sin formulario o handler efectivo.
- **Archivo:** `Front/src/pages/Devices/DevicesPage.tsx`, línea 77.
- **Gravedad:** Media.
- **Solución propuesta:** Implementar conforme al contrato o retirar las acciones.

### ERROR 15 — Nombres legítimos rechazados

- **Descripción:** el patrón rechaza guiones y apóstrofes.
- **Archivos:** `backend/src/common/validation/validation.utils.ts`, línea 8; `Front/src/utils/index.ts`, línea 4.
- **Gravedad:** Baja.
- **Solución propuesta:** Definir una política internacional de nombres.

### ERROR 16 — JWT almacenado en `localStorage`

- **Descripción:** queda accesible ante un XSS.
- **Archivo:** `Front/src/services/auth-storage.ts`, línea 4.
- **Gravedad:** Importante.
- **Solución propuesta:** Cookie `HttpOnly`, `Secure`, `SameSite` o arquitectura equivalente.

## 11. Validaciones faltantes priorizadas

### Críticas

1. Impedir creación pública arbitraria de administradores.
2. Autenticar el endpoint público que recibe mediciones.
3. Confirmar y versionar constraints, FK, UNIQUE y RLS de Supabase.
4. Proteger adecuadamente el token frente a XSS.
5. Confirmar la aplicación de DTO a todos los eventos WebSocket.

### Importantes

1. Unificar política de contraseñas.
2. Validar UUID en `StartTestSocketDto`.
3. Exigir al menos uno de los campos alias de resultado.
4. Alinear rangos 1–60000 y 50–5000.
5. Validar existencia y rol de `cuidador_id`.
6. Alinear formulario de cuidador con backend.
7. Corregir formularios simulados de Perfil y Configuración.
8. Validar rangos y orden de umbrales clínicos.
9. Validar URLs de API, WebSocket y MQTT.
10. Validar `desde <= hasta`.
11. Escapar búsquedas PostgREST.
12. Añadir máximo 254 al email backend.
13. Añadir rate limiting.
14. Sustituir la contraseña UUID por invitación/restablecimiento.

### Opcionales

1. Admitir nombres con guion y apóstrofe.
2. Aplicar máximos a buscadores.
3. Uniformar mensajes Create/Update.
4. Rechazar bodies vacíos.
5. Definir política para emojis.
6. Reglas regionales de teléfono.
7. Límites para fechas de medición.
8. Máximos razonables de `offset` y `timestamp`.

## 12. Conclusión

### Validaciones correctas

- `ValidationPipe` global estricto.
- UUID v4 en rutas HTTP.
- Nombres, correos, teléfonos, fecha y edad de pacientes.
- Rangos de mediciones HTTP.
- Enums clínicos y de rol.
- Paginación.
- Normalización de email.
- Control de acceso de cuidadores.
- Escape normal de React.
- Suite específica: **9/9 pruebas aprobadas**.

### Validaciones incompletas

- Contraseñas.
- Eventos y contratos del dispositivo.
- Filtros.
- Intervalos de fechas.
- Existencia y rol de relaciones UUID.
- Sanitización contextual.
- Constraints de Supabase.
- JWT en frontend.
- Coherencia entre campos mostrados y persistidos.

### Validaciones inexistentes o inefectivas

- Configuración.
- Cambio real de perfil y contraseña.
- Crear/configurar dispositivo desde frontend.
- Crear medición manual.
- Teléfono/estado del cuidador en backend.
- Teléfono familiar del paciente en backend.
- Autenticación del endpoint público de resultados.
- Regla condicional entre alias de resultado.

**Resultado final: cobertura global aproximada del 74%.**

El núcleo CRUD de pacientes y mediciones está razonablemente protegido. Sin embargo, la creación pública de administradores, la recepción pública de resultados, la ausencia del esquema versionado de base de datos y los formularios que aparentan persistir cambios sin hacerlo impiden considerar completa la validación del sistema.

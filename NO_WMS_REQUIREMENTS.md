# no-wms — Documento Completo de Requerimientos para Desarrollo
## Para uso de Claude Code — Contexto completo del proyecto

---

## 1. QUÉ ES NO-WMS

no-wms (no-wms.com) es una plataforma de gestión de bodega (WMS) AI-native diseñada para 3PLs, freight forwarders y operadores de bodegas de logística. El objetivo es reemplazar sistemas legacy como GBI y Magaya con una aplicación web de clase mundial — al nivel de Linear, Vercel Dashboard o Notion en calidad de diseño y rendimiento.

**Principio fundamental**: La interfaz web es el producto principal. Es software de primera clase, no un wrapper de agente IA. La IA está embebida dentro de la experiencia como capa de mejora (búsqueda inteligente, sugerencias inline, detección de anomalías, barra de comandos ⌘K), pero cada acción posible por IA también es accesible via UI tradicional.

**Stack tecnológico decidido**:
- Frontend: Next.js 15 (App Router) + Tailwind + shadcn/ui
- Backend: Next.js API Routes + Supabase
- Base de datos: Supabase (PostgreSQL) con row-level security
- Búsqueda: PostgreSQL full-text search + pg_trgm (trigram fuzzy matching)
- Auth: Supabase Auth (multi-tenant, role-based)
- IA: Anthropic Claude API
- Storage: Supabase Storage (fotos, documentos, etiquetas)
- Deploy: Vercel
- Email: Resend o Supabase Edge Functions
- WhatsApp: Twilio / WhatsApp Business API (Fase 2)
- Impresión: Browser Print API + soporte para impresoras térmicas

---

## 2. CONTEXTO DE NEGOCIO

### Cómo funciona la operación

La operación conecta un **origen** (bodega, típicamente en Miami, pero también España o China) con un **destino** (país receptor, inicialmente Ecuador). El flujo es:

1. **Clientes finales** (destinatarios/mailbox holders) compran en tiendas online de EEUU (Amazon, eBay, etc.)
2. Esas compras llegan a la **bodega en Miami** con la dirección de un casillero de su **agencia subcourier**
3. La bodega recibe, pesa, mide, fotografía y reporta cada paquete en el sistema
4. La **agencia subcourier** (en Ecuador) ve los paquetes de sus clientes en el sistema
5. La agencia genera **instrucciones de embarque** agrupando paquetes por modalidad/categoría
6. La bodega ejecuta las instrucciones: arma sacas, genera HAWB, crea manifiestos, documenta MAWB
7. La carga viaja por avión (o mar para LCL/FCL) hasta Ecuador
8. El **administrador en destino** actualiza estados, gestiona la entrega al cliente final

### Modelo de facturación
- **no-wms factura a las agencias subcourier** (por peso, por servicio, por almacenaje)
- **Las agencias cobran a sus propios clientes finales** (el sistema no interviene en esa relación en MVP)

### Regulación Ecuador (primer país destino)
Ecuador tiene categorías de courier reguladas por aduana:
- **Categoría C**: Hasta 100 lbs y $500 — la más común
- **Categoría D**: Hasta $2,000
- **Categoría E/F**: Valores más altos
- **Categoría B**: Tipo box
- **Categoría G**: Tipo box
- **Categoría A**: Tipo box
- Requiere: cédula/RUC del destinatario, cupo 4x4 (límite de importaciones), declaración de contenido

---

## 3. ROLES DE USUARIO (7 roles MVP)

### 3.1 Administrador de Bodega (Origen — Miami)
- **Ubicación**: En la bodega
- **Día a día**: Supervisa toda la operación. Asigna tareas a operarios. Revisa que los recibos (WR) estén correctos. Habla con administrador destino cuando hay problemas. Genera reportes para gerencia.
- **Puede hacer**:
  1. Crear y desactivar usuarios de bodega
  2. Ver y editar cualquier recibo de carga (WR)
  3. Aprobar despachos y órdenes de trabajo
  4. Configurar tarifa para administrador en destino
  5. Ver reportes (carga recibida, despachada, pendiente)
  6. Gestionar ubicaciones de bodega
  7. Ver alertas de carga con muchos días en bodega
  8. Solicitar las reservas de guías a la aerolínea cada semana
  9. Control de tickets generados
- **NO puede**:
  1. Ver información financiera interna del administrador en destino y agencias
  2. Eliminar registros permanentemente (solo desactivar)
  3. Modificar datos ya facturados
- **Dashboard**: Agencias subcourier, Cajas (tracking) recibidas hoy, WR en bodega (total), Órdenes de trabajo pendientes, Alertas de cajas con más de X días, Despachos pendientes de aprobar, Historial de WR, Reportes, Tickets, Historial de WR desconocidos (por ubicar)

### 3.2 Operario de Bodega (Origen — Miami)
- **Ubicación**: En la bodega, usa tablet o computadora; puede trabajar remoto
- **Día a día**: Recibe la carga física. Pesa, mide, fotografía. Reporta en el sistema el ingreso de la carga. Ejecuta órdenes de trabajo (reempaque, división, consolidación). Prepara los despachos.
- **Puede hacer**:
  1. Registrar WR de carga (escanear, pesar, medir, foto)
  2. Buscar cajas por tracking o destinatario
  3. Reportar el ingreso de la carga mediante el sistema
  4. Reportar daño en carga
  5. Ver y ejecutar órdenes de trabajo asignadas
  6. Actualizar estado de OTs (en progreso, completada)
  7. Ver y ejecutar las instrucciones de embarque
  8. Armar las instrucciones de embarque según la solicitud generada en el sistema
  9. Imprimir etiquetas
  10. Armar sacas
  11. Armar/completar toda la documentación para el embarque (MAWB, manifiestos, etc.)
  12. Entrega de sacas listas al transporte interno para entrega al aeropuerto
  13. Crear el manifiesto por MAWB creada por día, con estatus "lista para vuelo"
  14. Resolver tickets generados por las agencias
- **NO puede**:
  1. Crear usuarios
  2. Modificar tarifas
  3. Aprobar despachos
  4. Eliminar registros
  5. Ver información financiera
- **Dashboard**: En bodega (cajas/tracking por procesar), Bodega MIA (WR en bodega), Órdenes de trabajo asignadas, Despachos en preparación, Manifiestos (creación y actualización), Historial de WR, Historial de WR desconocidos, Tickets

### 3.3 Shipping Clerk (Oficina/Remoto)
- **Ubicación**: Oficina o remoto
- **Día a día**: Revisa sistema. Comunicación con destino para novedades o seguimientos de instrucciones de embarque, trabajos, solicitudes especiales. Corta la documentación para entrega en aerolíneas. Facturación. Validar cargos. Realizar los SED. Coordinar reservas con aerolínea y chofer para entregas. Genera cargo release. Seguimiento de cierres de tickets u órdenes de trabajo.
- **Puede hacer**:
  1. Datos finales del manifiesto para cortar la MAWB
  2. Acceso al reporte de tickets
  3. Imprimir MAWB e hijas (HAWBs)
  4. Acceso a las facturas de cada instrucción de embarque
  5. Opción para validar partidas de los productos para elaboración de SED
  6. Conexión con sistema de facturación (QuickBooks — Fase 2)
  7. Lista de números para MAWB y HAWB de la semana
  8. Creación HAWB con diferente numeración de los WR
  9. Información del WR y campos para completar datos del cliente que va a retirar la carga
  10. Cargos adicionales
- **NO puede**:
  1. Crear WR
  2. Editar información del WR
  3. Modificar valores de órdenes de trabajo sin previa autorización de gerencia
- **Dashboard**: Despachos en preparación según modalidad de embarque, Bodega MIA (WR en bodega), Manifiestos (creación y actualización), Lista de HAWB, Tickets, Reporte de costos diarios, Reporte de órdenes de trabajo

### 3.4 Administrador en Destino (Ecuador — Remoto)
- **Ubicación**: Remoto, acceso por web/nube
- **Día a día**: Revisa los recibos de todas las agencias subcourier. Genera reporte por agencia. Actualiza status de las cargas de forma masiva. Genera notificaciones masivas por retrasos en arribos o comunicados que se visualicen como alerta al ingresar al sistema Y llegue un respaldo al correo electrónico de cada agencia registrada. Habla con agencias directamente. Control de reportes de WR no ingresados a tiempo.
- **Puede hacer**:
  1. Crear y desactivar N número de usuarios para agencias subcourier por categoría (Corporativo o Box)
  2. Aprobar o cancelar órdenes de trabajo o instrucciones de embarque que generen los subcourier
  3. Configurar tarifa por agencia subcourier, por rangos (1 a 100 lb, 101 a 200 lb, etc.)
  4. Ver y generar reportes (carga embarcada, órdenes de trabajo finalizados, pendientes)
  5. Ver alertas de carga con muchos días en bodega, enviar recordatorios de embarque. Contador de días.
  6. Ver y editar actualizaciones de estatus de embarques de la carga
  7. Seguimiento de las notificaciones masivas
  8. Generar la facturación para cada agencia subcourier (conexión SRI — Fase 2)
  9. Control de novedades reportadas por no reporte de WR a tiempo
  10. Subir información de WR de diferentes orígenes (ejemplo: Bodega España)
- **NO puede**:
  1. Eliminar o modificar información de los WR
  2. Modificar estatus que corresponden a origen
  3. Aprobar instrucciones de embarque u órdenes de trabajo que corresponden a origen
- **Dashboard**: Agencias subcourier, En bodega (cajas/tracking por procesar), Bodega MIA (WR por agencia — pendientes por despachar), Bodega España (WR por agencia — reporta Ecuador), Manifiestos (actualización de estatus), Historial de WR, Historial de WR desconocidos, Tickets, Reportes, Notificaciones, Facturación

### 3.5 Operario en Destino (Ecuador — Remoto)
- **Ubicación**: Remoto, acceso por web/nube
- **Día a día**: Revisa recibos de todas las agencias. Genera reporte por agencia. Actualiza status de forma masiva. Genera notificaciones masivas. Habla con agencias directamente. Control de reportes de WR no ingresados a tiempo.
- **Puede hacer**:
  1. Solicitar aprobación de cancelar órdenes de trabajo o instrucciones de embarque
  2. Generar reportes (carga embarcada, OT finalizadas, pendientes)
  3. Ver alertas de carga con muchos días en bodega
  4. Generar recordatorios de embarque
  5. Editar actualizaciones de estatus de embarques
  6. Generar las notificaciones masivas
  7. Control de novedades reportadas por no reporte de WR a tiempo
  8. Subir reporte de WR ingresados de la bodega de China
  9. Generar y controlar el módulo de tickets por agencia (revisión previa que autorice el traslado a bodega de origen)
  10. Revisar y solicitar el reporte de WR desconocidos al casillero de la agencia subcourier correspondiente
  11. Solicitar coordinaciones de pickup mediante el sistema (locales)
- **NO puede**:
  1. Eliminar o modificar información de los WR
  2. Modificar estatus que corresponden a origen
  3. Aprobar instrucciones de embarque u OT que corresponden a origen
  4. Modificar tarifas de agencias subcourier
  5. Facturar
  6. Ver información financiera
  7. Crear usuarios de agencias subcourier
  8. Trasladar WR de desconocidos a bodega Miami sin previa autorización de origen
  9. Cerrar ticket sin una revisión o comentario previo de origen
- **Dashboard**: Agencias subcourier, En bodega (cajas/tracking por procesar), Bodega MIA (WR por agencia), Bodega China (WR por agencia — reporta Ecuador), Manifiestos (actualización de estatus), Historial de WR, Historial de WR desconocidos, Tickets, Reportes, Notificaciones, Facturación, Pickup

### 3.6 Agencia Subcourier (Remoto)
- **Ubicación**: Remoto, acceso por web/nube
- **Día a día**: Revisión de WR reportados por bodega, generar instrucciones de embarque, órdenes de servicio, generar tickets para novedades.
- **Puede hacer**:
  1. Crear casilleros como agencia (dar de alta a sus clientes/destinatarios)
  2. Revisar WR reportados por bodega
  3. Generar instrucciones de embarque según la modalidad de embarques y categorías de courier de Ecuador
  4. Solicitar órdenes de servicio
  5. Generar tickets para reporte de novedades a bodega
  6. Solicitar el reporte de algún paquete que esté en historial de WR desconocidos al casillero del cliente
  7. Recepción de notificaciones
  8. Recepción y descarga de facturas emitidas, tarifarios, estados de cuenta
- **NO puede**:
  1. Generar ni modificar ningún tipo de estatus (únicamente recepción)
  2. Modificar tarifas
- **Dashboard**: Bodega MIA (WR en bodega por agencia), Bodega España (WR por agencia), Manifiestos (seguimiento de estatus), Historial de WR, Historial de WR desconocidos, Tickets, Notificaciones, Facturación
- **Nota importante**: Las agencias se clasifican en dos categorías: **Corporativo** y **Box**. Esto afecta la prioridad de cierres de órdenes de trabajo.

### 3.7 Super Admin
- Configuración del sistema completa
- Gestión de roles y permisos
- Multi-warehouse setup
- Feature flags
- Settings a nivel plataforma

---

## 4. ENTIDADES DEL SISTEMA (Objetos de Datos)

### 4.1 WR (Warehouse Receipt) — Entidad Central
Cada paquete físico que llega a la bodega se convierte en un WR. Es el objeto más importante del sistema.

| Campo | Descripción | Obligatorio | Quién lo ingresa | Ejemplo |
|-------|-------------|:-----------:|------------------|---------|
| Número de WR | ID único generado por bodega | Sí | Sistema genera, operario confirma | GLP1234 |
| Número de tracking | Número del carrier (FedEx, UPS, etc.) | Sí | Operario escanea o escribe | 1Z999AA10123456784 |
| Carrier / Transportista | Empresa que trajo el paquete | Sí | Operario selecciona de lista | FedEx / UPS / DHL / USPS / Amazon |
| Peso real (libras) | Peso en báscula al recibir | Sí | Operario (manual o báscula) | 12.5 lb |
| Largo (pulgadas) | Medida al recibir | Sí | Operario (manual o dimensionador) | 24 in |
| Ancho (pulgadas) | Medida al recibir | Sí | Operario (manual o dimensionador) | 18 in |
| Alto (pulgadas) | Medida al recibir | Sí | Operario (manual o dimensionador) | 12 in |
| Peso volumétrico | Calculado: (L×W×H) ÷ factor dimensional | Sí | Sistema calcula automático | 15.1 lb |
| Número de piezas | Artículos dentro de la caja | Sí | Operario ingresa | 3 |
| Fotos | Fotos de la caja al recibirla | Sí (mín 1) | Operario con celular/tablet | foto_frontal.jpg |
| Estado | Punto del proceso del WR | Sí | Sistema cambia según acciones | Recibida / En bodega / En OT / Despachada |
| Destinatario | Cliente final | Sí | Operario selecciona de lista | Juan Pérez (DEST-042) |
| Agencia | Agencia a la que pertenece el destinatario | Sí | Sistema asigna auto según destinatario | Agencia Express |
| Fecha y hora de ingreso | Cuándo se recibió en bodega | Sí | Sistema automático | 2025-02-15 14:30 |
| Ubicación en bodega | Dónde se guardó físicamente | Opcional | Operario ingresa | Estante A3, Nivel 2 |
| Observaciones de recibo | Notas: daño, caja abierta, DGR, etc. | No | Operario escribe | "Esquina aplastada, cinta rota" |
| Contenido declarado | Descripción del contenido | Fase 2 | Agencia o usuario | "Ropa y zapatos" |
| Valor declarado (USD) | Valor declarado para aduana/seguro | Fase 2 | Agencia ingresa | $150.00 |
| Días en bodega | Contador desde fecha de ingreso | Sí | Sistema calcula | 15 días |

**Factor dimensional**: Configurable por modalidad en Settings (166 para aéreo, 139 para marítimo, etc.)

**Regla de peso para facturación**: SIEMPRE se cobra por el MAYOR entre peso real y peso volumétrico.

### 4.2 HAWB (House Air Waybill)
- Número de HAWB detallado en el manifiesto de carga
- Formato ejemplo: GLP12345
- Lo ingresa el usuario (operario)
- Diferente numeración de los WR (un HAWB puede agrupar varios WR)

### 4.3 MAWB (Master Air Waybill)
- Número de MAWB de la aerolínea
- Formato ejemplo: 906-13203201
- Lo ingresa el usuario
- Un MAWB agrupa varios HAWB por día/vuelo

### 4.4 Instrucción de Embarque / Despacho
Cada modalidad genera su propia instrucción de embarque:

| Modalidad | Genera # instrucción | Auto-generado |
|-----------|---------------------|:-------------:|
| Consolidado Courier (C-D-E-F) | Sí — # único | Sistema |
| Box (B-G-A) | Sí — # único | Sistema |
| Aéreo | Sí — # único | Sistema |
| LCL | Sí — # único | Sistema |
| FCL | Sí — # único | Sistema |

### 4.5 Orden de Trabajo (OT)
- Número de orden auto-generado por cada solicitud
- Tiene prioridad diferente para agencias corporativas vs box
- 13 tipos definidos (ver sección 6)

### 4.6 Otras entidades (por definir datos específicos pero que deben existir en el modelo)
- **Destinatario (cliente final)**: Casillero, nombre, cédula/RUC, dirección en destino, teléfono, email, agencia
- **Agencia**: Nombre, tipo (corporativo/box), tarifas, crédito, configuraciones
- **Factura / Cobro**: Generada por destino hacia las agencias
- **Bodega / Almacén**: Ubicación física, zonas, racks
- **Ticket**: Reporte de novedad con ciclo de vida propio

---

## 5. CICLOS DE VIDA (Estados y Transiciones)

### 5.1 Ciclo de vida del WR

```
(nuevo) ──► RECIBIDA ──► EN BODEGA ──► EN ORDEN DE TRABAJO ──► EN BODEGA (OT completada)
                                    ├──► EN DESPACHO ──► DESPACHADA
                                    ├──► DAÑADA (branch, vuelve a EN BODEGA tras resolución)
                                    └──► ABANDONO (auto por días o manual)
```

**Transiciones detalladas:**

| Estado antes | Estado después | Qué lo causa | Quién | Condiciones previas | Notificación |
|---|---|---|---|---|---|
| (nuevo) | Recibida | Operario completa formulario de recibo: escanea tracking, pesa, mide, foto, selecciona destinatario, GUARDAR | Operario | Tracking sin duplicar, peso, dimensiones, mín 1 foto, destinatario seleccionado, notas DGR/caja rota/mal estado | Email auto a la agencia: "Se recibió caja [tracking] para [destinatario], peso: X lb" |
| Recibida | En bodega | Recibo exitoso, cambio automático | Sistema | Recibo completo sin errores | Ninguna adicional |
| En bodega | En orden de trabajo | Se crea OT que incluye este WR | Agencia solicita → Bodega asigna a operario | El WR no debe tener otra OT activa | Notificar al operario asignado |
| En orden de trabajo | En bodega | Operario marca OT como completada | Operario | Todos los pasos de la OT marcados como terminados | Notificar a agencia: "OT completada, ver fotos/resultados" |
| En bodega | En despacho | Agencia solicita despacho + bodega aprueba | Agencia solicita → Bodega aprueba | 1. No tener OT pendientes, 2. Despacho aprobado por admin bodega | Email a agencia: "Despacho aprobado, en preparación" |
| En despacho | Despachada | Operario confirma salida, ingresa tracking de salida | Operario o Admin bodega | Tracking de salida ingresado | Email a agencia y destinatario con tracking de salida |
| En bodega | Dañada | Operario detecta daño post-recibo | Operario | Mínimo 3 fotos del daño + descripción escrita | Email URGENTE a agencia + alerta al admin bodega |
| Dañada | En bodega | Se resuelve el reclamo (agencia acepta, se repara, etc.) | Admin bodega | Debe documentar la resolución por escrito | Email a agencia con resolución |
| En bodega | Abandono | Supera XX días configurados sin despacho | Sistema (auto) o Admin | Configurable por agency/settings | Notificación a agencia |

### 5.2 Ciclo de vida del Despacho / Instrucción de Embarque

```
APROBADO ──► FINALIZADO (operario arma la instrucción, genera HAWB)
```
Aplica para todas las modalidades: Courier (C-D-E-F), Box (B-G-A), Aéreo, LCL, FCL.

**Condición para FINALIZADO**: Generar el número de HAWB para visualizar en el manifiesto.
**Notificación**: A la agencia subcourier mediante actualización del manifiesto en el sistema.

Ciclo expandido (del one-pager):
```
Requested → Approved → In Preparation → Manifested → Ready for Flight → In Transit → Arrived → Delivered
         → Rejected / Cancelled (con motivo)
```

### 5.3 Ciclo de vida de Orden de Trabajo

```
APROBADO ──► FINALIZADO (operario realiza el trabajo según instrucciones)
```
**Condición para FINALIZADO**: Llenar campo de notas indicando que el trabajo fue realizado + cargar fotos o reportes solicitados.
**Notificación**: A la agencia subcourier mediante actualización en el sistema.

Ciclo expandido:
```
Requested → Approved → In Progress → Completed → [trigger notificación]
         → Cancelled (con motivo + notificación)
         → Pending (bloqueada, necesita corrección)
```

---

## 6. ACCIONES Y PANTALLAS (Flujos Detallados)

### 6.1 RECIBO DE CARGA (Módulo más crítico)

**Acción**: Registrar recibo de caja (WR)
**Quién**: Operario de bodega
**Paso a paso**:
1. Operario abre pantalla de Nuevo Recibo
2. Selecciona la agencia de destino
3. Escanea el código de barras de la guía (o escribe el tracking manualmente)
4. El sistema verifica que el tracking NO esté duplicado
5. Operario selecciona el carrier de una lista (FedEx, UPS, DHL, USPS, Amazon, etc.)
6. Operario pone la caja en la báscula → el peso aparece automático (o lo escribe manual)
7. Operario mide la caja o usa el dimensionador → dimensiones aparecen
8. Operario toma foto(s) con la tablet/celular
9. Operario selecciona la AGENCIA de una lista
10. Operario selecciona el DESTINATARIO de la lista de esa agencia
11. Operario indica cuántas piezas hay dentro
12. Si hay algo raro (daño, DGR, caja abierta), escribe en notas
13. Presiona CONFIRMAR RECIBO
14. El sistema genera un WR único y muestra un resumen
15. El sistema ofrece imprimir etiqueta interna

**Datos de entrada**: Tracking (escaneado o manual), Carrier (selección), Peso (báscula o manual), Largo/Ancho/Alto (medido o manual), Fotos (cámara dispositivo), Agencia (selección), Destinatario (selección filtrada por agencia), Número de piezas, Notas (opcional)

**Resultado en pantalla**: Confirmación con WR único, resumen de datos, peso volumétrico calculado, fecha de creación (para cálculo de días de bodegaje), botón imprimir etiqueta, botón registrar otra caja.

**Errores y manejo**:
- **Tracking duplicado** → Alerta: "Esta guía ya fue recibida el [fecha]. ¿Desea ver el recibo existente?" — NO permitir crear otro con el mismo tracking
- **Sin conexión a báscula** → Permitir ingreso manual
- **Foto no se sube** → Reintentar, o permitir continuar con advertencia
- **Destinatario no existe** → Botón para crear destinatario rápido

**CRÍTICO — Offline**: Este módulo DEBE funcionar sin internet. El operario debe poder recibir carga en modo offline, y cuando se restaure la conexión, los datos se sincronizan automáticamente.

### 6.2 DESPACHO / CONSOLIDADO

**Acción**: Solicitar despacho consolidado
**Quién**: Agencia subcourier
**Paso a paso**:
1. Agencia abre pantalla "Mis cajas en bodega"
2. Ve tabla con todas sus cajas (filtrable por destinatario)
3. Selecciona las cajas que quiere despachar (checkbox)
4. Presiona "SOLICITAR DESPACHO"
5. Sistema muestra resumen: # cajas, # piezas, peso total, peso volumétrico
6. Agencia selecciona método de envío / modalidad (Courier C/D/E/F, Box B/G/A, Aéreo, LCL, FCL)
7. Agencia selecciona dirección de destino (de su libreta o nueva)
8. Agencia agrega instrucciones especiales si aplica
9. Agencia confirma solicitud
10. Bodega recibe la solicitud como pendiente de aprobación

**Resultado**: Resumen con número de solicitud, lista de cajas, peso total y volumétrico, costo estimado, estado "Pendiente de aprobación"

**Errores**:
- Selecciona caja con OT pendiente → "La caja [X] tiene una orden de trabajo en proceso. No se puede incluir."
- Sin cajas seleccionadas → Botón deshabilitado

### 6.3 Los 13 Tipos de Órdenes de Trabajo

Extraídos del manual del sistema GBI que actualmente usan. Cada uno tiene su propio flujo:

1. **Abandono**: Marcar paquete como abandonado (por días en bodega o solicitud)
2. **Agrupar**: Combinar múltiples WR en uno solo
3. **Autorizar Retiro**: Autorizar a alguien a retirar la carga presencialmente
4. **Consolidar**: Agrupar múltiples paquetes en un solo bulto para embarque
5. **Delivery**: Coordinar entrega local
6. **Dividir**: Separar contenido de un WR en múltiples WR
7. **Enviar**: Instrucción general de envío
8. **Fotos**: Solicitar fotos adicionales de un WR
9. **Inspección**: Solicitar revisión/apertura de caja para verificar contenido
10. **Inventario**: Solicitar conteo/verificación del contenido
11. **Reempacar**: Re-empaquetar carga (caja dañada, optimización de espacio, etc.)
12. **Retorno**: Devolver paquete al remitente
13. **Solicitud Especial**: Cualquier otra solicitud que no encaje en las anteriores

Cada OT sigue el ciclo: Solicitada → Aprobada → En Progreso → Completada (con fotos/notas) → Notificación a agencia.

---

## 7. REGLAS DE NEGOCIO

### REGLA 1 — Almacenaje
**Cuándo**: Cuando un WR lleva más de XX días calendario en bodega sin ser despachado (XX configurable en settings por agencia/destino).
**Qué hace el sistema**:
1. Marcar el WR en color rojo indicando alerta de bodegaje
2. Al llegar al día XX (configurable), cambiar estatus a ABANDONO → el cliente NO podrá recuperar el WR
3. Cobrar almacenaje diario según tarifa de la agencia
**Excepción**: El admin puede extender el período gratis para un WR específico, documentando el motivo.

### REGLA 2 — No despachar con OT pendiente
**Cuándo**: Cuando bodega intenta incluir un WR que tiene una orden de trabajo en estado activa o pendiente en un despacho.
**Qué hace el sistema**:
1. Bloquear el WR con mensaje: "Orden de trabajo en curso o pendiente"
2. Confirmar que la OT ha sido realizada para activar el WR
**Excepción**: Admin bodega puede forzar despacho (cancelando la OT con documentación).

### REGLA 3 — WR Desconocidos
**Cuándo**: Cuando bodega no puede identificar el destinatario de un paquete por falta de número de casillero.
**Qué hace el sistema**:
1. Reportar en "Desconocidos" mostrando: nombre del remitente, transportista, tipo de paquete, fecha de ingreso
2. **NO mostrar el número de tracking** (por seguridad)
3. Cuando el cliente reclame, lo hará mediante MATCH del tracking de la carga (deben tener coincidencia)
**Si no hay coincidencia**: Se deberá presentar la factura de compra para identificar que el paquete le corresponde.

### REGLA 4 — Reporte de novedades en recibo
**Cuándo**: Cuando bodega recibe los paquetes de los transportistas.
**Qué hace el sistema**:
1. En el reporte del WR, notificar las novedades: carga peligrosa (tipo de UN), carga en mal estado (notificar daño), caja abierta, etc.
**Importante**: Daño requiere mínimo 3 fotos + descripción escrita + notificación inmediata a la agencia.

### REGLA 5 — Instrucciones no procesables
**Cuándo**: Cuando bodega recibe instrucciones de embarque u OT de destino que no puede procesar.
**Qué hace el sistema**:
1. Dejar la solicitud como "Pendiente"
2. Notificar a destino antes del cierre del manifiesto (en caso de instrucción de embarque)
3. Opción de cancelar o proceder con la OT/instrucción tras corrección.

### REGLA 6 — Traslados de WR entre agencias
**Cuándo**: Cuando un cliente final solicita el embarque con un subcourier diferente al original.
**Qué hace el sistema**:
1. Se debe presentar carta de autorización para el cambio, emitida por el cliente
2. Bodega o admin destino aprueba el cambio previa revisión
3. Se reporta al casillero final solicitado
**Excepción**: Únicamente si se comprueba que la factura tiene toda la información correcta para el cambio.

### REGLA 7 — Facturación por peso mayor (del one-pager)
**Siempre**: Al calcular costo de despacho o servicio por peso.
**Qué hace**: Comparar peso_real vs peso_volumétrico. Usar el MAYOR. Mostrar ambos en la factura.
**Sin excepciones**.

### REGLA 8 — Tracking duplicado (del one-pager)
**Cuándo**: Operario ingresa un tracking que ya existe.
**Qué hace**: BLOQUEO DURO. Alerta inmediata, no permitir crear otro recibo.

---

## 8. BÚSQUEDA — PILAR CORE DEL PRODUCTO

La búsqueda es el MAYOR pain point de los usuarios actuales. En GBI/Magaya, un error de un carácter en el tracking = "no encontrado". Las agencias pierden horas buscando paquetes.

### Búsqueda Universal (⌘K o barra superior, siempre accesible)
- **Fuzzy matching**: Encuentra paquetes incluso con typos, caracteres traspuestos, números parciales
- **Multi-campo**: Una sola query busca en tracking, WR, HAWB, nombre destinatario, nombre agencia, descripción contenido, notas, carrier — simultáneamente
- **Instantánea**: <50ms. Resultados mientras se escribe, sin botón "buscar"
- **Ranking inteligente**: Exactos primero, parciales después, fuzzy al final. Recientes y activos pesan más que archivados
- **Contextual por rol**: La agencia solo ve sus paquetes. El operario ve todo pero rankeado por sus tareas actuales

### Filtrado avanzado (composable, persistente, compartible)
- Filtros apilables tipo Linear: estado + agencia + rango fecha + rango peso + días en bodega + modalidad + carrier
- Persistentes por sesión y compartibles por URL
- Filtros guardados: "Mis paquetes con más de 30 días", "OT pendientes para cliente X"
- Acciones masivas desde cualquier vista filtrada: seleccionar todo → crear OT, instrucción de embarque, exportar

### Scan-First para operarios
- Escáner/cámara alimenta directamente la búsqueda universal
- Escanear código → detalle instantáneo del WR con historial y acciones disponibles
- Modo batch scan: escanear 20 paquetes en secuencia para acción masiva

### Búsqueda con lenguaje natural (⌘K)
- "Paquetes de Amazon para agencia Express con más de 15 días" → resultados filtrados
- "Todos los WR con OT pendientes" → vista filtrada
- "Paquetes de Juan Pérez listos para embarcar" → resultados con acción de despacho

### Inteligencia de búsqueda
- Búsquedas recientes: últimas 10
- Búsquedas sugeridas según rol y contexto
- Recuperación de zero-results: sugerencias de corrección, búsqueda en archivados
- Cross-reference: pegar número de orden de compra, Amazon order ID, nombre de remitente → match contra todos los metadatos

### Implementación técnica
- PostgreSQL `pg_trgm` para fuzzy matching por trigramas
- Full-text search de PostgreSQL para búsqueda semántica
- Upgrade path a Meilisearch/Typesense si escala lo requiere

---

## 9. SISTEMA DE SETTINGS (Pilar Core)

El sistema debe servir Ecuador hoy, Colombia mañana, y cualquier país LATAM el próximo año. Cada dimensión configurable es un setting, no código.

### Jerarquía cascada (herencia y override):
```
Super Admin (Plataforma)
  └─ Organización (ej: GLP)
       └─ Bodega / Origen (ej: Miami, España, China)
       └─ País Destino (ej: Ecuador, Colombia)
            └─ Agencia (ej: Express Courier Quito)
                 └─ Preferencias de usuario
```
Un valor en nivel superior aplica a todos los inferiores salvo override explícito.

### Settings por nivel:

**Plataforma**: Países soportados, monedas, idiomas, feature flags globales, templates de roles/permisos, límites globales.

**Organización**: Branding (logo, colores), factor dimensional default (166/139/custom) — overridable por modalidad, días de bodegaje gratis default, umbral de abandono automático, tipos de OT habilitados, templates de notificaciones, período retención audit log.

**Bodega/Origen**: Ubicación física, timezone, horarios operación, zonas/racks/ubicaciones, carriers manejados, configuración báscula/dimensionador, formato de etiquetas e impresoras, workflow de recibo (campos requeridos, fotos mínimas, checklist DGR), preferencias de escaneo/barcode.

**País Destino**: Categorías courier con límites peso/valor (ej: Ecuador Cat C = 100 lbs / $500), modalidades habilitadas (Courier, Aéreo, LCL, FCL), requisitos aduaneros (cédula/RUC, cupo 4x4, declaraciones de contenido), reglas de cálculo de impuestos/aranceles, documentación requerida por modalidad, reglas de validación de consignatario (formato ID, matching de nombre), moneda de facturación, formato de numeración HAWB.

**Agencia**: Tarifario (por rango de peso, por modalidad, por categoría), términos y límites de crédito, auto-aprobación de despachos (sí/no — configurable), override de días bodegaje gratis, override de días abandono, preferencias de notificación, país destino default, modalidades permitidas, información de contacto para comunicaciones automáticas.

**Usuario**: Idioma (ES/EN), timezone display, layout de dashboard, preferencias de notificación, filtros/vistas guardadas, personalización de atajos de teclado.

---

## 10. CONEXIONES EXTERNAS

| Sistema | Para qué | MVP/Fase |
|---------|----------|----------|
| Email (Resend/Supabase) | Notificaciones a agencias y destinatarios | MVP |
| WhatsApp (Twilio) | Notificaciones bidireccionales | Fase 2 |
| FedEx/UPS/DHL APIs | Rastreo de paquetes entrantes | Fase 2 |
| Excel de tarifas | Importar tarifas por agencia | Fase 2 (manual en MVP) |
| QuickBooks | Conexión con contabilidad | Fase 2 |
| SRI Ecuador | Facturación electrónica | Fase 2 |

---

## 11. REQUERIMIENTOS NO FUNCIONALES (pendientes de confirmar valores exactos pero la arquitectura debe soportar)

| Tema | Pregunta clave | Decisión/Default |
|------|----------------|-----------------|
| Dispositivos | ¿Tablet, celular, desktop? | Todos — responsive, mobile-first para operarios |
| Escáner | ¿Pistola USB, cámara, Bluetooth? | Soportar todos — empezar con cámara del dispositivo |
| Idioma | ¿ES, EN, ambos? | Ambos — MVP en español, inglés Fase 2 |
| Volumen agencias | ¿Cuántas? | Diseñar para N agencias, empezar con 3-5 |
| Volumen destinatarios | ¿Cuántos? | Miles por agencia |
| Usuarios simultáneos | ¿Máximo? | Diseñar para cientos, empezar con decenas |
| Login | ¿Email+password? ¿2FA? | Email+password MVP, 2FA configurable |
| Timeout sesión | ¿Cuántos minutos? | Configurable en settings |
| Auditoría | ¿Log de quién hizo qué? | SÍ — todo cambio de estado logueado |
| Horario operación | ¿24/7? | Sí, sistema disponible 24/7 |
| Moneda | ¿Solo USD? | USD MVP, multi-moneda Fase 2 |
| Impresión | ¿Qué se imprime? | Etiquetas internas, MAWB, HAWB, facturas |
| Respaldos | ¿Frecuencia? | Automáticos (Supabase se encarga) |
| Datos históricos | ¿Migrar de GBI? | Fase 2 |
| Fotos | ¿Retención? | Ilimitada en MVP |

---

## 12. PRINCIPIOS DE ARQUITECTURA

1. **UI-first, AI-enhanced**: La web app es el producto principal. Cada acción de IA también funciona via UI.
2. **Performance es feature**: <100ms transiciones, <200ms búsqueda, UI optimista.
3. **Search es navegación**: Todo accesible desde búsqueda. Fuzzy, parcial, lenguaje natural.
4. **Multi-tenant desde día uno**: Cada query scoped por organización. RLS en base de datos.
5. **Configurable todo**: Settings cascada (Plataforma → Org → Bodega → País → Agencia → Usuario). Ecuador día uno; agregar Colombia = nueva entrada en settings, cero cambio de código.
6. **Real-time**: Supabase subscriptions para actualizaciones live.
7. **Offline-capable receipt**: Cola y sincronización cuando se restaura conexión.
8. **Auditar todo**: Cada cambio de estado con quién, cuándo, qué y por qué.
9. **AI como infraestructura**: Cada módulo expone API basada en intenciones. UI es el cliente principal; email/WhatsApp son clientes secundarios.

---

## 13. ALCANCE MVP (Fase 1)

**Meta**: Reemplazar GBI para 3-5 agencias subcourier que embarcan desde Miami a Ecuador. Arquitectura multi-bodega desde día uno.

**Incluye**:
- Recibo de WR (scan, pesar, medir, foto, asignar) con cola offline y sincronización
- Vista inventario bodega con búsqueda/filtro avanzado
- 13 tipos de órdenes de trabajo con flujos básicos
- Instrucciones de embarque para categorías courier Ecuador (A–G) + Aéreo
- Generación de manifiestos (MAWB/HAWB)
- Gestión de tarifas (por agencia, rango de peso, modalidad)
- Acceso role-based para los 7 roles
- Notificaciones por email (recibo, despacho, OT completada, alertas)
- Tracking de días en bodega con alertas configurables y auto-abandono
- Gestión de WR desconocidos
- Sistema de tickets
- Facturación a agencias (no-wms → agencia)
- Reportes básicos (carga in/out, aging, por agencia)
- Settings de país destino Ecuador (categorías courier, cupo 4x4, cédula/RUC)
- Panel de settings completo a cada nivel
- IA: Barra de comandos (⌘K) con búsqueda en lenguaje natural, sugerencias inteligentes

**NO incluye en MVP** (Fase 2+):
- WhatsApp
- Portal de cliente final
- LCL/FCL
- Otros países destino (pero la arquitectura los soporta)
- QuickBooks / SRI
- Bodegas operativas en España/China (la arquitectura las soporta)
- IA avanzada: OCR de documentos, ops predictivas
- APIs de carriers
- Multi-moneda
- Migración de datos GBI
- App nativa móvil
- IoT (básculas inteligentes, dimensionadores)
- Analytics/BI avanzado

---

## 14. GLOSARIO

| Término | Significado |
|---------|-------------|
| WR | Warehouse Receipt — recibo de carga, un WR por paquete físico |
| HAWB | House Air Waybill — guía aérea hija, agrupa WRs |
| MAWB | Master Air Waybill — guía aérea maestra, agrupa HAWBs por vuelo |
| OT | Orden de Trabajo — solicitud de servicio sobre un WR |
| Agencia / Subcourier | Empresa courier que opera bajo el paraguas del 3PL |
| Destinatario / Casillero | Cliente final que recibe la carga en destino |
| Saca | Bolsa o bulto que agrupa paquetes para embarque |
| DGR | Dangerous Goods Regulations — carga peligrosa |
| SED | Shipper's Export Declaration — declaración de exportación |
| Cupo 4x4 | Límite de importaciones courier por persona en Ecuador |
| Factor dimensional | Divisor para calcular peso volumétrico (166 aéreo, 139 marítimo) |
| Cargo release | Documento que autoriza la liberación de la carga |
| Corporativo vs Box | Dos categorías de agencias con diferente prioridad operativa |

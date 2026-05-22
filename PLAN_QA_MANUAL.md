# Plan de Acción QA Manual End-to-End

## 1. Alcance

Este plan cubre pruebas manuales de punta a punta para la plataforma Escarbato Petshop, incluyendo administración central, autenticación, operación diaria, gestión de catálogo, stock, ventas, mostrador, cajas, peluquería, usuarios, reportes, comportamiento offline, sincronización y experiencia responsive.

## 2. Preparación del Entorno

Antes de comenzar, la persona QA debe preparar el ambiente de prueba.

1. Abrir la plataforma en un navegador actualizado, preferentemente Chrome o Edge.
2. Abrir también una ventana en modo incógnito para pruebas de sesiones paralelas.
3. Tener disponible una cuenta de usuario operativa y una cuenta supervisora si aplica.
4. Tener disponible una cuenta admin para el panel central.
5. Confirmar que la base de datos de prueba contiene o permite crear proveedores, tipos, productos, métodos de pago, cajas y turnos.
6. Confirmar que el navegador permite `localStorage`, `sessionStorage`, IndexedDB y Service Workers.
7. Mantener abierta la consola del navegador durante las pruebas críticas para detectar errores JavaScript.
8. Registrar evidencias con capturas de pantalla, fecha, usuario utilizado, navegador, empresa/subdominio y resultado observado.

## 3. Criterios Generales de Aceptación

1. La app no debe mostrar errores de consola no controlados durante flujos normales.
2. Los mensajes de éxito, error y validación deben ser claros para una persona usuaria no técnica.
3. Toda creación, edición o eliminación debe persistir al recargar la página.
4. Los listados deben actualizarse después de cada operación sin requerir cerrar sesión.
5. Las acciones críticas deben solicitar confirmación cuando corresponda.
6. Las operaciones entre módulos relacionados deben mantener consistencia de datos.
7. La app debe ser utilizable en desktop y mobile.
8. En modo offline, la app debe comunicar el estado y no perder datos locales ya guardados.

## 4. Administración Central de Empresas

### QA-ADM-01 - Login admin correcto

**Objetivo:** Validar que una persona admin pueda ingresar al panel central.

**Pasos:**

1. Abrir la ruta del panel admin.
2. Verificar que se muestre el formulario `Ingreso admin`.
3. Ingresar usuario admin válido.
4. Ingresar contraseña admin válida.
5. Presionar `Ingresar`.
6. Esperar la carga del listado de empresas.

**Resultado esperado:**

1. El login se completa sin error.
2. Se muestra la tabla `Empresas registradas`.
3. El botón `Salir` queda visible.
4. No aparecen errores en consola.

### QA-ADM-02 - Login admin inválido

**Objetivo:** Validar el rechazo de credenciales incorrectas.

**Pasos:**

1. Abrir el panel admin en una sesión limpia.
2. Ingresar un usuario incorrecto.
3. Ingresar una contraseña incorrecta.
4. Presionar `Ingresar`.
5. Observar el mensaje mostrado.

**Resultado esperado:**

1. No se ingresa al panel.
2. Se muestra un mensaje de operación fallida o credenciales incorrectas.
3. No se guarda token admin en una sesión válida.
4. La pantalla permanece en el formulario de login.

### QA-ADM-03 - Crear empresa nueva

**Objetivo:** Validar la creación de una empresa/tenant.

**Pasos:**

1. Ingresar al panel admin con credenciales válidas.
2. Ir al formulario `Nueva empresa`.
3. Completar `Nombre` con un nombre único.
4. Completar `Subdominio slug` con un slug único en minúsculas.
5. Completar `Tipo de negocio`.
6. Completar `assets/empresa` si corresponde.
7. Completar `db_empresa` con una base de datos de prueba única.
8. Completar `JWT secret`.
9. Completar usuario y contraseña de auth.
10. Completar usuario y contraseña de supervisor.
11. Presionar `Crear empresa`.
12. Esperar a que el listado se actualice.

**Resultado esperado:**

1. La empresa aparece en la tabla.
2. El slug y DB se muestran correctamente.
3. La empresa queda en estado `Activa`.
4. No se duplican filas.
5. La empresa permite autenticarse desde su subdominio o URL correspondiente.

### QA-ADM-04 - Editar empresa existente

**Objetivo:** Validar edición de datos no sensibles de una empresa.

**Pasos:**

1. Ingresar al panel admin.
2. Buscar una empresa de prueba.
3. Presionar `Editar`.
4. Cambiar el nombre comercial.
5. Cambiar el tipo de negocio.
6. Confirmar que el campo de base de datos queda deshabilitado si la empresa ya existe.
7. Presionar `Guardar cambios`.
8. Esperar la actualización del listado.
9. Recargar la página.

**Resultado esperado:**

1. Los cambios se guardan correctamente.
2. La DB no puede modificarse desde edición.
3. Al recargar, los cambios permanecen.
4. No se pierde el estado activo de la empresa.

### QA-ADM-05 - Cambiar contraseña de empresa

**Objetivo:** Validar el cambio de contraseña para roles de una empresa.

**Pasos:**

1. Ingresar al panel admin.
2. En una empresa de prueba, presionar `Password`.
3. Seleccionar rol `Auth`.
4. Ingresar una nueva contraseña segura.
5. Presionar `Actualizar contraseña`.
6. Cerrar sesión en la app de la empresa si estaba abierta.
7. Intentar ingresar con la contraseña anterior.
8. Intentar ingresar con la nueva contraseña.

**Resultado esperado:**

1. La contraseña anterior deja de funcionar.
2. La contraseña nueva permite ingresar.
3. El panel admin no muestra la contraseña en texto visible después de guardar.
4. El listado vuelve a mostrarse sin errores.

## 5. Autenticación y Sesión de Empresa

### QA-AUTH-01 - Login automático o modal de credenciales

**Objetivo:** Validar el ingreso inicial a la app de una empresa.

**Pasos:**

1. Abrir la URL de una empresa activa.
2. Si aparece el modal `Iniciar sesión`, ingresar usuario y contraseña válidos.
3. Presionar `Ingresar`.
4. Esperar a que se cargue el menú lateral.
5. Verificar que la sección inicial sea `Panel` o la primera sección habilitada.

**Resultado esperado:**

1. El usuario ingresa correctamente.
2. Se precargan los datos de la app.
3. El menú queda habilitado después de la carga.
4. El token queda persistido para la sesión.

### QA-AUTH-02 - Credenciales incorrectas

**Objetivo:** Validar que credenciales inválidas no permiten usar la plataforma.

**Pasos:**

1. Borrar tokens del navegador o abrir incógnito.
2. Abrir la app de empresa.
3. Ingresar usuario inválido.
4. Ingresar contraseña inválida.
5. Presionar `Ingresar`.
6. Repetir con usuario válido y contraseña inválida.

**Resultado esperado:**

1. Se muestra `Usuario o contraseña incorrectos` o mensaje equivalente.
2. El modal permanece abierto.
3. No se renderizan datos protegidos.
4. No se generan errores de consola.

### QA-AUTH-03 - Recuperación ante sesión vencida

**Objetivo:** Validar que la app solicita login cuando el token deja de ser válido.

**Pasos:**

1. Ingresar a la app con un usuario válido.
2. Borrar manualmente el token desde DevTools o invalidarlo desde backend si es posible.
3. Ejecutar una acción protegida, por ejemplo guardar un proveedor o cargar dashboard.
4. Observar el comportamiento de la app.
5. Ingresar nuevamente credenciales válidas cuando se soliciten.

**Resultado esperado:**

1. La app muestra mensaje de sesión vencida o solicita login.
2. Al reingresar, la operación puede repetirse correctamente.
3. No queda la pantalla bloqueada.
4. No se pierden datos ya persistidos.

### QA-AUTH-04 - Persistencia de sesión al recargar

**Objetivo:** Validar que una sesión válida se conserva al recargar.

**Pasos:**

1. Ingresar a la app con credenciales válidas.
2. Navegar a `Productos`.
3. Recargar el navegador.
4. Esperar la precarga.
5. Navegar a otra sección protegida.

**Resultado esperado:**

1. No se solicita login si el token sigue vigente.
2. Los datos se cargan nuevamente.
3. El menú queda habilitado.
4. La app responde normalmente.

### QA-AUTH-05 - Aislamiento entre empresas

**Objetivo:** Validar que los datos de una empresa no se mezclan con otra.

**Pasos:**

1. Abrir la empresa A e ingresar.
2. Crear un proveedor con nombre único, por ejemplo `Proveedor QA Empresa A`.
3. Abrir empresa B en incógnito e ingresar con sus credenciales.
4. Ir a `Proveedores` en empresa B.
5. Buscar el proveedor creado en empresa A.

**Resultado esperado:**

1. El proveedor de empresa A no aparece en empresa B.
2. Cada empresa mantiene su propia base de datos.
3. No hay contaminación de sesión ni de cache visible.

## 6. Dashboard / Panel

### QA-DASH-01 - Carga inicial del panel

**Objetivo:** Validar que el panel carga métricas iniciales.

**Pasos:**

1. Ingresar a la app.
2. Esperar la carga completa de datos.
3. Verificar que la sección `Panel` esté activa.
4. Observar tarjetas, métricas o resumen disponible.
5. Abrir la consola del navegador.

**Resultado esperado:**

1. El panel no queda en estado de carga infinito.
2. Las métricas visibles tienen formato correcto.
3. Si no hay datos, se muestran estados vacíos entendibles.
4. No hay errores JavaScript.

### QA-DASH-02 - Actualización luego de una venta

**Objetivo:** Validar que el panel refleja actividad comercial nueva.

**Pasos:**

1. Registrar una venta desde `Mostrador`.
2. Confirmar que la venta finaliza exitosamente.
3. Ir a `Panel`.
4. Recargar el panel o la página si existe cache.
5. Comparar las métricas de ventas con el registro nuevo.

**Resultado esperado:**

1. El panel refleja la venta nueva según sus métricas.
2. Los totales son coherentes con el total final de la venta.
3. No se muestran datos duplicados.

### QA-DASH-03 - Productos con stock bajo

**Objetivo:** Validar que el panel identifica alertas de stock.

**Pasos:**

1. Crear o elegir un producto con `Stock mínimo` mayor a cero.
2. Ajustar su stock para que quede igual o menor al mínimo pero mayor a cero.
3. Ir al `Panel`.
4. Revisar alertas o listados relacionados con stock bajo.

**Resultado esperado:**

1. El producto aparece como stock bajo si el panel muestra esa información.
2. La cantidad informada coincide con el módulo `Stock`.
3. Si el panel no tiene tarjeta específica, no debe mostrar información contradictoria.

### QA-DASH-04 - Estado vacío sin datos

**Objetivo:** Validar comportamiento cuando una empresa no tiene datos cargados.

**Pasos:**

1. Ingresar a una empresa nueva o limpia.
2. Abrir `Panel`.
3. Revisar tarjetas, tablas y mensajes.
4. Navegar a otras secciones y volver al panel.

**Resultado esperado:**

1. La pantalla no falla por arrays vacíos.
2. Las métricas muestran cero o estados vacíos claros.
3. La navegación permanece habilitada.

### QA-DASH-05 - Dashboard responsive

**Objetivo:** Validar visualización del panel en mobile.

**Pasos:**

1. Abrir DevTools en modo responsive.
2. Seleccionar un ancho aproximado de 390 px.
3. Recargar la app.
4. Abrir `Panel`.
5. Hacer scroll vertical completo.

**Resultado esperado:**

1. No hay contenido cortado horizontalmente.
2. Las tarjetas son legibles.
3. El menú o navegación mobile permite moverse a otras secciones.
4. Los textos principales no se superponen.

## 7. Proveedores

### QA-PROV-01 - Crear proveedor válido

**Objetivo:** Validar alta de proveedor.

**Pasos:**

1. Ir a `Proveedores`.
2. Presionar el botón para crear nuevo proveedor.
3. Completar el nombre con `Proveedor QA Manual`.
4. Completar datos opcionales si existen, como contacto, teléfono o descripción.
5. Presionar `Guardar`.
6. Buscar el proveedor en el listado.

**Resultado esperado:**

1. Se muestra mensaje de éxito.
2. El proveedor aparece en el listado.
3. La información guardada coincide con lo ingresado.
4. El proveedor queda disponible para seleccionarse en `Productos`.

### QA-PROV-02 - Validación de nombre requerido

**Objetivo:** Validar campos obligatorios.

**Pasos:**

1. Ir a `Proveedores`.
2. Abrir el modal de nuevo proveedor.
3. Dejar el nombre vacío.
4. Completar solo campos opcionales si existen.
5. Presionar `Guardar`.

**Resultado esperado:**

1. El proveedor no se crea.
2. Se muestra una validación clara.
3. El modal permanece abierto para corregir.
4. No aparece una fila vacía en el listado.

### QA-PROV-03 - Editar proveedor

**Objetivo:** Validar actualización de proveedor.

**Pasos:**

1. Crear o elegir un proveedor existente.
2. Presionar `Editar`.
3. Cambiar el nombre a `Proveedor QA Manual Editado`.
4. Guardar cambios.
5. Recargar la página.
6. Buscar el proveedor editado.

**Resultado esperado:**

1. El listado muestra el nombre nuevo.
2. El nombre anterior ya no aparece, salvo en historial si existe.
3. Los productos asociados muestran el proveedor actualizado.

### QA-PROV-04 - Buscar proveedor

**Objetivo:** Validar búsqueda por texto.

**Pasos:**

1. Ir a `Proveedores`.
2. Crear dos proveedores con nombres diferentes si no existen.
3. Escribir parte del nombre de uno en el buscador.
4. Observar los resultados.
5. Borrar el buscador.

**Resultado esperado:**

1. Solo se muestran coincidencias al buscar.
2. Al borrar el texto, vuelve el listado completo.
3. La búsqueda no distingue incorrectamente mayúsculas/minúsculas.

### QA-PROV-05 - Eliminar proveedor

**Objetivo:** Validar eliminación controlada.

**Pasos:**

1. Crear un proveedor de prueba sin productos asociados.
2. Presionar el botón eliminar.
3. Confirmar que aparece modal de confirmación.
4. Cancelar la eliminación.
5. Verificar que el proveedor sigue existiendo.
6. Presionar eliminar nuevamente.
7. Confirmar la eliminación.

**Resultado esperado:**

1. Cancelar no elimina el registro.
2. Confirmar elimina el proveedor.
3. El listado se actualiza.
4. Al recargar, el proveedor eliminado no vuelve a aparecer.

## 8. Tipos de Producto

### QA-TIPO-01 - Crear tipo válido

**Objetivo:** Validar alta de tipo de producto.

**Pasos:**

1. Ir a `Tipos de Producto`.
2. Presionar nuevo tipo.
3. Completar nombre `Alimentos QA`.
4. Completar descripción si existe.
5. Guardar.
6. Verificar el listado.

**Resultado esperado:**

1. El tipo aparece en el listado.
2. Queda disponible en el selector de productos.
3. El nombre se muestra correctamente con acentos o caracteres válidos.

### QA-TIPO-02 - Evitar nombre vacío

**Objetivo:** Validar obligatoriedad de nombre.

**Pasos:**

1. Abrir nuevo tipo.
2. Dejar nombre vacío.
3. Presionar guardar.
4. Observar mensajes.

**Resultado esperado:**

1. No se crea el tipo.
2. Se muestra error claro.
3. La pantalla permite corregir sin perder contexto.

### QA-TIPO-03 - Evitar duplicados evidentes

**Objetivo:** Validar tratamiento de tipos repetidos.

**Pasos:**

1. Crear `Juguetes QA`.
2. Intentar crear `juguetes qa` con distinta capitalización.
3. Intentar guardar.
4. Revisar el listado.

**Resultado esperado:**

1. La app impide o advierte el duplicado.
2. No quedan dos tipos equivalentes si la validación existe.
3. Si el sistema permite duplicados por diseño, registrar el comportamiento como riesgo funcional.

### QA-TIPO-04 - Editar tipo usado por producto

**Objetivo:** Validar consistencia entre tipo y producto.

**Pasos:**

1. Crear un tipo `Tipo QA Original`.
2. Crear un producto asociado a ese tipo.
3. Volver a `Tipos de Producto`.
4. Editar el tipo a `Tipo QA Editado`.
5. Ir a `Productos`.
6. Buscar el producto asociado.

**Resultado esperado:**

1. El producto muestra el tipo actualizado.
2. No se pierde la asociación.
3. Los filtros de productos incluyen el nombre actualizado.

### QA-TIPO-05 - Eliminar tipo

**Objetivo:** Validar eliminación de tipos.

**Pasos:**

1. Crear un tipo de prueba sin productos asociados.
2. Presionar eliminar.
3. Cancelar la confirmación.
4. Confirmar que sigue visible.
5. Repetir y confirmar eliminación.
6. Recargar la página.

**Resultado esperado:**

1. La cancelación conserva el tipo.
2. La confirmación elimina el tipo.
3. El tipo eliminado no aparece en selectores de productos.

## 9. Productos

### QA-PROD-01 - Crear producto completo

**Objetivo:** Validar alta de producto con costo, margen y precio final.

**Pasos:**

1. Crear previamente un proveedor y un tipo.
2. Ir a `Productos`.
3. Abrir `Nuevo Producto`.
4. Completar nombre `Producto QA Manual`.
5. Seleccionar tipo.
6. Seleccionar proveedor.
7. Ingresar costo `1000`.
8. Ingresar porcentaje de ganancia `30`.
9. Verificar que `Precio calculado` muestre `1300` o formato equivalente.
10. Ingresar precio final `1350`.
11. Ingresar stock mínimo `5`.
12. Agregar descripción.
13. Guardar.

**Resultado esperado:**

1. El producto aparece en el listado.
2. Costo, porcentaje, precio calculado y precio final son correctos.
3. El producto se puede encontrar por búsqueda.
4. El producto aparece en `Stock` y `Mostrador` si tiene stock disponible.

### QA-PROD-02 - Validaciones obligatorias

**Objetivo:** Validar que no se creen productos incompletos.

**Pasos:**

1. Abrir nuevo producto.
2. Dejar nombre vacío.
3. Dejar tipo sin seleccionar.
4. Dejar proveedor sin seleccionar.
5. Dejar costo, porcentaje o precio final vacíos.
6. Presionar guardar.

**Resultado esperado:**

1. El producto no se crea.
2. La app informa los campos requeridos.
3. No aparece un producto incompleto en el listado.

### QA-PROD-03 - Edición inline de precios

**Objetivo:** Validar edición rápida desde tabla.

**Pasos:**

1. Ir a `Productos`.
2. Ubicar un producto existente.
3. Cambiar el campo inline `Costo`.
4. Cambiar el campo inline `Porcentaje`.
5. Observar actualización de precio calculado.
6. Cambiar `Precio final`.
7. Salir del campo o confirmar el cambio según comportamiento.
8. Recargar la página.

**Resultado esperado:**

1. Los cambios se guardan automáticamente o con el mecanismo previsto.
2. El precio calculado responde al costo y porcentaje.
3. El precio final queda persistido.
4. La fecha de actualización se modifica si aplica.

### QA-PROD-04 - Filtros de producto

**Objetivo:** Validar búsqueda y filtros combinados.

**Pasos:**

1. Crear productos de distintos tipos y proveedores.
2. Ingresar texto parcial en `Buscar producto`.
3. Seleccionar un tipo específico.
4. Seleccionar un proveedor específico.
5. Seleccionar filtro de stock `Disponible`, `Stock bajo` y `Sin stock`.
6. Limpiar filtros.

**Resultado esperado:**

1. Los resultados coinciden con todos los filtros activos.
2. Al limpiar filtros vuelve el listado completo.
3. No aparecen productos de otro tipo o proveedor cuando el filtro está activo.

### QA-PROD-05 - Ver detalle y eliminar producto

**Objetivo:** Validar visualización y eliminación.

**Pasos:**

1. Crear un producto de prueba.
2. Presionar el icono de visualizar.
3. Revisar que el modal muestre información completa.
4. Cerrar el detalle.
5. Presionar eliminar.
6. Cancelar y verificar que sigue visible.
7. Eliminar nuevamente y confirmar.
8. Recargar.

**Resultado esperado:**

1. El detalle coincide con los datos guardados.
2. Cancelar no elimina.
3. Confirmar elimina.
4. El producto eliminado no aparece en `Mostrador` ni en filtros.

## 10. Stock

### QA-STOCK-01 - Cargar stock inicial

**Objetivo:** Validar ingreso de stock para un producto.

**Pasos:**

1. Crear un producto con stock mínimo configurado.
2. Ir a `Stock`.
3. Buscar el producto.
4. Abrir la acción de ajuste o carga de stock.
5. Ingresar una cantidad positiva, por ejemplo `20`.
6. Guardar.
7. Recargar la página.

**Resultado esperado:**

1. La cantidad queda visible en stock.
2. El producto queda disponible en `Mostrador`.
3. El valor persiste al recargar.

### QA-STOCK-02 - Ajuste de stock a cero

**Objetivo:** Validar producto sin stock.

**Pasos:**

1. Ubicar un producto con stock positivo.
2. Ajustar la cantidad a `0` o realizar una salida que deje stock en cero.
3. Guardar.
4. Ir a `Productos` y aplicar filtro `Sin stock`.
5. Ir a `Mostrador` y filtrar `Sin stock`.

**Resultado esperado:**

1. El producto aparece como sin stock.
2. No permite vender una cantidad mayor a la disponible.
3. El stock no queda negativo.

### QA-STOCK-03 - Stock bajo

**Objetivo:** Validar clasificación por mínimo.

**Pasos:**

1. Configurar un producto con stock mínimo `5`.
2. Ajustar su stock actual a `3`.
3. Ir a `Productos`.
4. Aplicar filtro `Stock bajo`.
5. Revisar `Panel` si muestra alertas.

**Resultado esperado:**

1. El producto aparece como stock bajo.
2. La cantidad disponible es correcta.
3. No aparece en `Sin stock` mientras sea mayor a cero.

### QA-STOCK-04 - No permitir cantidades inválidas

**Objetivo:** Validar control de números inválidos.

**Pasos:**

1. Ir a `Stock`.
2. Intentar cargar una cantidad negativa.
3. Intentar cargar letras o símbolos si el campo lo permite.
4. Intentar guardar un campo vacío.
5. Observar mensajes y resultado.

**Resultado esperado:**

1. No se guardan cantidades inválidas.
2. La app muestra validación o impide la entrada.
3. El stock anterior permanece sin cambios.

### QA-STOCK-05 - Consistencia tras venta

**Objetivo:** Validar descuento de stock después de una venta.

**Pasos:**

1. Crear un producto con stock `10`.
2. Ir a `Mostrador`.
3. Agregar `3` unidades al carrito.
4. Finalizar la venta con un método de pago válido.
5. Ir a `Stock`.
6. Buscar el producto.

**Resultado esperado:**

1. El stock queda en `7`.
2. La venta aparece en `Ventas`.
3. El producto no queda reservado en el carrito después de finalizar.

## 11. Métodos de Pago

### QA-PAGO-01 - Crear método sin ajuste

**Objetivo:** Validar alta de método de pago básico.

**Pasos:**

1. Ir a `Métodos de pago`.
2. Crear un método llamado `Efectivo QA`.
3. Configurar descuento y recargo en cero si existen.
4. Guardar.
5. Ir a `Mostrador`.

**Resultado esperado:**

1. El método aparece en el listado.
2. El método aparece en el selector de pago de mostrador.
3. Al seleccionarlo, el total final no cambia.

### QA-PAGO-02 - Crear método con descuento

**Objetivo:** Validar cálculo de descuento.

**Pasos:**

1. Crear método `Descuento QA 10`.
2. Configurar descuento `10%`.
3. Guardar.
4. Ir a `Mostrador`.
5. Agregar un producto de $1000 al carrito.
6. Seleccionar el método creado.

**Resultado esperado:**

1. El resumen indica descuento del 10%.
2. El total final esperado es $900.
3. La venta guarda el método y el total final con descuento.

### QA-PAGO-03 - Crear método con recargo

**Objetivo:** Validar cálculo de recargo.

**Pasos:**

1. Crear método `Crédito QA 15`.
2. Configurar recargo `15%`.
3. Guardar.
4. Vender un producto de $1000 desde mostrador.
5. Seleccionar el método creado.

**Resultado esperado:**

1. El total final esperado es $1150.
2. El detalle de venta muestra método y recargo.
3. La lista de ventas permite filtrar por ese método.

### QA-PAGO-04 - Editar método existente

**Objetivo:** Validar actualización de métodos de pago.

**Pasos:**

1. Elegir un método de pago de prueba.
2. Editar nombre y porcentaje.
3. Guardar.
4. Ir a `Mostrador`.
5. Abrir el selector de método de pago.

**Resultado esperado:**

1. El selector muestra el nombre actualizado.
2. El cálculo usa el porcentaje actualizado.
3. Las ventas históricas mantienen el método registrado al momento de venta o muestran el comportamiento definido sin romperse.

### QA-PAGO-05 - Eliminar método no usado

**Objetivo:** Validar eliminación de método de pago.

**Pasos:**

1. Crear un método de pago de prueba que no se use en ventas.
2. Presionar eliminar.
3. Cancelar confirmación.
4. Confirmar que sigue visible.
5. Eliminar nuevamente y confirmar.
6. Ir a `Mostrador`.

**Resultado esperado:**

1. El método eliminado ya no aparece en el selector.
2. La eliminación no afecta otros métodos.
3. No se producen errores en ventas existentes.

## 12. Cajas

### QA-CAJA-01 - Crear caja

**Objetivo:** Validar alta de caja operativa.

**Pasos:**

1. Ir a `Cajas`.
2. Crear una caja llamada `Caja QA Principal`.
3. Completar saldo inicial si existe.
4. Guardar.
5. Recargar la app.

**Resultado esperado:**

1. La caja aparece en el listado.
2. El estado y saldo inicial son correctos.
3. La caja queda disponible para operar en mostrador si el sistema la requiere.

### QA-CAJA-02 - Abrir caja

**Objetivo:** Validar apertura de caja para ventas.

**Pasos:**

1. Ir a `Cajas`.
2. Seleccionar una caja cerrada o nueva.
3. Ejecutar acción de apertura si existe.
4. Ingresar monto inicial.
5. Confirmar.
6. Ir a `Mostrador`.

**Resultado esperado:**

1. La caja queda abierta.
2. Mostrador no bloquea ventas por falta de caja si se requiere caja abierta.
3. El estado se conserva al recargar.

### QA-CAJA-03 - Registrar venta con caja abierta

**Objetivo:** Validar relación entre caja y venta.

**Pasos:**

1. Abrir una caja.
2. Realizar una venta desde `Mostrador`.
3. Volver a `Cajas`.
4. Revisar movimientos, totales o estado de caja.

**Resultado esperado:**

1. La caja refleja la venta si el módulo registra movimientos.
2. El monto coincide con el total final de la venta.
3. No se duplica el movimiento.

### QA-CAJA-04 - Cerrar caja

**Objetivo:** Validar cierre de caja.

**Pasos:**

1. Operar al menos una venta con la caja abierta.
2. Ir a `Cajas`.
3. Ejecutar cierre de caja.
4. Ingresar monto final si aplica.
5. Confirmar cierre.
6. Intentar realizar otra venta.

**Resultado esperado:**

1. La caja queda cerrada.
2. El cierre muestra totales correctos.
3. La app bloquea ventas sin caja abierta si ese es el comportamiento esperado.

### QA-CAJA-05 - Validar montos inválidos

**Objetivo:** Validar que caja no acepta datos incoherentes.

**Pasos:**

1. Intentar crear o abrir caja con monto negativo.
2. Intentar dejar nombre vacío.
3. Intentar cerrar caja con monto no numérico si el campo lo permite.
4. Guardar cada caso.

**Resultado esperado:**

1. Los datos inválidos no se guardan.
2. Se muestra mensaje de validación.
3. La caja conserva su estado previo.

## 13. Mostrador

### QA-MOST-01 - Venta básica por unidades

**Objetivo:** Validar venta completa desde mostrador.

**Pasos:**

1. Asegurar que exista producto con stock positivo y precio final.
2. Asegurar que exista método de pago activo.
3. Ir a `Mostrador`.
4. Buscar el producto.
5. Dejar `Unidad de medición` en `Unidad`.
6. Ingresar cantidad `2`.
7. Agregar al carrito.
8. Abrir carrito flotante.
9. Seleccionar método de pago.
10. Presionar `Finalizar compra`.

**Resultado esperado:**

1. La venta se registra.
2. El carrito se limpia.
3. El stock se descuenta por 2 unidades.
4. La venta aparece en `Ventas`.

### QA-MOST-02 - Venta por monto en pesos

**Objetivo:** Validar modo de medición por pesos.

**Pasos:**

1. Ir a `Mostrador`.
2. Cambiar `Unidad de medición` a `Pesos`.
3. Elegir un producto con precio conocido.
4. Ingresar un monto, por ejemplo `$500`.
5. Agregar al carrito.
6. Revisar la cantidad calculada.
7. Finalizar con método de pago válido.

**Resultado esperado:**

1. La app convierte el monto a cantidad según el precio.
2. El subtotal coincide con el monto ingresado o redondeo esperado.
3. El stock se descuenta según la cantidad calculada.

### QA-MOST-03 - No vender más que stock disponible

**Objetivo:** Validar límites de stock en carrito.

**Pasos:**

1. Crear producto con stock `3`.
2. Ir a `Mostrador`.
3. Intentar ingresar cantidad `4`.
4. Intentar agregar al carrito.
5. Si permite agregar `3`, intentar editar el carrito a `4`.

**Resultado esperado:**

1. La app impide superar stock disponible.
2. El botón de agregar se deshabilita o se corrige la cantidad.
3. No se registra venta con stock negativo.

### QA-MOST-04 - Carrito con varios productos

**Objetivo:** Validar cálculo acumulado.

**Pasos:**

1. Preparar dos productos con stock y precios diferentes.
2. Agregar el primer producto con cantidad `1`.
3. Agregar el segundo producto con cantidad `2`.
4. Abrir carrito.
5. Revisar subtotal de cada línea.
6. Cambiar cantidad de una línea.
7. Eliminar una línea.
8. Finalizar venta.

**Resultado esperado:**

1. Subtotales y total se recalculan en cada cambio.
2. Eliminar línea remueve solo ese producto.
3. La venta final contiene los productos restantes.
4. El stock se descuenta correctamente para cada producto.

### QA-MOST-05 - Preferencias visuales del mostrador

**Objetivo:** Validar persistencia de vista y visualización de stock.

**Pasos:**

1. Ir a `Mostrador`.
2. Cambiar vista de cuadrícula a listado.
3. Cambiar `Visualizar stock` de unidades a pesos.
4. Recargar la página.
5. Volver a `Mostrador`.

**Resultado esperado:**

1. La preferencia de vista se conserva.
2. La preferencia de visualización de stock se conserva.
3. Los productos siguen siendo operables.

## 14. Ventas

### QA-VENTA-01 - Listado de ventas recientes

**Objetivo:** Validar que las ventas registradas se listan correctamente.

**Pasos:**

1. Registrar una venta desde `Mostrador`.
2. Ir a `Ventas`.
3. Buscar la venta por cliente o producto.
4. Revisar fecha, método, productos, total calculado y total final.

**Resultado esperado:**

1. La venta aparece al inicio o según orden descendente por fecha.
2. Los datos coinciden con la venta realizada.
3. El método de pago se muestra correctamente.

### QA-VENTA-02 - Ver detalle de venta

**Objetivo:** Validar modal de detalle.

**Pasos:**

1. Ir a `Ventas`.
2. Ubicar una venta con más de un producto.
3. Presionar visualizar.
4. Revisar cliente, fecha, método, descuento/recargo, totales y líneas.
5. Cerrar modal.

**Resultado esperado:**

1. El detalle muestra todos los productos.
2. Cantidades, precios y subtotales son correctos.
3. El modal cierra sin afectar el listado.

### QA-VENTA-03 - Filtrar ventas por método de pago

**Objetivo:** Validar filtro de método.

**Pasos:**

1. Crear dos ventas con métodos de pago distintos.
2. Ir a `Ventas`.
3. Seleccionar el primer método en el filtro.
4. Revisar los resultados.
5. Seleccionar el segundo método.
6. Limpiar el filtro.

**Resultado esperado:**

1. Cada filtro muestra solo ventas de ese método.
2. Al limpiar, vuelven todas las ventas.
3. El filtro no altera datos guardados.

### QA-VENTA-04 - Filtrar ventas por fecha

**Objetivo:** Validar rango de fechas.

**Pasos:**

1. Ir a `Ventas`.
2. Seleccionar `Desde` con la fecha actual.
3. Seleccionar `Hasta` con la fecha actual.
4. Confirmar que se muestran ventas del día.
5. Seleccionar un rango sin ventas.

**Resultado esperado:**

1. El rango incluye ventas dentro del día completo.
2. Un rango sin ventas muestra estado vacío.
3. No aparecen ventas fuera del rango.

### QA-VENTA-05 - Eliminar venta

**Objetivo:** Validar eliminación y sus consecuencias.

**Pasos:**

1. Crear una venta de prueba.
2. Anotar stock del producto vendido después de la venta.
3. Ir a `Ventas`.
4. Presionar eliminar.
5. Cancelar confirmación.
6. Confirmar que la venta sigue visible.
7. Eliminar nuevamente y confirmar.
8. Revisar stock del producto.

**Resultado esperado:**

1. Cancelar no elimina.
2. Confirmar elimina la venta.
3. Verificar si el stock se repone o no según diseño definido.
4. Si el comportamiento no está definido, registrar como hallazgo para producto.

## 15. Peluquería

### QA-PEL-01 - Crear tipo de perro

**Objetivo:** Validar alta de tipos de perro.

**Pasos:**

1. Ir a `Peluquería`.
2. Abrir pestaña `Tipos de perros`.
3. Crear tipo `Pequeño QA`.
4. Completar descripción.
5. Guardar.
6. Recargar la pestaña.

**Resultado esperado:**

1. El tipo aparece en el listado.
2. Queda disponible para configurar servicios.
3. Queda disponible en el formulario de turnos.

### QA-PEL-02 - Crear servicio con precio y duración

**Objetivo:** Validar servicios por tipo de perro.

**Pasos:**

1. Asegurar que exista al menos un tipo de perro.
2. Ir a pestaña `Servicios`.
3. Crear servicio `Baño QA`.
4. Completar descripción.
5. Para cada tipo de perro visible, cargar precio y duración.
6. Guardar.
7. Abrir nuevamente el servicio.

**Resultado esperado:**

1. El servicio se guarda.
2. Los precios y duraciones por tipo persisten.
3. El servicio aparece en creación de turnos.

### QA-PEL-03 - Configurar horarios de disponibilidad

**Objetivo:** Validar rangos horarios por día.

**Pasos:**

1. Ir a pestaña `Horarios`.
2. Seleccionar un día de prueba, por ejemplo lunes.
3. Agregar rango desde `09:00` hasta `13:00` con capacidad `1`.
4. Agregar un segundo rango desde `15:00` hasta `18:00` con capacidad `2`.
5. Guardar horarios.
6. Volver a calendario semanal.

**Resultado esperado:**

1. Los horarios se guardan.
2. El calendario muestra disponibilidad en los rangos configurados.
3. Fuera de esos rangos no se deberían poder crear turnos válidos.

### QA-PEL-04 - Crear turno desde calendario

**Objetivo:** Validar alta de turno.

**Pasos:**

1. Ir a `Calendario semanal`.
2. Seleccionar una fecha y hora dentro de horario disponible.
3. Abrir nuevo turno.
4. Seleccionar servicio.
5. Seleccionar tipo de perro.
6. Completar cliente `Cliente Peluquería QA`.
7. Dejar estado `pendiente`.
8. Guardar.
9. Revisar calendario y pestaña `Turnos`.

**Resultado esperado:**

1. El turno aparece en el calendario.
2. El turno aparece en el listado.
3. Duración y precio se calculan según servicio y tipo.
4. No se superpone si no hay capacidad suficiente.

### QA-PEL-05 - Abonar turno

**Objetivo:** Validar pago de turno de peluquería.

**Pasos:**

1. Crear un turno pendiente con precio.
2. Asegurar que exista método de pago.
3. Abrir el turno o su acción de pago.
4. Seleccionar método de pago.
5. Revisar resumen de pago.
6. Presionar `Abonar`.
7. Ir a `Ventas` si el sistema registra el pago como venta.

**Resultado esperado:**

1. El turno queda marcado como abonado o pagado.
2. El método de pago queda asociado.
3. El total respeta descuento o recargo del método.
4. Si genera venta, aparece en el listado de ventas con datos coherentes.

## 16. Usuarios

### QA-USR-01 - Listar usuarios

**Objetivo:** Validar carga de usuarios de la empresa.

**Pasos:**

1. Ingresar con usuario autorizado.
2. Ir a `Usuario`.
3. Esperar la carga del listado.
4. Revisar usuarios disponibles y roles.

**Resultado esperado:**

1. Se muestran usuarios de la empresa actual.
2. No se muestran usuarios de otras empresas.
3. La sección no queda vacía por error si hay usuarios configurados.

### QA-USR-02 - Editar usuario autorizado

**Objetivo:** Validar actualización de datos o permisos de usuario.

**Pasos:**

1. Ir a `Usuario`.
2. Seleccionar un usuario editable.
3. Cambiar un campo permitido.
4. Guardar.
5. Recargar la app.

**Resultado esperado:**

1. El cambio persiste.
2. No se modifican campos no editables.
3. La operación respeta permisos del usuario conectado.

### QA-USR-03 - Cambiar contraseña de usuario si aplica

**Objetivo:** Validar cambio de contraseña desde gestión de usuarios.

**Pasos:**

1. Ir a `Usuario`.
2. Elegir usuario de prueba.
3. Ejecutar acción de cambio de contraseña si está disponible.
4. Ingresar contraseña nueva.
5. Guardar.
6. Cerrar sesión o borrar token.
7. Intentar login con contraseña nueva.

**Resultado esperado:**

1. La contraseña nueva funciona.
2. La contraseña anterior deja de funcionar si corresponde.
3. La app no expone la contraseña en pantalla.

### QA-USR-04 - Validar permisos de usuario no supervisor

**Objetivo:** Confirmar restricciones de rol.

**Pasos:**

1. Ingresar con usuario no supervisor si existe.
2. Ir a `Usuario`.
3. Intentar editar otro usuario o campos restringidos.
4. Intentar acceder a funciones críticas.

**Resultado esperado:**

1. Las acciones restringidas no están visibles o no se permiten.
2. Se muestra mensaje claro si se intenta una acción no autorizada.
3. No se modifican datos sin permiso.

### QA-USR-05 - Persistencia y seguridad de sesión

**Objetivo:** Validar que datos de usuario no queden inconsistentes.

**Pasos:**

1. Ingresar con usuario válido.
2. Abrir otra pestaña con la misma empresa.
3. Cambiar datos permitidos del usuario en una pestaña.
4. Recargar la otra pestaña.
5. Revisar datos visibles.

**Resultado esperado:**

1. La información se sincroniza al recargar.
2. No aparecen datos parciales o antiguos después de guardar.
3. No se fuerza logout inesperado salvo que cambie una credencial crítica.

## 17. Reportes y Exportaciones

### QA-REP-01 - Descargar PDF de productos

**Objetivo:** Validar exportación PDF.

**Pasos:**

1. Ingresar a la app con productos cargados.
2. Ejecutar la acción de reporte PDF de productos si está visible.
3. Si no está visible, abrir `/api/reportes/productos.pdf` autenticado según flujo disponible.
4. Descargar el archivo.
5. Abrir el PDF.

**Resultado esperado:**

1. El PDF se descarga correctamente.
2. El archivo abre sin estar corrupto.
3. Incluye productos esperados con precios y datos principales.

### QA-REP-02 - Descargar Excel de productos

**Objetivo:** Validar exportación XLSX.

**Pasos:**

1. Ingresar con sesión válida.
2. Ejecutar reporte Excel de productos.
3. Descargar el archivo.
4. Abrirlo con Excel, LibreOffice o Google Sheets.
5. Revisar columnas.

**Resultado esperado:**

1. El archivo abre correctamente.
2. Las columnas tienen datos coherentes.
3. Los precios y stock mantienen formato numérico utilizable.

### QA-REP-03 - Reporte sin productos

**Objetivo:** Validar exportes en empresa vacía.

**Pasos:**

1. Ingresar a una empresa sin productos.
2. Ejecutar reporte PDF.
3. Ejecutar reporte Excel.
4. Abrir ambos archivos.

**Resultado esperado:**

1. No falla la descarga.
2. El reporte muestra cabecera o estado vacío.
3. No hay error 500 ni archivo corrupto.

### QA-REP-04 - Reporte luego de edición de precios

**Objetivo:** Validar datos actualizados en exportes.

**Pasos:**

1. Editar precio final de un producto.
2. Guardar y recargar la app.
3. Descargar PDF.
4. Descargar Excel.
5. Buscar el producto editado en ambos archivos.

**Resultado esperado:**

1. Los reportes muestran el precio actualizado.
2. No muestran valores anteriores cacheados.
3. La fecha o datos de actualización son coherentes si se incluyen.

### QA-REP-05 - Seguridad de reportes sin sesión

**Objetivo:** Validar protección de endpoints de reporte.

**Pasos:**

1. Abrir una ventana incógnita sin login.
2. Intentar acceder directamente a `/api/reportes/productos.pdf`.
3. Intentar acceder a `/api/reportes/productos.xlsx`.
4. Observar respuesta.

**Resultado esperado:**

1. El sistema no entrega reportes sin autorización.
2. Responde con login requerido, 401 o comportamiento seguro equivalente.
3. No se filtra información de productos.

## 18. Offline, Cache y Sincronización

### QA-OFF-01 - Carga con cache sin conexión

**Objetivo:** Validar uso de datos guardados localmente.

**Pasos:**

1. Ingresar online y navegar por varias secciones para precargar datos.
2. Recargar la página online.
3. Activar modo offline desde DevTools o desconectar red.
4. Recargar la app.
5. Revisar panel, productos, stock y ventas.

**Resultado esperado:**

1. La app permite entrar con datos cacheados.
2. Muestra aviso de sin conexión.
3. Los datos visibles coinciden con la última carga exitosa.
4. No se queda en pantalla en blanco.

### QA-OFF-02 - Crear dato offline y sincronizar

**Objetivo:** Validar cola offline para cambios.

**Pasos:**

1. Ingresar online y confirmar que hay sesión válida.
2. Activar offline.
3. Crear un proveedor o editar un producto.
4. Confirmar que la app informa estado offline o guarda localmente.
5. Volver online.
6. Esperar sincronización.
7. Recargar la app.

**Resultado esperado:**

1. El cambio no se pierde.
2. Al volver online se sincroniza con backend.
3. El cambio persiste después de recargar.
4. Si falla, la app muestra error claro y no duplica registros.

### QA-OFF-03 - Venta offline

**Objetivo:** Validar comportamiento de ventas sin conexión.

**Pasos:**

1. Preparar producto con stock alto.
2. Ingresar online y cargar Mostrador.
3. Activar offline.
4. Intentar realizar una venta.
5. Volver online.
6. Revisar `Ventas` y `Stock`.

**Resultado esperado:**

1. Si la venta offline está soportada, queda en cola y se sincroniza.
2. Si no está soportada, la app bloquea claramente la operación.
3. No se pierden ni duplican ventas.
4. El stock final es consistente.

### QA-OFF-04 - Conflicto en dos pestañas

**Objetivo:** Validar consistencia con múltiples clientes.

**Pasos:**

1. Abrir la misma empresa en dos pestañas.
2. En pestaña A, editar precio de un producto.
3. En pestaña B, editar el mismo producto con otro precio.
4. Guardar ambas operaciones en orden conocido.
5. Recargar ambas pestañas.

**Resultado esperado:**

1. El sistema queda en un estado consistente.
2. Ambas pestañas terminan mostrando el mismo valor después de recargar.
3. Si existe estrategia último guardado gana, se cumple claramente.
4. No se corrompe el registro.

### QA-OFF-05 - Reconexión realtime

**Objetivo:** Validar actualización en tiempo real.

**Pasos:**

1. Abrir empresa en dos navegadores o pestañas.
2. En pestaña A, crear un producto.
3. Observar pestaña B sin recargar.
4. Si no aparece, navegar a otra sección y volver.
5. Cortar red en pestaña B y restaurarla.
6. Crear otro dato desde pestaña A.

**Resultado esperado:**

1. La pestaña B recibe actualización o la obtiene al refrescar sección.
2. Tras reconectar, vuelve a recibir datos actualizados.
3. No se duplican notificaciones ni registros.

## 19. Pruebas de Integración End-to-End

### QA-INT-01 - Alta de catálogo completa y venta

**Objetivo:** Validar flujo proveedor, tipo, producto, stock, método de pago, venta y ventas.

**Pasos:**

1. Crear proveedor `Proveedor INT 01`.
2. Crear tipo `Tipo INT 01`.
3. Crear producto `Producto INT 01` asociado a ese proveedor y tipo.
4. Asignar costo, porcentaje, precio final y stock mínimo.
5. Cargar stock `15`.
6. Crear método de pago `Pago INT 01` sin ajustes.
7. Ir a `Mostrador`.
8. Vender `4` unidades del producto.
9. Ir a `Ventas` y abrir detalle.
10. Ir a `Stock` y verificar cantidad restante.

**Resultado esperado:**

1. Cada módulo consume correctamente los datos del módulo anterior.
2. La venta muestra producto, método y total correctos.
3. El stock queda en `11`.
4. El producto sigue asociado al proveedor y tipo correctos.

### QA-INT-02 - Método de pago con descuento aplicado a venta

**Objetivo:** Validar integración pagos, mostrador y ventas.

**Pasos:**

1. Crear producto con precio final `1000` y stock suficiente.
2. Crear método con descuento `20%`.
3. Vender 1 unidad desde mostrador usando ese método.
4. Revisar total final antes de confirmar.
5. Confirmar venta.
6. Abrir detalle en `Ventas`.

**Resultado esperado:**

1. El total calculado es `$1000`.
2. El total final es `$800`.
3. El detalle muestra método y descuento.
4. El stock se descuenta solo 1 unidad.

### QA-INT-03 - Peluquería pagada aparece en ventas o caja

**Objetivo:** Validar integración peluquería, métodos de pago, ventas y caja si aplica.

**Pasos:**

1. Crear tipo de perro.
2. Crear servicio con precio `5000`.
3. Crear método de pago con recargo `10%`.
4. Crear turno para un cliente.
5. Abonar el turno con el método creado.
6. Revisar estado del turno.
7. Revisar `Ventas` y `Cajas` si corresponde.

**Resultado esperado:**

1. El turno queda pagado.
2. El total final esperado es `$5500` si aplica recargo.
3. La venta o movimiento de caja se registra si el diseño lo contempla.
4. No se duplica el cobro al recargar.

### QA-INT-04 - Eliminación de producto relacionado

**Objetivo:** Validar impacto de eliminar un producto con historial.

**Pasos:**

1. Crear producto con stock.
2. Registrar una venta con ese producto.
3. Intentar eliminar el producto desde `Productos`.
4. Confirmar eliminación si el sistema lo permite.
5. Revisar `Ventas`.
6. Revisar `Stock`.

**Resultado esperado:**

1. Si se permite eliminar, las ventas históricas siguen mostrando nombre y datos necesarios.
2. El listado de productos ya no muestra el producto.
3. El sistema no rompe detalles de ventas.
4. Si se bloquea eliminar por historial, el mensaje debe ser claro.

### QA-INT-05 - Multisesión con reserva de carrito

**Objetivo:** Validar stock reservado entre dos operadores.

**Pasos:**

1. Crear producto con stock `5`.
2. Abrir dos pestañas o navegadores con la misma empresa.
3. En pestaña A, agregar `3` unidades al carrito sin finalizar.
4. En pestaña B, revisar stock disponible del producto.
5. Intentar vender `3` unidades en pestaña B.
6. Finalizar o vaciar carrito en pestaña A.
7. Revisar disponibilidad en pestaña B.

**Resultado esperado:**

1. La pestaña B considera stock reservado por A si realtime está activo.
2. No se permite sobrevender.
3. Al limpiar o finalizar carrito A, la reserva se libera o se convierte en venta.
4. El stock final es consistente.

### QA-INT-06 - Empresa deshabilitada desde admin

**Objetivo:** Validar integración admin y acceso de tenant.

**Pasos:**

1. Ingresar a una empresa de prueba y confirmar acceso normal.
2. En panel admin, deshabilitar esa empresa.
3. Recargar la app de la empresa.
4. Intentar iniciar sesión nuevamente.
5. Intentar consumir una ruta protegida.

**Resultado esperado:**

1. La empresa deshabilitada no permite operar normalmente.
2. El sistema muestra error claro o bloquea acceso.
3. No se entregan datos protegidos de la empresa deshabilitada.

### QA-INT-07 - Reporte posterior a venta y cambio de stock

**Objetivo:** Validar que reportes reflejan inventario actualizado.

**Pasos:**

1. Crear producto con precio y stock `20`.
2. Descargar reporte Excel inicial.
3. Vender `5` unidades.
4. Descargar reporte Excel nuevamente.
5. Comparar stock y datos del producto.

**Resultado esperado:**

1. El segundo reporte refleja stock `15` si incluye stock.
2. Los precios coinciden con el producto actualizado.
3. No se descarga un reporte cacheado anterior.

### QA-INT-08 - Operación offline y sincronización cruzada

**Objetivo:** Validar persistencia offline con otra sesión online.

**Pasos:**

1. Abrir pestaña A online y cargar datos.
2. Abrir pestaña B online.
3. Poner pestaña A offline.
4. Crear o editar un proveedor en A.
5. En B, crear otro proveedor online.
6. Volver A online.
7. Esperar sincronización.
8. Recargar ambas pestañas.

**Resultado esperado:**

1. Ambos proveedores existen después de sincronizar.
2. No se pierde el cambio offline.
3. No se sobrescribe el cambio online sin motivo.
4. Ambas pestañas terminan con la misma información.

## 20. Pruebas Responsive y Usabilidad Global

### QA-UI-01 - Navegación mobile completa

**Objetivo:** Validar acceso a todas las secciones en mobile.

**Pasos:**

1. Activar viewport mobile de 390 px.
2. Recargar la app.
3. Abrir menú o navegación disponible.
4. Entrar a cada sección habilitada.
5. Volver al panel.

**Resultado esperado:**

1. Todas las secciones son accesibles.
2. No hay botones fuera de pantalla.
3. La app mantiene estado y sesión.

### QA-UI-02 - Formularios en mobile

**Objetivo:** Validar modales y formularios en pantalla chica.

**Pasos:**

1. En mobile, abrir nuevo producto.
2. Completar campos hasta el final del modal.
3. Cerrar con cancelar.
4. Repetir con turno de peluquería.
5. Repetir con carrito de mostrador.

**Resultado esperado:**

1. Los modales se pueden desplazar.
2. Los botones guardar/cancelar son accesibles.
3. El teclado móvil no oculta campos críticos de forma permanente.

### QA-UI-03 - Tablas y paginación mobile

**Objetivo:** Validar listados largos.

**Pasos:**

1. Cargar más registros que el tamaño de página en productos o ventas.
2. Abrir sección en mobile.
3. Navegar entre páginas o scroll infinito si aplica.
4. Usar búsqueda y filtros.

**Resultado esperado:**

1. La paginación funciona.
2. Los registros son legibles.
3. Los filtros no quedan ocultos ni inutilizables.

### QA-UI-04 - Estados de carga y vacío

**Objetivo:** Validar feedback visual.

**Pasos:**

1. Entrar a cada sección recién recargada.
2. Observar estado de carga.
3. Aplicar filtros que no devuelvan resultados.
4. Limpiar filtros.

**Resultado esperado:**

1. Se muestran loaders breves o estados de carga.
2. Los estados vacíos son claros.
3. La app se recupera al limpiar filtros.

### QA-UI-05 - Tema y contraste

**Objetivo:** Validar usabilidad visual.

**Pasos:**

1. Cambiar tema si la app ofrece selector.
2. Revisar textos, botones, chips y alertas.
3. Validar contraste en modales.
4. Revisar foco visible navegando con teclado.

**Resultado esperado:**

1. El contenido sigue siendo legible.
2. Los botones críticos se distinguen.
3. El foco de teclado es visible.
4. El tema seleccionado persiste si corresponde.

## 21. Seguridad Manual Básica

### QA-SEC-01 - XSS en nombres

**Objetivo:** Validar que entradas maliciosas no ejecutan scripts.

**Pasos:**

1. Crear proveedor, tipo o producto con nombre `<script>alert(1)</script>`.
2. Guardar si el sistema lo permite.
3. Volver al listado.
4. Abrir detalle.
5. Recargar la página.

**Resultado esperado:**

1. No se ejecuta ningún alert ni script.
2. El texto se escapa o se bloquea.
3. No se rompe el HTML de la página.

### QA-SEC-02 - Acceso API sin token

**Objetivo:** Validar protección de datos.

**Pasos:**

1. Abrir ventana incógnita sin login.
2. Acceder a `/api/data`.
3. Acceder a `/api/productos` si aplica.
4. Observar respuesta.

**Resultado esperado:**

1. La API responde 401 o acceso denegado.
2. No entrega datos de empresa.
3. No muestra stack traces sensibles.

### QA-SEC-03 - Manipulación de token

**Objetivo:** Validar rechazo de token inválido.

**Pasos:**

1. Ingresar con usuario válido.
2. Modificar manualmente el token en localStorage.
3. Recargar.
4. Intentar navegar o guardar datos.

**Resultado esperado:**

1. El token inválido se rechaza.
2. La app solicita login nuevamente.
3. No se entregan datos protegidos.

### QA-SEC-04 - Acceso admin desde contexto no permitido

**Objetivo:** Validar restricción de IP/VPN si está configurada.

**Pasos:**

1. Intentar abrir panel admin desde una red no autorizada si es posible.
2. Ingresar credenciales correctas.
3. Observar respuesta.

**Resultado esperado:**

1. El acceso se bloquea por IP/VPN.
2. No se permite listar empresas.
3. El mensaje no revela detalles sensibles de infraestructura.

### QA-SEC-05 - Datos sensibles en pantalla

**Objetivo:** Validar no exposición de secretos.

**Pasos:**

1. Ingresar al panel admin.
2. Editar una empresa.
3. Revisar campos de contraseña y secretos.
4. Abrir DevTools y revisar almacenamiento local/sesión.

**Resultado esperado:**

1. Las contraseñas no se muestran en claro después de guardadas.
2. Los campos sensibles no se exponen innecesariamente.
3. Los tokens existen solo donde corresponde y no aparecen en la UI.

## 22. Checklist de Cierre de QA

1. Ejecutar todos los casos críticos de catálogo, stock, mostrador y ventas.
2. Ejecutar al menos una prueba completa de peluquería con pago.
3. Ejecutar al menos una prueba multiempresa.
4. Ejecutar al menos una prueba offline con sincronización.
5. Ejecutar pruebas responsive en mobile y desktop.
6. Descargar PDF y Excel de productos.
7. Validar que no quedan errores JavaScript no controlados.
8. Registrar bugs con pasos exactos, datos usados, resultado esperado, resultado real, evidencia y severidad.
9. Limpiar datos de prueba si el ambiente debe quedar reutilizable.
10. Confirmar con producto cualquier comportamiento no definido, especialmente eliminación de ventas, reposición de stock y efectos de eliminar entidades con historial.

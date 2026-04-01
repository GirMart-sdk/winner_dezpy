# ✅ VERIFICACIÓN DEL SISTEMA DE PAGOS

Este archivo te ayuda a verificar que el sistema de pagos está completamente funcional.

## 🔍 PASO 1: Verificar que el servidor está corriendo

```bash
# En una terminal PowerShell:
npm start
```

**Debe mostrar:**
```
✓ Database initialized
✓ Table customers created
✓ Table products created
✓ Table sales created
✓ Table sale_items created
✓ Table customer_profiles created
✓ Table demand_forecast created
...
✓ Server listening on port 3000
```

**Señales verdes:**
- ✅ "Server listening on port 3000"
- ✅ Al menos 10 tablas creadas
- ✅ Sin errores rojos (ERROR, FAILED, etc)

Si ves errores, ejecuta:
```bash
# Matar proceso node
Stop-Process -Name node

# Limpiar BD
rm winner_store.db
rm *.db-journal

# Reiniciar
npm start
```

---

## 🔗 PASO 2: Verificar que el servidor responde

**Opción A: En el navegador**

1. Abre http://localhost:3000
2. Deberías ver la tienda online con productos
3. Si ves productos y puedes añadir al carrito ✅

**Opción B: En PowerShell**

```powershell
# Verificar que el servidor está escuchando
curl http://localhost:3000/api/products
```

**Debe mostrar:**
```
[
  { "id": 1, "name": "Producto...", "price": 89990, ... },
  { "id": 2, "name": "Producto...", "price": 34990, ... },
  ...
]
```

**Señal verde:**
- ✅ Retorna código 200
- ✅ Muestra lista de productos en JSON

---

## 🛍️ PASO 3: Verificar el modal de pagos

**En el navegador:**

1. Abre http://localhost:3000
2. Haz clic en un producto "Ver más"
3. Selecciona una talla
4. Haz clic en "Agregar al carrito" ✅
5. Haz clic en "Ver carrito" o el icono del carrito
6. Verifica que el producto está en el carrito ✅
7. Haz clic en el botón verde "💳 PROCEDER AL PAGO" ✅

**Señales verdes:**
- ✅ Modal aparece con fondo oscuro
- ✅ Muestra "PASO 1: TUS DATOS"
- ✅ Tiene 5 campos (Nombre, Email, Teléfono, Dirección, Ciudad)
- ✅ Botón "Continuar al pago" funciona

---

## 📋 PASO 4: Completar PASO 1 (Datos del cliente)

En el modal, completa con datos de prueba:

```
Nombre:     Juan Pérez
Email:      juan@test.com
Teléfono:   3105551234
Dirección:  Calle 123 #45
Ciudad:     Bogotá
```

**Luego haz clic en "Continuar al pago"**

**Señales verdes:**
- ✅ No hay mensaje de error
- ✅ Modal avanza a "PASO 2: SELECCIONA TU MÉTODO DE PAGO"
- ✅ Ves 5 opciones: 💳 📱 📱 🏦 💵

---

## 💳 PASO 5: Completar PASO 2 (Método de pago)

### Opción A: Tarjeta (💳)

1. Haz clic en la opción "💳 TARJETA"
2. Modal avanza a "PASO 3: DATOS DE LA TARJETA"
3. Completa con estos datos de prueba:

```
Número:      4532 1488 0343 6467
Vencimiento: 12/25
CVV:         123
Titular:     Juan Perez
```

**Verificaciones mientras escribes:**
- ✅ Número se formatea automáticamente: 4532 1488 0343 6467
- ✅ Vencimiento se formatea: 12/25
- ✅ CVV solo acepta números

4. Haz clic en "Procesar Pago"

**Esperado:**
```
✅ ¡Pago aceptado!

Referencia: WIN-ORDER-abc123
Total: $X,XXX.XXX

Te enviaremos confirmación a juan@test.com
```

**Señales verdes:**
- ✅ Aparece mensaje de éxito
- ✅ Muestra referencia (WIN-ORDER-...)
- ✅ Modal se cierra automáticamente
- ✅ Carrito queda vacío

### Opción B: Nequi (📱)

1. Haz clic en "📱 NEQUI"
2. Aparece mensaje:

```
✅ ¡Pedido creado!

Referencia: WIN-ORDER-abc123
Total: $X,XXX.XXX

Te enviaremos datos de Nequi por WhatsApp
WhatsApp: 3105551234
```

**Señales verdes:**
- ✅ Aparece el mensaje inmediatamente
- ✅ Muestra referencia
- ✅ Modal se cierra automáticamente

### Opción C: Daviplata (📱)

Similar a Nequi, pero menciona Daviplata.

### Opción D: PSE (🏦)

Similar a Nequi, pero menciona PSE/Transferencia.

### Opción E: Efectivo (💵)

Similar a Nequi, pero menciona contacto para coordinar.

---

## 🧪 PASO 6: Probar página de pruebas

1. Abre http://localhost:3000/test-payments.html
2. Deberías ver varios botones de prueba

**Botones presentes:**
- ✅ "Procesar Pago Tarjeta"
- ✅ "Procesar Pago Nequi"
- ✅ "Ver Historial"
- ✅ "Buscar Pago"

3. Haz clic en "Procesar Pago Tarjeta"

**Esperado:**
```
Resultado de la prueba:

✅ TEST DE PAGO EXITOSO
Referencia: WIN-ORDER-xxx
Método: tarjeta
Email: test@example.com
Respuesta del servidor: Pago registrado
```

**Señales verdes:**
- ✅ Aparece resultado en color VERDE
- ✅ Muestra referencia
- ✅ Dice "Pago registrado"

---

## 📊 PASO 7: Verificar base de datos

1. Abre el navegador en http://localhost:3000/admin-panel.html
2. Busca la sección de "Ventas" o "Sales"
3. Deberías ver las transacciones registradas

**Qué verificar:**
- ✅ Una fila por cada pago que procesaste
- ✅ Columna "reference_number" con WIN-ORDER-xxx
- ✅ Columna "payment_method" con el método usado
- ✅ Columna "customer_email" con el email ingresado
- ✅ Columna "total" con el monto

Si no hay interfaz de admin, puedes verificar directamente en Terminal:

```bash
# En PowerShell:
sqlite3 winner_store.db "SELECT * FROM sales LIMIT 1;"
```

**Esperado:**
```
1|239980|15000|224980|2|pending|card|pending_verification|juan@test.com|3105551234|...
```

---

## 🔐 PASO 8: Verificar seguridad

**Verifica que NO se guardó:**
- ❌ Número de tarjeta completo (solo últimos 4 dígitos)
- ❌ CVV de la tarjeta
- ❌ Datos bancarios

**Verifica que SÍ se guardó:**
- ✅ Email del cliente
- ✅ Teléfono del cliente
- ✅ Dirección
- ✅ Referencia de pago
- ✅ Método de pago
- ✅ Total del pedido

---

## 🐛 DEPURACIÓN

Si algo no funciona, sigue estos pasos:

### El modal no aparece

1. Abre la consola (F12) en el navegador
2. Busca mensajes de error (en rojo)
3. Verifica que `index.html` tiene todo el código del modal

```javascript
// En la consola, intenta:
openPaymentModal()
// Si funciona, verás el modal sin hacer clic
```

### El pago da error de conexión

1. Verifica que el servidor está corriendo
2. Abre http://localhost:3000 en el navegador
3. Si no carga, reinicia: `npm start`

### Los datos no se guardan en BD

1. Revisa los logs del servidor
2. Verifica que `backend/server.js` tiene el endpoint POST /api/payments
3. Intenta nuevamente desde una ventana incógnita

### El formato de tarjeta no funciona

1. Verifica que los inputs tienen estos IDs:
   - `cardNumber`
   - `cardExpiry`
   - `cardCVV`
   - `cardName`

2. Verifica que `app.js` tiene las funciones:
   - `formatCardNumber()`
   - `formatExpiry()`
   - `formatCVV()`

---

## 📋 CHECKLIST FINAL

Marca todo lo que funciona:

**Servidor:**
- [ ] npm start inicia sin errores
- [ ] Todas las tablas se crean (10+)
- [ ] No hay errores en los logs

**Frontend:**
- [ ] http://localhost:3000 carga la tienda
- [ ] Los productos se muestran
- [ ] Se pueden añadir al carrito
- [ ] El botón "PROCEDER AL PAGO" abre el modal

**Modal - Paso 1:**
- [ ] Se muestran los 5 campos (Nombre, Email, Teléfono, Dirección, Ciudad)
- [ ] Validación funciona (pide rellenar campos)
- [ ] Botón "Continuar al pago" avanza a paso 2

**Modal - Paso 2:**
- [ ] Se muestran 5 opciones de pago
- [ ] Al hacer clic, avanzan a paso 3 (tarjeta) o se procesan (otros)
- [ ] Los iconos se muestran correctamente (💳 📱 🏦 💵)

**Modal - Paso 3 (Tarjeta):**
- [ ] Se piden 4 datos (número, vencimiento, CVV, titular)
- [ ] Número se formatea automáticamente
- [ ] Vencimiento se formatea automáticamente
- [ ] CVV solo acepta números
- [ ] Botón "Procesar Pago" funciona

**Respuestas:**
- [ ] Tarjeta: Muestra "✅ ¡Pago aceptado!" con referencia
- [ ] Nequi: Muestra "✅ ¡Pedido creado!" con instrucciones
- [ ] Daviplata: Muestra "✅ ¡Pedido creado!" con instrucciones
- [ ] PSE: Muestra "✅ ¡Pedido creado!" con instrucciones
- [ ] Efectivo: Muestra "✅ ¡Pedido creado!" con instrucciones

**Base de datos:**
- [ ] Los pagos se guardan en la tabla sales
- [ ] Aparece referencia (WIN-ORDER-xxx)
- [ ] Aparece email del cliente
- [ ] Aparece método de pago
- [ ] Aparece el monto total

**Página de prueba:**
- [ ] http://localhost:3000/test-payments.html carga
- [ ] Los botones de prueba funcionan
- [ ] Retornan respuestas en verde (éxito)

---

**Si todas las casillas están marcadas ✅, entonces el sistema de pagos está 100% funcional.**

¡Felicidades! 🎉

---

## 📞 Contacto y Soporte

Si tienes problemas:

1. **Revisa los logs del servidor** - Muestra errores exactos
2. **Abre la consola del navegador** (F12) - Muestra errores del navegador
3. **Revisa PAYMENT_SYSTEM.md** - Documentación técnica completa
4. **Consulta PAYMENT_QUICK_START.md** - Guía rápida

---

**Última actualización:** [Enero 2024]  
**Estado:** ✅ Sistema completamente implementado y funcional

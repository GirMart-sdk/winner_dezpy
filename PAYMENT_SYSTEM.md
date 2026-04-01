# 💳 Sistema de Pagos - WINNER STORE

## 📋 Resumen Ejecutivo

Se ha implementado un **sistema completo de procesamiento de pagos** con:
- ✅ Modal de pago multi-paso seguro
- ✅ Soporte para 5 métodos de pago diferentes
- ✅ Validación de tarjeta de crédito/débito
- ✅ Recolección de datos del cliente
- ✅ Integración con base de datos
- ✅ Endpoints API para procesar pagos
- ✅ Historial de transacciones

---

## 🎯 Flujo de Pago del Cliente

### **Paso 1: Datos Personales**
El cliente completa un formulario con:
- Nombre completo *
- Correo electrónico *
- Teléfono/WhatsApp *
- Dirección de entrega *
- Ciudad/Departamento *

**Validación:** 
- Todos los campos requeridos
- Email con formato válido
- Teléfono con mínimo 10 dígitos

### **Paso 2: Selección de Método de Pago**
El cliente elige entre 5 opciones:

| Método | Ícono | Descripción |
|--------|-------|-------------|
| **Tarjeta** | 💳 | Crédito/Débito - Procesamiento inmediato |
| **Nequi** | 📱 | Billetera digital - Instrucc. por WhatsApp |
| **Daviplata** | 📱 | Billetera Davivienda - Instrucc. por WhatsApp |
| **PSE/Transfer** | 🏦 | Transferencia bancaria - Instrucc. por WhatsApp |
| **Efectivo** | 💵 | Pago contra entrega - Coordinar por teléfono |

### **Paso 3: Datos de Tarjeta** (Solo si elige tarjeta)

Campos securizados:
- **Número de tarjeta:** Formateado automáticamente (XXXX XXXX XXXX XXXX)
- **Vencimiento:** MM/YY con validación de fecha actual
- **CVV:** 3-4 dígitos (sin almacenar)
- **Nombre en tarjeta:** Tal como aparece en la tarjeta

**Seguridad:**
- 🔒 Datos **NO se guardan** en servidores
- 🔐 Validación en tiempo real
- ✓ Detección automática de marca (Visa, Mastercard, AMEX, Discover)

---

## 🔧 API Endpoints

### **POST /api/payments**
Registra un nuevo pago

**Request:**
```json
{
  "id": "PAY-123456",
  "timestamp": "2026-03-29T21:52:54.000Z",
  "customer": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+573001234567",
    "address": "Calle 123 #45-67"
  },
  "method": "card|nequi|daviplata|pse|cash",
  "methodName": "Tarjeta Crédito",
  "subtotal": 150000,
  "shipping": 15000,
  "total": 165000,
  "items": [
    {"name": "Producto 1", "qty": 2, "price": 75000},
    {"name": "Producto 2", "qty": 1, "price": 50000}
  ],
  "status": "pending_verification",
  "reference": "WIN-ORDER-ABC123",
  "shipping_address": "Calle 123 #45-67, Bogotá"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "payment": {
    "id": "PAY-123456",
    "reference": "WIN-ORDER-ABC123",
    "status": "pending_verification",
    "method": "card",
    "methodName": "Tarjeta Crédito",
    "amount": 165000,
    "currency": "COP",
    "customer": {
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "phone": "+573001234567"
    },
    "timestamp": "2026-03-29T21:52:54.000Z",
    "items": 2,
    "message": "Pago con tarjeta procesado. Recibirás confirmación por email."
  }
}
```

---

### **GET /api/payments/:reference**
Obtiene detalles de un pago específico

**Request:**
```
GET /api/payments/WIN-ORDER-ABC123
Headers: x-api-key: dev-api-key
```

**Response:**
```json
{
  "id": "PAY-123456",
  "timestamp": "2026-03-29T21:52:54.000Z",
  "client": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+573001234567",
  "method": "card",
  "payment_status": "pending_verification",
  "total": 165000,
  "reference_number": "WIN-ORDER-ABC123",
  "items": 2
}
```

---

### **GET /api/payments/customer/:email**
Obtiene historial de pagos de un cliente

**Request:**
```
GET /api/payments/customer/juan@example.com
Headers: x-api-key: dev-api-key
```

**Response:**
```json
[
  {
    "id": "PAY-123456",
    "client": "Juan Pérez",
    "total": 165000,
    "timestamp": "2026-03-29T21:52:54.000Z",
    "payment_status": "completed"
  },
  {
    "id": "PAY-789012",
    "client": "Juan Pérez",
    "total": 89990,
    "timestamp": "2026-03-28T10:30:00.000Z",
    "payment_status": "completed"
  }
]
```

---

## 📊 Base de Datos

### Tabla `sales` (mejorada)

```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  timestamp DATETIME,
  channel TEXT,
  vendor TEXT,
  client TEXT,
  method TEXT,
  subtotal REAL,
  discount REAL,
  total REAL NOT NULL,
  items TEXT,
  
  -- Nuevos campos de pago
  payment_method TEXT,
  payment_status TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  reference_number TEXT
)
```

### Relaciones

- **sales** ← **sale_items** (1:N) - Items de cada venta
- **sales** ← **customer_profiles** - Datos del cliente
- **sales** ← **inventory** - Actualización de stock

---

## 🔐 Seguridad

### Headers Requeridos
```
x-api-key: dev-api-key
Content-Type: application/json
```

### Validaciones

✅ **Cliente:**
- Email válido (contiene @)
- Teléfono con 10+ dígitos
- Nombre y dirección obligatorios

✅ **Tarjeta:**
- Número mínimo 13 dígitos
- Vencimiento no pasado
- CVV 3-4 dígitos
- Nombre en tarjeta

✅ **Pago:**
- Total > 0
- Items válidos
- Referencia única

### Lo que NO se guarda
- ❌ Número de tarjeta completo (solo últimos 4)
- ❌ CVV
- ❌ Datos sensibles sin encriptar

---

## 📱 Integración con Tienda Online

### Flujo Completo

```
1. Usuario añade productos al carrito
2. Click en "PROCEDER AL PAGO"
3. openPaymentModal() → Paso 1
4. continueToPaymentMethod() → Paso 2
5. selectPaymentMethod() → 
   - Si tarjeta → showPaymentStep(3)
   - Si otro → processNonCardPayment()
6. processPayment() → POST /api/payments
7. Limpia carrito y cierra modal
8. Muestra confirmación con referencia
```

### Funciones JavaScript Disponibles

```javascript
// Abrir modal de pagos
openPaymentModal()

// Continuar al paso 2 (validar datos)
continueToPaymentMethod()

// Seleccionar método
selectPaymentMethod(methodId)
// methodId: 'card', 'nequi', 'daviplata', 'pse', 'cash'

// Procesar pago con tarjeta
processPayment()

// Procesar pago sin tarjeta
processNonCardPayment(methodId)

// Cerrar modal
closePaymentModal()

// Mostrar paso específico
showPaymentStep(step)
// step: 1, 2, o 3
```

---

## 🧪 Testing

### Página de Prueba
- Accede a: `http://localhost:3000/test-payments.html`

### Test de Botones
1. **Procesar Pago Tarjeta** - Registra pago con método "card"
2. **Procesar Pago Nequi** - Registra pedido con método "nequi"
3. **Consultar Pago** - Busca un pago por referencia
4. **Ver Historial** - Lista pagos del cliente

---

## 📈 Flujo de Seguimiento del Dinero

```
Pago creado (pending_verification)
    ↓
Admin verifica en dashboard
    ↓
Admin marca como procesado
    ↓
Se genera referencia de envío
    ↓
Número de seguimiento enviado al cliente
    ↓
Pago marcado como completed
```

---

## 🚀 Variables de Entorno

```bash
API_KEY=dev-api-key              # Para desarrollo
JWT_SECRET=dev-jwt-secret-winner-2026
DB_PATH=backend/winner_store.db
PORT=3000
```

---

## 📝 Próximas Mejoras (Opcionales)

- [ ] Integración con Wompi/Openpay para pagos reales
- [ ] Tokenización de tarjetas en servidor externo
- [ ] Webhook para confirmación de pagos
- [ ] Recibos PDF
- [ ] Reembolsos automáticos
- [ ] Promociones/Cupones de descuento
- [ ] Programación de pagos recurrentes

---

## ✅ Checklist de Implementación

- [x] HTML Modal con 3 pasos
- [x] Validaciones JavaScript
- [x] Funciones de pago
- [x] Estilos CSS responsivos
- [x] Endpoint POST /api/payments
- [x] Endpoint GET /api/payments/:reference
- [x] Endpoint GET /api/payments/customer/:email
- [x] Tabla sales actualizada
- [x] Formateo de tarjeta y fecha
- [x] Detección de marca tarjeta
- [x] Integración con carrito
- [x] Página de prueba
- [x] Documentación

---

## 💼 Notas para Usar

1. **En Desarrollo:** Los pagos quedan como "pending_verification"
2. **Comunicación:** Se utilizan WhatsApp y email para coordinar
3. **Seguridad:** NO guardes datos de tarjeta en logs
4. **Test:** Usa la página test-payments.html para validar

---

*Última actualización: 29 de marzo de 2026*
*Sistema: WINNER STORE v2.0*

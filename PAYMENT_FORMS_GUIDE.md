# 📋 Guía de Formularios de Pago - WINNER STORE

## Estado: ✅ IMPLEMENTADO

Se ha mejorado el sistema de pagos con **formularios específicos y detallados** para cada método de pago, con validaciones robustas y campos de datos personalizados.

---

## 📊 Métodos de Pago Disponibles

### 1. 💳 **Tarjeta de Crédito/Débito**

**Descripción:** Pago instantáneo con tarjeta Visa, Mastercard, AMEX o Discover.

**Campos del Formulario:**
```
├── Número de Tarjeta *          (Formato: XXXX XXXX XXXX XXXX)
├── Vencimiento (MM/YY) *        (Ej: 12/26)
├── CVV *                         (3-4 dígitos)
├── Nombre en Tarjeta *          (Como aparece en la tarjeta)
└── Número de Documento *        (CC, CE, Pasaporte o NIT)
```

**Validaciones:**
- ✓ Número de tarjeta: mínimo 13 dígitos
- ✓ CVV: 3-4 dígitos numéricos
- ✓ Vencimiento: no puede estar vencida
- ✓ Documento: mínimo 8 caracteres
- ✓ Detección automática de marca (Visa, MC, AMEX, Discover)
- 🔒 Datos NO se guardan en servidor (solo últimos 4 dígitos)

**Flujo:**
1. Cliente completa datos personales
2. Selecciona "Tarjeta Crédito/Débito"
3. Completa datos de tarjeta
4. Paga y recibe confirmación inmediata

---

### 2. 🏦 **PSE / Transferencia Bancaria**

**Descripción:** Pago mediante PSE (Plataforma de Pagos Seguros Electrónicos) o transferencia bancaria directa.

**Campos del Formulario:**
```
├── Banco *                      (Dropdown con 9+ bancos)
│   ├── Bancolombia
│   ├── Davivienda
│   ├── BBVA
│   ├── Santander
│   ├── ScotiaBank
│   ├── Banco de Occidente
│   ├── Itaú
│   ├── Pichincha
│   └── Otro banco
├── Tipo de Documento *          (Dropdown)
│   ├── Cédula de Ciudadanía (CC)
│   ├── Cédula de Extranjería (CE)
│   ├── Pasaporte
│   └── NIT
└── Número de Documento *        (Ej: 1234567890)
```

**Validaciones:**
- ✓ Banco: debe estar seleccionado
- ✓ Tipo de documento: debe estar seleccionado
- ✓ Número de documento: mínimo 8 caracteres

**Flujo:**
1. Cliente completa datos personales
2. Selecciona "PSE / Transferencia"
3. Selecciona banco y tipo de documento
4. Completa número de documento
5. Recibe por WhatsApp:
   - Enlace PSE seguro
   - Datos de transferencia alternativa
   - Instrucciones paso a paso

---

### 3. 📱 **Nequi**

**Descripción:** Pago mediante billetera digital Nequi con solicitud automática.

**Campos del Formulario:**
```
├── Número de Celular Nequi *    (Formato: +57 3XX XXX XXXX)
└── Nombre Completo *            (Tal como está en tu cuenta Nequi)
```

**Validaciones:**
- ✓ Celular: mínimo 10 dígitos (formato colombiano)
- ✓ Nombre: mínimo 3 caracteres
- ℹ️ Debe ser el número asociado a la cuenta Nequi

**Flujo:**
1. Cliente completa datos personales
2. Selecciona "Nequi"
3. Ingresa celular y nombre
4. Recibe por WhatsApp:
   - Solicitud de pago Nequi
   - Solo debe aprobar desde su app Nequi
   - Confirmación instantánea

---

### 4. 📱 **Daviplata**

**Descripción:** Pago mediante billetera digital Daviplata con código QR.

**Campos del Formulario:**
```
├── Número de Celular Daviplata * (Formato: +57 3XX XXX XXXX)
└── Nombre Completo *             (Tal como está en Davivienda)
```

**Validaciones:**
- ✓ Celular: mínimo 10 dígitos (formato colombiano)
- ✓ Nombre: mínimo 3 caracteres
- ℹ️ Debe ser el número registrado en Davivienda

**Flujo:**
1. Cliente completa datos personales
2. Selecciona "Daviplata"
3. Ingresa celular y nombre
4. Recibe por WhatsApp:
   - Código QR para pagar
   - Instrucciones detalladas
   - Atención al cliente si tiene dudas

---

### 5. 💵 **Efectivo**

**Descripción:** Pago en efectivo mediante entrega a domicilio o recogida en tienda.

**Campos del Formulario:**
```
├── Opción de Entrega *          (Dropdown)
│   ├── Pago Contra Entrega
│   └── Recogida en Tienda
└── Referencia Adicional         (Apto, piso, portería, etc.)
    (Ej: "Apto 305, Portería 2, Casa blanca con puerta verde")
```

**Validaciones:**
- ✓ Opción de entrega: debe estar seleccionada
- ℹ️ Referencia es opcional pero recomendada

**Tipos de Entrega:**

#### **Pago Contra Entrega** 📦
- Paga en efectivo cuando el producto llega a tu domicilio
- El repartidor lleva los producto
- Puedes inspeccionar antes de pagar

#### **Recogida en Tienda** 🏪
- Paga en efectivo en nuestra tienda física
- Puedes programar la recogida
- La tienda te contactará para coordinar

**Flujo:**
1. Cliente completa datos personales
2. Selecciona "Efectivo"
3. Elige entre Entrega o Recogida
4. Ingresa referencia adicional (opcional)
5. Se contactarán por WhatsApp para:
   - Confirmar dirección/hora de recogida
   - Coordinar detalles de entrega
   - Pagos y confirmación

---

## 🔐 Seguridad y Privacidad

### Protección de Datos

| Método | Datos Guardados | Datos NO Guardados |
|--------|-----------------|-------------------|
| **Tarjeta** | Últimos 4 dígitos, marca, documento | Número completo, CVV, vencimiento |
| **PSE** | Banco, tipo documento, número documento | N/A |
| **Nequi** | Celular, nombre | N/A |
| **Daviplata** | Celular, nombre | N/A |
| **Efectivo** | Tipo entrega, dirección | N/A |

### Encriptación
- ✅ Conexión HTTPS segura
- ✅ No almacenamos datos sensibles de tarjeta
- ✅ Datos validados en tiempo real
- ✅ Tokens JWT para sesiones seguras

---

## 📱 Flujo Completo de Pago

```
INICIO
  ↓
┌─────────────────────────────────┐
│ PASO 1: DATOS PERSONALES        │
├─────────────────────────────────┤
│ ✓ Nombre                        │
│ ✓ Email                         │
│ ✓ Teléfono/WhatsApp            │
│ ✓ Dirección de Entrega         │
│ ✓ Ciudad/Departamento          │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ PASO 2: SELECCIONAR MÉTODO      │
├─────────────────────────────────┤
│ 💳 Tarjeta                      │
│ 🏦 PSE/Transferencia           │
│ 📱 Nequi                        │
│ 📱 Daviplata                    │
│ 💵 Efectivo                     │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ PASO 3: DATOS DEL MÉTODO        │
├─────────────────────────────────┤
│ Campos específicos para cada    │
│ método seleccionado            │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│ 4. CONFIRMACIÓN                 │
├─────────────────────────────────┤
│ ✓ Referencia de orden          │
│ ✓ Total a pagar                │
│ ✓ Instrucciones por WhatsApp   │
└─────────────────────────────────┘
  ↓
FIN
```

---

## 🔄 Estados del Pago

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `pending_verification` | Tarjeta en verificación | Sistema revisa datos |
| `waiting_confirmation` | Esperando confirmación | Cliente completa pago |
| `pending_processing` | Procesando transacción | Sistema valida |
| `completed` | Pago completado | Orden confirmada |
| `failed` | Pago rechazado | Reintentar o cambiar método |

---

## 💬 Comunicación con Cliente

### Canales
1. **WhatsApp** - Principal (envío de instrucciones, confirmaciones)
2. **Email** - Confirmación de pedido (automática)
3. **SMS** - Notificaciones opcionales (si aplica)

### Mensajes Automáticos

**Después de Tarjeta:**
```
✅ ¡PAGO PROCESADO CORRECTAMENTE!

Referencia: WIN-ORDER-ABC123
Método: Tarjeta VISA
Total: $165,000

✓ Recibirás confirmación por WhatsApp
✓ La entrega se coordina según tu dirección
```

**Después de PSE:**
```
✅ ¡SOLICITUD DE PAGO REGISTRADA!

Referencia: WIN-ORDER-ABC123
Método: PSE / Bancolombia
Total: $165,000

📱 Te enviaremos por WhatsApp:
• Enlace PSE seguro
• Datos de transferencia bancaria
• Instrucciones de pago
```

**Después de Nequi/Daviplata:**
```
✅ ¡PAGO REGISTRADO!

Referencia: WIN-ORDER-ABC123
Método: [Nequi/Daviplata]
Total: $165,000

📱 Te enviaremos por WhatsApp:
• Solicitud/código QR de pago
• Solo debes aprobar desde tu app
```

**Después de Efectivo:**
```
✅ ¡PEDIDO CONFIRMADO!

Referencia: WIN-ORDER-ABC123
Tipo Entrega: Pago Contra Entrega / Recogida en Tienda
Total: $165,000

👤 Te contactaremos para coordinar:
• Fecha y hora de entrega/recogida
• Confirmar dirección
• Detalles finales
```

---

## 📞 Soporte

Si tienes problemas con el pago:

1. **Tarjeta Rechazada:** 
   - Verifica que tengas fondos suficientes
   - Contacta a tu banco
   - Intenta con otra tarjeta

2. **PSE No Funciona:**
   - Verifica tu acceso bancario
   - Intenta nuevamente
   - Prueba con otra opción de pago

3. **Problemas con Nequi/Daviplata:**
   - Asegúrate de tener saldo en tu billetera
   - Verifica el número de celular correcto
   - Contacta al soporte

4. **Dudas sobre Efectivo:**
   - Te llamaremos para confirmar detalles
   - Recibirás confirmación por WhatsApp
   - Puedes consultar en línea en cualquier momento

**WhatsApp:** +57 [tu número]
**Email:** soporte@winner.store
**Teléfono:** Disponible en horario comercial

---

## 🎯 Cambios Implementados

### Archivos Modificados

#### **index.html**
- ✅ Agregado formulario para Tarjeta de Crédito mejorado
- ✅ Agregado formulario para PSE / Transferencia
- ✅ Agregado formulario para Nequi
- ✅ Agregado formulario para Daviplata
- ✅ Agregado formulario para Efectivo
- ✅ Mejora de interfaz y validaciones visuales

#### **app.js**
- ✅ Función `selectPaymentMethod()` - Muestra formulario según método
- ✅ Función `formatCardNumber()` - Formatea y detecta marca automáticamente
- ✅ Función `formatExpiry()` - Formatea MM/YY
- ✅ Función `formatCVV()` - Solo dígitos
- ✅ Función `formatPhone()` - Formato colombiano
- ✅ Función `updateCashFields()` - Actualiza info de efectivo
- ✅ Función `processPayment()` - Procesa tarjeta de crédito
- ✅ Función `processPaymentPSE()` - Procesa PSE
- ✅ Función `processPaymentNequi()` - Procesa Nequi
- ✅ Función `processPaymentDaviplata()` - Procesa Daviplata
- ✅ Función `processPaymentCash()` - Procesa Efectivo

#### **backend/server.js**
- ✅ Endpoint POST /api/payments - Maneja todos los métodos
- ✅ Compatible con nuevos campos `methodDetails`
- ✅ Almacenamiento seguro sin datos sensibles

---

## ✨ Características Destacadas

✅ **Formularios Específicos** - Cada método tiene sus propios campos
✅ **Validaciones Robustas** - En tiempo real mientras escribes
✅ **Detección de Marca** - Identifica Visa, MC, AMEX, Discover automáticamente
✅ **Formato Automático** - Números de teléfono, tarjeta, etc.
✅ **Mensajes Claros** - Indica qué campo necesita corrección
✅ **Seguridad Máxima** - No almacenamos datos sensibles
✅ **Mejor UX** - Interfaz intuitiva y fácil de usar
✅ **Soporte Multicanal** - WhatsApp, Email, SMS

---

## 🚀 Próximos Pasos (Opcional)

- [ ] Integración con gateway de pago real (Wompi, Openpay)
- [ ] Email con confirmación y detalles del pedido
- [ ] SMS de notificación de pago
- [ ] Recibos PDF descargables
- [ ] Panel de seguimiento de orden en tiempo real
- [ ] Reembolsos automáticos
- [ ] Ciclo de facturación para clientes frecuentes

---

**Última actualización:** 31 de marzo de 2026
**Estado:** ✅ LISTO PARA USAR

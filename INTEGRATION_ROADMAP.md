# 🔌 Guía de Integración - Pasos Siguientes

**Estado:** Implementación base completada, lista para integración real  
**Fecha:** 2 de abril 2026

---

## 📋 Roadmap de Integración

### FASE 1: Wompi (Tarjetas) - 🔴 CRÍTICA
**Prioridad:** ALTA  
**Tiempo estimado:** 2-3 días  
**Responsable:** Backend

#### Pasos:
1. **Crear cuenta Wompi**
   - Registrarse en https://www.wompi.co/
   - Completar KYC (Know Your Customer)
   - Obtener credenciales de prueba y producción

2. **Configurar variables de entorno**
   ```env
   WOMPI_PUBLIC_KEY=pub_test_xxxxx
   WOMPI_PRIVATE_KEY=prv_test_xxxxx
   WOMPI_ACCEPTANCE_TOKEN=acp_test_xxxxx
   ```

3. **Actualizar buildWompiUrl() en app.js**
   ```javascript
   function buildWompiUrl(params) {
     const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY;
     const wompiParams = new URLSearchParams({
       'public-key': wompiPublicKey,
       // ... resto de parámetros
     });
   }
   ```

4. **Configurar webhook de confirmación**
   ```javascript
   // POST /api/webhooks/wompi
   app.post('/api/webhooks/wompi', (req, res) => {
     const { reference, status, amount } = req.body;
     
     // Verificar firma del webhook
     // Actualizar estado de venta en DB
     // Enviar confirmación al cliente
   });
   ```

5. **Probar en ambiente de staging**
   - Usar tarjeta de prueba Wompi
   - Verificar redirecciones
   - Confirmar webhook

---

### FASE 2: Nequi - 🟡 IMPORTANTE
**Prioridad:** MEDIA  
**Tiempo estimado:** 1-2 días  
**Responsable:** Backend

#### Pasos:
1. **Registrarse en Equifax (Nequi)**
   - Portal: https://www.equifax.com.co/nequi/
   - Documentos requeridos: RUT, Cámara de Comercio

2. **Obtener API credentials**
   ```env
   NEQUI_API_KEY=xxx
   NEQUI_API_SECRET=xxx
   NEQUI_MERCHANT_ID=xxx
   ```

3. **Implementar API de Nequi en backend**
   ```javascript
   async function initiateNequiPayment(phoneNumber, amount) {
     const nequiUrl = 'https://api.equifax.com/nequi/v1/transactions';
     const payload = {
       phone: phoneNumber,
       amount: amount,
       description: 'Compra Winner'
     };
     // Realizar request
     // Obtener paymentId
     // Retornar al cliente
   }
   ```

4. **Crear endpoint de confirmación**
   ```javascript
   POST /api/payments/nequi/confirm
   {
     phone: "31XXXXXXX",
     paymentId: "NEQ123456",
     status: "confirmed"
   }
   ```

---

### FASE 3: PSE - 🟡 IMPORTANTE
**Prioridad:** MEDIA  
**Tiempo estimado:** 1-2 días  
**Responsable:** Backend

#### Pasos:
1. **Registrarse en plataforma PSE**
   - Portal: https://www.pagofacil.com.co/
   - Completar datos del comercio

2. **Obtener credenciales PSE**
   ```env
   PSE_MERCHANT_ID=xxx
   PSE_API_KEY=xxx
   PSE_WEBHOOK_SECRET=xxx
   ```

3. **Actualizar buildPSEUrl()**
   ```javascript
   function buildPSEUrl(params) {
     const pseUrl = 'https://www.pagofacil.com.co/api/transactions';
     // Incluir credenciales
     // Construir firma
     // Retornar URL de redirección
   }
   ```

4. **Implementar webhook de PSE**
   ```javascript
   POST /api/webhooks/pse
   // Procesar confirmación de banco
   // Actualizar estado de venta
   ```

---

### FASE 4: Daviplata - 🟢 OPCIONAL
**Prioridad:** BAJA  
**Tiempo estimado:** 1 día

#### Pasos:
1. **Contactar a Davivienda**
   - Email: integraciones@davivienda.com
   - Solicitar acceso a API Daviplata

2. **Similar a Nequi** (usar WhatsApp como alternativa)

---

### FASE 5: Efectivo - ✅ COMPLETADO
**Estado:** Ya implementado con WhatsApp

---

## 🧪 Plan de Testing

### Ambiente LOCAL
```javascript
// En app.js (development)
const IS_DEVELOPMENT = true;

if (IS_DEVELOPMENT) {
  // Usar claves de prueba
  WOMPI_PUBLIC_KEY = 'pub_test_xxx';
  // Mock responses para testing
}
```

### Test Cases
- [ ] Completar formulario cliente (validar todos los campos)
- [ ] Seleccionar cada transportadora (verificar costo)
- [ ] Elegir cada método de pago (verificar redirección)
- [ ] Wompi: Simular pago exitoso
- [ ] Wompi: Simular pago rechazado
- [ ] Nequi: Verificar mensaje WhatsApp
- [ ] PSE: Verificar redirección a portal
- [ ] Efectivo: Verificar instrucciones
- [ ] Verificar datos guardados en BD
- [ ] Verificar emails de confirmación

---

## 🗄️ Cambios en Base de Datos

### Tabla: `sales`
**Agregar columnas:**
```sql
ALTER TABLE sales ADD COLUMN (
  payment_reference VARCHAR(255),        -- ID de la pasarela
  payment_status ENUM('pending', 'confirmed', 'failed', 'cancelled'),
  payment_gateway VARCHAR(50),           -- 'wompi', 'nequi', 'pse', etc.
  gateway_response JSON,                 -- Respuesta completa de pasarela
  webhook_received BOOLEAN DEFAULT FALSE -- ¿Se recibió webhook?
);
```

### Tabla: `payment_transactions` (NUEVA)
```sql
CREATE TABLE payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id VARCHAR(255) FOREIGN KEY,
  reference VARCHAR(255) UNIQUE,
  gateway VARCHAR(50),
  amount DECIMAL(12, 2),
  status ENUM('pending', 'confirmed', 'failed'),
  gateway_response JSON,
  webhook_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 📧 Emails de Confirmación

### Sistema de Emails a Implementar

**1. Confirmación de Pedido (inmediato)**
```
TO: customer@email.com
SUBJECT: ✅ Pedido Registrado - Ref: ON123456

Tu pedido ha sido registrado exitosamente.

Detalles del Pedido:
- Referencia: ON123456
- Total: $108,980
- Envío: Servientrega Express ($18,990)
- Estado: Pendiente de pago

Próximo paso: [Link a pagar]
```

**2. Confirmación de Pago (después de webhook)**
```
TO: customer@email.com
SUBJECT: 💳 Pago Confirmado - Ref: ON123456

Tu pago ha sido procesado exitosamente.

Detalles:
- Método: Tarjeta de Crédito
- Monto: $108,980
- Estado: ✅ CONFIRMADO

Tu pedido será despachado en las próximas 2 horas.
Número de seguimiento: [TRK123456]
```

**3. Notificación de Envío**
```
TO: customer@email.com
SUBJECT: 📦 Tu pedido está en camino

Tu paquete #ON123456 ha sido despachado.

Transportista: Servientrega Express
Número de guía: SVD123456789
Seguimiento: [Link a Servientrega]

Entrega estimada: ${deliveryDate}
```

---

## 📞 Contactos de Integradores

### Wompi
- **Email:** integraciones@wompi.co
- **Teléfono:** +57 (1) 400-1234
- **Documentación:** docs.wompi.co

### Nequi (Equifax)
- **Email:** integraciones@equifax.com.co
- **Portal:** developer.equifax.com.co
- **Soporte 24/7:** +57 (1) 445-5000

### PSE (PagosFácil)
- **Email:** integraciones@pagofacil.com.co
- **Portal:** api.pagofacil.com.co
- **Documentación:** docs.pagofacil.com.co

### Daviplata
- **Email:** integraciones@davivienda.com
- **Teléfono:** +57 (1) 400-1234
- **Portal:** devportal.davivienda.com

---

## 💼 Presupuesto de Comisiones

### Tarifas Típicas por Gateway

| Gateway | Comisión | Rango | Mínimo |
|---------|----------|-------|--------|
| Wompi (Tarjeta) | 2.45% + $575 | $1k-$100M | - |
| Nequi | 1.98% + $290 | - | - |
| PSE | 0% - 2% | Según banco | - |
| Daviplata | 1.98% + $290 | - | - |

**Estimado:** ~$2,000-5,000/mes con 50-100 transacciones

---

## 🔐 Checklist de Seguridad

- [ ] HTTPS en todos los endpoints
- [ ] Validación de firmas de webhook
- [ ] Encriptación de credenciales en .env
- [ ] No almacenar datos de tarjeta
- [ ] Auditoría de transacciones
- [ ] Logs de intentos fallidos
- [ ] Rate limiting en endpoints de pago
- [ ] CORS configurado correctamente
- [ ] Validación de SSL/TLS

---

## 📊 KPIs a Monitorear

```javascript
// Crear dashboard con estas métricas
- Total de ventas online por día
- Tasa de conversión por método de pago
- Costo promedio de envío
- Tiempo promedio de confirmación de pago
- Tasa de rechazo por gateway
- Ingresos netos (ventas - comisiones - envío)
```

---

## 📞 Soporte y Escalamiento

### Si algo falla:

**1. Verificar logs:**
```bash
# Backend logs
tail -f logs/payment-transactions.log

# Gateway webhook logs
SELECT * FROM payment_transactions WHERE status = 'failed' ORDER BY created_at DESC;
```

**2. Contactar al proveedor:**
- Wompi: +57 (1) 400-1234
- Nequi: +57 (1) 445-5000
- PSE: integraciones@pagofacil.com.co

**3. Contactar al cliente:**
- Email automático de disculpas
- Ofrecimiento de reintentar
- Número de soporte

---

## ✅ Definición de Hecho

Se considera completada la integración cuando:

- ✅ Todas las pasarelas reciben transacciones
- ✅ Todos los webhooks se procesan correctamente
- ✅ Confirmación vía email automática
- ✅ Dashboard de monitoreo activo
- ✅ Documentación completada
- ✅ Team capacitado en procesos

---

**Próximo paso:** Comenzar con FASE 1 (Wompi) - Estimar 2-3 días de implementación

# WYNPY - WINNER STORE

Plataforma de E-commerce con Análisis de Ventas y Gestión de Inventarios.

## 🚀 Características

- **Tienda (Storefront)**: Navegación de productos, filtrado por categorías y sección de ofertas dinámicas.
- **Panel Administrativo**: Gestión de inventario con códigos QR, Punto de Venta (POS) y registro de pagos.
- **Análisis de Ventas**: Visualización de datos en tiempo real con Chart.js (Ventas diarias, canales y métodos de pago).
- **Backend Robusto**: Servidor Node.js con base de datos SQLite persistente.
- **Merchant Ready**: JSON-LD para cada producto y un feed CSV disponible en `/merchant-feed.csv` para sincronizar con Google Merchant Center.
- **Seguridad**: API protegida con JWT para el panel (POST/DELETE) y clave `x-api-key` para la tienda online; orígenes CORS configurables vía entorno.

## 🛠️ Instalación y Configuración

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Inicializar la base de datos**:

   ```bash
   npm run seed
   ```

3. **Iniciar el servidor**:

   ```bash
   npm start
   ```

4. **Acceso**:
   - Tienda: `index.html` (Abrir en el navegador)
   - Servidor API: `http://localhost:3000`

## 📊 Tecnologías

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+), Chart.js.
- **Backend**: Node.js, Express.
- **Base de Datos**: SQLite3.

## 📦 Google Merchant Center

- Cada renderizado de productos inyecta JSON-LD (ItemList + Product/Offer) enriquecido con metadata (GTIN, MPN, color, tallas, material y shipping_weight) para que Google pueda comprobar las ofertas frente a la misma página.
- El endpoint público `GET /merchant-feed.csv` devuelve un CSV completo con los atributos extraídos (id, title, description, link, image_link, additional_image_link, availability, price, sale_price, sale_price_effective_date, brand, gtin, mpn, condition, google_product_category, product_type, gender, age_group, color, size, material, pattern, shipping_weight, item_group_id, identifier_exists, tax, shipping, custom_label_0 y custom_label_1) y se construye con datos actuales de inventario para evitar discrepancias y dar mayor confianza al catálogo.

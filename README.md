# CREDI GESTIÓN ONLINE

Sistema web de créditos y cobranza con autenticación y base de datos PostgreSQL mediante Supabase.

## Incluye
- Login y creación de cuenta.
- Clientes con DNI único por usuario.
- Créditos con interés, cuotas y frecuencia.
- Cronograma calculado automáticamente.
- Cobranza y control de saldo.
- Detección de cuotas vencidas.
- Historial de cliente.
- Caja (ingresos/egresos).
- Reportes y exportación CSV.
- RLS: cada usuario solo consulta y modifica sus propios registros.
- Responsive para celular y PC.

## 1. Crear base de datos
En Supabase crea un proyecto y ejecuta todo el contenido de `schema.sql` en SQL Editor.

## 2. Configurar la web
Edita `config.js` y coloca:
- `supabaseUrl`: URL de tu proyecto.
- `supabaseAnonKey`: clave pública anon/publishable.

Nunca pongas la `service_role key` en el navegador.

## 3. Probar
Puedes abrir `index.html` con un servidor local. Para evitar restricciones del navegador, usa VS Code Live Server o cualquier servidor estático.

## 4. Publicar gratis
### GitHub Pages
Sube estos archivos al repositorio y activa Pages. Como el proyecto es estático, GitHub Pages puede servir la aplicación.

### Vercel / Netlify
Importa el repositorio y publica como sitio estático. No requiere build command.

## Importante
Esta versión ya usa servidor/base de datos para los datos de negocio, pero antes de usarla en una operación financiera real conviene añadir auditoría, roles (administrador/cobrador), cierre de caja, respaldos, comprobantes, reglas de interés/mora y controles contables según tu operación.

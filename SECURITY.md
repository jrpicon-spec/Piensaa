# Seguridad operativa

## Tokens del frontend

El token JWT se conserva en `sessionStorage` porque el cliente Socket.IO actual
necesita leerlo para enviarlo en el handshake. Esto reduce la persistencia frente
a `localStorage`, pero no elimina el riesgo de robo ante XSS. Una migración a
cookies `HttpOnly` requiere autenticar también el handshake Socket.IO mediante
cookie, lo cual queda fuera de esta corrección para no alterar la integración
ESP32/Socket.IO en producción.

## Endpoint HTTP del dispositivo

`POST /api/device/result` requiere el header:

```text
X-Device-Api-Key: <DEVICE_API_KEY>
```

El servidor debe definir `DEVICE_API_KEY` con un secreto aleatorio de al menos
32 bytes. El flujo Socket.IO existente no utiliza este endpoint ni cambia sus
eventos, namespace o transportes.

## Migraciones

Aplicar `supabase/migrations` antes de desplegar el backend. La migración añade
campos de cuidadores, constraints, relaciones y persistencia de configuración.

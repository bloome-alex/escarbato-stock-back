# Seguridad de Proxy e IP Admin

El backend usa `req.ip` como fuente canonica para validar el acceso al panel admin. Express solo debe confiar en headers como `X-Forwarded-For` cuando el socket origen pertenece a un reverse proxy configurado explicitamente en `TRUSTED_PROXY_IPS`.

Variables relevantes:

- `ADMIN_DOMAIN`: IP permitida para servir `/admin` y `/admin.html`.
- `TRUSTED_PROXY_IPS`: lista separada por comas de IPs o rangos CIDR de reverse proxies confiables. Si esta vacia, no se confia en ningun proxy.

No expongas el backend directamente a internet cuando la proteccion admin dependa de una IP de VPN o de reglas del proxy. En despliegues con Nginx, Traefik, balanceadores o ingress, el servicio debe aceptar trafico externo solo desde ese proxy confiable y `TRUSTED_PROXY_IPS` debe contener exclusivamente sus IPs/rangos internos.

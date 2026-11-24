# Cartera Family

App web personal (PWA) para consultar una cartera familiar desde el iPhone: capital, rentabilidad, gráfico, ratios y posiciones, y una pestaña «Actualidad» con datos públicos de mercado.

**Los datos están cifrados.** `data/portfolio.enc.json` va cifrado con AES-256-GCM y una clave derivada de una contraseña
(PBKDF2-SHA256), y `data/market.enc.json` (datos públicos de mercado) va cifrado con la misma clave. El repositorio no contiene ningún dato de la cartera en claro: sin la contraseña la app no muestra nada.
El descifrado se hace solo en el navegador (WebCrypto).

Uso en iPhone: abrir la web en Safari → Compartir → «Añadir a pantalla de inicio».

HTML, CSS y JavaScript sin dependencias ni paso de compilación.

# Roadmap

> Volver a: [README](../README.md) · Ver también: [Base de datos](./database.md)

AgroFactoring se entrega primero como MVP de hackathon sobre Stellar **testnet** con oráculos por API, y evoluciona hacia producción con datos meteorológicos reales, IoT en la finca, anchor SEP-24 nativo y mainnet.

---

## Etapa actual — MVP del hackathon (operativo)

- **Smart contract Soroban** en testnet: `__constructor`, `set_usdc`, `init`, `release_phase`, `trigger_disaster`, `get_escrow_state`. Tests con 22 snapshots en `Stellar/contracts/Agro_Factoring/test_snapshots/`.
- **Oráculo climático por API**: OpenWeatherMap + IDEAM Colombia. Detección de helada (`temp < 2 °C` > 4 h). Lecturas persistidas en `weather_readings`.
- **Verificación de fase** por API satelital (Sentinel Hub NDVI) o evidencia fotográfica georeferenciada subida desde el celular del agricultor.
- **Backend Next.js** que firma y envía transacciones on-chain reales (`@stellar/stellar-sdk` 16) como oráculo/admin.
- **Dashboard contextual por rol** (exportador / agricultor) con *Switch Rol* y el "wow moment" del desastre climático (overlay rojo, contador de temperatura, congelamiento pulsante, quema de deuda, fondo de rescate).
- **Última milla fiat** vía widget Transak (botón "Retirar a Nequi" con toast explicativo).
- **Supabase**: 7 tablas + 9 migraciones aplicadas con datos de demo (Café Caturra en Salento, Quindío).

## Próxima etapa — Datos meteorológicos reales + IoT real

Esta es la siguiente evolución y el foco del roadmap. Elimina el botón *"Simular"* del MVP y lo reemplaza por **detección autónoma 24/7**:

### Datos meteorológicos reales

- **OpenWeatherMap / IDEAM en producción** con *polling* programado (en lugar de inserción manual del emulador del hackathon).
- **Umbrales configurables por cultivo y región** (helada, sequía, exceso de lluvia, granizo), no solo `temp < 2 °C`.
- **Histórico y reanálisis** para calibrar el % de quema de deuda y el monto del fondo de rescate según la severidad del evento.

### IoT real en la finca

- **Sensores físicos** desplegados en fincas piloto midiendo *in situ*:
  - **Humedad de suelo** (validación del estrés hídrico que el NDVI satelital solo estima).
  - **NDVI local** con cámaras multiespectrales de bajo costo para contrastar con Sentinel Hub.
  - **Temperatura de canopy** y humedad relativa para detectar heladas antes que la estación meteorológica más cercana.
- **Edge Functions de Supabase** reciben los reportes de los dispositivos (vía HTTP/MQTT→HTTPS), evalúan los umbrales paramétricos y disparan `trigger_disaster` on-chain automáticamente — sin intervención humana.
- La tabla `iot_readings` ya está reservada en el esquema (ver [`./database.md`](./database.md)); sus columnas `ndvi_index` y `soil_moisture` están listas.
- **Firmware** del gateway de la finca en repos warrants de la red local LoRa o Wi-Fi, envía lecturas firmadas y dormita entre reportes para ahorrar batería.

### Lógica paramétrica extendida

- **Múltiples trigger** por contrato (helada AND/OR sequía AND/OR exceso de lluvia) con porcentajes de quema variables según el cultivo y la fase en la que ocurre el evento.
- **Reumbralización**: si el cultivo se recupera tras un evento leve, reanudar el ciclo en lugar de congelar todo.

## Producción v1 — Hardening y fiat

- **Supabase**: habilitar RLS con policies por rol (ver [`./database.md`](./database.md#5-nota-de-seguridad-hardening-pendiente)), migrar contraseñas a hash (bcrypt/argon2) o a Supabase Auth nativo.
- **Bitso / Airtm API** para conversión USDC → COP vía PSE/ACH a la cuenta del agricultor (reemplazo del widget Transak).
- **Webhooks idempotentes** para evitar duplicar `phase_ledger` o `weather_readings` ante reintentos.
- **Rate limiting** y validación estricta de entrada en las rutas `/api/data/*`.
- **Observabilidad**: logs estructurados, métricas de latencia de `rpc.simulateTransaction`/`rpc.sendTransaction`, alertas de TTL bajo en escrows.

## Escala — Anchor SEP-24 nativo y mainnet

- Asociación con un **corredor de cambio regulado en Colombia** registrado como Anchor SEP-24: el contrato paga al Anchor, el Anchor acredita COP automáticamente al agricultor, eliminando la API intermediaria.
- **SEP-31** para pagos cross-border del exportador (Miami) al Anchor colombiano.
- **Mainnet**: migrar el contrato y los trustlines USDC de testnet a mainnet; auditoría de seguridad (ver *Soroban Audit Bank* en el skill Soroban) antes de manejar fondos reales.
- **Multi-cultivo, multi-país**: replicar el contrato por cultivo (café, cacao, arroz, maíz, frutales) y por país (Brasil, México, Perú), parametrizando fases y umbrales.
- **Gobernanza** del oráculo: set de oráculos con firmas múltiples (multisig) para `trigger_disaster`, en lugar del admin único actual.
- **Modelo de seguro paramétrico sostenible**: reaseguro on-chain o pool de liquidez atraído por yield del escrow anual.

## No-goal (fuera de alcance actual)

- Mercado de futuros / derivados: AgroFactoring es factoring con seguro paramétrico, no requiere regulación CFTC.
- Tokenización de la cosecha como NFT: se evaluará si los exportadores lo demandan para comerciar el compromiso de despacho.
- Préstamos a longitudes de ciclo no agronómicas (no son ciclo medible por NDVI, no aplican).
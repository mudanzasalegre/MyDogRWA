# MyFirstDog Token: Tokenización de Activos del Mundo Real (RWA)

## Introducción

**MyFirstDog** es un proyecto innovador que explora la tokenización de activos del mundo real (RWA, por sus siglas en inglés) mediante la representación digital de algo especial: **un perro**. Este proyecto combina conceptos avanzados de blockchain, como listas blancas de usuarios (whitelist) y custodios (custodians), para garantizar seguridad, conformidad legal y escalabilidad.

## ¿Qué es MyFirstDog?

El contrato **MyFirstDog** es un token ERC20 diseñado para representar una propiedad compartida del activo en 1000 partes indivisibles. Esto permite a los usuarios interactuar con el ecosistema blockchain de una manera regulada, transparente y segura.

---

## Objetivos

1. **Representar un activo real:** MyFirstDog tokeniza un activo único, garantizando su representación en la blockchain.
2. **Cumplimiento legal:** Uso de una whitelist para limitar el acceso a usuarios aprobados, cumpliendo con normativas legales.
3. **Seguridad:** Un contrato custodio asegura que los balances puedan ser congelados/descongelados en caso de actividad irregular.
4. **Transparencia:** Uso de contratos inteligentes para gestionar roles y permisos de manera confiable.

---

## Arquitectura del Sistema

### 1. **Contrato Principal: MyFirstDog**
Este contrato es el token ERC20 principal que permite la emisión y transferencia de tokens.

- **Máximo de 1000 unidades:** Cada token representa una parte indivisible del activo.
- **Sin decimales:** Cada token es indivisible.
- **Whitelist:** Solo los usuarios aprobados pueden comprar tokens.
- **Roles y permisos:**
  - `DEFAULT_ADMIN_ROLE`: Control total del contrato.
  - `PAUSER_ROLE`: Permite pausar el contrato.
  - `MINTER_ROLE`: Permite emitir nuevos tokens.

#### Funcionalidades principales
- **`buy()`**: Permite a los usuarios en la whitelist comprar un token por un precio fijo de 0.1 ETH.
- **`mint()`**: Emite nuevos tokens dentro del límite máximo.
- **`withdraw()`**: Retira fondos acumulados del contrato.

---

### 2. **Whitelist: Contrato Allowlist**
Este contrato gestiona quién puede interactuar con MyFirstDog.

- **Añadir o eliminar usuarios:** Administradores con el rol `LIMITER_ROLE` pueden gestionar la lista.
- **Roles:**
  - `DEFAULT_ADMIN_ROLE`: Control total del contrato.
  - `LIMITER_ROLE`: Permite gestionar la whitelist.

#### Funcionalidades principales
- **`allowUser(address)`**: Añade un usuario a la whitelist.
- **`disallowUser(address)`**: Elimina un usuario de la whitelist.
- **`isAllowed(address)`**: Verifica si un usuario está en la whitelist.

---

### 3. **Custodio: Contrato Custodian**
Este contrato asegura la integridad del sistema mediante la gestión de balances congelados.

- **Congelación de activos:** Protege los balances en caso de disputas o irregularidades.
- **Roles:**
  - `DEFAULT_ADMIN_ROLE`: Control total del contrato.
  - `CUSTODIAN_ROLE`: Permite congelar/descongelar balances.

#### Funcionalidades principales
- **`freeze(address, uint256)`**: Congela un balance de un usuario.
- **`unfreeze(address, uint256)`**: Descongela un balance previamente congelado.
- **`availableBalance(address)`**: Verifica el balance disponible de un usuario.

---

## Beneficios

1. **Cumplimiento normativo:**
   - La whitelist limita el acceso a usuarios aprobados.
   - El custodio asegura que los activos puedan ser congelados en caso de necesidad legal.

2. **Seguridad:**
   - Roles y permisos previenen abusos en la gestión del contrato.
   - La custodia garantiza la integridad de los balances.

3. **Transparencia:**
   - Todas las operaciones son públicas y rastreables en la blockchain.

4. **Escalabilidad:**
   - El modelo es fácilmente replicable para otros activos físicos o conceptuales con necesidades similares.

---

## Despliegue y Uso

### 1. **Despliegue de Contratos**
1. Desplegar el contrato `Custodian`:
   ```solidity
   Custodian custodian = new Custodian(adminAddress);
   ```

2. Desplegar el contrato `Allowlist`:
   ```solidity
   Allowlist allowlist = new Allowlist(adminAddress);
   ```

3. Desplegar el contrato `MyFirstDog`:
   ```solidity
   MyFirstDog myFirstDog = new MyFirstDog(custodianAddress, allowlistAddress);
   ```

### 2. **Uso**
1. **Añadir un usuario a la whitelist:**
   - Llamar a `allowUser(address)` desde el contrato `Allowlist` con un usuario aprobado.

2. **Congelar un balance:**
   - Llamar a `freeze(address, amount)` desde el contrato `Custodian`.

3. **Comprar un token:**
   - Los usuarios en la whitelist pueden llamar a `buy()` desde el contrato `MyFirstDog`.

---

## Ejemplo de Interacción
```solidity
// Añadir un usuario a la whitelist
allowlist.allowUser(userAddress);

// Congelar parte del balance de un usuario
custodian.freeze(userAddress, 5);

// Comprar un token
myFirstDog.buy({ value: 0.1 ether });
```

---

## Consideraciones Legales

1. **Cumplimiento de Regulaciones:** Este sistema está diseñado para cumplir con normativas financieras y de valores, dependiendo de la jurisdicción.
2. **Protección de Usuarios:** Los roles de whitelist y custodia aseguran que el sistema sea seguro y transparente.
3. **Escalabilidad:** El modelo puede aplicarse a cualquier activo físico o conceptual con necesidades similares.

---

## Conclusión

**MyFirstDog** combina innovación tecnológica y cumplimiento normativo para explorar cómo la tokenización puede representar activos reales en la blockchain. Este proyecto abre la puerta a nuevas oportunidades para conectar el mundo físico y digital de manera segura y escalable.

---

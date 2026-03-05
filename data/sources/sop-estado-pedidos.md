---
title: SOP Consulta de Estado de Pedidos
sourceUrl: https://intranet.example/sops/operaciones/estado-pedidos
docType: sop
rolesAllowed: support,sales,admin
validFrom: 2025-04-01
validTo:
---
# Objetivo
Estandarizar como responder consultas de estado de pedidos en canales de soporte y ventas. El objetivo es reducir respuestas ambiguas y asegurar que toda comunicacion esté respaldada por fuente verificable. En el piloto del copiloto RAG, las consultas se resuelven con herramientas read-only y sin exponer PII.

# Estados oficiales
CREATED: pedido registrado pero aun no liberado a preparación. PICKING: pedido en preparación logística. SHIPPED: pedido despachado con transporte asignado. DELIVERED: pedido entregado según confirmación operativa. ON_HOLD: pedido retenido por validaciones pendientes o incidencias.

# Flujo de consulta
1. Pedir ID de pedido con formato estándar (ORD-####).
2. Confirmar que el usuario tenga rol habilitado para consultar estado.
3. Consultar herramienta read-only de estado de pedidos.
4. Responder estado actual, timestamp y próximos hitos esperados.
5. Si el estado es ON_HOLD, agregar causa operativa genérica y canal de seguimiento.
6. Registrar la interacción para trazabilidad y mejora de servicio.

# Buenas practicas
Responder en lenguaje claro, sin prometer fechas no confirmadas. Evitar copiar salidas técnicas completas si no agregan valor al usuario final. Si el pedido involucra política especial (devolución, descuento, crédito), agregar referencia a documento corporativo vigente con citaciones.

# Riesgos y escalamiento
Si hay discrepancia entre herramienta y sistema transaccional, priorizar el sistema transaccional y escalar a operaciones. Si no hay ID válido, no inferir datos por nombre de cliente ni por datos parciales. El escalamiento debe incluir requestId interno, timestamp de consulta y área responsable.


---
title: FAQ Facturacion y Estado de Facturas
sourceUrl: https://intranet.example/faqs/finanzas/facturacion
docType: faq
rolesAllowed: finance,support,admin
validFrom: 2025-01-15
validTo:
---
# Preguntas frecuentes
## Cuando una factura figura como PENDING
Una factura en estado PENDING indica que aun no termino la validacion documental o aprobacion interna. El equipo debe revisar si falta orden de compra, recepcion de mercaderia o validacion tributaria. Mientras permanezca pendiente, no se debe confirmar fecha de pago final al cliente.

## Cuando una factura figura como APPROVED
El estado APPROVED implica validacion documental completa y habilitacion para ciclo de pago o cobro. Desde este punto, cualquier cambio requiere flujo de excepcion y trazabilidad de aprobaciones. Si el cliente reporta diferencia de monto, iniciar proceso de aclaracion antes de emitir nota de credito.

## Cuando una factura figura como REJECTED
El rechazo puede deberse a inconsistencias de datos fiscales, duplicidad o falta de respaldo contractual. Se debe generar ticket de correccion y registrar causa de rechazo para analitica. No se debe reemitir manualmente sin confirmar que la causa raiz fue resuelta.

## Que informacion se puede compartir
En modo copiloto piloto, solo se comparte estado, fecha de ultima actualizacion y campos comerciales no sensibles. Nunca se exponen datos personales, cuentas bancarias ni direcciones de clientes. Si el usuario insiste en PII, responder con rechazo de seguridad y orientar al canal autorizado.

## Como actuar ante falta de evidencia
Si no existe evidencia suficiente en SOPs o registros read-only, responder explicitamente que no hay certeza. Luego pedir contexto minimo: ID de factura, unidad de negocio y periodo de consulta. Finalmente sugerir revisar portal financiero o abrir caso en soporte de finanzas.


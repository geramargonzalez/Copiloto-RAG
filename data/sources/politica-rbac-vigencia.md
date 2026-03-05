---
title: Politica RBAC y Vigencia Documental para Copiloto
sourceUrl: https://intranet.example/politicas/seguridad/rbac-vigencia-copiloto
docType: policy
rolesAllowed: admin,finance,sales,support
validFrom: 2025-01-05
validTo:
---
# Principios de acceso
El copiloto aplica control de acceso por rol en retrieval y en herramientas read-only. Cada chunk documental debe incluir metadata de roles permitidos y vigencia temporal para evitar respuestas basadas en documentos obsoletos. El usuario solo debe ver evidencia compatible con su rol y fecha de consulta.

# Reglas de vigencia
Un documento con validFrom en el futuro no puede recuperarse. Un documento con validTo vencido debe excluirse de retrieval salvo modo auditoria explícito. Si existen dos versiones vigentes, se prioriza la mas reciente y se mantiene traza de version consultada.

# Matriz minima de roles
finance: politicas financieras, facturacion, notas de credito, devoluciones con impacto contable.  
sales: descuentos comerciales, estado de pedidos, guias de cotizacion.  
support: SOPs operativos, consultas de estado, devoluciones estándar.  
admin: acceso transversal de supervision sin privilegios de escritura.

# Controles esperados
Toda respuesta debe incluir citaciones de fuentes vigentes cuando el intent sea SOP/policy. Si no hay evidencia suficiente, el sistema debe responder falta de certeza en lugar de inferir. Las herramientas de estado deben registrar tool trace sin datos personales y con requestId interno.

# Requisitos de seguridad
No indexar PII por defecto y redactar PII en logs. Aplicar allowlist de herramientas para impedir ejecución arbitraria. Limitar la tasa de consultas por usuario/IP durante el piloto para evitar abuso. Mantener trazabilidad de conversaciones y feedback para mejora continua.


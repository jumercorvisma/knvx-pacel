Integración para cliente Pacel de Chile. Cliente con SAP BO, una sola empresa, no tiene sociedades.

Este cliente en Konvex usa 1 servicio:

Factura de proveedores https://api.getkonvex.com/core/api/purchases/invoices

Este cliente hace la contabilización por gasto dentro de un informe, es decir por cada gasto del informe se hace un POST  al servicio de konvex. Es decir no hace un consolidado por informe, para hacer un solo POST como sucede con otros clientes.

En src/rindegastos/rindegastos.service.ts se puede encontrar las funciones que hacen todo el trabajo y se explica a continuación:

arrangeEntries(dateSince, reportId)-> consulta el informe y los gastos para iterarlos en functionPrincipales

functionPrincipales()-> Según el tipo de documento asociado al gasto decide el arreglo que se envía para crear la factura en SAP.

transformarRut() -> este cliente tiene dos nomenclaturas para sus socios de negocio en SAP, por eso tenemos está funcioón que toma el rut del proveedor y lo formatea para obtener el socio de negocio que va asociado a la factura.
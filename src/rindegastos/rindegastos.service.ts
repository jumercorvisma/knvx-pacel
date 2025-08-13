import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

import { KonvexService } from 'src/konvex/konvex.service';
import { CreateExpense } from './entities/gasto.entity';
import { ExpenseReport } from './entities/rindegasto.entity';

@Injectable()
export class RindegastosService {

  constructor (
    @Inject(forwardRef(() => KonvexService)) private readonly konvexService: KonvexService,
  ) {}

//Esta función es la principal, pues consulta los informes, gastos (con las dos funciones creadas para eso) 
// y hace el arreglo para enviarlos como entradas diarías (asientos contables) a SAP
  async arrangeEntries(dateSince: Date, reportId: string) {
    try{


    let journalEntryLines: {AccountCode?: string; Debit: string; Credit: string; LineMemo: string, FCCurrency?: string, FCCredit?: string, FCDebit?: string, ProjectCode?: string, ShortName?: string, CostingCode?: string}[] = [];
    journalEntryLines = [];
    
    let informesConsultados: ExpenseReport[] = await this.findAll(dateSince, reportId)
    var report = informesConsultados;
    var employeReport = informesConsultados['EmployeeIdentification'];
    var expenses = await this.findExpenses(dateSince, report['Id']); // Obtener las líneas de gasto por ID del informe
    var reportType = report['ExtraFields'].find(field => field.Name === "Tipo de rendición")?.Code;
    var folio = report['ReportNumber'];
    var configCont = report['ExtraFields'].find(field => field.Name === "Contabilizar documentos")?.Code;
    var ReportProjectCode = report['ExtraFields'].find(field => field.Name === "Área")?.Code;
    var comentarioAsientos = "FXR " + report['ReportNumber'] + " " + report['EmployeeName'] + " " + report['ExtraFields'].find(field => field.Name === "Área")?.Code;

    //Si el tipo de rendición es caja chica entonces el crédito se irá a la cuenta de Caja Chica

    if (String(reportType) == 'CCH'){
      
      journalEntryLines.push( { AccountCode: '10.101.001', Debit: "0", Credit: report['ReportTotalApproved'].toString() , LineMemo: "FXR " +report['ReportNumber'] + " " + report['EmployeeName'] + " Proyecto-"+ report['ExtraFields'].find(field => field.Name === "Área")?.Value, ProjectCode: report['ExtraFields'].find(field => field.Name === "Área")?.Code});
    
    };

    //Si el tipo de rendición es Fondo fijo entonces el crédito se irá a la cuenta del empleado

    if (String(reportType) == 'FF'){

      journalEntryLines.push( { ShortName: employeReport, Debit: "0", Credit: report['ReportTotalApproved'].toString() , LineMemo: "FXR " +report['ReportNumber'] + " " + report['EmployeeName'] + " Proyecto-"+ report['ExtraFields'].find(field => field.Name === "Área")?.Code, ProjectCode: report['ExtraFields'].find(field => field.Name === "Área")?.Code});

    };

    
    //Iteramos los gastos del informe para crear las lineas de débito

    for (var expense of expenses['Expenses']) {
            console.log(expense)

            await new Promise(resolve => setTimeout(resolve, 20000))

            //Busca el tipo de documento asociado al gasto, ya que si es factura o boleta de honorario tiene que crear otros asientos apartes para eso

            var tipoDoc = await expense.ExtraFields.find(field => field.Name === "Tipo de documento")?.Code
            console.log("tipo de documento es " + tipoDoc)
            console.log("el tipo del tipo de doc es" + typeof(tipoDoc))

            //Si el tipo de documento no es una boleta de honorarios o una factura entonces el asiento se irá a la cuenta contable especificada en la categoría del gasto (expense.categoryCode)

            if (String(tipoDoc) !== "33" && String(tipoDoc) !== "99"){
            
  
              journalEntryLines.push(
                { AccountCode: expense.CategoryCode, Debit: expense.OriginalAmount.toString(), Credit: "0" , LineMemo: "FXR " + report['ReportNumber'] + " " +report['EmployeeName'] + "- " + expense.Note, ProjectCode: expense.ExtraFields.find(field => field.Name === "Centro de costo")?.Code})
  
            }

            //Si el tipo de documento es una boleta de honorarios o una factura entonces el asiento se irá a la cuenta contable del proveedor (ShortName: rutLimpio)

            if (String(tipoDoc) === "33" || String(tipoDoc) === "99"){
            
            var rutProveedor = await expense.ExtraFields.find(field => field.Name === "RUT proveedor")?.Value || null
            console.log("Rut: " + rutProveedor)

            var rutLimpio = await this.formatRut(rutProveedor)

            console.log(rutLimpio)

              journalEntryLines.push(
                { ShortName: rutLimpio, Debit: expense.OriginalAmount.toString(), Credit: "0" , LineMemo: "FXR "+ report['ReportNumber'] + " "+ report['EmployeeName'] + "- " + expense.Note, ProjectCode: expense.ExtraFields.find(field => field.Name === "Centro de costo")?.Code});
  
            }
        }


        await new Promise(resolve => setTimeout(resolve, 10000))
        console.log("Estas son las Entrylines que se van a crear")
        console.log(journalEntryLines)
      
      //Finalizado el arreglo de los asiento los envio y espero la respuesta para marcar el informe como integrado
        
        await this.konvexService.createEntry(reportId, comentarioAsientos, journalEntryLines,ReportProjectCode,folio,'1')

        await new Promise(resolve => setTimeout(resolve, 20000))

      
      //Si en el informe el campo "Contabilizar documentos" es si entonces se preparan las entradas diarías para la contabilización de las facturas y boletas de honorarios cuando vienen asociadas al gasto. 
      // También se va creando el asiento de las facturas y boletas.

      if (configCont === 'si'){
        
        let gastos = expenses['Expenses'];

        await this.SendDocuments(gastos, report, rutLimpio);

      }
 
     

  return 'Sincronización finalizada' ;

  //Si hay un error se captura para dejar el log en el historial del informe
    } catch (error:any){

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("hola, ocurrió un error en la integración " + errorMessage )
      console.log("antes de enviar el mensaje");
      const op = await this.setIntegrationMessage(reportId, "Ocurrió un error en la integración, revisa que todos los datos en tus gastos se encuentren correctos", "Error al integrar")
      console.log("después de enviar el mensaje", op);
      return error

    };
}

//Esta función busca en rindegastos los reportes por id
  async findAll(dateSince: Date, reportId: string): Promise<ExpenseReport[]> {
    try{
        const config: AxiosRequestConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          //Solo se consultan informes cerrados que no esten integrados
          url: 'https://api.rindegastos.com/v1/getExpenseReport?Id='+reportId,
          headers: {
            'Authorization': 'Bearer '+ process.env.RG_APIKEY,
            'Content-Type': 'application/json'
          }
        }

        const resp = await axios.request<ExpenseReport[]>(config)
        return resp.data;

      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("hola, ocurrió un error al obtener los informes en Rindegastos: " + errorMessage )
      console.log("antes de enviar el mensaje");
      const op = await this.setIntegrationMessage(reportId, "Ocurrió un error al intentar obtener los informes en Rindegastos", "Error al integrar")
      console.log("después de enviar el mensaje", op);
      return error
    }

}

//Esta función obtiene el detalle de los gastos asociados a los reportes consultados
  async findExpenses(dateSince: Date, reportID: string){
    try{

     const config: AxiosRequestConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        //Se consultan solo gastos aprobados
        url: 'https://api.rindegastos.com/v1/getExpenses?Status=1&ReportId='+reportID+'&Since='+"1900-01-01"+'&IntegrationStatus=0',
        headers: {
          'Authorization': 'Bearer '+ process.env.RG_APIKEY,
          'Content-Type': 'application/json'
        }
      }
  
      const resp = await axios.request<CreateExpense[]>(config)
      return resp.data;

    }catch (error: any){
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("hola, ocurrió un error al intentar obtener los gastos del informe N° " + reportID + " " + errorMessage )
        console.log("antes de enviar el mensaje");
        const op = await this.setIntegrationMessage(reportID, "Ocurrió un error al intentar obtener los gastos del informe", "Error al integrar")
        console.log("después de enviar el mensaje", op);
      return error

    }


}

//Esta función formate el rut del proveedor para formar la nomenclatura del socio de negocio en SAP
async formatRut(rut: string){
  try{

      if (!rut || typeof rut !== 'string') return "rut invalido";
       // Eliminar puntos y guiones
       const limpio = rut.replace(/[.-]/g, '');
       // Validar que quede solo una cadena numérica con dígito verificador (8-9 caracteres)
      if (!/^\d{7,8}[0-9kK]$/.test(limpio)) return "rut invalido";

      return `P${limpio.toUpperCase()}`;

  }catch (error:any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("hola, ocurrió un error al formatear el rut del proveedor" + errorMessage )

        return error
  }


}

//Esta función marca al informe como integrado
async setIntegrationStatus(id_informe: string, id_sap: string){
  try{

    const event = new Date();
    var current_time = event.getHours()+":"+event.getMinutes()+":"+ event.getSeconds();
    var integrationDateF = event.getFullYear()+"-"+(event.getMonth()+1)+"-"+event.getDate()+" "+current_time;

    const config: AxiosRequestConfig = {

      method: 'put',
      maxBodyLength: Infinity,
      url: 'https://api.rindegastos.com/v1/setExpenseReportIntegration',
      headers: {

        'Authorization': 'Bearer '+ process.env.RG_APIKEY,
        'Content-Type': 'application/json',

      },
      data: {
            Id: id_informe,
            IntegrationStatus: 1,
            IntegrationCode: id_sap,
            IntegrationDate: integrationDateF
      }

    };
    
    const resp = await axios.request<ExpenseReport[]>(config)
    return resp.data['data']
  }catch (error:any){
        const errorMessage = error instanceof Error ? error.message : String(error);

         console.log("Ocurrió un error al actualizar el estado del informe " + errorMessage );
         console.log("antes de enviar el mensaje");
         const op = await this.setIntegrationMessage(id_informe, "Ocurrió un error al actualizar el estado del informe", "Error al integrar")
         console.log("después de enviar el mensaje", op);
    
        return error
  }

}

//Esta función deja el mensaje de integración en la bitacora, ya sea si se integró exitosamente o el mensaje de error
async setIntegrationMessage(id_informe: string, message: string, status?: string){
  try{

    const config: AxiosRequestConfig = {

      method: 'put',
      maxBodyLength: Infinity,
      url: 'https://api.rindegastos.com/v1/setExpenseReportCustomStatus',
      headers: {

        'Authorization': 'Bearer '+ process.env.RG_APIKEY,
        'Content-Type': 'application/json',

      },
      data: {
             Id: id_informe,
             IdAdmin: process.env.RG_ADMINUSER, //este admin de usuario también puede cambiar por cliente
             CustomStatus: status,
             CustomMessage: message
      }

    };
    
    const resp = await axios.request<ExpenseReport[]>(config)
    return resp.data

  } catch (error:any){

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("hola, ocurrió un error al intentar actualizar el estado del informe" + errorMessage )
        return error
  }
}

//Esta función crea los asientos de las facturas y boletas de honorarios si el cliente tiene la configuración habilitada
async SendDocuments(gastos: Array <any>, report, rutLimpio: string ){

for (var expense of gastos) {  

  var tipoDoc = await expense.ExtraFields.find(field => field.Name === "Tipo de documento")?.Code;
  var reportId = report['Id'];
  var ReportProjectCode = report['ExtraFields'].find(field => field.Name === "Área")?.Code

  let otherEntryLines: { AccountCode?: string; Debit: string; Credit: string; LineMemo: string, FCCurrency?: string, FCCredit?: string, FCDebit?: string, ProjectCode?: string, ShortName?: string, CostingCode?: string}[] = [];
  otherEntryLines = [];

            if (String(tipoDoc) === "33" || String(tipoDoc) === "99"){
              var comentarioDocs = "FXR " + report['ReportNumber'] + " " + expense.Note + " " + expense.ExtraFields.find(field => field.Name === "Tipo de documento")?.Value + " " + expense.ExtraFields.find(field => field.Name === "Número de documento")?.Value
              console.log("pasó este tipo de doc a other line entry"  + tipoDoc)
              otherEntryLines.push(
                { AccountCode: expense.CategoryCode, Debit: expense.Net.toString(), Credit: "0" , LineMemo: "FXR " + report['EmployeeName'] + "- " + expense.Note + " " + expense.ExtraFields.find(field => field.Name === "Número de documento")?.Value, CostingCode: expense.ExtraFields.find(field => field.Name === "Centro de costo")?.Code, ProjectCode: ReportProjectCode}, //una linea para el monto neto
                { AccountCode: "10.108.001", Debit: expense.Tax.toString(), Credit: "0", LineMemo: "FXR " + report['EmployeeName'] + "- " + expense.Note + " "  + expense.ExtraFields.find(field => field.Name === "Número de documento")?.Value, CostingCode: expense.ExtraFields.find(field => field.Name === "Centro de costo")?.Code, ProjectCode: ReportProjectCode }, //una linea para el iva
                { ShortName: rutLimpio, Debit: "0", Credit: expense.OriginalAmount.toString(), LineMemo: "FXR " + report['EmployeeName'] + "- " + expense.Note + " " + expense.ExtraFields.find(field => field.Name === "Número de documento")?.Value, CostingCode: expense.ExtraFields.find(field => field.Name === "Centro de costo")?.Code, ProjectCode: ReportProjectCode}) //una linea para el total


                try {
                  let fact = await this.konvexService.createEntry(reportId, comentarioDocs, otherEntryLines);
                  console.log("Esto fue lo que resultó de crear un asiento de factura " + fact)
                  
                } catch (error: any) {
                    
                   let syncGasto = await this.setIntegrationMessage(reportId, "El informe y los gastos se contabilizaron sin problema, pero hubo un problema al crear el asiento adicional del documento "+ expense.ExtraFields.find(field => field.Name === "Número de documento")?.Value + " asociado al gasto, debe ser creado manualmente en SAP. Revisa que la cuenta contable u otros datos estén correctos. ", "Integrado con observaciones")

                   return error

                }
  

          }

}

return reportId
}

}


//Pendientes
//Agregar proyecto y cuentas asociadas (pedido a konvex) ok
//OK: Crear socios de negocios con los nombres de syncore (pedido a konvex) ok
//Replicar el servicio pero consultando los informes por id ok
//marcar como integrado el informe ok
// completar los datos de la cabecera: comentario, fecha de documento y proyecto ok
// completar los datos de la cabecera cuando es una factura: referencia 1, comentario, fecha de documento, indicador, folio ok
// Cuando se trae de varias facturas o boletas de honorarios, hacer que se registren por separado ok
// Filtrar solo por gastos aprobados ok
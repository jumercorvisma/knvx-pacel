import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KonvexService } from 'src/konvex/konvex.service';
import { CreateExpense } from './entities/gasto.entity';
import { ExpenseReport } from './entities/rindegasto.entity';
import { facturaProveedores } from 'src/konvex/facturas.interface';


@Injectable()
export class RindegastosService {

  constructor (
    @Inject(forwardRef(() => KonvexService)) private readonly konvexService: KonvexService,
  ) {}

//Esta función es la principal, pues consulta los informes, gastos (con las dos funciones creadas para eso) 
// y hace el arreglo para enviarlos como entradas diarías (asientos contables) a SAP
  async arrangeEntries(dateSince: Date, reportId: string) {
    console.log("hola")
    try{
 
    let informesConsultados: ExpenseReport[] = await this.findAll(dateSince, reportId);
    var report = informesConsultados;
    console.log(report['ExpenseReports']['ReportNumber'])
    var expenses = await this.findExpenses(dateSince, reportId); // Obtener las líneas de gasto por ID del informe

    
    await this.functionPrincipales(expenses, report)

    await new Promise(resolve => setTimeout(resolve, 10000))


  return 'Sincronización finalizada' ;

  //Si hay un error se captura para dejar el log en el historial del informe
    } catch (error:any){

      return error

    };
}

//Esta función busca en rindegastos los reportes por id
  async findAll(dateSince: Date, reportId: string): Promise<ExpenseReport[]> {
    console.log("entro a findall")
    await new Promise(resolve => setTimeout(resolve, 20000))
    try{
        const config: AxiosRequestConfig = {
          method: 'get',
          maxBodyLength: Infinity,
          //Solo se consultan informes cerrados que no esten integrados
          url: 'https://api.rindegastos.com/v2/getExpenseReport?Id='+reportId,
          headers: {
            'Authorization': 'Bearer '+ process.env.RG_APIKEY,
            'Content-Type': 'application/json'
          }
        }

        const resp = await axios.request<ExpenseReport[]>(config)
        console.log(config)
        console.log(resp.data)
        return resp.data;

      
    } catch (error: any) {

      return error
    }

}

//Esta función obtiene el detalle de los gastos asociados a los reportes consultados
  async findExpenses(dateSince: Date, reportID: string){
    console.log("entró a findExpenses")
    await new Promise(resolve => setTimeout(resolve, 20000))
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
      console.log(resp.data)
      return resp.data;
      

    }catch (error: any){

      console.log(error)

      return error

    }


}

//Esta función itera el arreglo de gastos y separa aquellos
//en los que por el tipo de documento
async functionPrincipales(expenses: any, report: any){
  console.log("entró a functionPrincipales")

  try{


      for (var g of expenses['Expenses']) {
        
            
            console.log(g)

            await new Promise(resolve => setTimeout(resolve, 20000))

            //Busca el tipo de documento asociado al gasto para diferenciar como contabilizarlo

            var tipoDoc = g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code;
            var category = g.Category;
            console.log("tipo de documento es " + tipoDoc);
            console.log("el tipo del tipo de doc es" + typeof(tipoDoc));

            //Si no son FF, FEE o BH los creamos como facturas de proveedores
            //cambiando la nomenclatura del proveedor y la descripción

            if (tipoDoc === 'H'){

            console.log("Entró en el loop H")
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push(
              {
                sap: {
                  CardCode: g.ExtraFields.find(field => field.Name === "Proveedor SAP")?.Value,//"H20544736",
                  DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,//"2025-10-31",
                  DocType: "dDocument_Service",
                  FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"H",
                  FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value+"3",//"21012",
                  Indicator: "97",
                  Comments: g.Note + " Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],
                  DocumentLines: [
                    {
                      ItemDescription: g.Note,//"Servicio Degustacion",
                      AccountCode: g.CategoryCode,//"4-1-02-02-17",
                      LineTotal: g.Total,//"70175",  
                      TaxCode: "IVA_EXE",
                      WTLiable: "tYES", 
                      CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,//"MARKETIN",
                      CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code//"SUR-CHI"
                    }
                  ],
                  WithholdingTaxDataCollection: [
                    {
                      WTCode: "W1", 
                      TaxableAmount: g.Total//"70175" 
                    }
                  ]
                }
              })

            this.konvexService.createInvoices(facturaProveedor)
                  
             }


            //Si son FF, FEE o BH los creamos como facturas de proveedores
            //cambiando la nomenclatura del proveedor y la descripción

            const documentosValidos = ['33'];

            if (documentosValidos.includes(tipoDoc) && category !== 'Combustible Viajes'){

            console.log("Entró en el loop 33")
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                DocType: "dDocument_Service", 
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value+"3",//"21046",
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,//"2025-10-23T00:00:00Z",
                CardCode: g.ExtraFields.find(field => field.Name === "Proveedor SAP")?.Value,//"P77481532",
                CardName: g.Supplier,//"TECSF SOFTWARE SPA",
                JournalMemo: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                DocTotal: g.Total,//"13150",
                DocCurrency: g.Currency,//"CLP",
                Comments: g.Note + " Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],//"Ejemplo contabilización factura boleta electrónica 39",
                Indicator: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,//"77481532-5",
                DocumentLines: [
                  {
                    ItemDescription: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    Quantity: "1",
                    PriceAfterVAT: g.Total,//"13150",
                    Currency: g.Currency,//"CLP",
                    AccountCode: g.CategoryCode,//"4-1-02-12-02", 
                    CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,//"MARKETIN",
                    TaxCode: "IVA",
                    FreeText: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    Text: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code//"SUR-CHI"
                  }
                ]
              }
            }


            )

            this.konvexService.createInvoices(facturaProveedor)
                  
             }

            const documentosValidos2 = ['34', '39', 'C'];

            if (documentosValidos2.includes(tipoDoc)){

            console.log("Entró en el loop 34, 39, C")
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                DocType: "dDocument_Service", 
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value+"3",//"21046",
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,//"2025-10-23T00:00:00Z",
                CardCode: g.ExtraFields.find(field => field.Name === "Proveedor SAP")?.Value,//"P77481532",
                CardName: g.Supplier,//"TECSF SOFTWARE SPA",
                JournalMemo: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                DocTotal: g.Total,//"13150",
                DocCurrency: g.Currency,//"CLP",
                Comments: g.Note + " Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],//"Ejemplo contabilización factura boleta electrónica 39",
                Indicator: '33',//g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,//"77481532-5",
                DocumentLines: [
                  {
                    ItemDescription: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    Quantity: "1",
                    PriceAfterVAT: g.Total,//"13150",
                    Currency: g.Currency,//"CLP",
                    AccountCode: g.CategoryCode,//"4-1-02-12-02", 
                    CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,//"MARKETIN",
                    TaxCode: "IVA_EXE",
                    FreeText: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    Text: g.Note,//"Ejemplo contabilización factura boleta electrónica 39",
                    CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code//"SUR-CHI"
                  }
                ]
              }
            }


            )

            this.konvexService.createInvoices(facturaProveedor)
                  
             }

            if (tipoDoc === '33' && category ==='Combustible Viajes'){

            console.log("Combustible Viajes")
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                CardCode: g.ExtraFields.find(field => field.Name === "Proveedor SAP")?.Value,//"P92011000",
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,//"2025-06-16",
                DocType: "dDocument_Service", 
                Comments: g.Note + " Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],//"Carga de combustible con Impuesto Específico",
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value+"3",//"210214",
                Indicator: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,//"33",
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,//"92011000-1",
                DocumentLines: [        
                  {
                    LineNum: "0",
                    ItemDescription: g.Note,//"198 Lts.combustible",
                    AccountCode: g.CategoryCode,//"4-1-02-01-02",
                    LineTotal: g.Net,//"6987",
                    TaxCode: "IVA",      
                    TaxOnly: "tNO"       
                  },
                  {
                    LineNum: "1",
                    ItemDescription: g.Note,//"impuesto especifico",
                    AccountCode: g.CategoryCode,//"4-1-02-01-02", 
                    LineTotal: g.OtherTaxes,//"3685",     
                    TaxCode: "ESP.N.RE",  
                    TaxOnly: "tYES"
                  }
                ]
              }
            }


            )

            this.konvexService.createInvoices(facturaProveedor)
                  
             }

            
                
            }
          }
          catch (error: any ){
            console.log(error)
            return error

  }
  return 
      
}



}


//Pendientes
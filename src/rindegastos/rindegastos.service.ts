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

 async arrangeEntries(dateSince: Date, reportId: string) {
  
    try{
 
    let informesConsultados: ExpenseReport[] = await this.findAll(dateSince, reportId);
    var report = informesConsultados;
   
    var expenses = await this.findExpenses(dateSince, reportId); 

    
    await this.functionPrincipales(expenses, report)

    await new Promise(resolve => setTimeout(resolve, 10000))


  return 'Sincronización finalizada' ;

    } catch (error:any){

      return error

    };
}


  async findAll(dateSince: Date, reportId: string): Promise<ExpenseReport[]> {
    console.log("entro a findall")
    await new Promise(resolve => setTimeout(resolve, 20000))
    try{
        const config: AxiosRequestConfig = {
          method: 'get',
          maxBodyLength: Infinity,
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


async functionPrincipales(expenses: any, report: any){

  try{


      for (var g of expenses['Expenses']) {

            let snSAP = await this.transformarRut(g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value)

            
        
            
     
            await new Promise(resolve => setTimeout(resolve, 20000))

            var tipoDoc = g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code;
            var category = g.Category;
   
     
            if (tipoDoc === 'H'){

        
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push(
              {
                sap: {
                  CardCode: snSAP.resultadoH,
                  DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,
                  DocType: "dDocument_Service",
                  FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                  FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value,
                  Indicator: "97",
                  Comments: "Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],
                  DocumentLines: [
                    {
                      ItemDescription: g.Note,
                      AccountCode: g.CategoryCode,
                      LineTotal: g.Total, 
                      TaxCode: "IVA_EXE",
                      WTLiable: "tYES", 
                      CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,
                      CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code
                    }
                  ],
                  WithholdingTaxDataCollection: [
                    {
                      WTCode: "W1", 
                      TaxableAmount: g.Total
                    }
                  ]
                }
              })

            this.konvexService.createInvoices(facturaProveedor)
                  
             }


            const documentosValidos = ['33'];

            if (documentosValidos.includes(tipoDoc) && category !== 'Combustible Viajes'){

           
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                DocType: "dDocument_Service", 
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value,
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,
                CardCode: snSAP.resultadoP,
                CardName: g.Supplier,
                JournalMemo: g.Note,
                DocTotal: g.Total,
                DocCurrency: g.Currency,
                Comments: "Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],
                Indicator: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,
                DocumentLines: [
                  {
                    ItemDescription: g.Note,
                    Quantity: "1",
                    PriceAfterVAT: g.Total,
                    Currency: g.Currency,
                    AccountCode: g.CategoryCode, 
                    CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,
                    TaxCode: "IVA",
                    FreeText: g.Note,
                    Text: g.Note,
                    CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code
                  }
                ]
              }
            }


            )

            this.konvexService.createInvoices(facturaProveedor)
                  
             }

            const documentosValidos2 = ['34', '39', 'C'];

            if (documentosValidos2.includes(tipoDoc)){

            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                DocType: "dDocument_Service", 
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value,
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,
                CardCode: snSAP.resultadoP,
                JournalMemo: g.Note,
                DocTotal: g.Total,
                DocCurrency: g.Currency,
                Comments: "Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],
                Indicator: '33',
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,
                DocumentLines: [
                  {
                    ItemDescription: g.Note,
                    Quantity: "1",
                    PriceAfterVAT: g.Total,
                    Currency: g.Currency,
                    AccountCode: g.CategoryCode, 
                    CostingCode: g.ExtraFields.find(field => field.Name === "Área")?.Code,
                    TaxCode: "IVA_EXE",
                    FreeText: g.Note,
                    Text: g.Note,
                    CostingCode2: g.ExtraFields.find(field => field.Name === "Zona")?.Code
                  }
                ]
              }
            }


            )

            this.konvexService.createInvoices(facturaProveedor)
                  
             }

            if (tipoDoc === '33' && category ==='Combustible Viajes'){

           
            let facturaProveedor: facturaProveedores[] = [];
              
            facturaProveedor.push({
              sap: {
                CardCode: snSAP.resultadoP,
                DocDate: g.ExtraFields.find(field => field.Name === "Fecha de contabilización")?.Value,
                DocType: "dDocument_Service", 
                Comments: "Rendición N° "+ report['ExpenseReports']['ReportNumber'] + " Rendidor: " + report['ExpenseReports']['Employee']['Name'],
                FolioPrefixString: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                FolioNumber: g.ExtraFields.find(field => field.Name === "Número de Documento")?.Value,
                Indicator: g.ExtraFields.find(field => field.Name === "Tipo de Documento")?.Code,
                FederalTaxID: g.ExtraFields.find(field => field.Name === "RUT Proveedor")?.Value,
                DocumentLines: [        
                  {
                    LineNum: "0",
                    ItemDescription: g.Note,
                    AccountCode: g.CategoryCode,
                    LineTotal: g.Net,
                    TaxCode: "IVA",      
                    TaxOnly: "tNO"       
                  },
                  {
                    LineNum: "1",
                    ItemDescription: g.Note,
                    AccountCode: g.CategoryCode,
                    LineTotal: g.OtherTaxes,     
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
        
            return error

  }
  return 
      
}

async transformarRut(rutProveedor) {
    // Nos aseguramos de que sea sin DV y solo números.
    const soloNumeros = rutProveedor.replace(/[.-]/g, '').slice(0, -1);

    
    const resultadoP = `P${soloNumeros}`;
    const resultadoH = `H${soloNumeros}`;

    return {
        resultadoP,
        resultadoH
    };
}

}



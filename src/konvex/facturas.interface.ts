export interface facturaProveedores {
sap: {
                  DocType?: string,  
                  DocDate?: string,
                  CardCode?: string,
                  CardName?: string,
                  Comments?: string,
                  JournalMemo?: string,
                  DocTotal?: string,
                  DocCurrency?: string,
                  FolioPrefixString?: string,
                  FolioNumber?: string,
                  Indicator?: string,
                  FederalTaxID?: string,
                  DocumentLines?: 
                    {
                      LineNum?: string,
                      TaxOnly?: string,
                      ItemCode?: string,
                      ItemDescription?: string,
                      Quantity?: string,
                      PriceAfterVAT?: string,
                      Currency?: string,
                      FreeText?: string,
                      Text?: string,
                      Price?: string,
                      TaxCode?: string,
                      WarehouseCode?: string,
                      AccountCode?: string,
                      CostingCode?: string,
                      CostingCode2?: string,
                      CostingCode3?: string,
                      CostingCode4?: string,
                      LineTotal?: string,
                      WTLiable?: string
                    }[]
                  ,
                  WithholdingTaxDataCollection?: [
                    {
                      WTCode?: string,
                      TaxableAmount: string
                    }
                  ]
                },
                supplier?: {
                  id?: string,
                  name?: string
                },
                date?: string,
                items?: 
                  {
                    code?: string,
                    quantity?: string,
                    Value?: string,
                    sap?: {
                      AccountCode?: string,
                      TaxCode?: string,
                      ProjectCode?: string
                    }
                  }[]
                


}
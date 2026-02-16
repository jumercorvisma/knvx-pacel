export interface asiento {


    Memo?: string,
    ReferenceDate?: string,
    JournalEntryLines: 
        {
            AccountCode?: string,
            ShortName?: string,
            Debit: string,
            Credit: string,
            LineMemo: string,
            CostingCode?: string,
            CostingCode2?: string,
            CostingCode3?: string,
            CostingCode4?: string,
            ProjectCode?: string
        }[],
    sap?: {
        
        Reference?: string,
        Reference2?: string,
        ReferenceDate?: string
     
    }

    
}
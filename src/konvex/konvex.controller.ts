import { Controller, Get, Post, Body} from '@nestjs/common';
import { KonvexService } from './konvex.service';


@Controller('konvex')
export class KonvexController {
  constructor(private readonly konvexService: KonvexService) {}


  @Get('entries')
  findAllEntriesD() {
    return this.konvexService.findAllEntries();
  }

  @Post('entries')
  createEntries(
    @Body() data: { Memo: string, JournalEntryLines: { AccountCode: string; Credit: string; Debit: string; LineMemo: string, FCCurrency: string, FCCredit: string, FCDebit: string}[], ProjectCode: string, Reference: string, Reference2: string }

  ) {

    return this.konvexService.createEntry(data.Reference, data.Memo, data.JournalEntryLines, data.ProjectCode, data.Reference2);

  }

 

}

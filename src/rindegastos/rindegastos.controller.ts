import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RindegastosService } from './rindegastos.service';

@Controller('rindegastos')
export class RindegastosController {
  constructor(private readonly rindegastosService: RindegastosService) {}


  @Get()
  findAll(@Query('dateSince') dateSince: Date, @Query('reportId') reportId: string ) {
    return this.rindegastosService.findAll(dateSince, reportId);
  }



  @Get('entries') //toma los informes según la fecha desde/hasta, procesa el array para los timeEntries y los manda al servicio de konvex para que se creen 
  getEntries(
    @Query('dateSince') dateSince: Date, 
    @Query('reportId') reportId: string

  ){
    return this.rindegastosService.arrangeEntries(dateSince, reportId);
  }



}

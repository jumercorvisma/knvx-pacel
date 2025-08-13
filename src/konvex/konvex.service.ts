import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { Entries } from './entities/konvex_entries.entity';
import { CreateEntries } from './entities/konvex_entries_create.entity';
import { RindegastosService } from 'src/rindegastos/rindegastos.service';
import { HttpException, HttpStatus } from '@nestjs/common';


@Injectable()
export class KonvexService {


  constructor (
    @Inject(forwardRef(() => RindegastosService)) private readonly rindegastosService: RindegastosService,
  ) {}


  async findAllEntries(): Promise<Entries[]> {
    
    const config: AxiosRequestConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://api.getkonvex.com/core/api/payroll/journal-entries',
      headers: {
          'X-Secret': process.env.X_SECRET,
          'x-software': process.env.X_SOFTWARE, 
          'x-testing': 'true', 
          'accept': 'application/json',
          'x-db': process.env.X_DB,
          'x-user': process.env.X_USER,
          'x-apikey': process.env.X_APIKEY,
          'x-url': process.env.X_URL
      }
    }

    const resp = await axios.request<Entries []>(config)
    return resp.data;
  }

  async createEntry(Reference: string, comentario: string, entries: { Credit: string; Debit: string; LineMemo: string, ProjectCode?: string, FCCurrency?: string, FCCredit?: string, FCDebit?: string, ShortName?: string, AccountCode?: string, CostingCode?: string;}[], ProjectCode?: string, Reference2?: string, Origin?: string): Promise<CreateEntries[]> {
   try{


        const config: AxiosRequestConfig = {

          method: 'post',
          maxBodyLength: Infinity,
          url: 'https://api.getkonvex.com/core/api/payroll/journal-entries',
          headers: {

            'X-Secret': process.env.X_SECRET,
            'x-software': process.env.X_SOFTWARE, 
            'x-testing': 'true', 
            'accept': 'application/json',
            'x-db': process.env.X_DB,
            'x-user': process.env.X_USER,
            'x-apikey': process.env.X_APIKEY,
            'x-url': process.env.X_URL
          },
          data: {Memo: comentario,JournalEntryLines: entries, sap: { ProjectCode: ProjectCode, Reference: Reference, Reference2: Reference2 }
           }

        };
        console.log('esta es la entrada que se va a crear' + config.data)
        const resp = await axios.request<CreateEntries[]>(config)
        let transactionNumber = resp.data['data']['id']
        if (Origin === '1') {
        const syncSuccess = await this.rindegastosService.setIntegrationStatus(Reference,transactionNumber)
        }
        const op = await this.rindegastosService.setIntegrationMessage(Reference, "Integrado con éxito " + comentario, "Integrado")
        return resp.data['data']
  
      } catch (error: any){
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (error?.response?.data?.error?.detail?.data?.message) {
         let userMessage = error.response.data.error.detail.data.message;
         console.log("hola, ocurrió un error al crear el asiento en SAP " + userMessage+errorMessage );
         console.log("antes de enviar el mensaje");
         const op = await this.rindegastosService.setIntegrationMessage(Reference, "Ocurrió un error al crear el asiento en SAP: " + userMessage, "Error al integrar")
         console.log("después de enviar el mensaje", op);

        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: userMessage || 'Error desconocido en SAP',
            detail: error.response.data,
          },
          HttpStatus.BAD_REQUEST
        );
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error inesperado al crear asiento en SAP',
            detail: errorMessage,
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      };
    }
  }






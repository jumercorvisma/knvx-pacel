import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { RindegastosService } from 'src/rindegastos/rindegastos.service';
import { facturaProveedores } from './facturas.interface';


@Injectable()
export class KonvexService {


  constructor (
    @Inject(forwardRef(() => RindegastosService)) private readonly rindegastosService: RindegastosService,
  ) {}



  async createInvoices(facturaProveedor: facturaProveedores[]): Promise<facturaProveedores[]> {

    console.log("entró en la función dónde se crean facturas")


    try {
        const config: AxiosRequestConfig = {

          method: 'post',
          maxBodyLength: Infinity,
          url: 'https://api.getkonvex.com/core/api/purchases/invoices',
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
          data: facturaProveedor[0]

           }

           

        let resp = await axios.request<facturaProveedores[]>(config)

        console.log(resp.data)

        
        return resp.data

        }



      catch (error: any) {



  console.log(error)
 
      

      return error


    }

  }


}




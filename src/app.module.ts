import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RindegastosModule } from './rindegastos/rindegastos.module';
import { KonvexModule } from './konvex/konvex.module';


@Module({
  imports: [RindegastosModule, KonvexModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

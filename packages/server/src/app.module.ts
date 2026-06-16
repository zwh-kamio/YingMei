import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { UploadModule } from './modules/upload/upload.module';
import { MaterialModule } from './modules/material/material.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get('DB_TYPE', 'sqlite');
        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: 'data/yingmei.db',
            autoLoadEntities: true,
            synchronize: true,
            logging: false,
          };
        }
        return {
          type: 'mysql',
          host: config.get('MYSQL_HOST', 'localhost'),
          port: config.get<number>('MYSQL_PORT', 3306),
          username: config.get('MYSQL_USER', 'root'),
          password: config.get('MYSQL_PASSWORD', 'yingmei123'),
          database: config.get('MYSQL_DATABASE', 'yingmei'),
          autoLoadEntities: true,
          synchronize: true, // 开发环境自动建表
          logging: false,
          timezone: '+08:00',
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', '') || undefined,
          ttl: 3600,
        }),
      }),
    }),
    AuthModule,
    UserModule,
    UploadModule,
    MaterialModule,
    AiModule,
  ],
})
export class AppModule {}

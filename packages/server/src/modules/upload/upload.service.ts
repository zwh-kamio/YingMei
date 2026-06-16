import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

export interface StsCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  stsToken: string;
  expiration: string;
}

export interface UploadTokenResponse {
  credentials: StsCredentials;
  region: string;
  bucket: string;
  endpoint: string;
  key: string;
  callback: Record<string, unknown>;
}

@Injectable()
export class UploadService {
  private ossClient: OSS;

  constructor(private config: ConfigService) {
    this.ossClient = new OSS({
      region: config.get('OSS_REGION', 'oss-cn-hangzhou'),
      accessKeyId: config.get('OSS_ACCESS_KEY_ID', ''),
      accessKeySecret: config.get('OSS_ACCESS_KEY_SECRET', ''),
      bucket: config.get('OSS_BUCKET', 'yingmei-dev'),
    });
  }

  /**
   * 签发临时上传凭证（STS方式）
   * 生产环境应使用 RAM 角色签发 STS，这里先使用主账号 AK 直接签名
   */
  async getUploadToken(type: string = 'image'): Promise<UploadTokenResponse> {
    const config = this.config;
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const key = `uploads/${type}/${dateStr}/${uuidv4()}.${type === 'avatar' ? 'jpg' : 'png'}`;

    // 使用 OSS SDK 生成签名 URL 作为上传凭证
    // 简化方案：返回直传需要的参数
    const policy = {
      expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
      conditions: [
        ['content-length-range', 0, 50 * 1024 * 1024], // 最大 50MB
        ['starts-with', '$key', `uploads/${type}/`],
      ],
    };

    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');
    const signature = this.signPolicy(policyBase64, config.get('OSS_ACCESS_KEY_SECRET', ''));

    return {
      credentials: {
        accessKeyId: config.get('OSS_ACCESS_KEY_ID', ''),
        accessKeySecret: config.get('OSS_ACCESS_KEY_SECRET', ''),
        stsToken: '',
        expiration: policy.expiration,
      },
      region: config.get('OSS_REGION', 'oss-cn-hangzhou'),
      bucket: config.get('OSS_BUCKET', 'yingmei-dev'),
      endpoint: config.get('OSS_ENDPOINT', 'https://oss-cn-hangzhou.aliyuncs.com'),
      key,
      callback: {
        url: '',
        body: '',
      },
    };
  }

  /**
   * 生成 OSS 签名 URL（私有 bucket 访问用）
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.ossClient.signatureUrl(key, { expires: expiresIn });
  }

  private signPolicy(policyBase64: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha1', secret).update(policyBase64).digest('base64');
  }
}

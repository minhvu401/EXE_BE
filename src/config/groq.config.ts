import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export const geminiProvider = {
  provide: 'GEMINI_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new GoogleGenAI({
      apiKey: configService.get<string>('GEMINI_API_KEY'),
    });
  },
};

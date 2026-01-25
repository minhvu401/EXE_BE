/* eslint-disable prettier/prettier */
import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { GetClubRecommendationDto } from './dto/get-club-recommendation.dto';

export interface ClubRecommendation {
  clubName: string;
  reason: string;
  matchScore: number;
  relevantSkills: string[];
  relevantInterests: string[];
}

interface Club {
  fullName: string;
  category: string;
  description?: string;
  skills?: string[];
  interests?: string[];
  socialLink?: string;
}

@Injectable()
export class RecommendationService {
  constructor(
    @Inject('GEMINI_CLIENT') private geminiClient: GoogleGenAI,
    @InjectModel('User') private userModel: Model<Club>,
  ) {}

  async getClubRecommendations(
    dto: GetClubRecommendationDto,
  ): Promise<ClubRecommendation[]> {
    const limit = dto.limit || 5;

    // Lấy tất cả các câu lạc bộ từ database
    const clubs = await this.userModel.find(
      { category: { $exists: true } },
      {
        fullName: 1,
        category: 1,
        description: 1,
        skills: 1,
        interests: 1,
        socialLink: 1,
      },
    );

    if (clubs.length === 0) {
      return [];
    }

    // Chuẩn bị prompt cho OpenAI
    const clubsInfo = clubs
      .map(
        (club) =>
          `- Tên: ${club.fullName || 'N/A'}
      Danh mục: ${club.category || 'N/A'}
      Mô tả: ${club.description || 'N/A'}
      Kỹ năng liên quan: ${(club.skills || []).join(', ') || 'N/A'}
      Sở thích: ${(club.interests || []).join(', ') || 'N/A'}`,
      )
      .join('\n\n');

    const prompt = `Bạn là một trợ lý thông minh để gợi ý câu lạc bộ phù hợp.

Thông tin người dùng:
- Kỹ năng: ${dto.skills.join(', ')}
- Sở thích: ${dto.interests.join(', ')}
${dto.additionalInfo ? `- Thông tin bổ sung: ${dto.additionalInfo}` : ''}

Danh sách các câu lạc bộ:
${clubsInfo}

Dựa trên thông tin người dùng, hãy gợi ý ${limit} câu lạc bộ phù hợp nhất.
Trả lời bằng JSON với định dạng sau:
[
  {
    "clubName": "Tên câu lạc bộ",
    "reason": "Lý do tại sao câu lạc bộ này phù hợp (1-2 câu)",
    "matchScore": 85,
    "relevantSkills": ["kỹ năng phù hợp"],
    "relevantInterests": ["sở thích phù hợp"]
  }
]

Chỉ trả lại JSON, không có lời giải thích khác.`;

    try {
      const response = await this.geminiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const content = response.text || '[]';

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const recommendations: ClubRecommendation[] = JSON.parse(
        jsonMatch[0],
      ) as ClubRecommendation[];

      // Validate và filter response
      return recommendations
        .filter(
          (rec) =>
            rec.clubName && rec.reason && typeof rec.matchScore === 'number',
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Failed to get club recommendations');
    }
  }

  async getDetailedRecommendation(
    clubName: string,
    userSkills: string[],
    userInterests: string[],
  ): Promise<string> {
    const club = await this.userModel.findOne(
      { fullName: clubName, category: { $exists: true } },
      {
        fullName: 1,
        category: 1,
        description: 1,
        skills: 1,
        interests: 1,
        socialLink: 1,
      },
    );

    if (!club) {
      throw new Error('Club not found');
    }

    const prompt = `Hãy viết một mô tả chi tiết về lý do tại sao câu lạc bộ "${club.fullName}" (${club.category}) lại phù hợp với một người có:
- Kỹ năng: ${userSkills.join(', ')}
- Sở thích: ${userInterests.join(', ')}

Thông tin câu lạc bộ:
- Mô tả: ${club.description || 'N/A'}
- Kỹ năng liên quan: ${(club.skills || []).join(', ') || 'N/A'}
- Sở thích: ${(club.interests || []).join(', ') || 'N/A'}

Viết một đoạn văn 2-3 câu giải thích sự phù hợp.`;

    try {
      const response = await this.geminiClient.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to get detailed recommendation');
    }
  }
}

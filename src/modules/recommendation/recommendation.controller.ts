/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { GetClubRecommendationDto } from './dto/get-club-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PaymentGuard } from '../payment/guards/payment.guard';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('/clubs')
  @UseGuards(JwtAuthGuard, PaymentGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Gợi ý câu lạc bộ phù hợp dựa trên kỹ năng và sở thích',
    description:
      'Sử dụng AI để gợi ý các câu lạc bộ phù hợp nhất dựa trên kỹ năng và sở thích của người dùng',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách các câu lạc bộ được gợi ý với điểm phù hợp và lý do',
    example: [
      {
        clubName: 'Tech Club',
        reason: 'Câu lạc bộ công nghệ phù hợp với kỹ năng lập trình của bạn',
        matchScore: 92,
        relevantSkills: ['JavaScript', 'React'],
        relevantInterests: ['Technology', 'Programming'],
      },
    ],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Cần token JWT' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Dữ liệu đầu vào không hợp lệ',
  })
  @HttpCode(HttpStatus.OK)
  async getClubRecommendations(
    @Body() dto: GetClubRecommendationDto,
  ): Promise<any> {
    return await this.recommendationService.getClubRecommendations(dto);
  }

  @Get('/clubs/:clubName/details')
  @UseGuards(JwtAuthGuard, PaymentGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Lấy chi tiết lý do gợi ý cho một câu lạc bộ cụ thể',
    description:
      'Nhận mô tả chi tiết về lý do tại sao một câu lạc bộ phù hợp với bạn',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết về sự phù hợp của câu lạc bộ',
    schema: {
      example:
        'Câu lạc bộ này phù hợp với bạn vì nó tập trung vào công nghệ web và bạn có kỹ năng JavaScript và React...',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Club not found - Không tìm thấy câu lạc bộ',
  })
  @HttpCode(HttpStatus.OK)
  async getDetailedRecommendation(
    @Param('clubName') clubName: string,
    @Body('skills') skills: string[],
    @Body('interests') interests: string[],
  ): Promise<any> {
    return {
      clubName,
      detail: await this.recommendationService.getDetailedRecommendation(
        clubName,
        skills,
        interests,
      ),
    };
  }
}

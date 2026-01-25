import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 50000,
    description: 'Số tiền thanh toán (VND)',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'Thanh toán gói AI Premium',
    description: 'Mô tả đơn hàng',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 'ai-premium-monthly',
    description: 'Loại gói thanh toán',
    required: false,
  })
  @IsOptional()
  @IsString()
  packageType?: string;
}

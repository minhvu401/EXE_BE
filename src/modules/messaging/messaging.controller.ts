/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Messaging')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message to another user' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count for current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(
    @Request() req: ExpressRequest & { user: { id: string } },
  ) {
    const unreadCount = await this.messagingService.getUnreadCount(req.user.id);
    return { unreadCount };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async getConversations(@Request() req, @Query() query: GetConversationsDto) {
    return this.messagingService.getConversations(req.user.id, query);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversationById(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getConversationById(
      conversationId,
      req.user.id,
    );
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      req.user.id,
      query,
    );
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiResponse({ status: 200, description: 'Message retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageById(@Param('messageId') messageId: string) {
    return this.messagingService.getMessageById(messageId);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Update a message (edit)' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagingService.updateMessage(
      messageId,
      req.user.id,
      updateMessageDto,
    );
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markMessageAsRead(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markMessageAsRead(messageId, req.user.id);
  }

  @Patch('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  @ApiResponse({ status: 200, description: 'All messages marked as read' })
  async markConversationAsRead(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
  ) {
    await this.messagingService.markConversationMessagesAsRead(
      conversationId,
      req.user.id,
    );
    return { message: 'All messages in conversation marked as read' };
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation and all its messages' })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully',
  })
  async deleteConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    await this.messagingService.deleteConversation(conversationId, req.user.id);
  }
}

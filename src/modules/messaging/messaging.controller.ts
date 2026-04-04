/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  AddMembersDto,
  RemoveMemberDto,
  UpdateConversationDto,
} from './dto/manage-group.dto';
import { AddReactionDto, RemoveReactionDto } from './dto/reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Messaging')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ==================== CONVERSATION ENDPOINTS ====================

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation (direct or group)' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  async createConversation(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(
      req.user.id,
      createConversationDto,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async getConversations(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query() query: GetConversationsDto,
  ) {
    return this.messagingService.getConversations(req.user.id, query);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
  })
  async getConversationById(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getConversationById(
      conversationId,
      req.user.id,
    );
  }

  @Patch('conversations/:conversationId')
  @ApiOperation({ summary: 'Update conversation info (name, description)' })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
  })
  async updateConversation(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.messagingService.updateConversation(
      conversationId,
      req.user.id,
      updateConversationDto,
    );
  }

  @Post('conversations/:conversationId/members')
  @ApiOperation({ summary: 'Add members to a group conversation' })
  @ApiResponse({
    status: 200,
    description: 'Members added successfully',
  })
  async addMembers(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
    @Body() addMembersDto: AddMembersDto,
  ) {
    return this.messagingService.addMembers(
      conversationId,
      req.user.id,
      addMembersDto,
    );
  }

  @Delete('conversations/:conversationId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a group conversation' })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  async removeMember(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.messagingService.removeMember(conversationId, req.user.id, {
      memberId,
    });
  }

  @Post('conversations/:conversationId/mute')
  @ApiOperation({ summary: 'Mute a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation muted successfully',
  })
  async muteConversation(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.muteConversation(conversationId, req.user.id);
  }

  @Post('conversations/:conversationId/unmute')
  @ApiOperation({ summary: 'Unmute a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation unmuted successfully',
  })
  async unmuteConversation(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.unmuteConversation(
      conversationId,
      req.user.id,
    );
  }

  // ==================== MESSAGE ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message (or reply) in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Request() req: ExpressRequest & { user: { id: string } },
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
  async getMessageById(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.getMessageById(messageId, req.user.id);
  }

  @Get(':messageId/replies')
  @ApiOperation({ summary: 'Get replies to a specific message' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  async getReplies(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService.getReplies(messageId, req.user.id, query);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Update/edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagingService.updateMessage(
      messageId,
      req.user.id,
      updateMessageDto,
    );
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  async deleteMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    await this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markMessageAsRead(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markMessageAsRead(messageId, req.user.id);
  }

  @Patch('conversations/:conversationId/read-all')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'All messages marked as read' })
  @HttpCode(HttpStatus.OK)
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

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count for current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(
    @Request() req: ExpressRequest & { user: { id: string } },
  ) {
    const unreadCount = await this.messagingService.getUnreadCount(req.user.id);
    return { unreadCount };
  }

  // ==================== MESSAGE FEATURES: PINNING ====================

  @Post(':messageId/pin')
  @ApiOperation({ summary: 'Pin a message' })
  @ApiResponse({ status: 200, description: 'Message pinned successfully' })
  async pinMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.pinMessage(messageId, req.user.id);
  }

  @Post(':messageId/unpin')
  @ApiOperation({ summary: 'Unpin a message' })
  @ApiResponse({ status: 200, description: 'Message unpinned successfully' })
  async unpinMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.unpinMessage(messageId, req.user.id);
  }

  @Get('conversations/:conversationId/pinned')
  @ApiOperation({ summary: 'Get all pinned messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Pinned messages retrieved' })
  async getPinnedMessages(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getPinnedMessages(conversationId, req.user.id);
  }

  // ==================== MESSAGE FEATURES: REACTIONS ====================

  @Post(':messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiResponse({ status: 200, description: 'Reaction added successfully' })
  async addReaction(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
    @Body() addReactionDto: AddReactionDto,
  ) {
    return this.messagingService.addReaction(
      messageId,
      req.user.id,
      addReactionDto,
    );
  }

  @Delete(':messageId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('messageId') messageId: string,
    @Body() removeReactionDto: RemoveReactionDto,
  ) {
    return this.messagingService.removeReaction(
      messageId,
      req.user.id,
      removeReactionDto,
    );
  }

  // ==================== SEARCH ====================

  @Get('conversations/:conversationId/search')
  @ApiOperation({ summary: 'Search messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchMessages(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('conversationId') conversationId: string,
    @Query('q') searchTerm: string,
  ) {
    return this.messagingService.searchMessages(
      conversationId,
      req.user.id,
      searchTerm,
    );
  }
}

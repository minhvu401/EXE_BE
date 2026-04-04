/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { Conversation } from './schemas/conversation.schema';
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

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
  ) {}

  // ==================== CONVERSATION METHODS ====================

  /**
   * Create a new conversation (group or direct)
   */
  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const userObjectId = new Types.ObjectId(userId);
    const participantIds = createConversationDto.participantIds.map(
      (id) => new Types.ObjectId(id),
    );

    // Ensure user is part of participants
    if (!participantIds.some((id) => id.toString() === userId)) {
      throw new BadRequestException(
        'You must be a participant in the conversation',
      );
    }

    // Check for duplicates in participant list
    const uniqueParticipants = Array.from(
      new Set(participantIds.map((id) => id.toString())),
    ).map((id) => new Types.ObjectId(id));

    if (uniqueParticipants.length < 2) {
      throw new BadRequestException('At least 2 participants are required');
    }

    // For direct conversations, check if already exists
    if (uniqueParticipants.length === 2) {
      const existing = await this.conversationModel.findOne({
        participants: { $all: uniqueParticipants },
        type: 'direct',
      });

      if (existing) {
        return existing;
      }
    }

    const conversation = await this.conversationModel.create({
      name: createConversationDto.name,
      description: createConversationDto.description,
      participants: uniqueParticipants,
      type: uniqueParticipants.length === 2 ? 'direct' : 'group',
      createdBy: userObjectId,
    });

    return conversation.populate('participants', 'fullName avatarUrl email');
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(
    userId: string,
    query: GetConversationsDto,
  ): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const skip = (page - 1) * limit;

    const userObjectId = new Types.ObjectId(userId);

    const [data, total] = await Promise.all([
      this.conversationModel
        .find({ participants: userObjectId })
        .populate('participants', 'fullName avatarUrl email')
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderId', select: 'fullName' },
        })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments({ participants: userObjectId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a specific conversation
   */
  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    await conversation.populate([
      { path: 'participants', select: 'fullName avatarUrl email role' },
      {
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'fullName' },
      },
    ]);

    return conversation;
  }

  /**
   * Update conversation info (name, description)
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    if (conversation.type !== 'group') {
      throw new BadRequestException(
        'Cannot update direct message conversation',
      );
    }

    if (updateConversationDto.name) {
      conversation.name = updateConversationDto.name;
    }
    if (updateConversationDto.description) {
      conversation.description = updateConversationDto.description;
    }

    return (await conversation.save()).populate(
      'participants',
      'fullName avatarUrl email',
    );
  }

  /**
   * Add members to a group conversation
   */
  async addMembers(
    conversationId: string,
    userId: string,
    addMembersDto: AddMembersDto,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    if (conversation.type !== 'group') {
      throw new BadRequestException('Cannot add members to a direct message');
    }

    const memberIds = addMembersDto.memberIds.map(
      (id) => new Types.ObjectId(id),
    );

    // Add only new members
    for (const memberId of memberIds) {
      if (
        !conversation.participants.some(
          (p) => p.toString() === memberId.toString(),
        )
      ) {
        conversation.participants.push(memberId);
      }
    }

    return (await conversation.save()).populate(
      'participants',
      'fullName avatarUrl email',
    );
  }

  /**
   * Remove a member from a group conversation
   */
  async removeMember(
    conversationId: string,
    userId: string,
    removeMemberDto: RemoveMemberDto,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    if (conversation.type !== 'group') {
      throw new BadRequestException(
        'Cannot remove members from a direct message',
      );
    }

    const memberIdToRemove = new Types.ObjectId(removeMemberDto.memberId);

    // Allow users to remove themselves, or creator to remove others
    if (
      userId !== removeMemberDto.memberId &&
      conversation.createdBy?.toString() !== userId
    ) {
      throw new ForbiddenException(
        'Only group creator can remove other members',
      );
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== memberIdToRemove.toString(),
    );

    if (conversation.participants.length < 2) {
      throw new BadRequestException('Group must have at least 2 members');
    }

    return (await conversation.save()).populate(
      'participants',
      'fullName avatarUrl email',
    );
  }

  /**
   * Mute a conversation
   */
  async muteConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!conversation.mutedBy) {
      conversation.mutedBy = [];
    }
    if (!conversation.mutedBy.includes(userObjectId)) {
      conversation.mutedBy.push(userObjectId);
    }

    return await conversation.save();
  }

  /**
   * Unmute a conversation
   */
  async unmuteConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    if (conversation.mutedBy) {
      conversation.mutedBy = conversation.mutedBy.filter(
        (id) => id.toString() !== userId,
      );
    }

    return await conversation.save();
  }

  // ==================== MESSAGE METHODS ====================

  /**
   * Send a message (text, reply, or with attachments)
   */
  async sendMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const senderObjectId = new Types.ObjectId(senderId);
    const conversationObjectId = new Types.ObjectId(
      createMessageDto.conversationId,
    );

    // Verify conversation exists and user is a participant
    const conversation =
      await this.conversationModel.findById(conversationObjectId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation?.participants.some((p) => p.toString() === senderId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // If this is a reply, verify parent message exists
    if (createMessageDto.parentMessageId) {
      const parentMessage = await this.messageModel.findById(
        createMessageDto.parentMessageId,
      );
      if (!parentMessage) {
        throw new NotFoundException('Parent message not found');
      }
    }

    // Create message
    const message = await this.messageModel.create({
      senderId: senderObjectId,
      conversationId: conversationObjectId,
      content: createMessageDto.content,
      parentMessageId: createMessageDto.parentMessageId
        ? new Types.ObjectId(createMessageDto.parentMessageId)
        : undefined,
      attachments: createMessageDto.attachments || [],
    });

    // Update conversation with last message
    await this.conversationModel.findByIdAndUpdate(conversationObjectId, {
      lastMessage: message._id,
      lastMessageContent: message.content,
      lastMessageSenderId: senderObjectId,
      lastMessageAt: new Date(),
    });

    return message.populate('senderId', 'fullName avatarUrl email');
  }

  /**
   * Get messages in a conversation (with pagination)
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesDto,
  ): Promise<{
    data: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          isDeleted: { $ne: true },
        })
        .populate('senderId', 'fullName avatarUrl email')
        .populate({
          path: 'parentMessageId',
          populate: { path: 'senderId', select: 'fullName avatarUrl email' },
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get replies to a specific message
   */
  async getReplies(
    messageId: string,
    userId: string,
    query: GetMessagesDto,
  ): Promise<{
    data: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const parentMessage = await this.messageModel.findById(messageId);
    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    // Verify user has access to the conversation
    const conversation = await this.conversationModel.findById(
      parentMessage.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find({
          parentMessageId: new Types.ObjectId(messageId),
          isDeleted: { $ne: true },
        })
        .populate('senderId', 'fullName avatarUrl email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      this.messageModel.countDocuments({
        parentMessageId: new Types.ObjectId(messageId),
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a specific message
   */
  async getMessageById(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'fullName avatarUrl email')
      .populate({
        path: 'parentMessageId',
        populate: { path: 'senderId', select: 'fullName avatarUrl email' },
      });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to this message's conversation
    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException('You do not have access to this message');
    }

    return message;
  }

  /**
   * Update (edit) a message
   */
  async updateMessage(
    messageId: string,
    userId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = updateMessageDto.content;
    message.editedAt = new Date();

    return message.save();
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isRead = true;
    message.readAt = new Date();

    return message.save();
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversationObjectId = new Types.ObjectId(conversationId);

    // Verify user is participant
    const conversation =
      await this.conversationModel.findById(conversationObjectId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    await this.messageModel.updateMany(
      {
        conversationId: conversationObjectId,
        isDeleted: { $ne: true },
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      isRead: false,
      isDeleted: { $ne: true },
    });
  }

  // ==================== MESSAGE FEATURES ====================

  /**
   * Pin a message
   */
  async pinMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is in the conversation
    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    message.isPinned = true;
    message.pinnedAt = new Date();
    message.pinnedBy = new Types.ObjectId(userId);

    return message.save();
  }

  /**
   * Unpin a message
   */
  async unpinMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is in the conversation
    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    message.isPinned = false;
    message.pinnedAt = undefined;
    message.pinnedBy = undefined;

    return message.save();
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    addReactionDto: AddReactionDto,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const userObjectId = new Types.ObjectId(userId);

    // Initialize reactions if not exists
    if (!message.reactions) {
      message.reactions = [];
    }

    // Find or create reaction
    const reactionIndex = message.reactions.findIndex(
      (r) => r.emoji === addReactionDto.emoji,
    );

    if (reactionIndex !== -1) {
      // Add user to existing reaction if not already there
      if (
        !message.reactions[reactionIndex].users.some(
          (u) => u.toString() === userId,
        )
      ) {
        message.reactions[reactionIndex].users.push(userObjectId);
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji: addReactionDto.emoji,
        users: [userObjectId],
      });
    }

    return message.save();
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    removeReactionDto: RemoveReactionDto,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Initialize reactions if not exists
    if (!message.reactions) {
      message.reactions = [];
    }

    const reactionIndex = message.reactions.findIndex(
      (r) => r.emoji === removeReactionDto.emoji,
    );

    if (reactionIndex !== -1) {
      message.reactions[reactionIndex].users = message.reactions[
        reactionIndex
      ].users.filter((u) => u.toString() !== userId);

      // Remove reaction if no users left
      if (message.reactions[reactionIndex].users.length === 0) {
        message.reactions.splice(reactionIndex, 1);
      }
    }

    return message.save();
  }

  /**
   * Get pinned messages in a conversation
   */
  async getPinnedMessages(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    return this.messageModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
        isPinned: true,
        isDeleted: { $ne: true },
      })
      .populate('senderId', 'fullName avatarUrl email')
      .populate('pinnedBy', 'fullName')
      .sort({ pinnedAt: -1 });
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    searchTerm: string,
  ): Promise<Message[]> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    return this.messageModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
        isDeleted: { $ne: true },
        content: { $regex: searchTerm, $options: 'i' },
      })
      .populate('senderId', 'fullName avatarUrl email')
      .sort({ createdAt: -1 })
      .limit(50);
  }
}

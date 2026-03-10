import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { Conversation } from './schemas/conversation.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
  ) {}

  async sendMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    if (senderId === createMessageDto.recipientId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    const senderObjectId = new Types.ObjectId(senderId);
    const recipientObjectId = new Types.ObjectId(createMessageDto.recipientId);

    // Find or create conversation
    let conversation = await this.conversationModel.findOne({
      participants: {
        $all: [senderObjectId, recipientObjectId],
      },
    });

    if (!conversation) {
      conversation = await this.conversationModel.create({
        participants: [senderObjectId, recipientObjectId],
      });
    }

    // Create message
    const message = await this.messageModel.create({
      senderId: senderObjectId,
      recipientId: recipientObjectId,
      conversationId: conversation._id,
      content: createMessageDto.content,
    });

    // Update conversation with last message
    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastMessageContent: message.content,
      lastMessageSenderId: senderObjectId,
      lastMessageAt: new Date(),
    });

    return message.populate(['senderId', 'recipientId']);
  }

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
        .populate('lastMessage')
        .populate('lastMessageSenderId', 'fullName')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec() as Promise<Conversation[]>,
      this.conversationModel.countDocuments({ participants: userObjectId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!conversation.participants.some((p) => p.equals(userObjectId))) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    // Populate after verification
    await conversation.populate([
      { path: 'participants', select: 'fullName avatarUrl email' },
      { path: 'lastMessage' },
    ]);

    return conversation;
  }

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
    // Verify user is part of conversation
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!conversation.participants.some((p) => p.equals(userObjectId))) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId) })
        .populate('senderId', 'fullName avatarUrl email')
        .populate('recipientId', 'fullName avatarUrl email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      this.messageModel.countDocuments({
        conversationId: new Types.ObjectId(conversationId),
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getMessageById(messageId: string): Promise<Message> {
    const message = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'fullName avatarUrl email')
      .populate('recipientId', 'fullName avatarUrl email');

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message.toObject() as Message;
  }

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
      throw new BadRequestException('You can only edit your own messages');
    }

    message.content = updateMessageDto.content;
    message.editedAt = new Date();

    return (await message.save()).toObject() as Message;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    await this.messageModel.findByIdAndDelete(messageId);
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.recipientId.toString() !== userId) {
      throw new BadRequestException(
        'You can only mark your received messages as read',
      );
    }

    message.isRead = true;
    message.readAt = new Date();

    return (await message.save()).toObject() as Message;
  }

  async markConversationMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const conversationObjectId = new Types.ObjectId(conversationId);

    await this.messageModel.updateMany(
      {
        conversationId: conversationObjectId,
        recipientId: userObjectId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);

    return this.messageModel.countDocuments({
      recipientId: userObjectId,
      isRead: false,
    });
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    if (!conversation.participants.some((p) => p.equals(userObjectId))) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    // Delete all messages in conversation
    await this.messageModel.deleteMany({
      conversationId: new Types.ObjectId(conversationId),
    });

    // Delete conversation
    await this.conversationModel.findByIdAndDelete(conversationId);
  }

  async searchConversation(
    userId: string,
    otherUserName: string,
  ): Promise<Conversation | null> {
    const conversation = await this.conversationModel
      .findOne({
        participants: new Types.ObjectId(userId),
      })
      .populate('participants');

    if (!conversation) {
      return null;
    }

    interface Participant {
      _id: Types.ObjectId;
      fullName: string;
    }

    const otherUser = (
      conversation.participants as unknown as Participant[]
    ).find(
      (p) =>
        p._id.toString() !== userId &&
        p.fullName.toLowerCase().includes(otherUserName.toLowerCase()),
    );

    return otherUser ? conversation : null;
  }
}

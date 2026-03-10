import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getModelToken } from '@nestjs/mongoose';
import { Message } from './schemas/message.schema';
import { Conversation } from './schemas/conversation.schema';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockMessageModel: any;
  let mockConversationModel: any;

  const senderId = new Types.ObjectId().toString();
  const recipientId = new Types.ObjectId().toString();
  const conversationId = new Types.ObjectId();
  const messageId = new Types.ObjectId();

  beforeEach(async () => {
    mockMessageModel = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockConversationModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const createMessageDto = {
        recipientId: recipientId,
        content: 'Test message',
      };

      const senderObjectId = new Types.ObjectId(senderId);
      const recipientObjectId = new Types.ObjectId(recipientId);

      mockConversationModel.findOne.mockResolvedValue(null);
      mockConversationModel.create.mockResolvedValue({
        _id: conversationId,
        participants: [senderObjectId, recipientObjectId],
      });

      mockMessageModel.create.mockResolvedValue({
        _id: messageId,
        senderId: senderObjectId,
        recipientId: recipientObjectId,
        conversationId: conversationId,
        content: 'Test message',
        populate: jest.fn().mockResolvedValue({
          _id: messageId,
          senderId: { _id: senderObjectId, fullName: 'Sender' },
          recipientId: { _id: recipientObjectId, fullName: 'Recipient' },
          conversationId: conversationId,
          content: 'Test message',
        }),
      });

      mockConversationModel.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.sendMessage(senderId, createMessageDto);

      expect(result).toBeDefined();
      expect(mockConversationModel.findOne).toHaveBeenCalled();
      expect(mockMessageModel.create).toHaveBeenCalled();
    });

    it('should throw error when sending message to yourself', async () => {
      const createMessageDto = {
        recipientId: senderId,
        content: 'Test message',
      };

      await expect(
        service.sendMessage(senderId, createMessageDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConversations', () => {
    it('should get conversations for user', async () => {
      const senderObjectId = new Types.ObjectId(senderId);
      const mockConversations = [
        {
          _id: conversationId,
          participants: [senderObjectId],
          lastMessage: null,
        },
      ];

      mockConversationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockConversations),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      mockConversationModel.countDocuments.mockResolvedValue(1);

      const result = await service.getConversations(senderId, {
        page: 1,
        limit: 15,
      });

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockConversations);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('getConversationById', () => {
    it('should get conversation by id', async () => {
      const senderObjectId = new Types.ObjectId(senderId);
      const recipientObjectId = new Types.ObjectId(recipientId);

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        participants: [senderObjectId, recipientObjectId],
        populate: jest.fn().mockResolvedValue({
          _id: conversationId,
          participants: [
            { _id: senderObjectId, fullName: 'Sender' },
            { _id: recipientObjectId, fullName: 'Recipient' },
          ],
        }),
      });

      const result = await service.getConversationById(
        conversationId.toString(),
        senderId,
      );

      expect(result).toBeDefined();
      expect(mockConversationModel.findById).toHaveBeenCalledWith(
        conversationId.toString(),
      );
    });

    it('should throw NotFoundException when conversation not found', async () => {
      mockConversationModel.findById.mockResolvedValue(null);

      await expect(
        service.getConversationById(conversationId.toString(), senderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not participant', async () => {
      const otherUserId = new Types.ObjectId();
      const senderObjectId = new Types.ObjectId(senderId);

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        participants: [senderObjectId],
      });

      await expect(
        service.getConversationById(
          conversationId.toString(),
          otherUserId.toString(),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should get messages in conversation', async () => {
      const senderObjectId = new Types.ObjectId(senderId);
      const recipientObjectId = new Types.ObjectId(recipientId);

      mockConversationModel.findById.mockResolvedValue({
        _id: conversationId,
        participants: [senderObjectId, recipientObjectId],
      });

      const mockMessages = [
        {
          _id: messageId,
          senderId: senderObjectId,
          recipientId: recipientObjectId,
          content: 'Test',
        },
      ];

      mockMessageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockMessages),
              }),
            }),
          }),
        }),
      });

      mockMessageModel.countDocuments.mockResolvedValue(1);

      const result = await service.getMessages(
        conversationId.toString(),
        senderId,
        { page: 1, limit: 20 },
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockMessages);
      expect(result.total).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread message count', async () => {
      mockMessageModel.countDocuments.mockResolvedValue(5);

      const result = await service.getUnreadCount(senderId);

      expect(result).toBe(5);
      expect(mockMessageModel.countDocuments).toHaveBeenCalledWith({
        recipientId: expect.any(Types.ObjectId),
        isRead: false,
      });
    });
  });
});

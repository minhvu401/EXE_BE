import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Messaging Module E2E Tests', () => {
  let app: INestApplication;
  const authToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTIyYjQ2ZTZiZTUzMDcwZmU5MmZkMjEiLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MzE0ODU0MiwiZXhwIjoxNzczMjM0OTQyfQ.vtNy80C2Z8b5KByigPINsoFLkQoksdx1AgqSpvSrx04';
  const recipientId = '6944bed56fba0d6b3af3b854';
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /messages (Send Message)', () => {
    it('should send a message successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          content: 'Test message content',
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('senderId');
      expect(response.body).toHaveProperty('recipientId');
      expect(response.body.content).toBe('Test message content');
      expect(response.body.conversationId).toBeDefined();

      messageId = response.body._id;
      conversationId = response.body.conversationId;
    });

    it('should fail when content is empty', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          content: '',
        })
        .expect(400);
    });

    it('should fail when recipientId is missing', async () => {
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
        })
        .expect(400);
    });

    it('should fail to send message to yourself', async () => {
      const senderId = '692b46e6be53070fe92fd21';

      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: senderId,
          content: 'Test message to self',
        })
        .expect(400);
    });
  });

  describe('GET /messages/unread-count', () => {
    it('should get unread message count', async () => {
      const response = await request(app.getHttpServer())
        .get('/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('unreadCount');
      expect(typeof response.body.unreadCount).toBe('number');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/messages/unread-count')
        .expect(401);
    });
  });

  describe('GET /messages/conversations', () => {
    it('should get all conversations for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/messages/conversations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });
  });

  describe('GET /messages/conversations/:conversationId', () => {
    it('should get a specific conversation', async () => {
      if (!conversationId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/messages/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('participants');
      expect(Array.isArray(response.body.participants)).toBe(true);
    });

    it('should fail for non-existent conversation', async () => {
      await request(app.getHttpServer())
        .get('/messages/conversations/invalidId')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // MongoDB invalid ID error
    });
  });

  describe('GET /messages/conversations/:conversationId/messages', () => {
    it('should get messages in a conversation', async () => {
      if (!conversationId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination for messages', async () => {
      if (!conversationId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .get(
          `/messages/conversations/${conversationId}/messages?page=1&limit=10`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('GET /messages/:messageId', () => {
    it('should get a specific message', async () => {
      if (!messageId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('senderId');
      expect(response.body).toHaveProperty('content');
    });
  });

  describe('PATCH /messages/:messageId (Update Message)', () => {
    it('should update a message', async () => {
      if (!messageId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated message content',
        })
        .expect(200);

      expect(response.body.content).toBe('Updated message content');
      expect(response.body).toHaveProperty('editedAt');
    });

    it('should fail to update with empty content', async () => {
      if (!messageId) {
        this.skip();
        return;
      }

      await request(app.getHttpServer())
        .patch(`/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        })
        .expect(400);
    });
  });

  describe('PATCH /messages/:messageId/read', () => {
    it('should mark message as read', async () => {
      if (!messageId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isRead).toBe(true);
      expect(response.body).toHaveProperty('readAt');
    });
  });

  describe('PATCH /messages/conversations/:conversationId/read', () => {
    it('should mark all messages in conversation as read', async () => {
      if (!conversationId) {
        this.skip();
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/messages/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /messages/:messageId', () => {
    it('should delete a message', async () => {
      // First create a new message to delete
      const messageResponse = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          content: 'Message to delete',
        })
        .expect(201);

      const messageToDelete = messageResponse.body._id;

      await request(app.getHttpServer())
        .delete(`/messages/${messageToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should fail to delete non-existent message', async () => {
      await request(app.getHttpServer())
        .delete('/messages/invalidId')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  describe('DELETE /messages/conversations/:conversationId', () => {
    it('should delete a conversation and all messages', async () => {
      // First create a new conversation
      const messageResponse = await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          content: 'Message for conversation deletion test',
        })
        .expect(201);

      const convToDelete = messageResponse.body.conversationId;

      await request(app.getHttpServer())
        .delete(`/messages/conversations/${convToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

const mockService = {
  findAll: jest.fn(),
  getUnreadCount: jest.fn(),
  findOne: jest.fn(),
  markAllRead: jest.fn(),
  markRead: jest.fn(),
  markUnread: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
};

const mockContext = { userId: 'u1', organizationId: 'o1', roles: ['admin'] };

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

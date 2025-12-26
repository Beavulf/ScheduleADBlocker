import { NotFoundException } from '@nestjs/common';
import { OnetimeResolver } from './onetime.resolver';

// Mocks
const mockOnetimeService = () => ({
  create: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  getOneTimes: jest.fn(),
  toArchive: jest.fn(),
  getArchiveOneTimes: jest.fn(),
});

describe('OnetimeResolver', () => {
  let resolver: OnetimeResolver;
  let service: ReturnType<typeof mockOnetimeService>;

  beforeEach(() => {
    service = mockOnetimeService();
    resolver = new OnetimeResolver(service as any);
  });

  describe('craeteOneTime', () => {
    it('should call service.create with input and authUsername and return result', async () => {
      const input = { some: 'data' } as any;
      const username = 'tester';
      service.create.mockResolvedValue(true);

      const result = await resolver.craeteOneTime(input, username);

      expect(service.create).toHaveBeenCalledWith(input, username);
      expect(result).toBe(true);
    });
  });

  describe('deleteOneTime', () => {
    it('should call service.delete with id and authUsername and return result', async () => {
      const id = 'uuid-1';
      const username = 'deleter';
      service.delete.mockResolvedValue(true);

      const result = await resolver.deleteOneTime(id, username);

      expect(service.delete).toHaveBeenCalledWith(id, username);
      expect(result).toBe(true);
    });
  });

  describe('updateOneTime', () => {
    it('should call service.update with id, input and authUsername and return result', async () => {
      const id = 'uuid-2';
      const input = { field: 'value' } as any;
      const username = 'updater';
      service.update.mockResolvedValue(true);

      const result = await resolver.updateOneTime(id, input, username);

      expect(service.update).toHaveBeenCalledWith(id, input, username);
      expect(result).toBe(true);
    });
  });

  describe('getOneTimes', () => {
    it('should forward filter, sort, skip, take to service and return list', async () => {
      const filter = { status: { in: ['OPEN'] } } as any;
      const sort = { field: 'createdAt', order: 'desc' } as any;
      const skip = 5;
      const take = 10;
      const list = [{ id: '1' }, { id: '2' }] as any[];
      service.getOneTimes.mockResolvedValue(list);

      const result = await resolver.getOneTimes(filter, sort, skip, take);

      expect(service.getOneTimes).toHaveBeenCalledWith({ filter, sort, skip, take });
      expect(result).toBe(list);
    });

    it('should work when optional args are undefined and forward them as is', async () => {
      service.getOneTimes.mockResolvedValue([]);

      const result = await resolver.getOneTimes(undefined, undefined, undefined, undefined);

      expect(service.getOneTimes).toHaveBeenCalledWith({
        filter: undefined,
        sort: undefined,
        skip: undefined,
        take: undefined,
      });
      expect(result).toEqual([]);
    });
  });

  describe('archiveOneTime', () => {
    it('should return true when service.toArchive returns true', async () => {
      const id = 'uuid-3';
      service.toArchive.mockResolvedValue(true);

      const result = await resolver.archiveOneTime(id);

      expect(service.toArchive).toHaveBeenCalledWith(id);
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when service.toArchive returns false', async () => {
      const id = 'uuid-4';
      service.toArchive.mockResolvedValue(false);

      await expect(resolver.archiveOneTime(id)).rejects.toBeInstanceOf(NotFoundException);
      expect(service.toArchive).toHaveBeenCalledWith(id);
    });
  });

  describe('getArchiveOneTimes', () => {
    it('should forward args to service and return list', async () => {
      const filter = { isArchived: { equals: true } } as any;
      const sort = { field: 'createdAt', order: 'asc' } as any;
      const skip = 0;
      const take = 20;
      const list = [{ id: 'a' }] as any[];
      service.getArchiveOneTimes.mockResolvedValue(list);

      const result = await resolver.getArchiveOneTimes(filter, sort, skip, take);

      expect(service.getArchiveOneTimes).toHaveBeenCalledWith({ filter, sort, skip, take });
      expect(result).toBe(list);
    });
  });
});

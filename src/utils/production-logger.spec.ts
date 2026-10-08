import { ProductionLogger } from './production-logger';

describe('ProductionLogger', () => {
  let logger: ProductionLogger;
  let write: jest.SpyInstance;

  beforeEach(() => {
    logger = new ProductionLogger();
    write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => write.mockRestore());

  const output = () => write.mock.calls.map((call) => String(call[0])).join('');

  it.each(['InstanceLoader', 'RoutesResolver', 'RouterExplorer'])(
    'should drop startup narration from %s',
    (context) => {
      logger.log('Mapped {/api/v1/health, GET} route', context);
      expect(write).not.toHaveBeenCalled();
    },
  );

  it('should keep application logs', () => {
    logger.log('Granted Admin to someone@example.com', 'UsersAdminService');
    expect(output()).toContain('Granted Admin to someone@example.com');
  });

  it('should keep the restart marker', () => {
    logger.log('Nest application successfully started', 'NestApplication');
    expect(output()).toContain('successfully started');
  });

  it('should print without ANSI colour codes', () => {
    logger.log('plain', 'UsersAdminService');
    expect(output()).not.toMatch(/\u001b\[/);
  });
});

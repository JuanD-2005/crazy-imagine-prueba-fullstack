import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

interface RegisterResponseBody {
  id: number;
  name: string;
  email: string;
  role: string;
  passwordHash?: string;
}

interface LoginResponseBody {
  accessToken: string;
  user: { id: number; name: string; email: string; role: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testEmail = `test.auth.${Date.now()}@crazysupporthub.test`;
  const testPassword = 'Sup3rSecret!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('POST /auth/register with the correct invite code creates a new agent user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: testEmail,
        password: testPassword,
        inviteCode: process.env.INVITE_CODE,
      })
      .expect(201);

    const body = response.body as RegisterResponseBody;
    expect(body).toMatchObject({
      name: 'Test User',
      email: testEmail,
      role: 'agent',
    });
    expect(body.passwordHash).toBeUndefined();
  });

  it('POST /auth/register without an invite code returns 403', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Sin Código',
        email: `sin-codigo.${Date.now()}@crazysupporthub.test`,
        password: testPassword,
      })
      .expect(403);
  });

  it('POST /auth/register with an incorrect invite code returns 403', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Código Incorrecto',
        email: `codigo-incorrecto.${Date.now()}@crazysupporthub.test`,
        password: testPassword,
        inviteCode: 'not-the-real-invite-code',
      })
      .expect(403);
  });

  it('POST /auth/register with duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test User Again',
        email: testEmail,
        password: testPassword,
        inviteCode: process.env.INVITE_CODE,
      })
      .expect(409);
  });

  it('POST /auth/login with correct credentials returns 200 and a token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const body = response.body as LoginResponseBody;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user).toMatchObject({
      email: testEmail,
      role: 'agent',
    });
  });

  it('POST /auth/login with wrong password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('GET /auth/me without a token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me with a valid token returns the authenticated user', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const { accessToken } = loginResponse.body as LoginResponseBody;

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ email: testEmail, role: 'agent' });
  });
});

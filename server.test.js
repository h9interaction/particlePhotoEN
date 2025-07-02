// server.test.js
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('./server'); // server.js에서 app 객체를 export해야 함

describe('API 테스트: people 추가/조회/삭제', () => {
  it('POST /api/people - 인물 추가', async () => {
    const res = await request(app)
      .post('/api/people')
      .field('koreanName', '테스트유저')
      .field('englishName', 'TestUser')
      .field('organization', '테스트조직')
      .field('role', '테스트역할')
      .field('position', '테스트직위')
      .field('email', 'test@example.com')
      .attach('image', path.join(__dirname, 'test-image.png'));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/people - 인물 목록 조회', async () => {
    const res = await request(app).get('/api/people');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(p => p.englishName === 'TestUser')).toBeTruthy();
  });

  it('DELETE /api/people/:englishName - 인물 삭제', async () => {
    const res = await request(app).delete('/api/people/TestUser');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
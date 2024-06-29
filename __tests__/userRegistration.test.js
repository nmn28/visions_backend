const request = require('supertest');
const app = require('../index'); // Adjust the path to your main server file

test('User registration fails with invalid data', async () => {
    const response = await request(app)
        .post('/register')
        .send({ username: 'test', password: '123' });
    expect(response.statusCode).toBe(400);
});
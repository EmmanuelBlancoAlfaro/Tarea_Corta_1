const request = require('supertest');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

describe('Integration Tests', () => {
    
    let adminToken = '';
    let readOnlyToken = '';
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const kcUrl = `http://localhost:${process.env.KC_PORT || 9090}`;

    beforeAll(async () => {
        // Token de usuario administrador (con rol user-admin)
        const adminParams = new URLSearchParams({
            client_id: 'user-api', 
            client_secret: process.env.KC_CLIENT_SECRET,
            grant_type: 'password',
            username: process.env.KC_USER_NAME,
            password: process.env.KC_USER_PASSWORD 
        });

        const adminRes = await fetch(`${kcUrl}/realms/user-realm/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: adminParams
        });
        const adminData = await adminRes.json();
        adminToken = adminData.access_token;

        // Token de usuario de solo lectura (sin rol user-admin)
        const readOnlyParams = new URLSearchParams({
            client_id: 'user-api', 
            client_secret: process.env.KC_CLIENT_SECRET,
            grant_type: 'password',
            username: 'user-readonly',
            password: 'readonly123'
        });

        const readOnlyRes = await fetch(`${kcUrl}/realms/user-realm/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: readOnlyParams
        });
        const readOnlyData = await readOnlyRes.json();
        readOnlyToken = readOnlyData.access_token;
    });

    it('Should return 200 on GET /health without token', async () => {
        const response = await request(baseUrl).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    it('Should return 200 on GET /ready without token', async () => {
        const response = await request(baseUrl).get('/ready');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    it('Should return 401 if no token is sent on protected endpoint', async () => {
        const response = await request(baseUrl).get('/users');
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('missing bearer token');
    });

    it('Should return 403 if token lacks the required user-admin role', async () => {
        const response = await request(baseUrl)
            .post('/users')
            .send({
                username: "testforbidden",
                email: "testforbidden@test.com"
            })
            .set('Authorization', `Bearer ${readOnlyToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('forbidden: insufficient role');
    });

    it('Should return 201 if a valid token with role is sent and insert in DB', async () => {
        const randomEmail = `usuario${Date.now()}@test.com`;
        const randomUsername = `integration${Date.now().toString(36).replace(/[^a-z]/g, '').slice(-8)}`;
        const response = await request(baseUrl)
            .post('/users')
            .send({
                username: randomUsername,
                email: randomEmail
            })
            .set('Authorization', `Bearer ${adminToken}`); 

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id'); 
        expect(response.body.username).toBe(randomUsername);
    });

});
const request = require('supertest');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

describe('Integration Tests', () => {
    
    let validToken = '';

    beforeAll(async () => {
        
        const tokenParams = new URLSearchParams({
            client_id: 'user-api', 
            client_secret: process.env.KC_CLIENT_SECRET,
            grant_type: 'password',
            username: process.env.KC_USER_NAME,
            password: process.env.KC_USER_PASSWORD 
        });

        
        const keycloakResponse = await fetch(`http://localhost:${process.env.KC_PORT}/realms/user-realm/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        });

        const data = await keycloakResponse.json();
        validToken = data.access_token;
    });

    it('Should return 401 if no token is send in body', async () => {
        const response = await request(`http://localhost:${process.env.PORT}`)
            .get('/users'); 
            
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('missing bearer token');
    });

    it('Should return 201 if a valid token is send and insert in DB', async () => {
        
        const randomEmail = `usuario${Date.now()}@test.com`;
        const randomUsername = `integration${Date.now().toString(36).replace(/[^a-z]/g, '').slice(-8)}`;
        const response = await request(`http://localhost:${process.env.PORT}`)
            .post('/users')
            .send({
            username: randomUsername,
                email: randomEmail
            })
            .set('Authorization', `Bearer ${validToken}`); 

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id'); 
        expect(response.body.username).toBe(randomUsername);
    });

});
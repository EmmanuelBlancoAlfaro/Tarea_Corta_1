const request = require('supertest');
const app = require('../endpoints'); 

var mockPoolQuery = jest.fn();

jest.mock('pg', () => {
  const mPool = {
    query: (...args) => mockPoolQuery(...args), 
  };
  return { Pool: jest.fn(() => mPool) };
});

const { jwtVerify } = require('jose');

jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ 
    payload: { 
      sub: 'fake-user',
      realm_access: { roles: ['user-admin'] }
    } 
  }),
  createRemoteJWKSet: jest.fn()
}));

beforeEach(() => {
        mockPoolQuery.mockReset();
});

describe('Unit Tests - Validations to /users POST endpoint', () => {

    it('Should return 400 if no email is send in body', async () => {
        const response = await request(app)
            .post('/users')
            .send({username: "Juanito"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token')


        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Faltan campos obligatorios (username, email)")
    });

    it('Should return 400 if no username is send in body', async () => {
        const response = await request(app)
            .post('/users')
            .send({email: "emailexample@gmail.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token')

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Faltan campos obligatorios (username, email)")
    });

    it('Should return 400 if email is invalid', async () => {
        const response = await request(app)
            .post('/users')
            .send({
                email: "invalid-email",
                username: "Francisco"
            })
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token')

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Formato de email inválido")
    });

    it('Should return 400 if username has an invalid length', async () => {
    
        const response = await request(app)
            .post('/users')
            .send({
                email: "emailexample@gmail.com",
                username: "This-username-is-invalid-for-its-length"
            })
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token')

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El username debe tener entre 3 y 20 caracteres")
    
    });
    
    it('Should return 400 if username has numbers', async () => {
        const response = await request(app)
            .post('/users')
            .send({
                email: "emailexample@gmail.com",
                username: "Username1234"
            })
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token')
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El username no puede contener números")
    });
    
});

describe('Unit Tests - Validations to /users/:id PUT endpoint', () => {

    it('Should return 400 if id is not a number', async () => {
        const response = await request(app)
            .put('/users/invalid-id')
            .send({username: "Juanito", email: "juanito@example.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El ID debe ser un número");
    });

    it('Should return 400 if no email is send in body', async () => {
        const response = await request(app)
            .put('/users/1')
            .send({username: "Juanito"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Faltan campos obligatorios (username, email)");
    });

    it('Should return 400 if no username is send in body', async () => {
        const response = await request(app)
            .put('/users/1')
            .send({email: "juanito@example.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Faltan campos obligatorios (username, email)");
    });

    it('Should return 400 if email is invalid', async () => {
        const response = await request(app)
            .put('/users/1')
            .send({username: "Juanito", email: "invalid-email"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Formato de email inválido");
    });

    it('Should return 400 if username has an invalid length', async () => {
        const response = await request(app)
            .put('/users/1')
            .send({
                username: "This-username-is-invalid-for-its-length",
                email: "juanito@example.com"
            })
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El username debe tener entre 3 y 20 caracteres");
    });

    it('Should return 400 if username has numbers', async () => {
        const response = await request(app)
            .put('/users/1')
            .send({username: "Juanito123", email: "juanito@example.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El username no puede contener números");
    });

    it('Should return 404 if user does not exist', async () => {
        mockPoolQuery.mockResolvedValue({ rows: [] });

        const response = await request(app)
            .put('/users/999')
            .send({username: "Juanito", email: "juanito@example.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Usuario no encontrado");
    });

    it('Should return 200 if user is updated', async () => {
        const updatedUser = {id: 1, username: "Juanito", email: "juanito@example.com"};
        mockPoolQuery.mockResolvedValue({ rows: [updatedUser] });

        const response = await request(app)
            .put('/users/1')
            .send(updatedUser)
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(updatedUser);
    });

    it('Should return 400 if username or email is already registered', async () => {
        mockPoolQuery.mockRejectedValue({ code: '23505' });

        const response = await request(app)
            .put('/users/1')
            .send({username: "Juanito", email: "juanito@example.com"})
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El username o el email ya están registrados");
    });
});

describe('Unit Tests - Validations to /users/:id DELETE endpoint', () => {

    it('Should return 400 if id is not a number', async () => {
        const response = await request(app)
            .delete('/users/invalid-id')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El ID debe ser un número");
    });

    it('Should return 404 if user does not exist', async () => {
        mockPoolQuery.mockResolvedValue({ rowCount: 0 });

        const response = await request(app)
            .delete('/users/999')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Usuario no encontrado");
    });

    it('Should return 204 if user is deleted', async () => {
        mockPoolQuery.mockResolvedValue({ rowCount: 1 });

        const response = await request(app)
            .delete('/users/1')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(204);
    });

    it('Should return 500 if database query fails', async () => {
        mockPoolQuery.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
            .delete('/users/1')
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error');
    });
});

describe('Unit Tests - Authentication & Role Authorization (401 and 403)', () => {

    it('Should return 401 if no Authorization header is provided', async () => {
        const response = await request(app)
            .post('/users')
            .send({ username: "Juanito", email: "juanito@example.com" })
            .set('Accept', 'application/json');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('missing bearer token');
    });

    it('Should return 403 if token does not have the required user-admin role', async () => {
        jwtVerify.mockResolvedValueOnce({
            payload: {
                sub: 'fake-user-without-role',
                realm_access: { roles: ['default-roles-user-realm'] }
            }
        });

        const response = await request(app)
            .post('/users')
            .send({ username: "Juanito", email: "juanito@example.com" })
            .set('Accept', 'application/json')
            .set('Authorization', 'Bearer fake-token-no-admin');

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('forbidden: insufficient role');
    });
});

describe('Unit Tests - Health & Readiness endpoints', () => {

    it('GET /health should return 200 with status ok without database', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "ok",
            message: "The process is alive"
        });
    });

    it('GET /ready should return 200 when database connection is healthy', async () => {
        mockPoolQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
        const response = await request(app).get('/ready');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("ok");
    });

    it('GET /ready should return 503 when database fails', async () => {
        mockPoolQuery.mockRejectedValueOnce(new Error('Connection failed'));
        const response = await request(app).get('/ready');
        expect(response.status).toBe(503);
        expect(response.body.status).toBe("error");
    });
});

describe('Unit Tests - GET /users and GET /users/:id endpoints', () => {

    it('GET /users should return list of users with status 200', async () => {
        const usersList = [
            { id: 1, username: "pedro", email: "pedro@test.com" },
            { id: 2, username: "maria", email: "maria@test.com" }
        ];
        mockPoolQuery.mockResolvedValueOnce({ rows: usersList });

        const response = await request(app)
            .get('/users')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(usersList);
    });

    it('GET /users with created_at query param should filter by date', async () => {
        mockPoolQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
            .get('/users?created_at=2026-09-09')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(200);
        expect(mockPoolQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE created_at >='),
            expect.arrayContaining(['2026-09-09 00:00:00', '2026-09-09 23:59:59'])
        );
    });

    it('GET /users/:id should return 400 if id is not a number', async () => {
        const response = await request(app)
            .get('/users/abc')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("El ID debe ser un número");
    });

    it('GET /users/:id should return 404 if user not found', async () => {
        mockPoolQuery.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
            .get('/users/99')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Usuario no encontrado");
    });

    it('GET /users/:id should return 200 with user data when found', async () => {
        const user = { id: 1, username: "pedro", email: "pedro@test.com" };
        mockPoolQuery.mockResolvedValueOnce({ rows: [user] });

        const response = await request(app)
            .get('/users/1')
            .set('Authorization', 'Bearer fake-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(user);
    });
});



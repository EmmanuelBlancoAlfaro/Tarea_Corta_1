const request = require('supertest');
const app = require('../endpoints'); 

var mockPoolQuery = jest.fn();

jest.mock('pg', () => {
  const mPool = {
    query: (...args) => mockPoolQuery(...args), 
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ payload: { sub: 'fake-user' } }),
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

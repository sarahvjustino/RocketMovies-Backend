const { hash, compare } = require("bcryptjs")
const appError = require("../utils/AppError")
const sqliteConnection = require("../database/sqlite");
const knex = require("../database/knex");

class UsersController {
    async create(request, response) {
        const { name, email, password } = request.body;

        const database = await sqliteConnection();

        const UserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        if (UserExists) {
            throw new appError("Esse e-mail já está cadastrado!")
        }

        const hashedPassword = await hash(password, 8)

        await database.run("INSERT INTO users (name, email,password) VALUES (?, ?, ?)", [name, email, hashedPassword]);

        return response.json()
    }

    async update(request, response) {
        const { name, email, password, old_password } = request.body;
        const user_id = request.user.id;

        const database = await sqliteConnection();

        const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id]);

        if (!user) {
            throw new appError("Usuário não encontrado!");
        }

        const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        if (userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
            throw new appError("Esse e-mail já está em uso.");
        }

        user.name = name ?? user.name;
        user.email = email ?? user.email;

        if (password && !old_password) {
            throw new appError("Por favor, digite a senha antiga para continuar.");
        }

        if (password && old_password) {
            const checkOldPassword = await compare(old_password, user.password);

            if (!checkOldPassword) {
                throw new appError("Senha antiga não confere!");
            }

            user.password = await hash(password, 8);
        }

        await database.run(`
        UPDATE users SET
        name = ?,
        email = ?,
        password = ?,
        updated_at = DATETIME('now')
        WHERE id = ?
        `, [user.name, user.email, user.password, user_id])

        return response.json()
    }

    async delete(request, response) {
        const { user_id } = request.user.id;

        await knex("users").where({ id }).delete();

        return response.json()
    }
}

module.exports = UsersController;
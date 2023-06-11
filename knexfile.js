// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: "mysql",
    connection: {
      database: "balaena100_bokunote",
      user: "balaena100_boku",
      password: "SQL.Xserv.boku",
    },
    pool: {
      min: 2,
      max: 10
    },
  },

  staging: {
    client: "mysql",
    connection: {
      database: "boku_note",
      user: "root",
      password: "SQL@maclocal1",
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: "mysql",
    connection: {
      database: "boku_note",
      user: "root",
      password: "SQL@maclocal1",
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};

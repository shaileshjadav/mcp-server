"use strict";
const { McpServer, ResourceTemplate, } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport, } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { Pool } = require("pg");
const { z } = require("zod");
const server = new McpServer({
    name: "demo",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
    },
});
const config = {
    user: "postgres",
    password: "postgres",
    host: "localhost",
    database: "todo",
    port: "5432",
    ssl: {
        rejectUnauthorized: false,
    },
};
const pool = new Pool(config);
const getDb = async () => {
    const dbClient = await pool.connect();
    return dbClient;
};
/**
 * Tool 2: List all todos
 *
 * This tool:
 * 1. Retrieves all todos from the service
 * 2. Formats them as a list
 * 3. Returns the formatted list
 */
server.tool("list-todos", "List all todos", {}, async () => {
    const db = await getDb();
    const sqlStmt = 'SELECT * FROM todos;';
    const todoRows = await db.query(sqlStmt);
    const todos = todoRows.rows;
    let content = '';
    if (todos.length === 0) {
        content = "No todos found!";
    }
    const todoItems = todos.map((todo) => {
        return `
            Title: ${todo.title}
            isCompleted: ${todo.is_completed}
            `;
    });
    content = `TODO list: \n ${todoItems}`;
    return {
        content: [{
                type: 'text',
                text: content,
            }]
    };
});
server.tool("createTodo", { title: z.string() }, async ({ title }) => {
    const db = await getDb();
    try {
        const parameters = [title];
        const sqlStmt = 'INSERT into todos ("title") VALUES ($1);';
        await db.query(sqlStmt, parameters);
        return {
            content: [{
                    type: 'text',
                    text: `Todo created: \n\n ${title}`,
                }]
        };
    }
    finally {
        await db.release();
    }
});
server.tool("updateTodo", { oldTitle: z.string(), newTitle: z.string() }, async ({ oldTitle, newTitle }) => {
    const db = await getDb();
    try {
        const parameters = [oldTitle.toLowerCase(), newTitle];
        const sqlStmt = 'UPDATE todos SET "title"= $2 WHERE LOWER(title) = $1;';
        await db.query(sqlStmt, parameters);
        return {
            content: [{
                    type: 'text',
                    text: `Todo updated: \n\n ${newTitle}`,
                }]
        };
    }
    finally {
        await db.release();
    }
});
server.tool("updateCompletedStatus", { title: z.string(), status: z.boolean() }, async ({ title, status }) => {
    const db = await getDb();
    try {
        const parameters = [title.toLowerCase(), status];
        const sqlStmt = 'UPDATE todos SET "is_completed"= $2 WHERE LOWER(title) = $1;';
        await db.query(sqlStmt, parameters);
        return {
            content: [{
                    type: 'text',
                    text: `Todo ${title} status updated: \n\n ${status}`,
                }]
        };
    }
    finally {
        await db.release();
    }
});
// const updateTodo = async ({ title, status }: { title:string, status: boolean }) => {
//     const db = await getDb();
//     try {
//       const parameters = [title.toLocaleLowerCase(), status];
//       const sqlStmt = 'UPDATE todos SET "is_completed"= $2 WHERE LOWER(title) = $1;';
//       console.log(sqlStmt, parameters);
//       await db.query(sqlStmt, parameters);
//       return {
//         content:[{
//             type:'text',
//             text: `Todo ${title} status updated: \n\n ${status}`,
//         }]
//       }
//     } finally {
//       await db.release();
//     }
//   };
// updateTodo({
//   "title": "Watch Comedy show",
//   "status": true
// });
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("todo app is running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});

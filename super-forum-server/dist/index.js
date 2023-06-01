"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const typeorm_1 = require("typeorm");
const UserRepo_1 = require("./repo/UserRepo");
const body_parser_1 = __importDefault(require("body-parser"));
const apollo_server_express_1 = require("apollo-server-express");
const apollo_server_core_1 = require("apollo-server-core");
const http_1 = __importDefault(require("http"));
const schema_1 = require("@graphql-tools/schema");
const cors_1 = __importDefault(require("cors"));
const typeDefs_1 = __importDefault(require("./gql/typeDefs"));
const resolvers_1 = __importDefault(require("./gql/resolvers"));
const ThreadRepo_1 = require("./repo/ThreadRepo");
const envLoader_1 = require("./common/envLoader");
(0, envLoader_1.loadEnv)();
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        credentials: true,
        origin: process.env.CLIENT_URL,
    }));
    const router = express_1.default.Router();
    yield (0, typeorm_1.createConnection)();
    const redis = new ioredis_1.default({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD,
    });
    const RedisStore = (0, connect_redis_1.default)(express_session_1.default);
    const redisStore = new RedisStore({
        client: redis,
    });
    app.use(body_parser_1.default.json());
    app.use((0, express_session_1.default)({
        store: redisStore,
        name: process.env.COOKIE_NAME,
        sameSite: "Strict",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            path: "/",
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 24,
        },
    }));
    app.use(router);
    router.get("/", (req, res, next) => {
        req.session.test = "hello";
        res.send("hello");
    });
    router.post("/register", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("params", req.body);
            const userResult = yield (0, UserRepo_1.register)(req.body.email, req.body.userName, req.body.password);
            if (userResult && userResult.user) {
                res.send(`new user created, userId: ${userResult.user.id}`);
            }
            else if (userResult && userResult.messages) {
                res.send(userResult.messages[0]);
            }
            else {
                next();
            }
        }
        catch (ex) {
            res.send(ex.message);
        }
    }));
    router.post("/login", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            console.log("params", req.body);
            const userResult = yield (0, UserRepo_1.login)(req.body.userName, req.body.password);
            if (userResult && userResult.user) {
                req.session.userId = (_a = userResult.user) === null || _a === void 0 ? void 0 : _a.id;
                res.send(`user logged in, userId:
    ${req.session.userId}`);
            }
            else if (userResult && userResult.messages) {
                res.send(userResult.messages[0]);
            }
            else {
                next();
            }
        }
        catch (ex) {
            res.send(ex.message);
        }
    }));
    router.post("/logout", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("params", req.body);
            const msg = yield (0, UserRepo_1.logout)(req.body.userName);
            if (msg) {
                req.session.userId = null;
                res.send(msg);
            }
            else {
                next();
            }
        }
        catch (ex) {
            console.log(ex);
            res.send(ex.message);
        }
    }));
    router.post("/createthread", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("userId", req.session);
            console.log("body", req.body);
            const msg = yield (0, ThreadRepo_1.createThread)(req.session.userId, req.body.categoryId, req.body.title, req.body.body);
            res.send(msg);
        }
        catch (ex) {
            console.log(ex);
            res.send(ex.message);
        }
    }));
    router.post("/thread", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const threadResult = yield (0, ThreadRepo_1.getThreadById)(req.body.id);
            if (threadResult && threadResult.entity) {
                res.send(threadResult.entity.title);
            }
            else if (threadResult && threadResult.messages) {
                res.send(threadResult.messages[0]);
            }
        }
        catch (ex) {
            console.log(ex);
            res.send(ex.message);
        }
    }));
    router.post("/threadsbycategory", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const threadResult = yield (0, ThreadRepo_1.getThreadsByCategoryId)(req.body.categoryId);
            if (threadResult && threadResult.entities) {
                let items = "";
                console.log(threadResult.entities);
                threadResult.entities.forEach((th) => {
                    items += th.title + ", ";
                });
                res.send(items);
            }
            else if (threadResult && threadResult.messages) {
                res.send(threadResult.messages[0]);
            }
        }
        catch (ex) {
            console.log(ex);
            res.send(ex.message);
        }
    }));
    const httpServer = http_1.default.createServer(app);
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: typeDefs_1.default, resolvers: resolvers_1.default });
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema,
        context: ({ req, res }) => ({ req, res }),
        plugins: [
            (0, apollo_server_core_1.ApolloServerPluginLandingPageLocalDefault)({
                embed: true,
            }),
        ],
    });
    apolloServer.start().then(() => {
        apolloServer.applyMiddleware({
            app,
            cors: false,
        });
        httpServer.listen({ port: process.env.SERVER_PORT }, () => {
            console.log(`Server ready at http://localhost:${process.env.SERVER_PORT}${apolloServer.graphqlPath}`);
        });
    });
});
main();
//# sourceMappingURL=index.js.map
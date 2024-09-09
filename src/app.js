import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';

import products from './routers/products.js';
import carts from './routers/carts.js';
import views from './routers/views.js';
import tickets from './routers/tickets.js';
import auth from './routers/auth.js';
import cartsRouter from './routers/carts.js';
import authRouter from './routers/auth.js';
import { dirname } from './utils.js';
import { dbConnection } from './config/config.js';
import { initializePassport } from './config/passport.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js';
import usersRouter from './routers/users.js';

import swaggerRouter from './swagger.js';
import { addUserToLocals } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 8080;

if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not defined in the environment variables.');
}

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not defined in the environment variables.');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(dirname, 'public')));
app.use(cookieParser());

app.use(session({
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL,
        ttl: 3600
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

initializePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use(addUserToLocals);

app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
});

// Configuración de Handlebars con el helper ifCond
app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: {
        ifCond: function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        }
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,  // Permite acceder a las propiedades del prototipo
        allowProtoMethodsByDefault: true      // Permite acceder a los métodos del prototipo
    }
}));


app.use('/api/auth', authRouter);
app.set('views', path.join(dirname, 'views'));
app.set('view engine', 'handlebars');

app.use('/api/users', usersRouter);
app.use('/', views);
app.use('/api/products', products);
app.use('/api/carts', carts);
app.use('/api/carts', cartsRouter);
app.use('/api/tickets', tickets);
app.use('/api/auth', auth);
app.use(swaggerRouter);

app.get('/loggerTest', (req, res) => {
    logger.debug('Debug log');
    logger.http('HTTP log');
    logger.info('Info log');
    logger.warning('Warning log');
    logger.error('Error log');
    logger.fatal('Fatal log');
    res.send('Logger test complete');
});

app.get('/reset/:token', (req, res) => {
    res.render('resetPassword', { token: req.params.token });
});

app.use(errorHandler);

try {
    await dbConnection();
    const expressServer = app.listen(PORT, () => {
        logger.info(`Corriendo aplicación en el puerto ${PORT}`);
    });
    const io = new Server(expressServer);

    io.on('connection', async (socket) => {
        // Aquí manejamos las conexiones de socket.io
    });
} catch (error) {
    logger.error('Error connecting to the database:', error);
}

export { app };

















































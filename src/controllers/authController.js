import User from '../models/usersModel.js';
import { hashPassword, generateResetToken } from '../utils/bcryptPassword.js';
import { sendMail } from '../config/nodemailer.js';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import Cart from '../models/cartsModel.js';

export const loginUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/login');
        }

        // Verificar si el usuario tiene un carrito
        let user = await User.findById(req.user._id).populate('cart');
        if (!user.cart) {
            console.log('El usuario no tiene carrito. Creando uno nuevo...');
            const newCart = new Cart({
                user: req.user._id, // Asignar el ID del usuario al carrito
                products: [] // Carrito vacío
            });
            await newCart.save();
            user.cart = newCart._id; // Asignar el carrito al usuario
            await user.save(); // Guardar los cambios en el usuario
            console.log('Carrito creado y asignado al usuario:', user.cart);
        } else {
            console.log('El usuario ya tiene un carrito:', user.cart);
        }

        req.session.user = {
            email: req.user.email,
            rol: req.user.rol,
            cartId: user.cart._id // Guardar el carrito en la sesión
        };

        return res.redirect('/');
    } catch (error) {
        console.error('Error en el proceso de login:', error);
        return res.status(500).send('Error al iniciar sesión');
    }
};



// Controlador para el registro de usuario
export const registerUser = async (req, res) => {
    try {
        const { username, email, password, rol } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Crear el usuario nuevo
        const newUser = new User({ username, email, password: hashPassword(password), rol });
        await newUser.save();
        console.log('Usuario nuevo creado:', newUser);

        // Crear el carrito para el usuario nuevo
        const newCart = new Cart({
            user: newUser._id, // Asignar el ID del usuario al carrito
            products: [] // Carrito vacío
        });
        await newCart.save();
        console.log('Carrito creado:', newCart);

        // Asignar el carrito al usuario
        newUser.cart = newCart._id; 
        await newUser.save();
        console.log('Carrito asignado al usuario:', newUser);

        return res.redirect('/login');
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).send('Error al registrar el usuario');
    }
};


export const loginWithPassport = async (req, res, next) => {
    passport.authenticate('login', async (err, user, info) => {
        if (err) {
            console.error('Error during login authentication:', err);
            return next(err);
        }
        if (!user) {
            console.log('Login failed: Invalid credentials');
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        req.logIn(user, async (err) => {
            if (err) {
                console.error('Error during login:', err);
                return next(err);
            }

            // Actualizar last_connection
            user.last_connection = new Date();
            await user.save();

            const token = jwt.sign({ id: user._id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.cookie('jwt', token, { httpOnly: true });

            // Devolver el token y los detalles del usuario en la respuesta
            return res.json({ token, user });
        });
    })(req, res, next);
};


// Controlador para el inicio de sesión con GitHub
export const githubAuthCallback = async (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id, email: user.email, rol: user.rol }, process.env.JWT_SECRET);
    res.cookie('jwt', token, { httpOnly: true });
    return res.redirect('/');
};

// Controlador para olvidé mi contraseña
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found');
        }

        const resetToken = generateResetToken();
        user.resetPasswordToken = resetToken.token;
        user.resetPasswordExpires = resetToken.expires;
        await user.save();

        const resetUrl = `http://localhost:8080/reset/${resetToken.token}`;
        const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        await sendMail(user.email, 'Password Reset Request', message);

        res.status(200).send('Reset password email sent');
    } catch (error) {
        return res.status(500).send('Error sending reset password email');
    }
};

export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }

        user.password = hashPassword(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.send('Password has been reset');
    } catch (error) {
        return res.status(500).send('Error resetting password');
    }
};

export const logoutUser = async (req, res) => {
    try {
        const user = req.user;
        if (user) {
            // Actualizar last_connection al cerrar sesión
            user.last_connection = new Date();
            await user.save();
        }
        req.logout((err) => {
            if (err) {
                return res.status(500).send('Error logging out');
            }
            res.clearCookie('jwt');
            res.redirect('/login');  // Cambiado a /login para redirigir después del logout
        });
    } catch (error) {
        return res.status(500).send('Error logging out');
    }
};

export const loginOrRegisterUser = async (req, res) => {
    try {
        // Busca al usuario en la base de datos por su correo electrónico
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            // Si el usuario no existe, crear uno nuevo (registro)
            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,  // Asegúrate de manejar el hashing de contraseñas
                rol: 'user'  // o cualquier otro rol predeterminado
            });
            const savedUser = await newUser.save();
            return res.redirect('/products');
        }

        // Si el usuario existe pero no tiene un carrito asignado, creamos uno y lo asignamos
        if (!user.cart) {
            const newCart = await Cart.create({ products: [] });
            user.cart = newCart._id;
            await user.save(); // Guardamos el usuario con el carrito asignado
        }

        // Redirigir al usuario a la página de productos
        res.redirect('/products');
    } catch (error) {
        res.status(500).json({ error: 'Error en la autenticación o registro del usuario' });
    }
};









































import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/usersModel.js';
import { isValidPassword, hashPassword } from '../utils/bcryptPassword.js';

// Estrategia de GitHub
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
      let email = null;
      if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
      }

      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
          if (email) {
              user = await User.findOne({ email: email });
          }

          if (!user) {
              user = new User({
                  githubId: profile.id,
                  username: profile.username,
                  email: email,
                  password: '', // No password for GitHub users
                  rol: 'user'
              });
              await user.save();
          } else {
              user.githubId = profile.id;
              await user.save();
          }
      }
      return done(null, user);
  } catch (error) {
      return done(error, null);
  }
}));

// Estrategia de login local
passport.use('login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user || !isValidPassword(password, user.password)) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Estrategia de registro local
passport.use('register', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true // Para acceder a otros campos del formulario de registro
}, async (req, email, password, done) => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return done(null, false, { message: 'User already exists' });
    }

    // Crear un nuevo usuario con la contraseña hasheada
    const hashedPassword = hashPassword(password);
    const newUser = new User({
      email,
      password: hashedPassword,
      username: req.body.username, // Campo 'username' desde el formulario
      rol: req.body.rol || 'user'
    });

    await newUser.save();
    return done(null, newUser);
  } catch (error) {
    return done(error);
  }
}));

// Serializar usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserializar usuario
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const initializePassport = () => {
  passport.initialize();
  passport.session();
};

export { initializePassport };

export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/login');
};

export const forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
      return next();
  }
  res.redirect('/');      
};





























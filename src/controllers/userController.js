import User from '../models/usersModel.js';
import { upload } from '../config/multer.js';
import nodemailer from 'nodemailer';

// Controlador para obtener todos los usuarios con datos limitados
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'nombre correo rol');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
};

export const uploadUserDocuments = (req, res) => {
    upload.array('documents')(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error uploading files', error: err.message });
        }

        try {
            const user = await User.findById(req.params.uid);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const documents = req.files.map(file => ({
                name: file.originalname,
                reference: file.path
            }));

            const updatedUser = { ...user.toObject(), documents: [...user.documents, ...documents] };

            await User.updateOne({ _id: user._id }, updatedUser);

            res.status(200).json({ message: 'Documents uploaded successfully', documents: updatedUser.documents });
        } catch (error) {
            res.status(500).json({ message: 'Error updating user documents', error: error.message });
        }
    });
};

export const changeUserToPremium = async (req, res) => {
    try {
        const user = await User.findById(req.params.uid);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const requiredDocs = ['Identificación', 'Comprobante de domicilio', 'Comprobante de estado de cuenta'];
        const userDocs = user.documents.map(doc => doc.name);

        const hasAllDocs = requiredDocs.every(doc => userDocs.includes(doc));

        if (!hasAllDocs) {
            return res.status(400).json({ message: 'User has not uploaded all required documents' });
        }

        user.rol = 'premium';
        await user.save();

        res.status(200).json({ message: 'User upgraded to premium' });
    } catch (error) {
        res.status(500).json({ message: 'Error upgrading user to premium', error: error.message });
    }
};

// Controlador para eliminar usuarios inactivos
export const deleteInactiveUsers = async (req, res) => {
    try {
        // Definimos el tiempo de inactividad (2 días o 30 minutos para pruebas)
        const inactivityThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos
        // const inactivityThreshold = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 días, usar para producción

        // Buscar usuarios que no hayan iniciado sesión desde el umbral de inactividad
        const inactiveUsers = await User.find({ lastLogin: { $lt: inactivityThreshold } });

        // Configurar el sistema de correos, si no está configurado
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Puede ser otro servicio de correo
            auth: {
                user: 'tu_correo@gmail.com',
                pass: 'tu_contraseña'
            }
        });

        // Iterar sobre los usuarios inactivos para eliminarlos y enviar el correo
        for (const user of inactiveUsers) {
            // Eliminar el usuario
            await User.deleteOne({ _id: user._id });

            // Enviar correo de notificación al usuario
            const mailOptions = {
                from: 'tu_correo@gmail.com',
                to: user.correo,
                subject: 'Cuenta eliminada por inactividad',
                text: `Hola ${user.nombre}, tu cuenta ha sido eliminada por inactividad.`
            };

            await transporter.sendMail(mailOptions);
        }

        res.status(200).json({ message: `${inactiveUsers.length} usuarios inactivos eliminados.` });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuarios inactivos' });
    }
};

export const renderUsersManagement = async (req, res) => {
    try {
        // Obtener todos los usuarios de la base de datos
        const users = await User.find().lean(); // Usar .lean() para convertir los documentos Mongoose a objetos planos

        // Renderizar la vista 'manageUsers' y pasar los usuarios a la plantilla
        res.render('manageUsers', { users });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
};

export const changeUserRole = async (req, res) => {
    try {
        const { uid } = req.params; // Obtener el ID del usuario de los parámetros
        const { rol } = req.body; // Obtener el nuevo rol del cuerpo de la solicitud

        // Encontrar y actualizar el usuario
        await User.updateOne({ _id: uid }, { rol });

        res.status(200).json({ message: 'Rol actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar el rol del usuario' });
    }
};

// Controlador para eliminar un usuario
export const deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;

        // Eliminar el usuario de la base de datos
        await User.deleteOne({ _id: uid });

        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
};


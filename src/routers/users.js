import { Router } from 'express';
import { UserDTO } from '../dto/userDTO.js';
import { auth } from '../middleware/authMiddleware.js';
import { uploadUserDocuments, getAllUsers, deleteInactiveUsers, changeUserRole, deleteUser } from '../controllers/userController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// Ruta para obtener todos los usuarios
router.get('/', getAllUsers);

// Ruta para eliminar usuarios inactivos
router.delete('/', deleteInactiveUsers);

// Ruta para cambiar el rol de un usuario
router.post('/:uid/role', changeUserRole); // POST para cambiar el rol de un usuario

// Ruta para eliminar un usuario
router.delete('/:uid', deleteUser); // DELETE para eliminar un usuario

// Ruta para subir documentos del usuario
router.post('/:uid/documents', ensureAuthenticated, uploadUserDocuments);

router.get('/current', auth, (req, res) => {
    const userDTO = new UserDTO(req.user);
    res.json(userDTO);
});

export default router;




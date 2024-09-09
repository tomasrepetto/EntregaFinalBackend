import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    rol: {
        type: String,
        enum: ['user', 'premium', 'admin'],
        default: 'user'
    },
    documents: [
        {
            name: String,
            reference: String
        }
    ],
    last_connection: {
        type: Date
    },
    lastLogin: { type: Date, default: Date.now },
    cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
});

const User = mongoose.model('User', userSchema);

export default User;
























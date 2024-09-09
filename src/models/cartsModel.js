import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Referencia al usuario
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
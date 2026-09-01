import { Cart } from './cart.model';
import { ICartItem } from './cart.interface';

const addToCart = async (userId: string, item: ICartItem) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [item],
    });
  } else {
    // Check if item already exists with same product and variant
    const existingItemIndex = cart.items.findIndex(
      (i) =>
        i.product.toString() === item.product.toString() &&
        i.variantId.toString() === item.variantId.toString()
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += item.quantity;
      cart.items[existingItemIndex].price = item.price; // Update snapshot price to latest
    } else {
      cart.items.push(item);
    }
    await cart.save();
  }

  return cart;
};

const getCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  return cart;
};

const updateCartItemQuantity = async (
  userId: string,
  productId: string,
  variantId: string,
  quantity: number
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new Error('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (i) =>
      i.product.toString() === productId &&
      i.variantId.toString() === variantId
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    await cart.save();
  }

  return cart;
};

const removeCartItem = async (
  userId: string,
  productId: string,
  variantId: string
) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter(
    (i) =>
      !(
        i.product.toString() === productId &&
        i.variantId.toString() === variantId
      )
  );

  await cart.save();
  return cart;
};

const clearCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return cart;
};

const syncCart = async (userId: string, items: ICartItem[]) => {
    let cart = await Cart.findOne({ user: userId });
    
    if(!cart) {
        cart = await Cart.create({
            user: userId,
            items: items
        });
    } else {
        cart.items = items;
        await cart.save();
    }
    return cart;
}

export const CartServices = {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  syncCart
};

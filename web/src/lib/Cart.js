import { supabase } from './supabase'

// Load cart from database
export async function loadCart(userId) {
  if (!userId) return []
  
  const { data, error } = await supabase
    .from('cart')
    .select(`
      quantity,
      products:product_id (
        id,
        name,
        description,
        price,
        stock_quantity,
        image_url
      )
    `)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error loading cart:', error)
    return []
  }
  
  // Transform the data structure
  return data.map(item => ({
    id: item.products.id,
    name: item.products.name,
    description: item.products.description,
    price: item.products.price,
    stock_quantity: item.products.stock_quantity,
    image_url: item.products.image_url,
    quantity: item.quantity
  }))
}

// Add item to cart
export async function addToCartDB(userId, product, currentQuantity = 0) {
  if (!userId) return
  
  const newQuantity = currentQuantity + 1
  
  const { error } = await supabase
    .from('cart')
    .upsert({
      user_id: userId,
      product_id: product.id,
      quantity: newQuantity
    }, {
      onConflict: 'user_id, product_id'
    })
  
  if (error) {
    console.error('Error adding to cart:', error)
    throw error
  }
  
  return newQuantity
}

// Update cart item quantity
export async function updateCartQuantityDB(userId, productId, quantity) {
  if (!userId) return
  
  if (quantity <= 0) {
    // Remove item
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
    
    if (error) console.error('Error removing from cart:', error)
  } else {
    // Update quantity
    const { error } = await supabase
      .from('cart')
      .upsert({
        user_id: userId,
        product_id: productId,
        quantity: quantity
      }, {
        onConflict: 'user_id, product_id'
      })
    
    if (error) console.error('Error updating cart:', error)
  }
}

// Clear entire cart
export async function clearCartDB(userId) {
  if (!userId) return
  
  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId)
  
  if (error) console.error('Error clearing cart:', error)
}
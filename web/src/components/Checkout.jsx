import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Checkout({ cart, user, onClose, onOrderPlaced }) {
  const [loading, setLoading] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState(user?.delivery_address || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter your delivery address')
      return
    }

    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number')
      return
    }

    setLoading(true)

    try {
      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: 'Pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // 3. Update user's address and phone
      if (deliveryAddress !== user.delivery_address || phoneNumber !== user.phone_number) {
        await supabase
          .from('users')
          .update({
            delivery_address: deliveryAddress,
            phone_number: phoneNumber
          })
          .eq('id', user.id)
      }

      // 4. Clear the cart
      const { error: clearCartError } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)

      if (clearCartError) throw clearCartError

      // 5. Show success message
      toast.success(`Order #${order.id} placed successfully! Total: $${totalAmount.toFixed(2)}`, {
        duration: 5000,
        icon: '✅',
      })

      // 6. Close checkout and notify parent
      onOrderPlaced(order)
      onClose()

    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Checkout 🍽️</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-orange-600">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Delivery Address *
            </label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address"
              rows="3"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., 09123456789"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Special Instructions (Optional)
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests? (e.g., extra sauce, no onions, etc.)"
              rows="2"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Note about special instructions */}
          {specialInstructions && (
            <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
              📝 Note: "{specialInstructions}" will be sent to the kitchen.
            </div>
          )}
        </div>

        <div className="p-4 border-t sticky bottom-0 bg-white">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              !loading
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-300 cursor-not-allowed text-gray-500'
            }`}
          >
            {loading ? 'Placing Order...' : `Place Order • $${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import OrderStatusBadge from './OrderStatusBadge'
import OrderTimeline from './OrderTimeline'

export default function OrderHistory({ user, onBack }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [visibleOrders, setVisibleOrders] = useState(5)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price_at_purchase,
          products (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const getOrderTotal = (order) => {
    return order.order_items?.reduce((sum, item) => 
      sum + (item.price_at_purchase * item.quantity), 0
    ) || order.total_amount
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading your orders...</p>
      </div>
    )
  }

  if (selectedOrder) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedOrder(null)}
          className="mb-4 text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          ← Back to Orders
        </button>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">Order #{selectedOrder.id}</h2>
              <p className="text-gray-500 text-sm">
                Placed on {new Date(selectedOrder.created_at).toLocaleDateString()}
              </p>
            </div>
            <OrderStatusBadge status={selectedOrder.status} />
          </div>

          <OrderTimeline currentStatus={selectedOrder.status} />

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-3">
              {selectedOrder.order_items?.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <img 
                    src={item.products?.image_url} 
                    alt={item.products?.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{item.products?.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x ${item.price_at_purchase.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ${(item.price_at_purchase * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-orange-600">${getOrderTotal(selectedOrder).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Orders</h2>
        <button
          onClick={onBack}
          className="text-orange-600 hover:text-orange-700"
        >
          ← Back to Menu
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">You haven't placed any orders yet.</p>
          <button
            onClick={onBack}
            className="mt-4 bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700"
          >
            Start Ordering
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.slice(0, visibleOrders).map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-1">
                      {order.order_items?.length || 0} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={order.status} />
                    <p className="font-bold text-orange-600 mt-2">
                      ${getOrderTotal(order).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Show More Button */}
          {orders.length > visibleOrders && (
            <div className="text-center mt-6">
              <button
                onClick={() => setVisibleOrders(prev => prev + 5)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition font-semibold"
              >
                Show 5 More ({orders.length - visibleOrders} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}